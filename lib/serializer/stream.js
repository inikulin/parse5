'use strict';

var ReadableStream = require('stream').Readable,
    inherits = require('util').inherits,
    Serializer = require('./index');

/**
 * Streaming AST node to HTML serializer.
 * [Readable stream]{@link https://nodejs.org/api/stream.html#stream_class_stream_readable}.
 * @class
 * @memberof parse5
 * @extends stream.Readable
 * @param {ASTNode} node - node to serialize
 * @param {SerializerOptions} [options] - serialization options
 * @example
 * var parse5 = require('parse5');
 * var fs = require('fs');
 *
 * var file = fs.createWriteStream('/home/index.html');
 *
 * var document = parse5.parse('<body>Who is John Galt?</body>');
 * var serializer = new parse5.SerializerStream(document);
 *
 * serializer.pipe(file);
 */
var SerializerStream = module.exports = function (node, options) {
    ReadableStream.call(this);

    this.serializer = new Serializer(node, options);

    Object.defineProperty(this.serializer, 'html', {
        //NOTE: To make `+=` concat operator work properly we define
        //getter which always returns empty string
        get: function () {
            return '';
        },
        set: this.push.bind(this)
    });
};

inherits(SerializerStream, ReadableStream);

//Readable stream implementation
SerializerStream.prototype._read = function () {
    this.serializer.serialize();
    this.push(null);
};
