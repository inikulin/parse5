var Tokenizer = require('./tokenizer').Tokenizer;

//Insertion modes
var INITIAL_MODE = 'INITIAL_MODE',
    BEFORE_HTML_MODE = 'BEFORE_HTML_MODE',
    BEFORE_HEAD_MODE = 'BEFORE_HEAD_MODE',
    IN_HEAD_MODE = 'IN_HEAD_MODE',
    IN_HEAD_NOSCRIPT_MODE = 'IN_HEAD_NOSCRIPT_MODE',
    AFTER_HEAD_MODE = 'AFTER_HEAD_MODE',
    IN_BODY_MODE = 'IN_BODY_MODE',
    TEXT_MODE = 'TEXT_MODE',
    IN_TABLE_MODE = 'IN_TABLE_MODE',
    IN_TABLE_TEXT_MODE = 'IN_TABLE_TEXT_MODE',
    IN_CAPTION_MODE = 'IN_CAPTION_MODE',
    IN_COLUMN_GROUP_MODE = 'IN_COLUMN_GROUP_MODE',
    IN_TABLE_BODY_MODE = 'IN_TABLE_BODY_MODE',
    IN_ROW_MODE = 'IN_ROW_MODE',
    IN_CELL_MODE = 'IN_CELL_MODE',
    IN_SELECT_MODE = 'IN_SELECT_MODE',
    IN_SELECT_IN_TABLE_MODE = 'IN_SELECT_IN_TABLE_MODE',
    AFTER_BODY_MODE = 'AFTER_BODY_MODE',
    IN_FRAMESET_MODE = 'IN_FRAMESET_MODE',
    AFTER_FRAMESET_MODE = 'AFTER_FRAMESET_MODE',
    AFTER_AFTER_BODY_MODE = 'AFTER_AFTER_BODY_MODE',
    AFTER_AFTER_FRAMESET_MODE = 'AFTER_AFTER_FRAMESET_MODE';

//Text utils
function isWhitespace(ch) {
    return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f';
}

//Tree utils
function createDocument() {
    return {
        type: 'Document',
        quirksMode: false,
        childNodes: []
    };
}

function appendCommentNode(parentNode, data) {
    parentNode.childNodes.push({
        type: 'CommentNode',
        data: data
    });
}

var TreeConstructor = exports.TreeConstructor = function (html) {
    this.tokenizer = new Tokenizer(html);
    this.errBuff = [];
    this.insertionMode = INITIAL_MODE;
    this.document = createDocument();
};

TreeConstructor.prototype._err = function (msg) {
    this.errBuff.push(msg);
};

TreeConstructor.prototype._reprocessInMode = function (token, mode) {
    this.insertionMode = mode;
    this[mode](token);
};

//Insertion modes
var _ = TreeConstructor.prototype;

//12.2.5.4.1 The "initial" insertion mode
_[INITIAL_MODE] = function initialInsertionMode(token) {
    if (token.type === Tokenizer.CHARACTER_TOKEN && isWhitespace(token.ch))
        return;

    if (token.type === Tokenizer.COMMENT_TOKEN)
        appendCommentNode(this.document, token.data);

    else if (token.type === Tokenizer.DOCTYPE_TOKEN)
        this._processDoctypeInInitialMode(token);

    else {
        this._err('Parser error');
        this.document.quirksMode = true;
        this._reprocessInMode(BEFORE_HTML_MODE, token);
    }
};

TreeConstructor.prototype._processDoctypeInInitialMode = function (doctypeToken) {

};