import { CommentToken, DoctypeToken, CharacterToken } from '../../common/token';
import { Mixin } from '../../utils/mixin.js';
import { Tokenizer } from '../../tokenizer/index.js';
import { LocationInfoTokenizerMixin } from './tokenizer-mixin.js';
import { TAG_NAMES as $, NAMESPACES as NS } from '../../common/html.js';
import type { TreeAdapter, TreeAdapterTypeMap, ElementLocation } from '../../tree-adapters/interface';
import type { Parser } from '../../parser/index.js';
import type { PositionTrackingPreprocessorMixin } from '../position-tracking/preprocessor-mixin';
import type { Token, TagToken } from '../../common/token.js';

export class LocationInfoParserMixin<T extends TreeAdapterTypeMap> extends Mixin<Parser<T>> {
    treeAdapter: TreeAdapter<T>;
    posTracker: PositionTrackingPreprocessorMixin | null = null;
    lastStartTagToken: null | TagToken = null;
    lastFosterParentingLocation: null | ReturnType<Parser<T>['_findFosterParentingLocation']> = null;
    currentToken: Token | null = null;

    constructor(parser: Parser<T>) {
        super(parser);

        this.treeAdapter = parser.treeAdapter;
    }

    _setStartLocation(element: T['element']) {
        let loc = null;

        if (this.lastStartTagToken) {
            loc = {
                ...this.lastStartTagToken.location!,
                startTag: this.lastStartTagToken.location,
            };
        }

        this.treeAdapter.setNodeSourceCodeLocation(element, loc);
    }

    _setEndLocation(element: T['element'], closingToken: Token) {
        const loc = this.treeAdapter.getNodeSourceCodeLocation(element);

        if (loc && closingToken.location) {
            const ctLoc = closingToken.location;
            const tn = this.treeAdapter.getTagName(element);

            // NOTE: For cases like <p> <p> </p> - First 'p' closes without a closing
            // tag and for cases like <td> <p> </td> - 'p' closes without a closing tag.
            const isClosingEndTag = closingToken.type === Tokenizer.END_TAG_TOKEN && tn === closingToken.tagName;
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

            this.treeAdapter.updateNodeSourceCodeLocation(element, endLoc);
        }
    }

    override _getOverriddenMethods(mxn: LocationInfoParserMixin<T>, orig: Parser<T>) {
        return {
            _bootstrap(this: Parser<T>, document: T['document'], fragmentContext: T['element'] | null) {
                orig._bootstrap.call(this, document, fragmentContext);

                mxn.lastStartTagToken = null;
                mxn.lastFosterParentingLocation = null;
                mxn.currentToken = null;

                const tokenizerMixin = Mixin.install(this.tokenizer, LocationInfoTokenizerMixin);

                mxn.posTracker = tokenizerMixin.posTracker;
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
                const requireExplicitUpdate =
                    token.type === Tokenizer.END_TAG_TOKEN &&
                    (token.tagName === $.HTML || (token.tagName === $.BODY && this.openElements.hasInScope($.BODY)));

                if (requireExplicitUpdate) {
                    for (let i = this.openElements.stackTop; i >= 0; i--) {
                        const element = this.openElements.items[i];

                        if (this.treeAdapter.getTagName(element) === token.tagName) {
                            mxn._setEndLocation(element, token);
                            break;
                        }
                    }
                }
            },

            //Doctype
            _setDocumentType(this: Parser<T>, token: DoctypeToken) {
                orig._setDocumentType.call(this, token);

                const documentChildren = this.treeAdapter.getChildNodes(this.document);
                const docTypeNode = documentChildren.find((node) => this.treeAdapter.isDocumentTypeNode(node));

                if (docTypeNode) {
                    this.treeAdapter.setNodeSourceCodeLocation(docTypeNode, token.location!);
                }
            },

            //Elements
            _attachElementToTree(this: Parser<T>, element: T['element']) {
                //NOTE: _attachElementToTree is called from _appendElement, _insertElement and _insertTemplate methods.
                //So we will use token location stored in this methods for the element.
                mxn._setStartLocation(element);
                mxn.lastStartTagToken = null;
                orig._attachElementToTree.call(this, element);
            },

            _appendElement(this: Parser<T>, token: TagToken, namespaceURI: NS) {
                mxn.lastStartTagToken = token;
                orig._appendElement.call(this, token, namespaceURI);
            },

            _insertElement(this: Parser<T>, token: TagToken, namespaceURI: NS) {
                mxn.lastStartTagToken = token;
                orig._insertElement.call(this, token, namespaceURI);
            },

            _insertTemplate(this: Parser<T>, token: TagToken) {
                mxn.lastStartTagToken = token;
                orig._insertTemplate.call(this, token);

                const tmplContent = this.treeAdapter.getTemplateContent(this.openElements.current);

                this.treeAdapter.setNodeSourceCodeLocation(tmplContent, null);
            },

            _insertFakeRootElement(this: Parser<T>) {
                orig._insertFakeRootElement.call(this);
                this.treeAdapter.setNodeSourceCodeLocation(this.openElements.current, null);
            },

            //Comments
            _appendCommentNode(this: Parser<T>, token: CommentToken, parent: T['parentNode']) {
                orig._appendCommentNode.call(this, token, parent);

                const children = this.treeAdapter.getChildNodes(parent);
                const commentNode = children[children.length - 1];

                this.treeAdapter.setNodeSourceCodeLocation(commentNode, token.location!);
            },

            //Text
            _findFosterParentingLocation(this: Parser<T>) {
                //NOTE: store last foster parenting location, so we will be able to find inserted text
                //in case of foster parenting
                mxn.lastFosterParentingLocation = orig._findFosterParentingLocation.call(this);

                return mxn.lastFosterParentingLocation;
            },

            _insertCharacters(this: Parser<T>, token: CharacterToken) {
                orig._insertCharacters.call(this, token);

                const hasFosterParent = this._shouldFosterParentOnInsertion();

                const parent =
                    (hasFosterParent && mxn.lastFosterParentingLocation!.parent) ||
                    this.openElements.currentTmplContent ||
                    this.openElements.current;

                const siblings = this.treeAdapter.getChildNodes(parent);

                const textNodeIdx =
                    hasFosterParent && mxn.lastFosterParentingLocation!.beforeElement
                        ? siblings.indexOf(mxn.lastFosterParentingLocation!.beforeElement) - 1
                        : siblings.length - 1;

                const textNode = siblings[textNodeIdx];

                //NOTE: if we have location assigned by another token, then just update end position
                const tnLoc = this.treeAdapter.getNodeSourceCodeLocation(textNode);

                if (tnLoc) {
                    const { endLine, endCol, endOffset } = token.location!;
                    this.treeAdapter.updateNodeSourceCodeLocation(textNode, { endLine, endCol, endOffset });
                } else {
                    this.treeAdapter.setNodeSourceCodeLocation(textNode, token.location!);
                }
            },
        };
    }
}
