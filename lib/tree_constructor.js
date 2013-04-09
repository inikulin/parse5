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

//Namespaces
var HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml',
    MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML',
    SVG_NAMESPACE = 'http://www.w3.org/2000/svg',
    XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink',
    XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace',
    XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';

//Text utils
function isWhitespace(ch) {
    return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f';
}

//Construction utils
function appendNode(parentNode, node) {
    parentNode.childNodes.push(node);
}

function createDocument() {
    return {
        type: 'Document',
        quirksMode: false,
        childNodes: []
    };
}

function createElement(tagName, namespace) {
    return {
        type: 'Element',
        tagName: tagName,
        namespace: namespace,
        childNodes: []
    };
}

function createCommentNode(data) {
    return{
        type: 'CommentNode',
        data: data
    };
}

var TreeConstructor = exports.TreeConstructor = function (html) {
    this.tokenizer = new Tokenizer(html);
    this.errBuff = [];
    this.openElementsStack = [];
    this.insertionMode = INITIAL_MODE;
    this.document = createDocument();
    this.currentNode = null;
};

TreeConstructor.prototype._err = function (msg) {
    this.errBuff.push(msg);
};

TreeConstructor.prototype._pushToOpenElementsStack = function (element) {
    this.openElementsStack.push(element);
    this.currentNode = element;
};

TreeConstructor.prototype._insertHtmlElement = function (startTagToken) {
    var element = createElement(startTagToken.tagName, HTML_NAMESPACE);

    this.currentNode.childNodes.push(element);
    this._pushToOpenElementsStack(element);
};

TreeConstructor.prototype._reprocessTokenInMode = function (token, mode) {
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
        appendNode(this.document, createCommentNode(token.data));

    else if (token.type === Tokenizer.DOCTYPE_TOKEN)
        this._processDoctypeInInitialMode(token);

    else {
        this._err('Parse error');
        this.document.quirksMode = true;
        this._reprocessTokenInMode(BEFORE_HTML_MODE, token);
    }
};

TreeConstructor.prototype._processDoctypeInInitialMode = function (doctypeToken) {
    //TODO
};

//12.2.5.4.2 The "before html" insertion mode
_[BEFORE_HTML_MODE] = function beforeHtmlMode(token) {
    if (token.type === Tokenizer.CHARACTER_TOKEN && isWhitespace(token.ch))
        return;

    if (token.type === Tokenizer.DOCTYPE_TOKEN)
        this._err('Parse error');

    else if (token.type === Tokenizer.COMMENT_TOKEN)
        appendNode(this.document, createCommentNode(token.data));

    else if (token.type === Tokenizer.START_TAG_TOKEN && token.tagName === 'html') {
        this._processHtmlStartTagInBeforeHtmlMode();
        this.insertionMode = BEFORE_HEAD_MODE;
    }

    else if (token.type === Tokenizer.END_TAG_TOKEN &&
        token.tagName !== 'head' && token.tagName !== 'body' &&
        token.tagName !== 'html' && token.tagName !== 'br') {
        this._err('Parse error');
    }

    else {
        this._processHtmlStartTagInBeforeHtmlMode();
        this._reprocessTokenInMode(BEFORE_HEAD_MODE, token);
    }
};

TreeConstructor.prototype._processHtmlStartTagInBeforeHtmlMode = function () {
    var element = createElement('html', HTML_NAMESPACE);

    appendNode(this.document, element);
    this._pushToOpenElementsStack(element);
};

//12.2.5.4.3 The "before head" insertion mode
_[BEFORE_HEAD_MODE] = function (token) {

};
