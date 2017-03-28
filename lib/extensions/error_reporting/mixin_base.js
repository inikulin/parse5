'use strict';

var Mixin = require('../../utils/mixin'),
    inherits = require('util').inherits;

var ErrorReportingMixinBase = module.exports = function (host, opts) {
    Mixin.call(this, host);

    this.posTracker = null;
    this.onParseError = opts.onParseError;
};

inherits(ErrorReportingMixinBase, Mixin);

ErrorReportingMixinBase.prototype._setErrorLocation = function (err) {
    err.startLine = err.endLine = this.posTracker.line;
    err.startCol = err.endCol = this.posTracker.col;
    err.startOffset = err.endOffset = this.posTracker.offset;
};

ErrorReportingMixinBase.prototype._getOverriddenMethods = function (mxn) {
    return {
        _err: function (code, details) {
            var err = {
                code: code,
                line: -1,
                col: -1,
                offset: -1,
                details: details
            };

            mxn._setErrorLocation(err);
            mxn.onParseError(err);
        }
    };
};
