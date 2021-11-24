import { Location } from '../../common/token.js';
import { Mixin } from '../../utils/mixin.js';
import type { ERR } from '../../common/error-codes.js';

export interface ParserError extends Location {
    code: string;
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

    _reportError(code: ERR) {
        const { line, col, offset } = this.posTracker;

        this.onParseError({
            code,
            startLine: line,
            endLine: line,
            startCol: col,
            endCol: col,
            startOffset: offset,
            endOffset: offset,
        });
    }

    override _getOverriddenMethods(mxn: ErrorReportingMixinBase<Host>, _originalMethods: Host): Partial<Host> {
        return {
            _err(code: ERR) {
                mxn._reportError(code);
            },
        } as Partial<Host>;
    }
}
