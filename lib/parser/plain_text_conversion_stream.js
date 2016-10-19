'use strict';

var ParserStream = require('./parser_stream'),
    inherits = require('util').inherits,
    $ = require('../common/html').TAG_NAMES;

/**
 * Converts plain text files into HTML document as required by [HTML specification]{@link https://html.spec.whatwg.org/#read-text}.
 * A [writable stream]{@link https://nodejs.org/api/stream.html#stream_class_stream_writable}.
 * @class PlainTextConversionStream
 * @memberof parse5
 * @instance
 * @extends stream.Writable
 * @param {ParserOptions} options - Conversion options.
 * @example
 * var parse5 = require('parse5');
 * var fs = require('fs');
 *
 * var file = fs.createReadStream('/home/war_and_peace.txt');
 *
 * var converter = new parse5.PlainTextConversionStream();
 *
 * converter.on('finish', function() {
 *     var body = converter.document.childNodes[0].childNodes[1];
 * });
 *
 * file.pipe(converter);
 * });
 */
var PlainTextConversionStream = module.exports = function (options) {
    ParserStream.call(this, options);

    // NOTE: see https://html.spec.whatwg.org/#read-text
    this.parser._insertFakeElement($.HTML);
    this.parser._insertFakeElement($.HEAD);
    this.parser.openElements.pop();
    this.parser._insertFakeElement($.BODY);
    this.parser._insertFakeElement($.PRE);
    this.parser.treeAdapter.insertText(this.parser.openElements.current, '\n');
    this.parser.switchToPlaintextParsing();
};

inherits(PlainTextConversionStream, ParserStream);
