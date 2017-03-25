'use strict';

var Mixin = require('../../utils/mixin'),
    inherits = require('util').inherits;

var ErrorReportingMixinBase = module.exports = function (host, onParseError) {
    Mixin.call(this, host);

    this.posTracker = null;
    this.onParseError = onParseError;
};

inherits(ErrorReportingMixinBase, Mixin);

ErrorReportingMixinBase.prototype._setErrorLocation = function (err) {
    err.line = this.posTracker.line;
    err.col = this.posTracker.col;
    err.offset = this.posTracker.offset;
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
