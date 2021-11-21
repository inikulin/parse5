import { Mixin, install as installMixin } from '../../utils/Mixin.js';
import {
    Token,
    StartTagToken,
    CharacterToken,
    DocTypeToken,
    CommentToken,
    StartTagLocation,
    EndTagLocation,
    END_TAG_TOKEN,
} from '../../tokenizer/index.js';
import { LocationInfoTokenizerMixin } from './tokenizer-mixin.js';
import { LocationInfoOpenElementStackMixin, LocationInfoOptions } from './open-element-stack-mixin.js';
import * as HTML from '../../common/html.js';
import { TreeAdapterTypeMap, TreeAdapter } from '../../treeAdapter.js';
import { Parser } from '../../parser/index.js';
import { PositionTrackingPreprocessorMixin } from '../position-tracking/preprocessor-mixin.js';

//Aliases
const $ = HTML.TAG_NAMES;

export class LocationInfoParserMixin<T extends TreeAdapterTypeMap> extends Mixin<Parser<T>> {
    protected _parser: Parser<T>;
    protected _treeAdapter: TreeAdapter<T>;
    protected _posTracker: PositionTrackingPreprocessorMixin | null;
    protected _lastStartTagToken: StartTagToken | null;
    protected _lastFosterParentingLocation: { parent: null | T['element']; beforeElement: null | T['element'] } | null;
    protected _currentToken: Token | null;

    public constructor(parser: Parser<T>) {
        super(parser);

        this._parser = parser;
        this._treeAdapter = this._parser.treeAdapter;
        this._posTracker = null;
        this._lastStartTagToken = null;
        this._lastFosterParentingLocation = null;
        this._currentToken = null;
    }

    protected _setStartLocation(element: T['element']): void {
        let loc: StartTagLocation | null = null;

        if (this._lastStartTagToken?.location) {
            loc = {
                ...this._lastStartTagToken.location,
                startTag: this._lastStartTagToken.location,
            };
        }

        this._treeAdapter.setNodeSourceCodeLocation(element, loc);
    }

    protected _setEndLocation(element: T['element'], closingToken: Token): void {
        const loc = this._treeAdapter.getNodeSourceCodeLocation(element);

        if (loc) {
            if (closingToken.location) {
                const ctLoc = closingToken.location;
                const tn = this._treeAdapter.getTagName(element);

                // NOTE: For cases like <p> <p> </p> - First 'p' closes without a closing
                // tag and for cases like <td> <p> </td> - 'p' closes without a closing tag.
                const isClosingEndTag = closingToken.type === END_TAG_TOKEN && tn === closingToken.tagName;
                let endLoc: EndTagLocation;
                if (isClosingEndTag) {
                    endLoc = {
                        endTag: { ...ctLoc },
                        endLine: ctLoc.endLine,
                        endCol: ctLoc.endCol,
                        endOffset: ctLoc.endOffset,
                    };
                } else {
                    endLoc = {
                        endLine: ctLoc.startLine,
                        endCol: ctLoc.startCol,
                        endOffset: ctLoc.startOffset,
                    };
                }

                this._treeAdapter.updateNodeSourceCodeLocation(element, endLoc);
            }
        }
    }

    protected _getOverriddenMethods(orig: Partial<Parser<T>>): Partial<Parser<T>> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const mxn = this;
        return {
            bootstrap(this: Parser<T>, document: T['document'], fragmentContext?: T['element']): void {
                orig.bootstrap?.call(this, document, fragmentContext);

                mxn._lastStartTagToken = null;
                mxn._lastFosterParentingLocation = null;
                mxn._currentToken = null;

                if (this.tokenizer) {
                    const tokenizerMixin = installMixin(this.tokenizer, LocationInfoTokenizerMixin);

                    mxn._posTracker = tokenizerMixin.posTracker;
                }

                if (this.openElements) {
                    installMixin(this.openElements, LocationInfoOpenElementStackMixin, {
                        onItemPop(element: T['element']) {
                            if (mxn._currentToken) {
                                mxn._setEndLocation(element, mxn._currentToken);
                            }
                        },
                        // TODO (43081j): not sure why we need this cast
                        // it picks it up as having `opts?: unknown` without it,
                        // maybe some generics funkiness
                    } as LocationInfoOptions<T>);
                }
            },

            runParsingLoop(this: Parser<T>, scriptHandler?: (node: T['node']) => void): void {
                orig.runParsingLoop?.call(this, scriptHandler);

                if (this.openElements && mxn._currentToken) {
                    // NOTE: generate location info for elements
                    // that remains on open element stack
                    for (let i = this.openElements.stackTop; i >= 0; i--) {
                        const element = this.openElements.items[i];
                        if (element) {
                            mxn._setEndLocation(element, mxn._currentToken);
                        }
                    }
                }
            },

            //Token processing
            processTokenInForeignContent(this: Parser<T>, token: Token): void {
                mxn._currentToken = token;
                orig.processTokenInForeignContent?.call(this, token);
            },

            processToken(this: Parser<T>, token: Token): void {
                mxn._currentToken = token;
                orig.processToken?.call(this, token);

                //NOTE: <body> and <html> are never popped from the stack, so we need to updated
                //their end location explicitly.
                const requireExplicitUpdate =
                    token.type === END_TAG_TOKEN &&
                    (token.tagName === $.HTML || (token.tagName === $.BODY && this.openElements?.hasInScope($.BODY)));

                if (requireExplicitUpdate && this.openElements) {
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
            setDocumentType(this: Parser<T>, token: DocTypeToken): void {
                orig.setDocumentType?.call(this, token);

                const documentChildren = this.treeAdapter.getChildNodes(this.document);
                const cnLength = documentChildren.length;

                for (let i = 0; i < cnLength; i++) {
                    const node = documentChildren[i];

                    if (this.treeAdapter.isDocumentTypeNode(node)) {
                        this.treeAdapter.setNodeSourceCodeLocation(node, token.location);
                        break;
                    }
                }
            },

            //Elements
            attachElementToTree(this: Parser<T>, element: T['element']): void {
                //NOTE: _attachElementToTree is called from appendElement, insertElement and insertTemplate methods.
                //So we will use token location stored in this methods for the element.
                mxn._setStartLocation(element);
                mxn._lastStartTagToken = null;
                orig.attachElementToTree?.call(this, element);
            },

            appendElement(this: Parser<T>, token: StartTagToken, namespaceURI: string): void {
                mxn._lastStartTagToken = token;
                orig.appendElement?.call(this, token, namespaceURI);
            },

            insertElement(this: Parser<T>, token: StartTagToken, namespaceURI: string): void {
                mxn._lastStartTagToken = token;
                orig.insertElement?.call(this, token, namespaceURI);
            },

            insertTemplate(this: Parser<T>, token: StartTagToken, ns?: string): void {
                mxn._lastStartTagToken = token;
                orig.insertTemplate?.call(this, token, ns);

                if (this.openElements) {
                    const tmplContent = this.treeAdapter.getTemplateContent(this.openElements.current);

                    this.treeAdapter.setNodeSourceCodeLocation(tmplContent, null);
                }
            },

            insertFakeRootElement(this: Parser<T>): void {
                orig.insertFakeRootElement?.call(this);
                if (this.openElements) {
                    this.treeAdapter.setNodeSourceCodeLocation(this.openElements.current, null);
                }
            },

            //Comments
            appendCommentNode(this: Parser<T>, token: CommentToken, parent: T['parentNode']): void {
                orig.appendCommentNode?.call(this, token, parent);

                const children = this.treeAdapter.getChildNodes(parent);
                const commentNode = children[children.length - 1];

                this.treeAdapter.setNodeSourceCodeLocation(commentNode, token.location);
            },

            //Text
            findFosterParentingLocation(this: Parser<T>): {
                parent: null | T['element'];
                beforeElement: null | T['element'];
            } {
                //NOTE: store last foster parenting location, so we will be able to find inserted text
                //in case of foster parenting
                const lastFosterParentingLocation = orig.findFosterParentingLocation?.call(this);
                mxn._lastFosterParentingLocation = lastFosterParentingLocation ?? null;

                return lastFosterParentingLocation ?? { parent: null, beforeElement: null };
            },

            insertCharacters(this: Parser<T>, token: CharacterToken): void {
                orig.insertCharacters?.call(this, token);

                const hasFosterParent = this._shouldFosterParentOnInsertion();

                const parent =
                    (hasFosterParent && mxn._lastFosterParentingLocation?.parent) ||
                    this.openElements?.currentTmplContent ||
                    this.openElements?.current;

                const siblings = this.treeAdapter.getChildNodes(parent);

                const textNodeIdx =
                    hasFosterParent && mxn._lastFosterParentingLocation?.beforeElement
                        ? siblings.indexOf(mxn._lastFosterParentingLocation.beforeElement) - 1
                        : siblings.length - 1;

                const textNode = siblings[textNodeIdx];

                //NOTE: if we have location assigned by another token, then just update end position
                const tnLoc = this.treeAdapter.getNodeSourceCodeLocation(textNode);

                if (tnLoc && token.location) {
                    const { endLine, endCol, endOffset } = token.location;
                    this.treeAdapter.updateNodeSourceCodeLocation(textNode, { endLine, endCol, endOffset });
                } else {
                    this.treeAdapter.setNodeSourceCodeLocation(textNode, token.location);
                }
            },
        };
    }
}
