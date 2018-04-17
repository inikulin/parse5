'use strict';

const ErrorReportingMixinBase = require('./mixin_base');
const ErrorReportingPreprocessorMixin = require('./preprocessor_mixin');
const Mixin = require('../../utils/mixin');

class ErrorReportingTokenizerMixin extends ErrorReportingMixinBase {
    constructor(tokenizer, opts) {
        super(tokenizer, opts);

        const preprocessorMixin = Mixin.install(tokenizer.preprocessor, ErrorReportingPreprocessorMixin, opts);

        this.posTracker = preprocessorMixin.posTracker;
    }
}

module.exports = ErrorReportingTokenizerMixin;
