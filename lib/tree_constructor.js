var Tokenizer = require('./tokenizer').Tokenizer;

//Insertion modes
var INITIAL_MODE = 'INITIAL_MODE',
    BEFORE_HTML_MODE = 'BEFORE_HTML_MODE',
    BEFORE_HEAD_MODE = 'BEFORE_HEAD_MODE',
    IN_HEAD_MODE = 'IN_HEAD_MODE',
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
function isWhitespaceCharacter(ch) {
    return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f';
}

//Construction implementation
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

//Insertion modes processors
var _ = {};

//12.2.5.4.1 The "initial" insertion mode
_[INITIAL_MODE] = {};
_[INITIAL_MODE][Tokenizer.CHARACTER_TOKEN] = characterInInitialMode;
_[INITIAL_MODE][Tokenizer.COMMENT_TOKEN] = commentInInitialMode;
_[INITIAL_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInInitialMode;
_[INITIAL_MODE][Tokenizer.START_TAG_TOKEN] =
_[INITIAL_MODE][Tokenizer.END_TAG_TOKEN] = initialModeDefaultEntry;

function characterInInitialMode(tc, token) {
    if (!isWhitespaceCharacter(token.ch))
        initialModeDefaultEntry(tc, token);
}

function commentInInitialMode(tc, token) {
    tc._insertCommentNode(token)
}

function doctypeInInitialMode(tc, token) {
    //TODO
}

function initialModeDefaultEntry(tc, token) {
    tc._err('Parse error');
    tc.document.quirksMode = true;
    tc._reprocessTokenInMode(BEFORE_HTML_MODE, token);
}

//12.2.5.4.2 The "before html" insertion mode
_[BEFORE_HTML_MODE] = {};
_[BEFORE_HTML_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBeforeHtmlMode;
_[BEFORE_HTML_MODE][Tokenizer.COMMENT_TOKEN] = commentInBeforeHtmlMode;
_[BEFORE_HTML_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInBeforeHtmlMode;
_[BEFORE_HTML_MODE][Tokenizer.START_TAG_TOKEN] = startTagInBeforeHtmlMode;
_[BEFORE_HTML_MODE][Tokenizer.END_TAG_TOKEN] = endTagInBeforeHtmlMode;

function characterInBeforeHtmlMode(tc, token) {
    if (!isWhitespaceCharacter(token.ch))
        beforeHtmlModeDefaultEntry(tc, token);
}

function commentInBeforeHtmlMode(tc, token) {
    tc._insertCommentNode(token);
}

function doctypeInBeforeHtmlMode(tc, token) {
    tc._err('Parse error');
}

function startTagInBeforeHtmlMode(tc, token) {
    if (token.tagName === 'html') {
        tc._insertElement(this._createElementForToken(token, false));
        tc.insertionMode = BEFORE_HEAD_MODE;
    } else
        beforeHtmlModeDefaultEntry(tc, token);
}

function endTagInBeforeHtmlMode(tc, token) {
    if (token.tagName === 'html' || token.tagName === 'head' || token.tagName === 'body' || token.tagName === 'br')
        beforeHtmlModeDefaultEntry(tc, token);
    else
        tc._err('Parse error');
}

function beforeHtmlModeDefaultEntry(tc, token) {
    tc._createElementAndInsert('html');
    tc._reprocessTokenInMode(BEFORE_HEAD_MODE, token);
}

//12.2.5.4.3 The "before head" insertion mode
_[BEFORE_HEAD_MODE] = {};
_[BEFORE_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBeforeHeadMode;
_[BEFORE_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentInBeforeHeadMode;
_[BEFORE_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInBeforeHeadMode;
_[BEFORE_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagInBeforeHeadMode;
_[BEFORE_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagInBeforeHeadMode;

function characterInBeforeHeadMode(tc, token) {
    if (!isWhitespaceCharacter(token.ch))
        beforeHeadModeDefaultEntry(tc, token);
}

function commentInBeforeHeadMode(tc, token) {
    tc._insertCommentNode(token);
}

function doctypeInBeforeHeadMode(tc, token) {
    tc._err('Parse error');
}

function startTagInBeforeHeadMode(tc, token) {
    if (token.tagName === 'html') {
        //TODO: Process the token using the rules for the "in body" insertion mode.
    }

    else if (token.tagName === 'head') {
        tc._insertElement(tc._createElementForToken(token, false));
        tc.headElementPointer = this.currentNode;
        tc.insertionMode = IN_HEAD_MODE;
    }

    else
        beforeHeadModeDefaultEntry(tc, token);
}

function endTagInBeforeHeadMode(tc, token) {
    if (token.tagName === 'head' || token.tagName === 'body' || token.tagName === 'html' || token.tagName === 'br')
        beforeHeadModeDefaultEntry(tc, token);
    else
        tc._err('Parse error');
}

function beforeHeadModeDefaultEntry(tc, token) {
    tc._createElementAndInsert('head');
    tc.headElementPointer = tc.currentNode;
    tc._reprocessTokenInMode(IN_HEAD_MODE, token);
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

TreeConstructor.prototype._appendNode = function (node) {
    appendNode(this.currentNode, node);
};

TreeConstructor.prototype._insertElement = function (element) {
    this._appendNode(element);
    this.openElementsStack.push(element);
    this.currentNode = element;
};

TreeConstructor.prototype._createElementForToken = function (startTagToken, acknowledgeSelfClosing) {
    if (startTagToken.selfClosing && !acknowledgeSelfClosing)
        this._err('Parse error');

    return createElement(startTagToken.tagName, startTagToken.attrs, HTML_NAMESPACE);
};

TreeConstructor.prototype._createElementAndInsert = function (tagName) {
    this._insertElement(createElement(tagName, [], HTML_NAMESPACE));
};

TreeConstructor.prototype._insertCommentNode = function (commentToken) {
    this._appendNode(createCommentNode(commentToken.data));
};

TreeConstructor.prototype._insertCharacter = function (characterToken) {
    insertCharacterToNode(this.currentNode, characterToken.ch);
};

TreeConstructor.prototype._reprocessTokenInMode = function (token, mode) {
    this.insertionMode = mode;
    this[mode](token);
};