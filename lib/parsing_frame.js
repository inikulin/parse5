var unicode = require('./unicode');

//Text utils

//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').
function isCharCodeInCommonAllowedRange(charCode) {
    return  charCode > 0x001F && charCode < 0x007F || charCode > 0x009F && charCode < 0xD800;
}

function isSurrogatePair(charCode1, charCode2) {
    return charCode1 >= 0xD800 && charCode1 <= 0xDBFF && charCode2 >= 0xDC00 && charCode2 <= 0xDFFF;
}

function getSurrogatePairCharCode(charCode1, charCode2) {
    return (charCode1 - 0xD800) * 0x400 + 0x2400 + charCode2;
}

//Const
var undefined,
    CHARS = unicode.CHARS;

var ParsingFrame = exports.ParsingFrame = function (srcHtml, errBuff) {
    this.errBuff = errBuff;

    this.srcHtml = srcHtml;
    //NOTE: one leading U+FEFF BYTE ORDER MARK character must be ignored if any are present in the input stream.
    this.pos = this.srcHtml[0] === CHARS.BOM ? 0 : -1;
    this.lastCharPos = this.srcHtml.length - 1;
    this.skipNextNewLine = false;
    this.progressPos = this.pos;

    this.gapStack = [];
    this.lastGapPos = -1;

    this.line = 1;
    this.col = 1;
    this.lineLengths = [];
};

//NOTE: surrogate pairs and CRLF's produces gaps in input sequence that should be avoided during retreat
ParsingFrame.prototype._addGap = function () {
    this.gapStack.push(this.lastGapPos);
    this.lastGapPos = this.pos;
};

ParsingFrame.prototype._jumpOverGap = function () {
    this.lastGapPos = this.gapStack.pop();
    this.pos--;
};

//NOTE: HTML input preprocessing
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
ParsingFrame.prototype._getProcessedChar = function () {
    this.pos++;

    var isProgress = this.pos > this.progressPos;

    if (isProgress)
        this.progressPos = this.pos;

    if (this.pos > this.lastCharPos)
        return CHARS.EOF;

    var ch = this.srcHtml[this.pos];

    //NOTE: any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
    //must be ignored.
    if (this.skipNextNewLine && ch === '\n') {
        this.skipNextNewLine = false;
        this._addGap();

        return this._getProcessedChar();
    }

    //NOTE: all U+000D CARRIAGE RETURN (CR) characters must be converted to U+000A LINE FEED (LF) characters
    if (ch === '\r') {
        this.skipNextNewLine = true;
        return '\n';
    }

    this.skipNextNewLine = false;

    var charCode = ch.charCodeAt(0);

    //NOTE: try to peek a surrogate pair
    if (this.pos !== this.lastCharPos) {
        var nextChar = this.srcHtml[this.pos + 1],
            nextCharCode = nextChar.charCodeAt(0);

        if (isSurrogatePair(charCode, nextCharCode)) {
            //NOTE: we have a surrogate pair. Peek pair character and recalculate char code.
            this.pos++;
            this._addGap();

            ch += nextChar;
            charCode = getSurrogatePairCharCode(charCode, nextCharCode);
        }
    }

    //OPTIMIZATION: first perform check if the char code in the allowed range
    //that covers most common HTML input (e.g. ASCII codes) to avoid performance-sensitive checks.
    if (isProgress && !isCharCodeInCommonAllowedRange(charCode)) {
        if (unicode.isIllegalCharCode(charCode))
            this.errBuff.push('Error');

        if (unicode.isReservedCharCode(charCode)) {
            this.errBuff.push('Error');
            return CHARS.REPLACEMENT_CHARACTER;
        }
    }

    return ch;
};

ParsingFrame.prototype.advanceAndPeekChar = function () {
    var ch = this._getProcessedChar();

    if (ch === '\n' || ch === '\f') {
        this.lineLengths[this.line] = this.col;
        this.line++;
        this.col = 1;
    }
    else
        this.col++;

    return ch;
};

ParsingFrame.prototype.retreat = function () {
    if (this.pos === this.lastGapPos)
        this._jumpOverGap();

    this.pos--;
    this.col--;


    if (!this.col) {
        this.line--;
        this.col = this.lineLengths[this.line];
    }
};