'use strict';

exports.Parser = require('./parser');
exports.SAXParser = require('./sax');
exports.TreeSerializer =
exports.Serializer = require('./serializer');
exports.JsDomParser = require('./jsdom');

exports.TreeAdapters = {
    default: require('./tree_adapters/default'),
    htmlparser2: require('./tree_adapters/htmlparser2')
};
