import { Writable } from 'node:stream';
import { Parser, ParserOptions } from 'parse5/dist/parser/index.js';
import type { TreeAdapterTypeMap } from 'parse5/dist/tree-adapters/interface.js';
import type { DefaultTreeAdapterMap } from 'parse5/dist/tree-adapters/default.js';

/* eslint-disable unicorn/consistent-function-scoping -- The rule seems to be broken here. */

/**
 * Streaming HTML parser with scripting support.
 * A [writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).
 *
 * @example
 *
 * ```js
 * const ParserStream = require('parse5-parser-stream');
 * const http = require('http');
 *
 * // Fetch the page content and obtain it's <head> node
 * http.get('http://inikulin.github.io/parse5/', res => {
 *     const parser = new ParserStream();
 *
 *     parser.once('finish', () => {
 *         console.log(parser.document.childNodes[1].childNodes[0].tagName); //> 'head'
 *     });
 *
 *     res.pipe(parser);
 * });
 * ```
 *
 */
export class ParserStream<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap> extends Writable {
    private lastChunkWritten = false;
    private writeCallback: undefined | (() => void) = undefined;

    public parser: Parser<T>;
    private pendingHtmlInsertions: string[] = [];
    /** The resulting document node. */
    public document: T['document'];

    /**
     * @param options Parsing options.
     */
    constructor(options?: ParserOptions<T>) {
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

        this.parser = new Parser(options, undefined, undefined, scriptHandler);
        this.document = this.parser.document;
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
        handler: (scriptElement: T['element'], documentWrite: (html: string) => void, resume: () => void) => void
    ): void;
    /**
     * Base event handler.
     *
     * @param event Name of the event
     * @param handler Event handler
     */
    on(event: string, handler: (...args: any[]) => void): this;
}
