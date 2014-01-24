exports.Parser = require('./lib/parser');
exports.Tokenizer = require('./lib/tokenizer');
exports.Serializer = require('./lib/serializer');

exports.TreeAdapters = {
    default: require('./lib/tree_adapters/default'),
    htmlparser2: require('./lib/tree_adapters/htmlparser2')
};