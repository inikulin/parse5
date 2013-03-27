var textUtils = require('./text_utils');

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

    //NOTE: String.charCodeAt() can handle only UTC-2 characters subset. We should consumed whole UTF-16 character
    //if we have so, so we need to perform check for a surrogate pair.
    if (this.srcPos !== this.lastCharPos) {
        var nextChar = this.srcHtml[this.srcPos + 1],
            nextCharCode = nextChar.charCodeAt(0);

        if (textUtils.isSurrogatePair(charCode, nextCharCode)) {
            //NOTE: we have a surrogate pair. Peek pair character and recalculate char code.
            this.srcPos++;
            ch += nextChar;
            charCode = textUtils.getSurrogatePairCharCode(charCode, nextCharCode);
        }
    }

    if (textUtils.isIllegalCharCode(charCode))
        this.errBuff.push('Error');

    if (textUtils.isUnicodeReservedCharCode(charCode)) {
        this.errBuff.push('Error');
        return CHARS.REPLACEMENT_CHARACTER;
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