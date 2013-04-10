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
function isWhitespaceCharacterToken(token) {
    return token.type === Tokenizer.CHARACTER_TOKEN &&
        (token.ch === ' ' || token.ch === '\n' || token.ch === '\t' || token.ch === '\r' || token.ch === '\f');
}

//Construction utils
function appendNode(parentNode, node) {
    parentNode.childNodes.push(node);
}

function createDocument() {
    return {
        nodeName: '#document',
        quirksMode: false,
        childNodes: []
    };
}

function createElement(tagName, attrs, namespace) {
    return {
        nodeName: tagName,
        attrs: attrs,
        namespace: namespace,
        childNodes: []
    };
}

function createCommentNode(data) {
    return {
        nodeName: '#comment',
        data: data
    };
}

function createTextNode(value) {
    return {
        nodeName: '#text',
        value: value
    }
}

function insertCharacterToNode(node, ch) {
    var childNodesLength = node.childNodes.length,
        lastChild = childNodesLength && node.childNodes[childNodesLength - 1];

    if (lastChild && lastChild.nodeName === '#text')
        lastChild.value += ch;
    else
        appendNode(node, createTextNode(ch));
}

//Tree constructor
var TreeConstructor = exports.TreeConstructor = function (html) {
    this.tokenizer = new Tokenizer(html);
    this.errBuff = [];
    this.openElementsStack = [];
    this.insertionMode = INITIAL_MODE;
    this.currentNode = this.document = createDocument();
    this.headElementPointer = null;
};

TreeConstructor.prototype._err = function (msg) {
    this.errBuff.push(msg);
};

TreeConstructor.prototype._pushToOpenElementsStack = function (element) {
    this.openElementsStack.push(element);
    this.currentNode = element;
};

TreeConstructor.prototype._insertHtmlElement = function (element) {
    appendNode(this.currentNode, element);
    this._pushToOpenElementsStack(element);
};

TreeConstructor.prototype._createElementForTokenAndInsert = function (startTagToken) {
    this._insertHtmlElement(createElement(startTagToken.tagName, startTagToken.attrs));
};

TreeConstructor.prototype._createElementAndInsert = function (tagName) {
    this._insertHtmlElement(createElement(tagName, []));
};

TreeConstructor.prototype._insertCommentNode = function (commentToken) {
    appendNode(this.currentNode, createCommentNode(commentToken.data));
};

TreeConstructor.prototype._insertCharacter = function (characterToken) {
    insertCharacterToNode(this.currentNode, characterToken.ch);
};

TreeConstructor.prototype._reprocessTokenInMode = function (token, mode) {
    this.insertionMode = mode;
    this[mode](token);
};

//Insertion modes
var _ = TreeConstructor.prototype;

//12.2.5.4.1 The "initial" insertion mode
_[INITIAL_MODE] = function initialMode(token) {
    if (isWhitespaceCharacterToken(token))
        return;

    if (token.type === Tokenizer.COMMENT_TOKEN)
        this._insertCommentNode(token);

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
_[BEFORE_HTML_MODE][Tokenizer.CHARACTER_TOKEN] = function (token) {
    if (!isWhitespaceCharacterToken(token)) {
        this._createElementAndInsert('html');
        this._reprocessTokenInMode(BEFORE_HEAD_MODE, token);
    }
};
_[BEFORE_HTML_MODE] = function beforeHtmlMode(token) {
    if (isWhitespaceCharacterToken(token))
        return;

    if (token.type === Tokenizer.DOCTYPE_TOKEN)
        this._err('Parse error');

    else if (token.type === Tokenizer.COMMENT_TOKEN)
        this._insertCommentNode(token);

    else if (token.type === Tokenizer.START_TAG_TOKEN && token.tagName === 'html') {
        this._createElementForTokenAndInsert(token);
        this.insertionMode = BEFORE_HEAD_MODE;
    }

    else if (token.type === Tokenizer.END_TAG_TOKEN &&
        token.tagName !== 'head' && token.tagName !== 'body' &&
        token.tagName !== 'html' && token.tagName !== 'br') {
        this._err('Parse error');
    }

    else {
        this._createElementAndInsert('html');
        this._reprocessTokenInMode(BEFORE_HEAD_MODE, token);
    }
};

//12.2.5.4.3 The "before head" insertion mode
_[BEFORE_HEAD_MODE] = function beforeHeadMode(token) {
    if (isWhitespaceCharacterToken(token))
        return;

    if (token.type === Tokenizer.COMMENT_TOKEN)
        this._insertCommentNode(token);

    else if (token.type === Tokenizer.DOCTYPE_TOKEN)
        this._err('Parse error');

    else if (token.type === Tokenizer.START_TAG_TOKEN && token.tagName === 'html') {
        //TODO: Process the token using the rules for the "in body" insertion mode.
    }

    else if (token.type === Tokenizer.START_TAG_TOKEN && token.tagName === 'head') {
        this._createElementForTokenAndInsert(token);
        this.headElementPointer = this.currentNode;
        this.insertionMode = IN_HEAD_MODE;
    }

    else if (token.type === Tokenizer.END_TAG_TOKEN &&
        token.tagName !== 'head' && token.tagName !== 'body' &&
        token.tagName !== 'html' && token.tagName !== 'br') {
        this._err('Parse error');
    }

    else {
        this._createElementAndInsert('head');
        this.headElementPointer = this.currentNode;
        this._reprocessTokenInMode(IN_HEAD_MODE, token);
    }
};

//12.2.5.4.4 The "in head" insertion mode
_[IN_HEAD_MODE] = function (token) {
    if (isWhitespaceCharacterToken(token))
        this._insertCharacter(token);

    else if (token.type === Tokenizer.COMMENT_TOKEN)
        this._insertCommentNode(token);

    else if (token.type === Tokenizer.DOCTYPE_TOKEN)
        this._err('Parse error');
};