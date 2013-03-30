var textUtils = require('./text_utils');

//Text utils

//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module because this requires context change.
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
    CHARS = textUtils.CHARS;

var ParsingFrame = exports.ParsingFrame = function (srcHtml, errBuff) {
    this.errBuff = errBuff;

    this.srcHtml = srcHtml;
    //NOTE: one leading U+FEFF BYTE ORDER MARK character must be ignored if any are present in the input stream.
    this.srcPos = this.srcHtml[0] === CHARS.BOM ? 0 : -1;
    this.lastCharPos = this.srcHtml.length - 1;
    this.skipNextNewLine = false;

    this.cache = [];
    this.cachePos = -1;

    this.line = 1;
    this.col = 1;
    this.lineLengths = [];
};

//NOTE: HTML input preprocessing
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
ParsingFrame.prototype._getProcessedChar = function () {
    this.srcPos++;

    if (this.srcPos > this.lastCharPos)
        return CHARS.EOF;

    var ch = this.srcHtml[this.srcPos];

    //NOTE: any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
    //must be ignored.
    if (this.skipNextNewLine && ch === '\n') {
        this.skipNextNewLine = false;
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
    if (this.srcPos !== this.lastCharPos) {
        var nextChar = this.srcHtml[this.srcPos + 1],
            nextCharCode = nextChar.charCodeAt(0);

        if (isSurrogatePair(charCode, nextCharCode)) {
            //NOTE: we have a surrogate pair. Peek pair character and recalculate char code.
            this.srcPos++;
            ch += nextChar;
            charCode = getSurrogatePairCharCode(charCode, nextCharCode);
        }
    }

    //OPTIMIZATION: first perform check if char code in the allowed range
    //that covers most common HTML input (e.g. ASCII codes) to avoid performance-sensitive checks.
    if (!isCharCodeInCommonAllowedRange(charCode)) {
        if (textUtils.isIllegalCharCode(charCode))
            this.errBuff.push('Error');

        if (textUtils.isUnicodeReservedCharCode(charCode)) {
            this.errBuff.push('Error');
            return CHARS.REPLACEMENT_CHARACTER;
        }
    }

    return ch;
};

ParsingFrame.prototype.advanceAndPeekChar = function () {
    this.cachePos++;

    if (this.cachePos >= this.cache.length)
        this.cache[this.cachePos] = this._getProcessedChar();

    var ch = this.cache[this.cachePos];

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
    this.cachePos--;
    this.col--;

    if (!this.col) {
        this.line--;
        this.col = this.lineLengths[this.line];
    }
};