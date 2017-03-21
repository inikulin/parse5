'use strict';

var Mixin = require('../../utils/mixin'),
    inherits = require('util').inherits;

var ErrorReportingMixinBase = module.exports = function (host, onParseError) {
    Mixin.call(this, host);

    this.posTracker = null;
    this.onParseError = onParseError;
};

inherits(ErrorReportingMixinBase, Mixin);

ErrorReportingMixinBase.prototype._getOverriddenMethods = function (mxn) {
    return {
        _err: function (code) {
            mxn.onParseError({
                code: code,
                line: mxn.posTracker.line,
                col: mxn.posTracker.col,
                offset: mxn.posTracker.offset
            });
        }
    };
};
