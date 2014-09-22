var Parser = require('../tree_construction/parser'),
    ParserController = require('./parser_controller');

var UAEmbeddableParser = function (treeAdapter) {
    this.treeAdapter = treeAdapter;
};

//API
UAEmbeddableParser.prototype.parseDocument = function (html, scriptHandler, callback) {
    //NOTE: scriptHandler is an optional arg
    callback = callback || scriptHandler;

    //NOTE: this should be reentrant, so we create new parser
    var parser = new Parser(this.treeAdapter),
        parserController = new ParserController(parser);

    parser.scriptHandler = scriptHandler;

    //NOTE: override parser methods
    parser._runParsingLoop = function () {
        while (!parserController.suspended && !this.stopped)
            this._iterateParsingLoop();

        if (this.stopped)
            callback(this.document);
    };

    //NOTE: wait while parserController will be adopted by calling code, then
    //start parsing
    process.nextTick(function () {
        parser.parse(html);
    });

    return parserController;
};

UAEmbeddableParser.prototype.parseInnerHtml = function (innerHtml, contextElement) {
    //NOTE: this should be reentrant, so we create new parser
    var parser = new Parser(this.treeAdapter);

    return parser.parseFragment(innerHtml, contextElement);
};