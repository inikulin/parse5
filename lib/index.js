'use strict';

var ParserStream = exports.ParserStream = require('./parser');

exports.Serializer = require('./serializer');
exports.SAX = require('./sax');

exports.treeAdapters = {
    default: require('./tree_adapters/default'),
    htmlparser2: require('./tree_adapters/htmlparser2')
};

// Shorthands
exports.parse = function parse(html, options) {
    var parser = new ParserStream(options);

    parser.end(html);

    return parser.document;
};

exports.parseFragment = ParserStream.parseFragment;
