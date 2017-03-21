'use strict';

var ErrorReportingMixinBase = require('./mixin_base'),
    PositionTrackingPreprocessorMixin = require('../position_tracking/preprocessor_mixin'),
    inherits = require('util').inherits;


var ErrorReportingPreprocessorMixin = module.exports = function (preprocessor, onParseError) {
    ErrorReportingMixinBase.call(this, preprocessor, onParseError);

    this.posTracker = new PositionTrackingPreprocessorMixin(preprocessor);
};

inherits(ErrorReportingPreprocessorMixin, ErrorReportingMixinBase);
