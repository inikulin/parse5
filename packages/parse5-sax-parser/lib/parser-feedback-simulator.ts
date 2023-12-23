import {
    Tokenizer,
    type TokenizerOptions,
    TokenizerMode,
    type TokenHandler,
    Token,
    foreignContent,
    html,
} from 'parse5';

const $ = html.TAG_ID;

const REPLACEMENT_CHARACTER = '\uFFFD';
const LINE_FEED_CODE_POINT = 0x0a;

/**
 * Simulates adjustments of the Tokenizer which are performed by the standard parser during tree construction.
 */
export class ParserFeedbackSimulator implements TokenHandler {
    private namespaceStack: html.NS[] = [];
    public inForeignContent = false;
    public skipNextNewLine = false;
    public tokenizer: Tokenizer;

    constructor(
        options: TokenizerOptions,
        private handler: TokenHandler,
    ) {
        this.tokenizer = new Tokenizer(options, this);
        this._enterNamespace(html.NS.HTML);
    }

    /** @internal */
    onNullCharacter(token: Token.CharacterToken): void {
        this.skipNextNewLine = false;

        if (this.inForeignContent) {
            this.handler.onCharacter({
                type: Token.TokenType.CHARACTER,
                chars: REPLACEMENT_CHARACTER,
                location: token.location,
            });
        } else {
            this.handler.onNullCharacter(token);
        }
    }

    /** @internal */
    onWhitespaceCharacter(token: Token.CharacterToken): void {
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
    onCharacter(token: Token.CharacterToken): void {
        this.skipNextNewLine = false;
        this.handler.onCharacter(token);
    }

    /** @internal */
    onComment(token: Token.CommentToken): void {
        this.skipNextNewLine = false;
        this.handler.onComment(token);
    }

    /** @internal */
    onDoctype(token: Token.DoctypeToken): void {
        this.skipNextNewLine = false;
        this.handler.onDoctype(token);
    }

    /** @internal */
    onEof(token: Token.EOFToken): void {
        this.skipNextNewLine = false;
        this.handler.onEof(token);
    }

    //Namespace stack mutations
    private _enterNamespace(namespace: html.NS): void {
        this.namespaceStack.unshift(namespace);
        this.inForeignContent = namespace !== html.NS.HTML;
        this.tokenizer.inForeignNode = this.inForeignContent;
    }

    private _leaveCurrentNamespace(): void {
        this.namespaceStack.shift();
        this.inForeignContent = this.namespaceStack[0] !== html.NS.HTML;
        this.tokenizer.inForeignNode = this.inForeignContent;
    }

    //Token handlers
    private _ensureTokenizerMode(tn: html.TAG_ID): void {
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
    onStartTag(token: Token.TagToken): void {
        let tn = token.tagID;

        switch (tn) {
            case $.SVG: {
                this._enterNamespace(html.NS.SVG);
                break;
            }
            case $.MATH: {
                this._enterNamespace(html.NS.MATHML);
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

                if (currentNs === html.NS.MATHML) {
                    foreignContent.adjustTokenMathMLAttrs(token);
                } else if (currentNs === html.NS.SVG) {
                    foreignContent.adjustTokenSVGTagName(token);
                    foreignContent.adjustTokenSVGAttrs(token);
                }

                foreignContent.adjustTokenXMLAttrs(token);

                tn = token.tagID;

                if (!token.selfClosing && foreignContent.isIntegrationPoint(tn, currentNs, token.attrs)) {
                    this._enterNamespace(html.NS.HTML);
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
                    token.tagName = html.TAG_NAMES.IMG;
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
    onEndTag(token: Token.TagToken): void {
        let tn = token.tagID;

        if (!this.inForeignContent) {
            const previousNs = this.namespaceStack[1];

            if (previousNs === html.NS.SVG) {
                const adjustedTagName = foreignContent.SVG_TAG_NAMES_ADJUSTMENT_MAP.get(token.tagName);

                if (adjustedTagName) {
                    tn = html.getTagID(adjustedTagName);
                }
            }

            //NOTE: check for exit from integration point
            if (foreignContent.isIntegrationPoint(tn, previousNs, token.attrs)) {
                this._leaveCurrentNamespace();
            }
        } else if (
            (tn === $.SVG && this.namespaceStack[0] === html.NS.SVG) ||
            (tn === $.MATH && this.namespaceStack[0] === html.NS.MATHML)
        ) {
            this._leaveCurrentNamespace();
        }

        // NOTE: adjust end tag name as well for consistency
        if (this.namespaceStack[0] === html.NS.SVG) {
            foreignContent.adjustTokenSVGTagName(token);
        }

        this.handler.onEndTag(token);
    }
}
