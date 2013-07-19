var unicode = require('./unicode');

//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').
function isCodePointInCommonAllowedRange(cp) {
    return  cp > 0x001F && cp < 0x007F || cp > 0x009F && cp < 0xD800;
}

function isSurrogatePair(cp1, cp2) {
    return cp1 >= 0xD800 && cp1 <= 0xDBFF && cp2 >= 0xDC00 && cp2 <= 0xDFFF;
}

function getSurrogatePairCodePoint(cp1, cp2) {
    return (cp1 - 0xD800) * 0x400 + 0x2400 + cp2;
}

//Aliases
var $ = unicode.CODE_POINTS;

//Preprocessor
var Preprocessor = exports.Preprocessor = function (html, errBuff) {
    this.html = html;

    //NOTE: one leading U+FEFF BYTE ORDER MARK character must be ignored if any are present in the input stream.
    this.pos = this.html.charCodeAt(0) === $.BOM ? 0 : -1;
    this.lastCharPos = this.html.length - 1;
    this.skipNextNewLine = false;
    this.progressPos = this.pos;

    this.gapStack = [];
    this.lastGapPos = -1;
};

//NOTE: surrogate pairs and CRLF's produces gaps in input sequence that should be avoided during retreat
Preprocessor.prototype._addGap = function () {
    this.gapStack.push(this.lastGapPos);
    this.lastGapPos = this.pos;
};

//NOTE: HTML input preprocessing
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
Preprocessor.prototype.advanceAndPeekCodePoint = function () {
    while (true) {
        this.pos++;

        var isProgress = this.pos > this.progressPos;

        if (isProgress)
            this.progressPos = this.pos;

        if (this.pos > this.lastCharPos)
            return $.EOF;

        var cp = this.html.charCodeAt(this.pos);

        //NOTE: any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
        //must be ignored.
        if (this.skipNextNewLine && cp === $.LINE_FEED) {
            this.skipNextNewLine = false;
            this._addGap();
            continue;
        }

        //NOTE: all U+000D CARRIAGE RETURN (CR) characters must be converted to U+000A LINE FEED (LF) characters
        if (cp === $.CARRIAGE_RETURN) {
            this.skipNextNewLine = true;
            return $.LINE_FEED;
        }

        this.skipNextNewLine = false;

        //NOTE: try to peek a surrogate pair
        if (this.pos !== this.lastCharPos) {
            var nextCp = this.html.charCodeAt(this.pos + 1);

            if (isSurrogatePair(cp, nextCp)) {
                //NOTE: we have a surrogate pair. Peek pair character and recalculate code point.
                this.pos++;
                this._addGap();

                cp = getSurrogatePairCodePoint(cp, nextCp);
            }
        }

        //OPTIMIZATION: first perform check if the code point in the allowed range
        //that covers most common HTML input (e.g. ASCII codes) to avoid performance-sensitive checks.
        if (isProgress && !isCodePointInCommonAllowedRange(cp) && unicode.isReservedCodePoint(cp))
            return $.REPLACEMENT_CHARACTER;

        return cp;
    }
};

Preprocessor.prototype.retreat = function () {
    if (this.pos === this.lastGapPos) {
        this.lastGapPos = this.gapStack.pop();
        this.pos--;
    }

    this.pos--;
};