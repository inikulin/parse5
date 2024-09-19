import { Writable } from 'node:stream';
import { Parser, type ParserOptions, type TreeAdapterTypeMap, type DefaultTreeAdapterMap } from 'parse5';

/**
 * Streaming HTML parser with scripting support.
 * A [writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).
 *
 * @example
 *
 * ```js
 * const ParserStream = require('parse5-parser-stream');
 * const http = require('http');
 * const { finished } = require('node:stream');
 *
 * // Fetch the page content and obtain it's <head> node
 * http.get('http://inikulin.github.io/parse5/', res => {
 *     const parser = new ParserStream();
 *
 *     finished(parser, () => {
 *         console.log(parser.document.childNodes[1].childNodes[0].tagName); //> 'head'
 *     });
 *
 *     res.pipe(parser);
 * });
 * ```
 *
 */
export class ParserStream<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap> extends Writable {
    static getFragmentStream<T extends TreeAdapterTypeMap>(
        fragmentContext?: T['parentNode'] | null,
        options?: ParserOptions<T>,
    ): ParserStream<T> {
        const parser = Parser.getFragmentParser(fragmentContext, options);
        const stream = new ParserStream(options, parser);
        return stream;
    }

    private lastChunkWritten = false;
    private writeCallback: undefined | (() => void) = undefined;

    private pendingHtmlInsertions: string[] = [];
    /** The resulting document node. */
    public get document(): T['document'] {
        return this.parser.document;
    }
    public getFragment(): T['documentFragment'] {
        return this.parser.getFragment();
    }

    /**
     * @param options Parsing options.
     */
    constructor(
        options?: ParserOptions<T>,
        public parser: Parser<T> = new Parser(options),
    ) {
        super({ decodeStrings: false });

        const resume = (): void => {
            for (let i = this.pendingHtmlInsertions.length - 1; i >= 0; i--) {
                this.parser.tokenizer.insertHtmlAtCurrentPos(this.pendingHtmlInsertions[i]);
            }

            this.pendingHtmlInsertions.length = 0;

            //NOTE: keep parsing if we don't wait for the next input chunk
            this.parser.tokenizer.resume(this.writeCallback);
        };

        const documentWrite = (html: string): void => {
            if (!this.parser.stopped) {
                this.pendingHtmlInsertions.push(html);
            }
        };

        const scriptHandler = (scriptElement: T['element']): void => {
            if (this.listenerCount('script') > 0) {
                this.parser.tokenizer.pause();
                this.emit('script', scriptElement, documentWrite, resume);
            }
        };

        this.parser.scriptHandler = scriptHandler;
    }

    //WritableStream implementation
    override _write(chunk: string, _encoding: string, callback: () => void): void {
        if (typeof chunk !== 'string') {
            throw new TypeError('Parser can work only with string streams.');
        }

        this.writeCallback = callback;
        this.parser.tokenizer.write(chunk, this.lastChunkWritten, this.writeCallback);
    }

    // TODO [engine:node@>=16]: Due to issues with Node < 16, we are overriding `end` instead of `_final`.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    override end(chunk?: any, encoding?: any, callback?: any): any {
        this.lastChunkWritten = true;
        super.end(chunk || '', encoding, callback);
    }
}

export interface ParserStream<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap> {
    /**
     * Raised when parser encounters a `<script>` element. If this event has listeners, parsing will be suspended once
     * it is emitted. So, if `<script>` has the `src` attribute, you can fetch it, execute and then resume parsing just
     * like browsers do.
     *
     * @example
     *
     * ```js
     * const ParserStream = require('parse5-parser-stream');
     * const http = require('http');
     *
     * const parser = new ParserStream();
     *
     * parser.on('script', (scriptElement, documentWrite, resume) => {
     *     const src = scriptElement.attrs.find(({ name }) => name === 'src').value;
     *
     *     http.get(src, res => {
     *         // Fetch the script content, execute it with DOM built around `parser.document` and
     *         // `document.write` implemented using `documentWrite`.
     *         ...
     *         // Then resume parsing.
     *         resume();
     *     });
     * });
     *
     * parser.end('<script src="example.com/script.js"></script>');
     * ```
     *
     * @param event Name of the event
     * @param handler
     */
    on(
        event: 'script',
        handler: (scriptElement: T['element'], documentWrite: (html: string) => void, resume: () => void) => void,
    ): void;
    /**
     * Base event handler.
     *
     * @param event Name of the event
     * @param handler Event handler
     */
    on(event: string, handler: (...args: any[]) => void): this;
}
