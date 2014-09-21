var ParserController = exports.ParserController = function (parser) {
    this.parser = parser;
    this.suspended = false;
};

ParserController.prototype.suspend = function () {
    this.parser.suspended = this.suspended = true;
};

ParserController.prototype.resume = function () {
    this.parser.suspended = this.suspended = false;
    this.parser._runParsingLoop();
};

ParserController.prototype.documentWrite = function (html) {
    this.parser.tokenizer.preprocessor.write(html);
};

ParserController.prototype.setScriptHandler = function (handler) {
    this.parser.scriptHandler = handler;
};