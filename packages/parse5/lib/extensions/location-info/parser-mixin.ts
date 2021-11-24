import { Mixin } from '../../utils/mixin.js';
import { TAG_NAMES as $ } from '../../common/html.js';
import type { TreeAdapterTypeMap, ElementLocation } from '../../tree-adapters/interface';
import type { Parser } from '../../parser/index.js';
import { TokenType, Token } from '../../common/token.js';

export class LocationInfoParserMixin<T extends TreeAdapterTypeMap> extends Mixin<Parser<T>> {
    lastFosterParentingLocation: null | ReturnType<Parser<T>['_findFosterParentingLocation']> = null;
    currentToken: Token | null = null;

    constructor(private parser: Parser<T>) {
        super(parser);
    }

    _setEndLocation(element: T['element'], closingToken: Token) {
        const loc = this.parser.treeAdapter.getNodeSourceCodeLocation(element);

        if (loc && closingToken.location) {
            const ctLoc = closingToken.location;
            const tn = this.parser.treeAdapter.getTagName(element);

            // NOTE: For cases like <p> <p> </p> - First 'p' closes without a closing
            // tag and for cases like <td> <p> </td> - 'p' closes without a closing tag.
            const isClosingEndTag = closingToken.type === TokenType.END_TAG && tn === closingToken.tagName;
            const endLoc: Partial<ElementLocation> = {};
            if (isClosingEndTag) {
                endLoc.endTag = { ...ctLoc };
                endLoc.endLine = ctLoc.endLine;
                endLoc.endCol = ctLoc.endCol;
                endLoc.endOffset = ctLoc.endOffset;
            } else {
                endLoc.endLine = ctLoc.startLine;
                endLoc.endCol = ctLoc.startCol;
                endLoc.endOffset = ctLoc.startOffset;
            }

            this.parser.treeAdapter.updateNodeSourceCodeLocation(element, endLoc);
        }
    }

    override _getOverriddenMethods(mxn: LocationInfoParserMixin<T>, orig: Parser<T>) {
        return {
            _bootstrap(this: Parser<T>, document: T['document'], fragmentContext: T['element'] | null) {
                orig._bootstrap.call(this, document, fragmentContext);

                mxn.lastFosterParentingLocation = null;
                mxn.currentToken = null;

                this.openElements.onItemPop = (element) => mxn._setEndLocation(element, mxn.currentToken!);
            },

            _runParsingLoop(this: Parser<T>, scriptHandler: null | ((scriptElement: T['element']) => void)) {
                orig._runParsingLoop.call(this, scriptHandler);

                // NOTE: generate location info for elements
                // that remains on open element stack
                for (let i = this.openElements.stackTop; i >= 0; i--) {
                    mxn._setEndLocation(this.openElements.items[i], mxn.currentToken!);
                }
            },

            //Token processing
            _processTokenInForeignContent(this: Parser<T>, token: Token) {
                mxn.currentToken = token;
                orig._processTokenInForeignContent.call(this, token);
            },

            _processToken(this: Parser<T>, token: Token) {
                mxn.currentToken = token;
                orig._processToken.call(this, token);

                //NOTE: <body> and <html> are never popped from the stack, so we need to updated
                //their end location explicitly.
                if (
                    token.type === TokenType.END_TAG &&
                    (token.tagName === $.HTML || (token.tagName === $.BODY && this.openElements.hasInScope($.BODY)))
                ) {
                    for (let i = this.openElements.stackTop; i >= 0; i--) {
                        const element = this.openElements.items[i];

                        if (this.treeAdapter.getTagName(element) === token.tagName) {
                            mxn._setEndLocation(element, token);
                            break;
                        }
                    }
                }
            },
        };
    }
}
