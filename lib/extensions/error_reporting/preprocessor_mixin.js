'use strict';

var ErrorReportingMixinBase = require('./mixin_base'),
    PositionTrackingPreprocessorMixin = require('../position_tracking/preprocessor_mixin'),
    Mixin = require('../../utils/mixin'),
    inherits = require('util').inherits;


var ErrorReportingPreprocessorMixin = module.exports = function (preprocessor, opts) {
    ErrorReportingMixinBase.call(this, preprocessor, opts);

    this.posTracker = Mixin.install(preprocessor, PositionTrackingPreprocessorMixin);
    this.lastErrOffset = -1;
};

inherits(ErrorReportingPreprocessorMixin, ErrorReportingMixinBase);

ErrorReportingPreprocessorMixin.prototype._reportError = function (code) {
    //NOTE: avoid reporting error twice on advance/retreat
    if (this.lastErrOffset !== this.posTracker.offset) {
        this.lastErrOffset = this.posTracker.offset;
        ErrorReportingMixinBase.prototype._reportError.call(this, code);
    }
};
