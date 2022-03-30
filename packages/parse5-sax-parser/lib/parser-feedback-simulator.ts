import { Tokenizer, TokenizerOptions, TokenizerMode, TokenHandler } from 'parse5/dist/tokenizer/index.js';
import { TokenType, TagToken, CommentToken, DoctypeToken, CharacterToken, EOFToken } from 'parse5/dist/common/token.js';
import * as foreignContent from 'parse5/dist/common/foreign-content.js';
import { TAG_ID as $, TAG_NAMES as TN, NAMESPACES as NS } from 'parse5/dist/common/html.js';

const REPLACEMENT_CHARACTER = '\uFFFD';
const LINE_FEED_CODE_POINT = 0x0a;

/**
 * Simulates adjustments of the Tokenizer which are performed by the standard parser during tree construction.
 */
export class ParserFeedbackSimulator implements TokenHandler {
    private namespaceStack: NS[] = [];
    public inForeignContent = false;
    public skipNextNewLine = false;
    public tokenizer: Tokenizer;

    constructor(options: TokenizerOptions, private handler: TokenHandler) {
        this.tokenizer = new Tokenizer(options, this);
        this._enterNamespace(NS.HTML);
    }

    /** @internal */
    onNullCharacter(token: CharacterToken): void {
        this.skipNextNewLine = false;

        if (this.inForeignContent) {
            this.handler.onCharacter({
                type: TokenType.CHARACTER,
                chars: REPLACEMENT_CHARACTER,
                location: token.location,
            });
        } else {
            this.handler.onNullCharacter(token);
        }
    }

    /** @internal */
    onWhitespaceCharacter(token: CharacterToken): void {
        if (this.skipNextNewLine && token.chars.charCodeAt(0) === LINE_FEED_CODE_POINT) {
            this.skipNextNewLine = false;

            if (token.chars.length === 1) {
                return;
            }

            token.chars = token.chars.substr(1);
        }

        this.handler.onWhitespaceCharacter(token);
    }

    /** @internal */
    onCharacter(token: CharacterToken): void {
        this.skipNextNewLine = false;
        this.handler.onCharacter(token);
    }

    /** @internal */
    onComment(token: CommentToken): void {
        this.skipNextNewLine = false;
        this.handler.onComment(token);
    }

    /** @internal */
    onDoctype(token: DoctypeToken): void {
        this.skipNextNewLine = false;
        this.handler.onDoctype(token);
    }

    /** @internal */
    onEof(token: EOFToken): void {
        this.skipNextNewLine = false;
        this.handler.onEof(token);
    }

    //Namespace stack mutations
    private _enterNamespace(namespace: NS): void {
        this.namespaceStack.unshift(namespace);
        this.inForeignContent = namespace !== NS.HTML;
        this.tokenizer.inForeignNode = this.inForeignContent;
    }

    private _leaveCurrentNamespace(): void {
        this.namespaceStack.shift();
        this.inForeignContent = this.namespaceStack[0] !== NS.HTML;
        this.tokenizer.inForeignNode = this.inForeignContent;
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
    onStartTag(token: TagToken): void {
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

        this.handler.onStartTag(token);
    }

    /** @internal */
    onEndTag(token: TagToken): void {
        let tn = token.tagID;

        const [currentNs, previousNs] = this.namespaceStack;

        // NOTE: adjust end tag name as well for consistency
        if (currentNs === NS.SVG || (!this.inForeignContent && previousNs === NS.SVG)) {
            foreignContent.adjustTokenSVGTagName(token);
            tn = token.tagID;
        }

        if (!this.inForeignContent) {
            //NOTE: check for exit from integration point
            if (foreignContent.isIntegrationPoint(tn, previousNs, token.attrs)) {
                this._leaveCurrentNamespace();
            }
        } else if ((tn === $.SVG && currentNs === NS.SVG) || (tn === $.MATH && currentNs === NS.MATHML)) {
            this._leaveCurrentNamespace();
        }

        this.handler.onEndTag(token);
    }
}
