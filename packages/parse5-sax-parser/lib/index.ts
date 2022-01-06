import { Transform } from 'node:stream';
import { Tokenizer } from 'parse5/dist/tokenizer/index.js';
import {
    TokenType,
    Token,
    CharacterToken,
    TagToken,
    DoctypeToken,
    CommentToken,
    Attribute,
    Location,
} from 'parse5/dist/common/token.js';
import { DevNullStream } from './dev-null-stream.js';
import { ParserFeedbackSimulator } from './parser-feedback-simulator.js';

export interface SAXParserOptions {
    /**
     * Enables source code location information for the tokens.
     * When enabled, each token will have `sourceCodeLocation` property.
     */
    sourceCodeLocationInfo?: boolean;
}

/**
 * Streaming [SAX](https://en.wikipedia.org/wiki/Simple_API_for_XML)-style HTML parser.
 * A [transform stream](https://nodejs.org/api/stream.html#stream_class_stream_transform) (which means you can pipe _through_ it, see example).
 *
 * @example
 *
 * ```js
 *     const SAXParser = require('parse5-sax-parser');
 *     const http = require('http');
 *     const fs = require('fs');
 *
 *     const file = fs.createWriteStream('/home/google.com.html');
 *     const parser = new SAXParser();
 *
 *     parser.on('text', text => {
 *        // Handle page text content
 *        ...
 *     });
 *
 *     http.get('http://google.com', res => {
 *        // SAXParser is the Transform stream, which means you can pipe
 *        // through it. So, you can analyze page content and, e.g., save it
 *        // to the file at the same time:
 *        res.pipe(parser).pipe(file);
 *     });
 * ```
 */
export class SAXParser extends Transform {
    protected options: SAXParserOptions;
    protected tokenizer: Tokenizer;
    protected parserFeedbackSimulator: ParserFeedbackSimulator;
    private pendingText: CharacterToken | null = null;
    private lastChunkWritten = false;
    private stopped = false;

    /**
     * @param options Parsing options.
     */
    constructor(options: SAXParserOptions = {}) {
        super({ encoding: 'utf8', decodeStrings: false });

        this.options = {
            sourceCodeLocationInfo: false,
            ...options,
        };

        this.tokenizer = new Tokenizer(this.options);
        this.parserFeedbackSimulator = new ParserFeedbackSimulator(this.tokenizer);

        // NOTE: always pipe stream to the /dev/null stream to avoid
        // `highWaterMark` hit even if we don't have consumers.
        // (see: https://github.com/inikulin/parse5/issues/97#issuecomment-171940774)
        this.pipe(new DevNullStream());
    }

    //TransformStream implementation
    override _transform(
        chunk: string,
        _encoding: string,
        callback: (error?: Error | null, data?: string) => void
    ): void {
        if (typeof chunk !== 'string') {
            throw new TypeError('Parser can work only with string streams.');
        }

        callback(null, this._transformChunk(chunk));
    }

    override _final(callback: (error?: Error | null, data?: string) => void): void {
        this.lastChunkWritten = true;
        callback(null, this._transformChunk(''));
    }

    /**
     * Stops parsing. Useful if you want the parser to stop consuming CPU time
     * once you've obtained the desired info from the input stream. Doesn't
     * prevent piping, so that data will flow through the parser as usual.
     *
     * @example
     *
     * ```js
     * const SAXParser = require('parse5-sax-parser');
     * const http = require('http');
     * const fs = require('fs');
     *
     * const file = fs.createWriteStream('google.com.html');
     * const parser = new SAXParser();
     *
     * parser.on('doctype', ({ name, publicId, systemId }) => {
     *     // Process doctype info and stop parsing
     *     ...
     *     parser.stop();
     * });
     *
     * http.get('http://google.com', res => {
     *     // Despite the fact that parser.stop() was called whole
     *     // content of the page will be written to the file
     *     res.pipe(parser).pipe(file);
     * });
     * ```
     */
    public stop(): void {
        this.stopped = true;
    }

    //Internals
    protected _transformChunk(chunk: string): string {
        if (!this.stopped) {
            this.tokenizer.write(chunk, this.lastChunkWritten);
            this._runParsingLoop();
        }
        return chunk;
    }

    private _runParsingLoop(): void {
        let token = null;

        do {
            token = this.parserFeedbackSimulator.getNextToken();

            if (token.type === TokenType.HIBERNATION) {
                break;
            }

            if (
                token.type === TokenType.CHARACTER ||
                token.type === TokenType.WHITESPACE_CHARACTER ||
                token.type === TokenType.NULL_CHARACTER
            ) {
                if (this.pendingText === null) {
                    token.type = TokenType.CHARACTER;
                    this.pendingText = token;
                } else {
                    this.pendingText.chars += token.chars;

                    if (token.location && this.pendingText.location) {
                        const { endLine, endCol, endOffset } = token.location;
                        this.pendingText.location = {
                            ...this.pendingText.location,
                            endLine,
                            endCol,
                            endOffset,
                        };
                    }
                }
            } else {
                this._emitPendingText();
                this._handleToken(token);
            }
        } while (!this.stopped && token.type !== TokenType.EOF);
    }

    protected _handleToken(token: Token): boolean {
        if (token.type === TokenType.EOF) {
            return true;
        }

        const { eventName, reshapeToken } = TOKEN_EMISSION_HELPERS[token.type];

        if (this.listenerCount(eventName) === 0) {
            return false;
        }

        this._emitToken(eventName, reshapeToken(token as any));

        return true;
    }

    protected _emitToken(eventName: string, token: SaxToken): void {
        this.emit(eventName, token);
    }

    private _emitPendingText(): void {
        if (this.pendingText !== null) {
            this._handleToken(this.pendingText);
            this.pendingText = null;
        }
    }
}

export interface SaxToken {
    /** Source code location info. Available if location info is enabled via {@link SAXParserOptions}. */
    sourceCodeLocation?: Location | null;
}

export interface StartTag extends SaxToken {
    /** Tag name */
    tagName: string;
    /** List of attributes */
    attrs: Attribute[];
    /** Indicates if the tag is self-closing */
    selfClosing: boolean;
}

export interface EndTag extends SaxToken {
    /** Tag name */
    tagName: string;
}

export interface Text extends SaxToken {
    /** Text content. */
    text: string;
}

export interface Comment extends SaxToken {
    /** Comment text. */
    text: string;
}

export interface Doctype extends SaxToken {
    /** Document type name. */
    name: string | null;
    /** Document type public identifier. */
    publicId: string | null;
    /** Document type system identifier. */
    systemId: string | null;
}

const TEXT_EMISSION_HELPER = {
    eventName: 'text',
    reshapeToken: (origToken: CharacterToken): Text => ({
        text: origToken.chars,
        sourceCodeLocation: origToken.location,
    }),
};

const TOKEN_EMISSION_HELPERS = {
    [TokenType.START_TAG]: {
        eventName: 'startTag',
        reshapeToken: (origToken: TagToken): StartTag => ({
            tagName: origToken.tagName,
            attrs: origToken.attrs,
            selfClosing: origToken.selfClosing,
            sourceCodeLocation: origToken.location,
        }),
    },
    [TokenType.END_TAG]: {
        eventName: 'endTag',
        reshapeToken: (origToken: TagToken): EndTag => ({
            tagName: origToken.tagName,
            sourceCodeLocation: origToken.location,
        }),
    },
    [TokenType.COMMENT]: {
        eventName: 'comment',
        reshapeToken: (origToken: CommentToken): Comment => ({
            text: origToken.data,
            sourceCodeLocation: origToken.location,
        }),
    },
    [TokenType.DOCTYPE]: {
        eventName: 'doctype',
        reshapeToken: (origToken: DoctypeToken): Doctype => ({
            name: origToken.name,
            publicId: origToken.publicId,
            systemId: origToken.systemId,
            sourceCodeLocation: origToken.location,
        }),
    },
    [TokenType.CHARACTER]: TEXT_EMISSION_HELPER,
    [TokenType.NULL_CHARACTER]: TEXT_EMISSION_HELPER,
    [TokenType.WHITESPACE_CHARACTER]: TEXT_EMISSION_HELPER,
    [TokenType.HIBERNATION]: {
        eventName: 'hibernation',
        reshapeToken: (): Record<string, never> => ({}),
    },
};
