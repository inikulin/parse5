var Parser = require('../tree_construction/parser'),
    ParserController = require('./parser_controller');

var JsDomParser = module.exports = function (treeAdapter) {
    this.treeAdapter = treeAdapter;
};

//API
JsDomParser.prototype.parseDocument = function (html, scriptHandler, callback) {
    //NOTE: scriptHandler is an optional arg
    if(!callback) {
        callback = scriptHandler;
        scriptHandler = void 0;
    }

    //NOTE: this should be reentrant, so we create new parser here
    var parser = new Parser(this.treeAdapter, scriptHandler),
        parserController = new ParserController(parser);

    //NOTE: override parser loop method
    parser._runParsingLoop = function () {
        parserController.parsingLoopLock = true;

        while (!parserController.suspended && !this.stopped)
            this._iterateParsingLoop();

        parserController.parsingLoopLock = false;

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

JsDomParser.prototype.parseInnerHtml = function (innerHtml, contextElement) {
    //NOTE: this should be reentrant, so we create new parser here
    var parser = new Parser(this.treeAdapter);

    return parser.parseFragment(innerHtml, contextElement);
};