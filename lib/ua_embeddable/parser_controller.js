var ParserController = module.exports = function (parser) {
    this.parser = parser;
    this.suspended = false;
    this.parsingLoopLock = false;
};

ParserController.prototype._stateGuard = function (suspend) {
    if (this.suspended && suspend)
        throw new Error('parse5: Parser was already suspended. Please, check your control flow logic.');

    else if (!this.suspended && !suspend)
        throw new Error('parse5: Parser was already resumed. Please, check your control flow logic.');

    return suspend;
};

ParserController.prototype.suspend = function () {
    this.suspended = this._stateGuard(true);
};

ParserController.prototype.resume = function () {
    this.suspended = this._stateGuard(false);

    //NOTE: don't enter parsing loop if it is locked. Without this lock _runParsingLoop() may be called
    //while parsing loop is still running. E.g. when suspend() and resume() called synchronously.
    if (!this.parsingLoopLock)
        this.parser._runParsingLoop();
};

ParserController.prototype.documentWrite = function (html) {
    this.parser.tokenizer.preprocessor.write(html);
};
