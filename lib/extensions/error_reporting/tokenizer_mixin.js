'use strict';

var ErrorReportingMixinBase = require('./mixin_base'),
    ErrorReportingPreprocessorMixin = require('./preprocessor_mixin'),
    Mixin = require('../../utils/mixin'),
    inherits = require('util').inherits;


var ErrorReportingTokenizerMixin = module.exports = function (tokenizer, opts) {
    ErrorReportingMixinBase.call(this, tokenizer, opts);

    var preprocessorMixin = Mixin.install(tokenizer.preprocessor, ErrorReportingPreprocessorMixin, opts);

    this.posTracker = preprocessorMixin.posTracker;
};

inherits(ErrorReportingTokenizerMixin, ErrorReportingMixinBase);
