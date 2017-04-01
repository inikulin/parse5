'use strict';

var Mixin = require('../../utils/mixin'),
    inherits = require('util').inherits;


var PositionTrackingPreprocessorMixin = module.exports = function (preprocessor) {
    Mixin.call(this, preprocessor);

    this.preprocessor = preprocessor;
    this.isEol = false;
    this.lineStartPos = 0;
    this.droppedBufferSize = 0;

    this.offset = 0;
    this.col = 0;
    this.line = 1;
};

inherits(PositionTrackingPreprocessorMixin, Mixin);

PositionTrackingPreprocessorMixin.prototype._getOverriddenMethods = function (mxn, orig) {
    return {
        advance: function () {
            var pos = this.pos + 1,
                ch = this.html[pos];

            //NOTE: LF should be in the last column of the line
            if (mxn.isEol) {
                mxn.isEol = false;
                mxn.line++;
                mxn.lineStartPos = pos;
            }

            if (ch === '\n' || ch === '\r' && this.html[pos + 1] !== '\n')
                mxn.isEol = true;

            mxn.col = pos - mxn.lineStartPos + 1;
            mxn.offset = mxn.droppedBufferSize + pos;

            return orig.advance.call(this);
        },

        retreat: function () {
            orig.retreat.call(this);

            mxn.isEol = false;
            mxn.col = this.pos - mxn.lineStartPos + 1;
        },

        dropParsedChunk: function () {
            var prevPos = this.pos;

            orig.dropParsedChunk.call(this);

            var reduction = prevPos - this.pos;

            mxn.lineStartPos -= reduction;
            mxn.droppedBufferSize += reduction;
            mxn.offset = mxn.droppedBufferSize + this.pos;
        }
    };
};
