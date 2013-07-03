var Parser = require('./lib/parser').Parser;

exports.parse = function (html, treeAdapter) {
    var parser = new Parser(html, treeAdapter);

    return parser.parse();
};