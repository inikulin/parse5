'use strict';

var Parser = require('./parser');

exports.ParserStream = require('./parser/stream');
exports.Serializer = require('./serializer');
exports.SAX = require('./sax');

exports.treeAdapters = {
    default: require('./tree_adapters/default'),
    htmlparser2: require('./tree_adapters/htmlparser2')
};

// Shorthands
exports.parse = function parse(html, options) {
    var parser = new Parser(options);

    return parser.parse(html);
};

exports.parseFragment = function parseFragment(html, fragmentContext, options) {
    var parser = new Parser(options);

    return parser.parseFragment(html, fragmentContext, options);
};
