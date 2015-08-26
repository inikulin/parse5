'use strict';

var Parser = require('./parser'),
    Serializer = require('./serializer');

//Methods
exports.parse = function parse(html, options) {
    var parser = new Parser(options);

    return parser.parse(html);
};

exports.parseFragment = function parseFragment(html, fragmentContext, options) {
    var parser = new Parser(options);

    return parser.parseFragment(html, fragmentContext);
};

exports.serialize = function (node, options) {
    var serializer = new Serializer(node, options);

    return serializer.serialize();
};

//Tree adapters
exports.treeAdapters = {
    default: require('./tree_adapters/default'),
    htmlparser2: require('./tree_adapters/htmlparser2')
};


// Streaming
exports.ParserStream = require('./parser/stream');
exports.SerializerStream = require('./serializer/stream');
exports.SAXParser = require('./sax');
