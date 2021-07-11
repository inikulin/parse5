import { ErrorReportingMixinBase } from './mixin-base.js';
import { PositionTrackingPreprocessorMixin } from '../position-tracking/preprocessor-mixin.js';
import { Mixin } from '../../utils/mixin.js';

export class ErrorReportingPreprocessorMixin extends ErrorReportingMixinBase {
    constructor(preprocessor, opts) {
        super(preprocessor, opts);

        this.posTracker = Mixin.install(preprocessor, PositionTrackingPreprocessorMixin);
        this.lastErrOffset = -1;
    }

    _reportError(code) {
        //NOTE: avoid reporting error twice on advance/retreat
        if (this.lastErrOffset !== this.posTracker.offset) {
            this.lastErrOffset = this.posTracker.offset;
            super._reportError(code);
        }
    }
}
