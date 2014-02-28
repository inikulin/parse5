exports.Parser = require('./lib/tree_construction_stage/parser');
exports.TreeSerializer = require('./lib/tree_construction_stage/tree_serializer');

exports.TreeAdapters = {
    default: require('./lib/tree_adapters/default'),
    htmlparser2: require('./lib/tree_adapters/htmlparser2')
};