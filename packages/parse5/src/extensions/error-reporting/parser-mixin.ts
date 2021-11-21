import { ErrorReportingMixinBase, ErrorReportingOptions } from './mixin-base.js';
import { ErrorReportingTokenizerMixin } from './tokenizer-mixin.js';
import { LocationInfoTokenizerMixin } from '../location-info/tokenizer-mixin.js';
import { install as installMixin } from '../../utils/Mixin.js';
import { Token, Location } from '../../tokenizer/index.js';
import { TreeAdapterTypeMap } from '../../treeAdapter.js';
import { Parser } from '../../parser/index.js';

export class ErrorReportingParserMixin<T extends TreeAdapterTypeMap> extends ErrorReportingMixinBase<Parser<T>> {
    protected _currentLocation: Location | null = null;
    protected _locBeforeToken: boolean = false;

    public constructor(parser: Parser<T>, opts?: ErrorReportingOptions) {
        super(parser, opts);
    }

    protected override _setErrorLocation(err: unknown): void {
        if (this._currentLocation) {
            const errAsLoc = err as Location;

            errAsLoc.startLine = this._currentLocation.startLine;
            errAsLoc.startCol = this._currentLocation.startCol;
            errAsLoc.startOffset = this._currentLocation.startOffset;

            errAsLoc.endLine = this._locBeforeToken ? this._currentLocation.startLine : this._currentLocation.endLine;
            errAsLoc.endCol = this._locBeforeToken ? this._currentLocation.startCol : this._currentLocation.endCol;
            errAsLoc.endOffset = this._locBeforeToken
                ? this._currentLocation.startOffset
                : this._currentLocation.endOffset;
        }
    }

    protected override _getOverriddenMethods(orig: Partial<Parser<T>>): Partial<Parser<T>> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const mxn = this;

        return {
            bootstrap(this: Parser<T>, document: T['document'], fragmentContext: T['element']): void {
                if (orig.bootstrap) {
                    orig.bootstrap.call(this, document, fragmentContext);
                }

                if (this.tokenizer) {
                    installMixin(this.tokenizer, ErrorReportingTokenizerMixin, mxn._options);
                    installMixin(this.tokenizer, LocationInfoTokenizerMixin);
                }
            },

            processInputToken(token: Token): void {
                mxn._currentLocation = token.location ?? null;

                if (orig.processInputToken) {
                    orig.processInputToken.call(this, token);
                }
            },

            err(code: unknown, options?: unknown): void {
                mxn._locBeforeToken = (options as undefined | { beforeToken: boolean })?.beforeToken === true;
                mxn._reportError(code);
            },
        };
    }
}
