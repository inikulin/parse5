'use strict';

const { Writable } = require('stream');
const Parser = require('parse5/lib/parser');

class ParserStream extends Writable {
    constructor(options) {
        super({ decodeStrings: false });

        this.parser = new Parser(options);

        this.lastChunkWritten = false;
        this.writeCallback = null;
        this.pausedByScript = false;

        this.document = this.parser.treeAdapter.createDocument();

        this.pendingHtmlInsertions = [];

        this._resume = this._resume.bind(this);
        this._documentWrite = this._documentWrite.bind(this);
        this._scriptHandler = this._scriptHandler.bind(this);

        this.parser._bootstrap(this.document, null);
    }

    //WritableStream implementation
    _write(chunk, encoding, callback) {
        if (typeof chunk !== 'string') {
            throw new TypeError('Parser can work only with string streams.');
        }

        this.writeCallback = callback;
        this.parser.tokenizer.write(chunk, this.lastChunkWritten);
        this._runParsingLoop();
    }

    end(chunk, encoding, callback) {
        this.lastChunkWritten = true;
        super.end(chunk || '', encoding, callback);
    }

    //Scriptable parser implementation
    _runParsingLoop() {
        this.parser.runParsingLoopForCurrentChunk(this.writeCallback, this._scriptHandler);
    }

    _resume() {
        if (!this.pausedByScript) {
            throw new Error('Parser was already resumed');
        }

        while (this.pendingHtmlInsertions.length) {
            const html = this.pendingHtmlInsertions.pop();

            this.parser.tokenizer.insertHtmlAtCurrentPos(html);
        }

        this.pausedByScript = false;

        //NOTE: keep parsing if we don't wait for the next input chunk
        if (this.parser.tokenizer.active) {
            this._runParsingLoop();
        }
    }

    _documentWrite(html) {
        if (!this.parser.stopped) {
            this.pendingHtmlInsertions.push(html);
        }
    }

    _scriptHandler(scriptElement) {
        if (this.listenerCount('script') > 0) {
            this.pausedByScript = true;
            this.emit('script', scriptElement, this._documentWrite, this._resume);
        } else {
            this._runParsingLoop();
        }
    }
}

module.exports = ParserStream;
