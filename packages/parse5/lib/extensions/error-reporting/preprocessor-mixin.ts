import { ErrorReportingMixinBase, ErrorReportingMixinOptions } from './mixin-base.js';
import { PositionTrackingPreprocessorMixin } from '../position-tracking/preprocessor-mixin.js';
import { Mixin } from '../../utils/mixin.js';
import type { Preprocessor } from '../../tokenizer/preprocessor.js';
import type { ERR } from './../../common/error-codes.js';

export class ErrorReportingPreprocessorMixin extends ErrorReportingMixinBase<Preprocessor> {
    posTracker: PositionTrackingPreprocessorMixin;
    lastErrOffset = -1;

    constructor(preprocessor: Preprocessor, opts: ErrorReportingMixinOptions) {
        super(preprocessor, opts);

        this.posTracker = Mixin.install(preprocessor, PositionTrackingPreprocessorMixin);
    }

    override _reportError(code: ERR) {
        //NOTE: avoid reporting error twice on advance/retreat
        if (this.lastErrOffset !== this.posTracker.offset) {
            this.lastErrOffset = this.posTracker.offset;
            super._reportError(code);
        }
    }
}
