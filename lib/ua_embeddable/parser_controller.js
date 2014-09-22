var ParserController = exports.ParserController = function (parser) {
    this.parser = parser;
    this.suspended = false;
};

ParserController.prototype._setSuspended = function (suspend) {
    if(this.suspended && suspend)
        throw new Error('parse5: Parser was already suspended. Please, check your control flow logic.');

    else if(!this.suspended && !suspend)
        throw new Error('parse5: Parser was already resumed. Please, check your control flow logic.');

    return suspend;
};

ParserController.prototype.suspend = function () {
    this._setSuspended(true);
};

ParserController.prototype.resume = function () {
    this._setSuspended(false);
    this.parser._runParsingLoop();
};

ParserController.prototype.documentWrite = function (html) {
    this.parser.tokenizer.preprocessor.write(html);
};
