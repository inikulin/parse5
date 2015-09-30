'use strict';

var WritableStream = require('stream').Writable,
    inherits = require('util').inherits,
    Parser = require('./index');

/**
 * Streaming HTML parser with the scripting support.
 * [Writable stream]{@link https://nodejs.org/api/stream.html#stream_class_stream_writable}.
 * @class ParserStream
 * @memberof parse5
 * @instance
 * @extends stream.Writable
 * @param {ParserOptions} options - Parsing options.
 * @example
 * var parse5 = require('parse5');
 * var http = require('http');
 *
 * // Fetch google.com content and obtain it's <body> node
 * http.get('http://google.com', function(res) {
 *  var parser = new parse5.ParserStream();
 *
 *  parser.on('finish', function() {
 *      var body = parser.document.childNodes[0].childNodes[1];
 *  });
 *
 *  res.pipe(parser);
 * });
 */
var ParserStream = module.exports = function (options) {
    WritableStream.call(this);

    this.parser = new Parser(options, this.scriptHandler.bind(this));

    this.lastChunkWritten = false;
    this.writeCallback = null;

    /**
     * @member {ASTNode<document>} document - Resulting document node.
     * @memberof parse5#ParserStream
     * @instance
     */
    this.document = this.parser.treeAdapter.createDocument();

    this.pendingHtmlInsertions = [];

    this._resume = this._resume.bind(this);
    this._documentWrite = this._documentWrite.bind(this);

    this.parser._bootstrap(this.document, null);
};

inherits(ParserStream, WritableStream);

//WritableStream implementation
ParserStream.prototype._write = function (chunk, encoding, callback) {
    this.writeCallback = callback;
    this.parser.tokenizer.write(chunk.toString('utf8'), this.lastChunkWritten);
    this.parser._runParsingLoop(this.writeCallback);
};

ParserStream.prototype.end = function (chunk, encoding, callback) {
    this.lastChunkWritten = true;
    WritableStream.prototype.end.call(this, chunk, encoding, callback);
};

//Scriptable parser implementation
ParserStream.prototype._resume = function () {
    if (!this.parser.pausedByScript)
        throw new Error('Parser was already resumed');

    while (this.pendingHtmlInsertions.length) {
        var html = this.pendingHtmlInsertions.pop();

        this.parser.tokenizer.insertHtmlAtCurrentPos(html);
    }

    this.parser.pausedByScript = false;

    //NOTE: keep parsing if we don't wait for the next input chunk
    if (this.parser.tokenizer.active)
        this.parser._runParsingLoop(this.writeCallback);
};

ParserStream.prototype._documentWrite = function (html) {
    if (!this.parser.stopped)
        this.pendingHtmlInsertions.push(html);
};

ParserStream.prototype.scriptHandler = function (scriptElement) {
    if (this.listeners('script').length) {
        this.parser.pausedByScript = true;

        this.emit('script', scriptElement, this._documentWrite, this._resume);
    }
};

