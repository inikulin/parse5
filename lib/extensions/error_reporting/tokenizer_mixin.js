'use strict';

var ErrorReportingMixinBase = require('./mixin_base'),
    ErrorReportingPreprocessorMixin = require('./preprocessor_mixin'),
    inherits = require('util').inherits;


var ErrorReportingTokenizerMixin = module.exports = function (tokenizer, onParseError) {
    ErrorReportingMixinBase.call(this, tokenizer, onParseError);

    var preprocessorMixin = new ErrorReportingPreprocessorMixin(tokenizer.preprocessor, onParseError);

    this.posTracker = preprocessorMixin.posTracker;
};

inherits(ErrorReportingTokenizerMixin, ErrorReportingMixinBase);
