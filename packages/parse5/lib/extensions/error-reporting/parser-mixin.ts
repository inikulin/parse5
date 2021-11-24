import { ErrorReportingMixinOptions, BASE_ERROR } from './mixin-base.js';
import { ErrorReportingTokenizerMixin } from './tokenizer-mixin.js';
import { Mixin } from '../../utils/mixin.js';
import type { Location, Token } from '../../common/token.js';
import type { Parser } from '../../parser/index.js';
import type { TreeAdapterTypeMap } from '../../tree-adapters/interface.js';
import type { ERR } from '../../common/error-codes.js';

export class ErrorReportingParserMixin<T extends TreeAdapterTypeMap> extends Mixin<Parser<T>> {
    private onParseError: ErrorReportingMixinOptions['onParseError'];
    ctLoc: null | Location = null;
    locBeforeToken = false;

    constructor(parser: Parser<T>, private opts: ErrorReportingMixinOptions) {
        super(parser);
        this.onParseError = opts.onParseError;
    }

    _reportError(code: ERR) {
        const err = { ...BASE_ERROR, code };

        if (this.ctLoc) {
            err.startLine = this.ctLoc.startLine;
            err.startCol = this.ctLoc.startCol;
            err.startOffset = this.ctLoc.startOffset;

            err.endLine = this.locBeforeToken ? this.ctLoc.startLine : this.ctLoc.endLine;
            err.endCol = this.locBeforeToken ? this.ctLoc.startCol : this.ctLoc.endCol;
            err.endOffset = this.locBeforeToken ? this.ctLoc.startOffset : this.ctLoc.endOffset;
        }

        this.onParseError(err);
    }

    override _getOverriddenMethods(mxn: ErrorReportingParserMixin<T>, orig: Parser<T>): Partial<Parser<T>> {
        return {
            _bootstrap(this: Parser<T>, document: T['document'], fragmentContext: T['element'] | null) {
                orig._bootstrap.call(this, document, fragmentContext);

                Mixin.install(this.tokenizer, ErrorReportingTokenizerMixin, mxn.opts);
            },

            _processInputToken(token: Token) {
                mxn.ctLoc = token.location!;

                orig._processInputToken.call(this, token);
            },

            _err(code: ERR, options?: { beforeToken: boolean }) {
                mxn.locBeforeToken = !!options?.beforeToken;
                mxn._reportError(code);
            },
        };
    }
}
