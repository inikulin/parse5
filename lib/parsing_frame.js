var undefined;

var EOF = null,
    BOM = '\uFEFF',
    REPLACEMENT_CHARACTER = '\uFFFD';

var ILLEGAL_CHAR_CODES = {
    0x000B: true, 0xFFFE: true, 0xFFFF: true, 0x1FFFE: true, 0x1FFFF: true, 0x2FFFE: true, 0x2FFFF: true,
    0x3FFFE: true, 0x3FFFF: true, 0x4FFFE: true, 0x4FFFF: true, 0x5FFFE: true, 0x5FFFF: true, 0x6FFFE: true,
    0x6FFFF: true, 0x7FFFE: true, 0x7FFFF: true, 0x8FFFE: true, 0x8FFFF: true, 0x9FFFE: true, 0x9FFFF: true,
    0xAFFFE: true, 0xAFFFF: true, 0xBFFFE: true, 0xBFFFF: true, 0xCFFFE: true, 0xCFFFF: true, 0xDFFFE: true,
    0xDFFFF: true, 0xEFFFE: true, 0xEFFFF: true, 0xFFFFE: true, 0xFFFFF: true, 0x10FFFE: true, 0x10FFFF: true
};

//Utils
function isIllegalCharCode(charCode) {
    return ILLEGAL_CHAR_CODES[charCode] ||
        charCode >= 0x0001 && charCode <= 0x0008 ||
        charCode >= 0x000E && charCode <= 0x001F ||
        charCode >= 0x007F && charCode <= 0x009F ||
        charCode >= 0xFDD0 && charCode <= 0xFDEF;
}

var ParsingFrame = exports.ParsingFrame = function (srcHtml, errBuff) {
    this.errBuff = errBuff;

    this.srcHtml = srcHtml;
    this.processedHtml = '';

    //NOTE: one leading U+FEFF BYTE ORDER MARK character must be ignored if any are present in the input stream.
    this.srcPos = this.srcHtml[0] === BOM ? 0 : -1;
    this.processedPos = -1;
    this.eofReached = false;
    this.skipNextNewLine = false;

    this.line = 1;
    this.col = 1;
    this.lineLengths = [];
};

ParsingFrame.prototype._getProcessedChar = function () {
    this.srcPos++;

    if (this.srcPos >= this.srcHtml.length)
        return EOF;

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

    //NOTE: String.charCodeAt() can handle only UTC-2 characters subset. We should consumed whole UTF-16 character
    //if we have so, so we need to perform check for a surrogate pair.
    if (this.srcPos !== this.srcHtml.length - 1) {
        var pairChar = this.srcHtml[this.srcPos + 1],
            pairCharCode = pairChar.charCodeAt(0);

        if (charCode >= 0xD800 && charCode <= 0xDBFF && pairCharCode >= 0xDC00 && pairCharCode <= 0xDFFF) {
            //NOTE: we have a surrogate pair. Peek pair character and recalculate char code.
            this.srcPos++;
            charCode = (charCode - 0xD800) * 0x400 + 0x2400 + pairCharCode;
        }
    }

    if (isIllegalCharCode(charCode)) {
        this.errBuff.push('Error');
        return REPLACEMENT_CHARACTER;
    }

    return ch;
};

ParsingFrame.prototype.advanceAndPeekChar = function () {
    this.processedPos++;

    var ch = undefined;

    if (this.processedPos >= this.processedHtml.length) {
        ch = this._getProcessedChar();

        if (ch !== EOF)
            this.processedHtml += ch;
    } else
        ch = this.processedHtml[this.processedPos];

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
    this.processedPos--;
    this.col--;

    if (!this.col) {
        this.line--;
        this.col = this.lineLengths[this.line];
    }
};