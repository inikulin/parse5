'use strict';

var ErrorReportingMixinBase = require('./mixin_base'),
    PositionTrackingPreprocessorMixin = require('../position_tracking/preprocessor_mixin'),
    Mixin = require('../../utils/mixin'),
    inherits = require('util').inherits;


var ErrorReportingPreprocessorMixin = module.exports = function (preprocessor, opts) {
    ErrorReportingMixinBase.call(this, preprocessor, opts);

    this.posTracker = Mixin.install(preprocessor, PositionTrackingPreprocessorMixin);
};

inherits(ErrorReportingPreprocessorMixin, ErrorReportingMixinBase);
