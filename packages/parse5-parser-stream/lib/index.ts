import { Writable } from 'node:stream';
import { Parser } from 'parse5/lib/parser/index.js';
import type { TreeAdapterTypeMap } from 'parse5/lib/tree-adapters/interface';

export class ParserStream<T extends TreeAdapterTypeMap> extends Writable {
    lastChunkWritten = false;
    writeCallback: null | (() => void) = null;
    pausedByScript = false;

    parser: Parser<T>;
    pendingHtmlInsertions: string[] = [];
    document: T['document'];

    constructor(options?: any) {
        super({ decodeStrings: false });

        this.parser = new Parser(options);

        this._resume = this._resume.bind(this);
        this._documentWrite = this._documentWrite.bind(this);
        this._scriptHandler = this._scriptHandler.bind(this);

        this.document = this.parser.treeAdapter.createDocument();
        this.parser._bootstrap(this.document, null);
    }

    //WritableStream implementation
    override _write(chunk: string, _encoding: string, callback: () => void) {
        if (typeof chunk !== 'string') {
            throw new TypeError('Parser can work only with string streams.');
        }

        this.writeCallback = callback;
        this.parser.tokenizer!.write(chunk, this.lastChunkWritten);
        this._runParsingLoop();
    }

    override _final(callback: () => void) {
        this.lastChunkWritten = true;
        this._write('', '', callback);
    }

    //Scriptable parser implementation
    _runParsingLoop() {
        this.parser.runParsingLoopForCurrentChunk(this.writeCallback, this._scriptHandler);
    }

    _resume() {
        if (!this.pausedByScript) {
            throw new Error('Parser was already resumed');
        }

        while (this.pendingHtmlInsertions.length > 0) {
            const html = this.pendingHtmlInsertions.pop()!;

            this.parser.tokenizer!.insertHtmlAtCurrentPos(html);
        }

        this.pausedByScript = false;

        //NOTE: keep parsing if we don't wait for the next input chunk
        if (this.parser.tokenizer!.active) {
            this._runParsingLoop();
        }
    }

    _documentWrite(html: string) {
        if (!this.parser.stopped) {
            this.pendingHtmlInsertions.push(html);
        }
    }

    _scriptHandler(scriptElement: T['element']) {
        if (this.listenerCount('script') > 0) {
            this.pausedByScript = true;
            this.emit('script', scriptElement, this._documentWrite, this._resume);
        } else {
            this._runParsingLoop();
        }
    }
}
