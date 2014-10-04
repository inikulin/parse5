'use strict';

var Tokenizer = require('../tokenization/tokenizer'),
    TokenizerProxy = require('./tokenizer_proxy');

//Skipping handler
function skip() {
    //NOTE: do nothing =)
}

//SimpleApiParser
var SimpleApiParser = module.exports = function (handlers) {
    this.handlers = {
        doctype: handlers.doctype || skip,
        startTag: handlers.startTag || skip,
        endTag: handlers.endTag || skip,
        text: handlers.text || skip,
        comment: handlers.comment || skip
    };
};

//API
SimpleApiParser.prototype.parse = function (html) {
    var token = null;

    this._reset(html);

    do {
        token = this.tokenizerProxy.getNextToken();

        if (token.type === Tokenizer.CHARACTER_TOKEN ||
            token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN ||
            token.type === Tokenizer.NULL_CHARACTER_TOKEN) {
            this.pendingText = (this.pendingText || '') + token.chars;
        }

        else {
            this._emitPendingText();
            this._handleToken(token);
        }
    } while (token.type !== Tokenizer.EOF_TOKEN)
};

//Internals
SimpleApiParser.prototype._handleToken = function (token) {
    if (token.type === Tokenizer.START_TAG_TOKEN)
        this.handlers.startTag(token.tagName, token.attrs, token.selfClosing);

    else if (token.type === Tokenizer.END_TAG_TOKEN)
        this.handlers.endTag(token.tagName);

    else if (token.type === Tokenizer.COMMENT_TOKEN)
        this.handlers.comment(token.data);

    else if (token.type === Tokenizer.DOCTYPE_TOKEN)
        this.handlers.doctype(token.name, token.publicId, token.systemId);

};

SimpleApiParser.prototype._reset = function (html) {
    this.tokenizerProxy = new TokenizerProxy(html);
    this.pendingText = null;
};

SimpleApiParser.prototype._emitPendingText = function () {
    if (this.pendingText !== null) {
        this.handlers.text(this.pendingText);
        this.pendingText = null;
    }
};
