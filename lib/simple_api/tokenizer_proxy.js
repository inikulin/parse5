var Tokenizer = require('../tokenization_stage/tokenizer'),
    UNICODE = require('../common/unicode'),
    HTML = require('../common/html');

//Aliases
var $ = HTML.TAG_NAMES,
    NS = HTML.NAMESPACES;


//Tokenizer proxy
//NOTE: this proxy simulates adjustment of the Tokenizer which performed by standard parser during tree construction.
var TokenizerProxy = module.exports = function (html) {
    this.tokenizer = new Tokenizer(html);

    this.namespaceStack = [];
    this.namespaceStackTop = -1;
    this.inForeignContent = false;
};

TokenizerProxy.prototype.getNextToken = function () {
    var token = this.tokenizer.getNextToken();

    if (token.type === Tokenizer.START_TAG_TOKEN)
        this._handleStartTagToken(token);

    else if (token.type === Tokenizer.END_TAG_TOKEN)
        this._handleEndTagToken(token);

    else if (token.type === Tokenizer.NULL_CHARACTER_TOKEN && this.inForeignContent) {
        token.type = Tokenizer.CHARACTER_TOKEN;
        token.chars = UNICODE.REPLACEMENT_CHARACTER;
    }

    return token;
};

//Namespace stack mutations
TokenizerProxy.prototype._enterNamespace = function (namespace) {
    this.namespaceStackTop++;
    this.namespaceStack.push(namespace);

    this.inForeignContent = namespace !== NS.HTML;
    this.tokenizer.allowCDATA = this.inForeignContent;
};

TokenizerProxy.prototype._leaveCurrentNamespace = function () {
    this.namespaceStackTop--;
    this.namespaceStack.pop();

    this.inForeignContent = this.namespaceStack[this.namespaceStackTop] !== NS.HTML;
    this.tokenizer.allowCDATA = this.inForeignContent;
};

//Token handlers
TokenizerProxy.prototype._updateStateForStartTagToken = function (token) {

};

TokenizerProxy.prototype._handleStartTagToken = function (token) {

};

TokenizerProxy.prototype._handleEndTagToken = function (token) {

};


