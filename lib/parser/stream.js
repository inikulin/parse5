'use strict';

var WritableStream = require('stream').Writable,
    inherits = require('util').inherits,
    Parser = require('./index');


var ParserStream = module.exports = function (options) {
    WritableStream.call(this);

    this.parser = new Parser(options);
    this.lastChunkWritten = false;
    this.document = this.parser.treeAdapter.createDocument();

    this.parser._reset(this.document, null);
};

inherits(ParserStream, WritableStream);

//WritableStream implementation
ParserStream.prototype._write = function (chunk, encoding, callback) {
    this.parser.tokenizer.write(chunk.toString('utf8'), this.lastChunkWritten);
    this.parser._runParsingLoop();
    callback();
};

ParserStream.prototype.end = function (chunk, encoding, callback) {
    this.lastChunkWritten = true;
    WritableStream.prototype.end.call(this, chunk, encoding, callback);
};

