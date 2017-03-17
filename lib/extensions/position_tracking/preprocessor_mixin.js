'use strict';

var Mixin = require('../../utils/mixin'),
    inherits = require('util').inherits,
    UNICODE = require('../../common/unicode');

//Aliases
var $ = UNICODE.CODE_POINTS;

var PositionTrackingPreprocessorMixin = module.exports = function (preprocessor) {
    Mixin.call(this, preprocessor);

    this.isEol = false;
    this.lineStartPos = 0;
    this.col = -1;
    this.line = 1;
};

inherits(PositionTrackingPreprocessorMixin, Mixin);

PositionTrackingPreprocessorMixin.prototype._getOverriddenMethods = function (mxn, orig) {
    return {
        advance: function () {
            var cp = orig.advance.call(this);

            //NOTE: LF should be in the last column of the line
            if (mxn.isEol) {
                mxn.isEol = false;
                mxn.line++;
                mxn.lineStartPos = this.sourcePos;
            }

            if (cp === $.LINE_FEED)
                mxn.isEol = true;

            mxn.col = this.sourcePos - mxn.lineStartPos + 1;

            return cp;
        },

        retreat: function () {
            orig.retreat.call(this);
            mxn.isEol = false;

            mxn.col = this.sourcePos - mxn.lineStartPos + 1;
        }
    };
};
