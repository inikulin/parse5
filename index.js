var Parser = require('./lib/parser').Parser,
    HTML = require('./lib/html');

exports.parse = function (html, treeAdapter) {
    var parser = new Parser(html, treeAdapter);

    return parser.parse();
};
