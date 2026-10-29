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
    /** The name of the tag that opened each namespace frame, lowercase as in end tags; its end tag closes the frame. */
    private frameTags: string[] = [];
    /**
     * Above 0 while the current node is the element that opened the last frame; each further count is a frame below
     * whose element is the parent of the next frame's, so the current node stays known as the frames close.
     */
    private directFrames = 0;
    public inForeignContent = false;
    public skipNextNewLine = false;
    public tokenizer: Tokenizer;

    constructor(
        options: TokenizerOptions,
        private handler: TokenHandler,
    ) {
        this.tokenizer = new Tokenizer(options, this);
        this._enterNamespace(html.NS.HTML, '');
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
        const { skipNextNewLine } = this;
        this.skipNextNewLine = false;
        if (skipNextNewLine && token.chars.charCodeAt(0) === LINE_FEED_CODE_POINT) {
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
    private _enterNamespace(namespace: html.NS, tagName: string): void {
        this.namespaceStack.push(namespace);
        this.frameTags.push(tagName);
        this.directFrames++;
        this.inForeignContent = namespace !== html.NS.HTML;
        this.tokenizer.inForeignNode = this.inForeignContent;
    }

    private _leaveCurrentNamespace(): void {
        this.namespaceStack.pop();
        this.frameTags.pop();
        if (this.directFrames > 0) this.directFrames--;
        this.inForeignContent = this.namespaceStack[this.namespaceStack.length - 1] !== html.NS.HTML;
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
        const frames = this.namespaceStack.length;
        const ns = this.namespaceStack[frames - 1];

        switch (tn) {
            case $.SVG:
            case $.MATH: {
                const target = tn === $.SVG ? html.NS.SVG : html.NS.MATHML;

                // Foreign content keeps these in its namespace, except svg in annotation-xml. Unless the current node is
                // the frame's element, it may be annotation-xml or outside the frame: switch, as a guess nothing builds on.
                if (ns === html.NS.HTML || ns === target) {
                    this._enterNamespace(target, token.tagName);
                } else if (this.directFrames === 0) {
                    this._enterNamespace(target, token.tagName);
                    this.directFrames = 0;
                }
                break;
            }
            case $.MGLYPH:
            case $.MALIGNMARK: {
                // A MathML text integration point keeps these children in MathML.
                if (
                    this.directFrames > 0 &&
                    this.namespaceStack[frames - 2] === html.NS.MATHML &&
                    foreignContent.isIntegrationPoint(
                        html.getTagID(this.frameTags[frames - 1]),
                        html.NS.MATHML,
                        [],
                        html.NS.MATHML,
                    )
                ) {
                    this._enterNamespace(html.NS.MATHML, token.tagName);
                }
                break;
            }
            default:
            // Do nothing
        }

        if (this.inForeignContent) {
            if (foreignContent.causesExit(token)) {
                // Tree construction pops foreign elements up to an HTML element or integration point.
                while (this.inForeignContent) this._leaveCurrentNamespace();
                this.directFrames = 0;
            } else {
                const { tagName } = token;
                const currentNs = this.namespaceStack[this.namespaceStack.length - 1];

                if (currentNs === html.NS.MATHML) {
                    foreignContent.adjustTokenMathMLAttrs(token);
                } else if (currentNs === html.NS.SVG) {
                    foreignContent.adjustTokenSVGTagName(token);
                    foreignContent.adjustTokenSVGAttrs(token);
                }

                foreignContent.adjustTokenXMLAttrs(token);

                tn = token.tagID;

                // Unless the switch above opened a frame for it, the element is an integration point or a new current node.
                if (!token.selfClosing && this.namespaceStack.length === frames) {
                    if (foreignContent.isIntegrationPoint(tn, currentNs, token.attrs)) {
                        this._enterNamespace(html.NS.HTML, tagName);
                    } else {
                        this.directFrames = 0;
                    }
                }
            }
        } else {
            // An HTML element named like the integration point closes before it does, so it gets a frame of its own.
            if (token.tagName === this.frameTags[frames - 1]) {
                this._enterNamespace(html.NS.HTML, token.tagName);
            } else {
                this.directFrames = 0;
            }

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

        // Tree construction pops a self-closing foreign element at once, so a frame it opened ends with the tag.
        if (token.selfClosing && this.inForeignContent && this.namespaceStack.length > frames) {
            this._leaveCurrentNamespace();
        }

        this.handler.onStartTag(token);
    }

    /** @internal */
    onEndTag(token: Token.TagToken): void {
        const tn = token.tagID;
        const frames = this.frameTags.length;

        if (!this.inForeignContent) {
            // Leaving an integration point: only the end tag of the element that opened the HTML frame closes it.
            if (token.tagName === this.frameTags[frames - 1]) {
                this._leaveCurrentNamespace();
            } else {
                this.directFrames = 0;
            }
        } else if (tn === $.P || tn === $.BR) {
            // These end tags leave foreign content, as the start tags of `causesExit` do.
            while (this.inForeignContent) this._leaveCurrentNamespace();
        } else {
            // The frame's own end tag closes it; an mglyph or malignmark frame sits directly in its text integration
            // point, a MathML element, so the end tags of that element and of the next frame's below close it too.
            const tag = this.frameTags[frames - 1];
            const last = tag === html.TAG_NAMES.MGLYPH || tag === html.TAG_NAMES.MALIGNMARK ? frames - 3 : frames - 1;
            let i = frames - 1;

            while (i >= last && token.tagName !== this.frameTags[i]) i--;

            if (i >= last) {
                while (this.frameTags.length > i) this._leaveCurrentNamespace();
            } else {
                this.directFrames = 0;
            }
        }

        // NOTE: adjust end tag name as well for consistency
        if (this.namespaceStack[this.namespaceStack.length - 1] === html.NS.SVG) {
            foreignContent.adjustTokenSVGTagName(token);
        }

        this.handler.onEndTag(token);
    }
}
