import { Writable } from 'node:stream';
import { Parser, ParserOptions } from 'parse5/lib/parser/index.js';
import type { TreeAdapterTypeMap } from 'parse5/lib/tree-adapters/interface.js';
import type { DefaultTreeAdapterMap } from 'parse5/lib/tree-adapters/default.js';

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
    private writeCallback: null | (() => void) = null;
    private pausedByScript = false;

    public parser: Parser<T>;
    private pendingHtmlInsertions: string[] = [];
    /** The resulting document node. */
    public document: T['document'];

    constructor(options?: ParserOptions<T>) {
        super({ decodeStrings: false });

        this.parser = new Parser(options);

        this.document = this.parser.treeAdapter.createDocument();
        this.parser._bootstrap(this.document, null);
    }

    //WritableStream implementation
    override _write(chunk: string, _encoding: string, callback: () => void): void {
        if (typeof chunk !== 'string') {
            throw new TypeError('Parser can work only with string streams.');
        }

        this.writeCallback = callback;
        this.parser.tokenizer.write(chunk, this.lastChunkWritten);
        this._runParsingLoop();
    }

    // TODO [engine:node@>=16]: Due to issues with Node < 16, we are overriding `end` instead of `_final`.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    override end(chunk?: any, encoding?: any, callback?: any): void {
        this.lastChunkWritten = true;
        super.end(chunk || '', encoding, callback);
    }

    //Scriptable parser implementation
    private _runParsingLoop(): void {
        this.parser.runParsingLoopForCurrentChunk(this.writeCallback, this._scriptHandler);
    }

    private _resume = (): void => {
        if (!this.pausedByScript) {
            throw new Error('Parser was already resumed');
        }

        while (this.pendingHtmlInsertions.length > 0) {
            const html = this.pendingHtmlInsertions.pop()!;

            this.parser.tokenizer.insertHtmlAtCurrentPos(html);
        }

        this.pausedByScript = false;

        //NOTE: keep parsing if we don't wait for the next input chunk
        if (this.parser.tokenizer.active) {
            this._runParsingLoop();
        }
    };

    private _documentWrite = (html: string): void => {
        if (!this.parser.stopped) {
            this.pendingHtmlInsertions.push(html);
        }
    };

    private _scriptHandler = (scriptElement: T['element']): void => {
        if (this.listenerCount('script') > 0) {
            this.pausedByScript = true;
            this.emit('script', scriptElement, this._documentWrite, this._resume);
        } else {
            this._runParsingLoop();
        }
    };
}
