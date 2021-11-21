import { ErrorReportingMixinBase, ErrorReportingOptions } from './mixin-base.js';
import { ErrorReportingPreprocessorMixin } from './preprocessor-mixin.js';
import { install as installMixin } from '../../utils/Mixin.js';
import { Tokenizer } from '../../tokenizer/index.js';

export class ErrorReportingTokenizerMixin extends ErrorReportingMixinBase<Tokenizer> {
    public constructor(tokenizer: Tokenizer, opts?: ErrorReportingOptions) {
        super(tokenizer, opts);

        const preprocessorMixin = installMixin(tokenizer.preprocessor, ErrorReportingPreprocessorMixin, opts);

        this.posTracker = preprocessorMixin.posTracker;
    }

    protected _getOverriddenMethods(): Partial<Tokenizer> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const mxn = this;
        return {
            err(code: unknown): void {
                mxn._reportError(code);
            },
        };
    }
}
