import { Location } from '../../tokenizer/index.js';
import { Mixin } from '../../utils/Mixin.js';
import { PositionTrackingPreprocessorMixin } from '../position-tracking/preprocessor-mixin.js';

export interface ErrorReportingOptions {
    onParseError?: (err: unknown) => void;
}

export abstract class ErrorReportingMixinBase<T> extends Mixin<T> {
    public posTracker: PositionTrackingPreprocessorMixin | null;
    protected _onParseError?: (err: unknown) => void;
    protected _options?: ErrorReportingOptions;

    public constructor(host: T, opts?: ErrorReportingOptions) {
        super(host);

        this._options = opts;
        this.posTracker = null;
        this._onParseError = opts?.onParseError;
    }

    protected _setErrorLocation(err: Location & { code: unknown }): void {
        if (this.posTracker) {
            err.startLine = err.endLine = this.posTracker.line;
            err.startCol = err.endCol = this.posTracker.col;
            err.startOffset = err.endOffset = this.posTracker.offset;
        }
    }

    protected _reportError(code: unknown): void {
        const err: Location & { code: unknown } = {
            code,
            startLine: -1,
            startCol: -1,
            startOffset: -1,
            endLine: -1,
            endCol: -1,
            endOffset: -1,
        };

        this._setErrorLocation(err);
        this._onParseError?.(err);
    }
}
