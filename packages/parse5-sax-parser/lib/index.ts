import { Transform } from 'node:stream';
import type { Tokenizer, TokenHandler, Token } from 'parse5';
import { DevNullStream } from './dev-null-stream.js';
import { ParserFeedbackSimulator } from './parser-feedback-simulator.js';

export interface SAXParserOptions {
    /**
     * Enables source code location information for tokens.
     *
     * When enabled, each token will have a `sourceCodeLocation` property.
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
 *        // `SAXParser` is the `Transform` stream, which means you can pipe
 *        // through it. So, you can analyze the page content and, e.g., save it
 *        // to the file at the same time:
 *        res.pipe(parser).pipe(file);
 *     });
 * ```
 */
export class SAXParser extends Transform implements TokenHandler {
    protected options: SAXParserOptions;
    /** @internal */
    protected parserFeedbackSimulator: ParserFeedbackSimulator;
    private pendingText: Text | null = null;
    private lastChunkWritten = false;
    private stopped = false;
    protected tokenizer: Tokenizer;

    /**
     * @param options Parsing options.
     */
    constructor(options: SAXParserOptions = {}) {
        super({ encoding: 'utf8', decodeStrings: false });

        this.options = {
            sourceCodeLocationInfo: false,
            ...options,
        };

        this.parserFeedbackSimulator = new ParserFeedbackSimulator(this.options, this);
        this.tokenizer = this.parserFeedbackSimulator.tokenizer;

        // NOTE: always pipe the stream to the /dev/null stream to avoid
        // the `highWaterMark` to be hit even if we don't have consumers.
        // (see: https://github.com/inikulin/parse5/issues/97#issuecomment-171940774)
        this.pipe(new DevNullStream());
    }

    //`Transform` implementation
    override _transform(
        chunk: string,
        _encoding: string,
        callback: (error?: Error | null, data?: string) => void,
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
        this.tokenizer.pause();
    }

    //Internals
    protected _transformChunk(chunk: string): string {
        if (!this.stopped) {
            this.tokenizer.write(chunk, this.lastChunkWritten);
        }
        return chunk;
    }

    /** @internal */
    onCharacter({ chars, location }: Token.CharacterToken): void {
        if (this.pendingText === null) {
            this.pendingText = { text: chars, sourceCodeLocation: location };
        } else {
            this.pendingText.text += chars;

            if (location && this.pendingText.sourceCodeLocation) {
                const { endLine, endCol, endOffset } = location;
                this.pendingText.sourceCodeLocation = {
                    ...this.pendingText.sourceCodeLocation,
                    endLine,
                    endCol,
                    endOffset,
                };
            }
        }

        if (this.tokenizer.preprocessor.willDropParsedChunk()) {
            this._emitPendingText();
        }
    }

    /** @internal */
    onWhitespaceCharacter(token: Token.CharacterToken): void {
        this.onCharacter(token);
    }

    /** @internal */
    onNullCharacter(token: Token.CharacterToken): void {
        this.onCharacter(token);
    }

    /** @internal */
    onEof(): void {
        this._emitPendingText();
        this.stopped = true;
    }

    /** @internal */
    onStartTag(token: Token.TagToken): void {
        this._emitPendingText();

        const startTag: StartTag = {
            tagName: token.tagName,
            attrs: token.attrs,
            selfClosing: token.selfClosing,
            sourceCodeLocation: token.location,
        };
        this.emitIfListenerExists('startTag', startTag);
    }

    /** @internal */
    onEndTag(token: Token.TagToken): void {
        this._emitPendingText();

        const endTag: EndTag = {
            tagName: token.tagName,
            sourceCodeLocation: token.location,
        };
        this.emitIfListenerExists('endTag', endTag);
    }

    /** @internal */
    onDoctype(token: Token.DoctypeToken): void {
        this._emitPendingText();

        const doctype: Doctype = {
            name: token.name,
            publicId: token.publicId,
            systemId: token.systemId,
            sourceCodeLocation: token.location,
        };
        this.emitIfListenerExists('doctype', doctype);
    }

    /** @internal */
    onComment(token: Token.CommentToken): void {
        this._emitPendingText();

        const comment: Comment = {
            text: token.data,
            sourceCodeLocation: token.location,
        };
        this.emitIfListenerExists('comment', comment);
    }

    protected emitIfListenerExists(eventName: string, token: SaxToken): boolean {
        if (this.listenerCount(eventName) === 0) {
            return false;
        }

        this._emitToken(eventName, token);

        return true;
    }

    protected _emitToken(eventName: string, token: SaxToken): void {
        this.emit(eventName, token);
    }

    private _emitPendingText(): void {
        if (this.pendingText !== null) {
            this.emitIfListenerExists('text', this.pendingText);
            this.pendingText = null;
        }
    }
}

export interface SaxToken {
    /** Source code location info. Available if location info is enabled via {@link SAXParserOptions}. */
    sourceCodeLocation?: Token.Location | null;
}

export interface StartTag extends SaxToken {
    /** Tag name */
    tagName: string;
    /** List of attributes */
    attrs: Token.Attribute[];
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

export interface SAXParser {
    /** Raised when the parser encounters a start tag. */
    on(event: 'startTag', listener: (startTag: StartTag) => void): this;
    /** Raised when the parser encounters an end tag. */
    on(event: 'endTag', listener: (endTag: EndTag) => void): this;
    /** Raised when the parser encounters a comment. */
    on(event: 'comment', listener: (comment: Comment) => void): this;
    /** Raised when the parser encounters text content. */
    on(event: 'text', listener: (text: Text) => void): this;
    /** Raised when the parser encounters a [document type declaration](https://en.wikipedia.org/wiki/Document_type_declaration) */
    on(event: 'doctype', listener: (doctype: Doctype) => void): this;
    /**
     * Base event handler.
     *
     * @param event Name of the event
     * @param handler Event handler
     */
    on(event: string, handler: (...args: any[]) => void): this;
}
