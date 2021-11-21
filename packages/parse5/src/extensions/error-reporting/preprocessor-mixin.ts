import { ErrorReportingMixinBase, ErrorReportingOptions } from './mixin-base.js';
import { PositionTrackingPreprocessorMixin } from '../position-tracking/preprocessor-mixin.js';
import { install as installMixin } from '../../utils/Mixin.js';
import { Preprocessor } from '../../tokenizer/preprocessor.js';

export class ErrorReportingPreprocessorMixin extends ErrorReportingMixinBase<Preprocessor> {
    protected _lastErrOffset: number;

    public constructor(preprocessor: Preprocessor, opts?: ErrorReportingOptions) {
        super(preprocessor, opts);

        this.posTracker = installMixin(preprocessor, PositionTrackingPreprocessorMixin);
        this._lastErrOffset = -1;
    }

    protected override _reportError(code: unknown): void {
        //NOTE: avoid reporting error twice on advance/retreat
        if (this.posTracker !== null && this._lastErrOffset !== this.posTracker.offset) {
            this._lastErrOffset = this.posTracker.offset;
            super._reportError(code);
        }
    }

    protected _getOverriddenMethods(): Partial<Preprocessor> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const mxn = this;
        return {
            err(code: unknown): void {
                mxn._reportError(code);
            },
        };
    }
}
