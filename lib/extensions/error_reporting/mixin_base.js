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

ErrorReportingMixinBase.prototype._reportError = function (code) {
    var err = {
        code: code,
        line: -1,
        col: -1,
        offset: -1
    };

    this._setErrorLocation(err);
    this.onParseError(err);
};

ErrorReportingMixinBase.prototype._getOverriddenMethods = function (mxn) {
    return {
        _err: function (code) {
            mxn._reportError(code);
        }
    };
};
