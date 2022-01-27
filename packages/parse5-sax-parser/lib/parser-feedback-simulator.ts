import { Tokenizer, TokenizerOptions, TokenizerMode, TokenHandler } from 'parse5/dist/tokenizer/index.js';
import type { TagToken, CommentToken, DoctypeToken, Location } from 'parse5/dist/common/token.js';
import * as foreignContent from 'parse5/dist/common/foreign-content.js';
import * as unicode from 'parse5/dist/common/unicode.js';
import { TAG_ID as $, TAG_NAMES as TN, NAMESPACES as NS, getTagID } from 'parse5/dist/common/html.js';

//ParserFeedbackSimulator
//Simulates adjustment of the Tokenizer which performed by standard parser during tree construction.
export class ParserFeedbackSimulator implements TokenHandler {
    private namespaceStack: NS[] = [];
    private inForeignContent = false;
    public skipNextNewLine = false;
    public tokenizer: Tokenizer;

    constructor(options: TokenizerOptions, private handler: TokenHandler) {
        this.tokenizer = new Tokenizer(options, this);
        this._enterNamespace(NS.HTML);
    }

    /** @internal */
    onNullCharacterToken(chars: string, location: Location | null): void {
        this.skipNextNewLine = false;

        if (this.inForeignContent) {
            this.handler.onCharacterToken(unicode.REPLACEMENT_CHARACTER, location);
        } else {
            this.handler.onNullCharacterToken(chars, location);
        }
    }

    /** @internal */
    onWhitespaceCharacterToken(chars: string, location: Location | null): void {
        if (this.skipNextNewLine && chars.charCodeAt(0) === unicode.CODE_POINTS.LINE_FEED) {
            this.skipNextNewLine = false;

            if (chars.length === 1) {
                return;
            }

            chars = chars.substr(1);
        }

        this.handler.onWhitespaceCharacterToken(chars, location);
    }

    /** @internal */
    onCharacterToken(chars: string, location: Location | null): void {
        this.skipNextNewLine = false;
        this.handler.onCharacterToken(chars, location);
    }

    /** @internal */
    onCommentToken(token: CommentToken): void {
        this.skipNextNewLine = false;
        this.handler.onCommentToken(token);
    }

    /** @internal */
    onDoctypeToken(token: DoctypeToken): void {
        this.skipNextNewLine = false;
        this.handler.onDoctypeToken(token);
    }

    /** @internal */
    onEofToken(location: Location | null): void {
        this.skipNextNewLine = false;
        this.handler.onEofToken(location);
    }

    //Namespace stack mutations
    private _enterNamespace(namespace: NS): void {
        this.namespaceStack.unshift(namespace);
        this.inForeignContent = namespace !== NS.HTML;
        this.tokenizer.allowCDATA = this.inForeignContent;
    }

    private _leaveCurrentNamespace(): void {
        this.namespaceStack.shift();
        this.inForeignContent = this.namespaceStack[0] !== NS.HTML;
        this.tokenizer.allowCDATA = this.inForeignContent;
    }

    //Token handlers
    private _ensureTokenizerMode(tn: $): void {
        switch (tn) {
            case $.TEXTAREA:
            case $.TITLE: {
                this.tokenizer.state = TokenizerMode.RCDATA;
                break;
            }
            case $.PLAINTEXT: {
                this.tokenizer.state = TokenizerMode.PLAINTEXT;
                break;
            }
            case $.SCRIPT: {
                this.tokenizer.state = TokenizerMode.SCRIPT_DATA;
                break;
            }
            case $.STYLE:
            case $.IFRAME:
            case $.XMP:
            case $.NOEMBED:
            case $.NOFRAMES:
            case $.NOSCRIPT: {
                this.tokenizer.state = TokenizerMode.RAWTEXT;
                break;
            }
            default:
            // Do nothing
        }
    }

    /** @internal */
    onStartTagToken(token: TagToken): void {
        let tn = token.tagID;

        switch (tn) {
            case $.SVG: {
                this._enterNamespace(NS.SVG);
                break;
            }
            case $.MATH: {
                this._enterNamespace(NS.MATHML);
                break;
            }
            default:
            // Do nothing
        }

        if (this.inForeignContent) {
            if (foreignContent.causesExit(token)) {
                this._leaveCurrentNamespace();
            } else {
                const currentNs = this.namespaceStack[0];

                if (currentNs === NS.MATHML) {
                    foreignContent.adjustTokenMathMLAttrs(token);
                } else if (currentNs === NS.SVG) {
                    foreignContent.adjustTokenSVGTagName(token);
                    foreignContent.adjustTokenSVGAttrs(token);
                }

                foreignContent.adjustTokenXMLAttrs(token);

                tn = token.tagID;

                if (!token.selfClosing && foreignContent.isIntegrationPoint(tn, currentNs, token.attrs)) {
                    this._enterNamespace(NS.HTML);
                }
            }
        } else {
            switch (tn) {
                case $.PRE:
                case $.TEXTAREA:
                case $.LISTING: {
                    this.skipNextNewLine = true;
                    break;
                }
                case $.IMAGE: {
                    token.tagName = TN.IMG;
                    token.tagID = $.IMG;
                    break;
                }
                default:
                // Do nothing
            }

            this._ensureTokenizerMode(tn);
        }

        this.handler.onStartTagToken(token);
    }

    /** @internal */
    onEndTagToken(token: TagToken): void {
        let tn = token.tagID;

        if (!this.inForeignContent) {
            const previousNs = this.namespaceStack[1];

            if (previousNs === NS.SVG) {
                const adjustedTagName = foreignContent.SVG_TAG_NAMES_ADJUSTMENT_MAP.get(token.tagName);

                if (adjustedTagName) {
                    tn = getTagID(adjustedTagName);
                }
            }

            //NOTE: check for exit from integration point
            if (foreignContent.isIntegrationPoint(tn, previousNs, token.attrs)) {
                this._leaveCurrentNamespace();
            }
        } else if (
            (tn === $.SVG && this.namespaceStack[0] === NS.SVG) ||
            (tn === $.MATH && this.namespaceStack[0] === NS.MATHML)
        ) {
            this._leaveCurrentNamespace();
        }

        // NOTE: adjust end tag name as well for consistency
        if (this.namespaceStack[0] === NS.SVG) {
            foreignContent.adjustTokenSVGTagName(token);
        }

        this.handler.onEndTagToken(token);
    }
}
