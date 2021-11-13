import { Mixin } from '../../utils/mixin.js';
import type { ERR } from '../../common/error-codes.js';

export interface ParserError {
    code: string;
    startLine: number;
    startCol: number;
    endLine: number;
    endCol: number;
    startOffset: number;
    endOffset: number;
}

export const BASE_ERROR = {
    startLine: -1,
    startCol: -1,
    startOffset: -1,
    endLine: -1,
    endCol: -1,
    endOffset: -1,
};

interface ClassWithErrorReporting {
    _err(code: string): void;
}

export interface ErrorReportingMixinOptions {
    onParseError: (err: ParserError) => void;
}

export abstract class ErrorReportingMixinBase<Host extends ClassWithErrorReporting> extends Mixin<Host> {
    abstract posTracker: { line: number; col: number; offset: number };
    onParseError: (err: ParserError) => void;

    constructor(host: Host, opts: ErrorReportingMixinOptions) {
        super(host);

        this.onParseError = opts.onParseError;
    }

    _setErrorLocation(err: ParserError) {
        err.startLine = err.endLine = this.posTracker.line;
        err.startCol = err.endCol = this.posTracker.col;
        err.startOffset = err.endOffset = this.posTracker.offset;
    }

    _reportError(code: ERR) {
        const err = { ...BASE_ERROR, code };

        this._setErrorLocation(err);
        this.onParseError(err);
    }

    override _getOverriddenMethods(mxn: ErrorReportingMixinBase<Host>, _originalMethods: Host): Partial<Host> {
        return {
            _err(code: ERR) {
                mxn._reportError(code);
            },
        } as Partial<Host>;
    }
}
