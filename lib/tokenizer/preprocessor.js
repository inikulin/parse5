'use strict';

var unicode = require('../common/unicode'),
    ERR = require('../common/error_codes');

//Aliases
var $ = unicode.CODE_POINTS;

//Const
var DEFAULT_BUFFER_WATERLINE = 1 << 16;

//Preprocessor
//NOTE: HTML input preprocessing
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
var Preprocessor = module.exports = function () {
    this.html = null;

    this.pos = -1;
    this.lastGapPos = -1;
    this.lastCharPos = -1;

    this.gapStack = [];

    this.skipNextNewLine = false;

    this.lastChunkWritten = false;
    this.endOfChunkHit = false;
    this.bufferWaterline = DEFAULT_BUFFER_WATERLINE;
};

Preprocessor.prototype._err = function () {
    // NOTE: err reporting is noop by default. Enabled by mixin.
};

Preprocessor.prototype._addGap = function () {
    this.gapStack.push(this.lastGapPos);
    this.lastGapPos = this.pos;
};

Preprocessor.prototype._processSurrogate = function (cp) {
    //NOTE: try to peek a surrogate pair
    if (this.pos !== this.lastCharPos) {
        var nextCp = this.html.charCodeAt(this.pos + 1);

        if (unicode.isSurrogatePair(nextCp)) {
            //NOTE: we have a surrogate pair. Peek pair character and recalculate code point.
            this.pos++;

            //NOTE: add gap that should be avoided during retreat
            this._addGap();

            return unicode.getSurrogatePairCodePoint(cp, nextCp);
        }
    }

    //NOTE: we are at the end of a chunk, therefore we can't infer surrogate pair yet.
    else if (!this.lastChunkWritten) {
        this.endOfChunkHit = true;
        return $.EOF;
    }

    //NOTE: isolated surrogate
    this._err(ERR.surrogateInInputStream);

    return cp;
};

Preprocessor.prototype.dropParsedChunk = function () {
    if (this.pos > this.bufferWaterline) {
        this.lastCharPos -= this.pos;
        this.html = this.html.substring(this.pos);
        this.pos = 0;
        this.lastGapPos = -1;
        this.gapStack = [];
    }
};

Preprocessor.prototype.write = function (chunk, isLastChunk) {
    if (this.html)
        this.html += chunk;

    else
        this.html = chunk;

    this.lastCharPos = this.html.length - 1;
    this.endOfChunkHit = false;
    this.lastChunkWritten = isLastChunk;
};

Preprocessor.prototype.insertHtmlAtCurrentPos = function (chunk) {
    this.html = this.html.substring(0, this.pos + 1) +
        chunk +
        this.html.substring(this.pos + 1, this.html.length);

    this.lastCharPos = this.html.length - 1;
    this.endOfChunkHit = false;
};

Preprocessor.prototype.advance = function () {
    this.pos++;

    if (this.pos > this.lastCharPos) {
        this.endOfChunkHit = !this.lastChunkWritten;
        return $.EOF;
    }

    var cp = this.html.charCodeAt(this.pos);

    //NOTE: any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
    //must be ignored.
    if (this.skipNextNewLine && cp === $.LINE_FEED) {
        this.skipNextNewLine = false;
        this._addGap();
        return this.advance();
    }

    //NOTE: all U+000D CARRIAGE RETURN (CR) characters must be converted to U+000A LINE FEED (LF) characters
    if (cp === $.CARRIAGE_RETURN) {
        this.skipNextNewLine = true;
        return $.LINE_FEED;
    }

    this.skipNextNewLine = false;

    if (unicode.isSurrogate(cp))
        cp = this._processSurrogate(cp);

    //OPTIMIZATION: first check if code point is in the common allowed
    //range (ASCII alphanumeric, whitespaces, big chunk of BMP)
    //before going into detailed performance cost validation.
    var isCommonValidRange = cp > 0x1F && cp < 0x7F || cp === $.LINE_FEED || cp === $.CARRIAGE_RETURN || cp > 0x9F && cp < 0xFDD0;

    if (!isCommonValidRange)
        this._checkForProblematicCharacters(cp);

    return cp;
};

Preprocessor.prototype._checkForProblematicCharacters = function (cp) {
    if (unicode.isControlCodePoint(cp))
        this._err(ERR.controlCharacterInInputStream);

    else if (unicode.isUndefinedCodePoint(cp))
        this._err(ERR.noncharacterInInputStream);
};

Preprocessor.prototype.retreat = function () {
    if (this.pos === this.lastGapPos) {
        this.lastGapPos = this.gapStack.pop();
        this.pos--;
    }

    this.pos--;
};

