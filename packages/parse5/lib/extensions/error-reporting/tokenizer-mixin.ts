import { ErrorReportingMixinBase, ErrorReportingMixinOptions } from './mixin-base.js';
import { ErrorReportingPreprocessorMixin } from './preprocessor-mixin.js';
import { Mixin } from '../../utils/mixin.js';
import type { Tokenizer } from '../../tokenizer/index.js';
import type { Preprocessor } from '../../tokenizer/preprocessor.js';

export class ErrorReportingTokenizerMixin extends ErrorReportingMixinBase<Tokenizer> {
    posTracker: ErrorReportingPreprocessorMixin['posTracker'];

    constructor(tokenizer: Tokenizer, opts: ErrorReportingMixinOptions) {
        super(tokenizer, opts);

        const preprocessorMixin = Mixin.install<
            Preprocessor,
            [ErrorReportingMixinOptions],
            ErrorReportingPreprocessorMixin
        >(tokenizer.preprocessor, ErrorReportingPreprocessorMixin, opts);

        this.posTracker = preprocessorMixin.posTracker;
    }
}
