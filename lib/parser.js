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

//Tree implementation
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

//Insertion modes
var _ = {};

//12.2.5.4.1 The "initial" insertion mode
_[INITIAL_MODE] = {};
_[INITIAL_MODE][Tokenizer.CHARACTER_TOKEN] = characterInInitialMode;
_[INITIAL_MODE][Tokenizer.COMMENT_TOKEN] = commentInInitialMode;
_[INITIAL_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInInitialMode;
_[INITIAL_MODE][Tokenizer.START_TAG_TOKEN] =
_[INITIAL_MODE][Tokenizer.END_TAG_TOKEN] = initialModeDefaultEntry;

function characterInInitialMode(p, token) {
    if (!isWhitespaceCharacter(token.ch))
        initialModeDefaultEntry(p, token);
}

function commentInInitialMode(p, token) {
    p._insertCommentNode(token)
}

function doctypeInInitialMode(p, token) {
    //TODO
}

function initialModeDefaultEntry(p, token) {
    p._err('Parse error');
    p.document.quirksMode = true;
    p._reprocessTokenInMode(BEFORE_HTML_MODE, token);
}

//12.2.5.4.2 The "before html" insertion mode
_[BEFORE_HTML_MODE] = {};
_[BEFORE_HTML_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBeforeHtmlMode;
_[BEFORE_HTML_MODE][Tokenizer.COMMENT_TOKEN] = commentInBeforeHtmlMode;
_[BEFORE_HTML_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInBeforeHtmlMode;
_[BEFORE_HTML_MODE][Tokenizer.START_TAG_TOKEN] = startTagInBeforeHtmlMode;
_[BEFORE_HTML_MODE][Tokenizer.END_TAG_TOKEN] = endTagInBeforeHtmlMode;

function characterInBeforeHtmlMode(p, token) {
    if (!isWhitespaceCharacter(token.ch))
        beforeHtmlModeDefaultEntry(p, token);
}

function commentInBeforeHtmlMode(p, token) {
    p._insertCommentNode(token);
}

function doctypeInBeforeHtmlMode(p, token) {
    p._err('Parse error');
}

function startTagInBeforeHtmlMode(p, token) {
    if (token.tagName === 'html') {
        var element = p._createElementForToken(token, false);
        p._insertElement(element);
        p.insertionMode = BEFORE_HEAD_MODE;
    }

    else
        beforeHtmlModeDefaultEntry(p, token);
}

function endTagInBeforeHtmlMode(p, token) {
    if (token.tagName === 'html' || token.tagName === 'head' ||
        token.tagName === 'body' || token.tagName === 'br') {
        beforeHtmlModeDefaultEntry(p, token);
    }

    else
        p._err('Parse error');
}

function beforeHtmlModeDefaultEntry(p, token) {
    p._createElementAndInsert('html');
    p._reprocessTokenInMode(BEFORE_HEAD_MODE, token);
}

//12.2.5.4.3 The "before head" insertion mode
_[BEFORE_HEAD_MODE] = {};
_[BEFORE_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBeforeHeadMode;
_[BEFORE_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentInBeforeHeadMode;
_[BEFORE_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInBeforeHeadMode;
_[BEFORE_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagInBeforeHeadMode;
_[BEFORE_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagInBeforeHeadMode;

function characterInBeforeHeadMode(p, token) {
    if (!isWhitespaceCharacter(token.ch))
        beforeHeadModeDefaultEntry(p, token);
}

function commentInBeforeHeadMode(p, token) {
    p._insertCommentNode(token);
}

function doctypeInBeforeHeadMode(p, token) {
    p._err('Parse error');
}

function startTagInBeforeHeadMode(p, token) {
    if (token.tagName === 'html') {
        //TODO: Process the token using the rules for the "in body" insertion mode.
    }

    else if (token.tagName === 'head') {
        var element = p._createElementForToken(token, false);
        p._insertElement(element);
        p.headElementPointer = this.currentNode;
        p.insertionMode = IN_HEAD_MODE;
    }

    else
        beforeHeadModeDefaultEntry(p, token);
}

function endTagInBeforeHeadMode(p, token) {
    if (token.tagName === 'head' || token.tagName === 'body' ||
        token.tagName === 'html' || token.tagName === 'br') {
        beforeHeadModeDefaultEntry(p, token);
    }

    else
        p._err('Parse error');
}

function beforeHeadModeDefaultEntry(p, token) {
    p._createElementAndInsert('head');
    p.headElementPointer = p.currentNode;
    p._reprocessTokenInMode(IN_HEAD_MODE, token);
}


//12.2.5.4.4 The "in head" insertion mode
_[IN_HEAD_MODE] = {};
_[IN_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterInHeadMode;
_[IN_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentInHeadMode;
_[IN_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInHeadMode;
_[IN_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagInHeadMode;
_[IN_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagInHeadMode;

function characterInHeadMode(p, token) {
    if (isWhitespaceCharacter(token.ch))
        p._insertCharacter(token);

    else
        inHeadModeDefaultEntry(p, token);
}

function commentInHeadMode(p, token) {
    p._insertCommentNode(token);
}

function doctypeInHeadMode(p, token) {
    p._err('Parse error');
}

function startTagInHeadMode(p, token) {
    if (token.tagName === 'html') {
        //TODO Process the token using the rules for the "in body" insertion mode.
    }

    else if (token.tagName === 'base' || token.tagName === 'basefont' ||
             token.tagName === 'bgsound' || token.tagName === 'link') {
        var element = p._createElementForToken(token, true);
        p._appendNode(element);
    }

    else if (token.tagName === 'meta') {
        var element = p._createElementForToken(token, true);
        p._appendNode(element);
    }

    else if (token.tagName === 'title') {
        //TODO Follow the generic RCDATA element parsing algorithm.
    }

    //NOTE: here we assume that we always act as an interactive user agent with enabled scripting, so we parse
    //<noscript> as a rawtext.
    else if (token.tagName === 'noscript' || token.tagName === 'noframes' || token.tagName === 'style') {
        //TODO Follow the generic raw text element parsing algorithm.
    }

    else if (token.tagName === 'script') {
        var element = p._createElementForToken(token, false);
        p._insertElement(element);
        p.tokenizer.switchToScriptDataState();
        p.originalInsertionMode = IN_HEAD_MODE;
        p.insertionMode = TEXT_MODE;
    }

    else if (token.tagName === 'head')
        p._err('Parsing error');

    else
        inHeadModeDefaultEntry(p, token);
}

function endTagInHeadMode(p, token) {
    if (token.tagName === 'head') {
        p._popCurrentNode();
        p.insertionMode = AFTER_HEAD_MODE;
    }

    else if (token.tagName === 'body' || token.tagName === 'br' || token.tagName === 'html')
        inHeadModeDefaultEntry(p, token);

    else
        this._err('Parse error');
}

function inHeadModeDefaultEntry(p, token) {
    p._popCurrentNode();
    p._reprocessTokenInMode(AFTER_HEAD_MODE);
}

//12.2.5.4.6 The "after head" insertion mode
function afterHeadModeDefaultEntry(p, token) {

}

//Parser
var Parser = exports.Parser = function (html) {
    this.tokenizer = new Tokenizer(html);
    this.errBuff = [];

    this.insertionMode = INITIAL_MODE;
    this.originalInsertionMode = '';

    this.currentNode = this.document = createDocument();
    this.headElementPointer = null;
    this.openElementsStack = [];

    this.framesetOk = true;
};

Parser.prototype._err = function (msg) {
    this.errBuff.push(msg);
};

Parser.prototype._appendNode = function (node) {
    appendNode(this.currentNode, node);
};

Parser.prototype._popCurrentNode = function () {
    this.openElementsStack.pop();
    this.currentNode = this.openElementsStack[this.openElementsStack.length - 1];
};

Parser.prototype._insertElement = function (element) {
    this._appendNode(element);
    this.openElementsStack.push(element);
    this.currentNode = element;
};

Parser.prototype._createElementForToken = function (startTagToken, selfClosingAcknowledged) {
    if (startTagToken.selfClosing && !selfClosingAcknowledged)
        this._err('Parse error');

    return createElement(startTagToken.tagName, startTagToken.attrs, HTML_NAMESPACE);
};

Parser.prototype._createElementAndInsert = function (tagName) {
    this._insertElement(createElement(tagName, [], HTML_NAMESPACE));
};

Parser.prototype._insertCommentNode = function (commentToken) {
    this._appendNode(createCommentNode(commentToken.data));
};

Parser.prototype._insertCharacter = function (characterToken) {
    insertCharacterToNode(this.currentNode, characterToken.ch);
};

Parser.prototype._reprocessTokenInMode = function (token, mode) {
    this.insertionMode = mode;
    _[mode](this, token);
};