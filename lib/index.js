'use strict';

exports.ParserStream = require('./parser');
exports.SAXParser = require('./sax');
exports.TreeSerializer =
exports.Serializer = require('./serializer');

exports.TreeAdapters = {
    default: require('./tree_adapters/default'),
    htmlparser2: require('./tree_adapters/htmlparser2')
};
