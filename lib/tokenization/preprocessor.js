'use strict';

var UNICODE = require('../common/unicode');

//Aliases
var $ = UNICODE.CODE_POINTS;

//Const
var CARRIAGE_RETURN_NEW_LINE_REGEX = /\r\n?/g;

//Utils

//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').
function isReservedCodePoint(cp) {
    return cp >= 0xD800 && cp <= 0xDFFF || cp > 0x10FFFF;
}

function isSurrogatePair(cp1, cp2) {
    return cp1 >= 0xD800 && cp1 <= 0xDBFF && cp2 >= 0xDC00 && cp2 <= 0xDFFF;
}

function getSurrogatePairCodePoint(cp1, cp2) {
    return (cp1 - 0xD800) * 0x400 + 0x2400 + cp2;
}

//Preprocessor
//NOTE: HTML input preprocessing
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
var Preprocessor = module.exports = function (html) {
    this.write(html);

    //NOTE: one leading U+FEFF BYTE ORDER MARK character must be ignored if any are present in the input stream.
    this.pos = this.html.charCodeAt(0) === $.BOM ? 0 : -1;

    this.gapStack = [];
    this.lastGapPos = -1;
};

Preprocessor.prototype.write = function (html) {
    //NOTE: All U+000D CARRIAGE RETURN (CR) characters must be converted to U+000A LINE FEED (LF) characters.
    //Any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
    //must be ignored.
    html = html.replace(CARRIAGE_RETURN_NEW_LINE_REGEX, '\n');

    if (this.html) {
        this.html = this.html.substring(0, this.pos + 1) +
                    html +
                    this.html.substring(this.pos + 1, this.html.length);

    }
    else
        this.html = html;


    this.lastCharPos = this.html.length - 1;
};

Preprocessor.prototype.advanceAndPeekCodePoint = function () {
    this.pos++;

    if (this.pos > this.lastCharPos)
        return $.EOF;

    var cp = this.html.charCodeAt(this.pos);

    //OPTIMIZATION: first perform check if the code point in the allowed range that covers most common
    //HTML input (e.g. ASCII codes) to avoid performance-cost operations for high-range code points.
    if (cp >= 0xD800) {
        //NOTE: try to peek a surrogate pair
        if (this.pos !== this.lastCharPos) {
            var nextCp = this.html.charCodeAt(this.pos + 1);

            if (isSurrogatePair(cp, nextCp)) {
                //NOTE: we have a surrogate pair. Peek pair character and recalculate code point.
                this.pos++;
                cp = getSurrogatePairCodePoint(cp, nextCp);

                //NOTE: add gap that should be avoided during retreat
                this.gapStack.push(this.lastGapPos);
                this.lastGapPos = this.pos;
            }
        }

        if (isReservedCodePoint(cp))
            cp = $.REPLACEMENT_CHARACTER;
    }

    return cp;
};

Preprocessor.prototype.retreat = function () {
    if (this.pos === this.lastGapPos) {
        this.lastGapPos = this.gapStack.pop();
        this.pos--;
    }

    this.pos--;
};
