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
     * Resulting document node.
     * @member {ASTNode<document>} document
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

        /**
         * Raised then parser encounters `<script>` element.
         * If event has listeners then parsing will be suspended on event emission.
         * So, if `<script>` has `src` attribute you can fetch it, execute and then
         * resume parser like browsers do.
         * @event script
         * @memberof parse5#ParserStream
         * @instance
         * @type {Function}
         * @param {ASTNode} scriptElement - Script element that caused the event.
         * @param {Function} documentWrite(html) - Write additional `html` at the current parsing position.
         * Suitable for the DOM `document.write` and `document.writeln` methods implementation.
         * @param {Function} resume - Resumes the parser.
         * @example
         * var parse = require('parse5');
         * var http = require('http');
         *
         * var parser = new parse5.ParserStream();
         *
         * parser.on('script', function(scriptElement, documentWrite, resume) {
         *   var src = parse5.treeAdapters.default.getAttrList(scriptElement)[0].value;
         *
         *   http.get(src, function(res) {
         *      // Fetch script content, execute it with DOM built around `parser.document` and
         *      // `document.write` implemented using `documentWrite`
         *      ...
         *      // Then resume the parser
         *      resume();
         *   });
         * });
         *
         * parser.end('<script src="example.com/script.js"></script>');
         */
        this.emit('script', scriptElement, this._documentWrite, this._resume);
    }
};

