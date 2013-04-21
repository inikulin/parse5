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
_[INITIAL_MODE][Tokenizer.END_TAG_TOKEN] =
_[INITIAL_MODE][Tokenizer.EOF_TOKEN] = initialModeDefaultEntry;

function characterInInitialMode(p, token) {
    if (!isWhitespaceCharacter(token.ch))
        initialModeDefaultEntry(p, token);
}

function commentInInitialMode(p, token) {
    p._appendCommentNode(token)
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
_[BEFORE_HTML_MODE][Tokenizer.CHARACTER_TOKEN] = characterBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.COMMENT_TOKEN] = commentBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.START_TAG_TOKEN] = startTagBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.END_TAG_TOKEN] = endTagBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.EOF_TOKEN] = beforeHtmlModeDefaultEntry;

function characterBeforeHtml(p, token) {
    if (!isWhitespaceCharacter(token.ch))
        beforeHtmlModeDefaultEntry(p, token);
}

function commentBeforeHtml(p, token) {
    p._appendCommentNode(token);
}

function doctypeBeforeHtml(p, token) {
    p._err('Parse error');
}

function startTagBeforeHtml(p, token) {
    if (token.tagName === 'html') {
        p._insertElementForToken(token, false);
        p.insertionMode = BEFORE_HEAD_MODE;
    }

    else
        beforeHtmlModeDefaultEntry(p, token);
}

function endTagBeforeHtml(p, token) {
    if (token.tagName === 'html' || token.tagName === 'head' ||
        token.tagName === 'body' || token.tagName === 'br') {
        beforeHtmlModeDefaultEntry(p, token);
    }

    else
        p._err('Parse error');
}

function beforeHtmlModeDefaultEntry(p, token) {
    p._explicitlyCreateElementAndInsert('html');
    p._reprocessTokenInMode(BEFORE_HEAD_MODE, token);
}

//12.2.5.4.3 The "before head" insertion mode
_[BEFORE_HEAD_MODE] = {};
_[BEFORE_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.EOF_TOKEN] = beforeHeadModeDefaultEntry;

function characterBeforeHead(p, token) {
    if (!isWhitespaceCharacter(token.ch))
        beforeHeadModeDefaultEntry(p, token);
}

function commentBeforeHead(p, token) {
    p._appendCommentNode(token);
}

function doctypeBeforeHead(p, token) {
    p._err('Parse error');
}

function startTagBeforeHead(p, token) {
    if (token.tagName === 'html') {
        //TODO: Process the token using the rules for the "in body" insertion mode.
    }

    else if (token.tagName === 'head') {
        p._insertElementForToken(token, false);
        p.headElement = this.currentNode;
        p.insertionMode = IN_HEAD_MODE;
    }

    else
        beforeHeadModeDefaultEntry(p, token);
}

function endTagBeforeHead(p, token) {
    if (token.tagName === 'head' || token.tagName === 'body' ||
        token.tagName === 'html' || token.tagName === 'br') {
        beforeHeadModeDefaultEntry(p, token);
    }

    else
        p._err('Parse error');
}

function beforeHeadModeDefaultEntry(p, token) {
    p._explicitlyCreateElementAndInsert('head');
    p.headElement = p.currentNode;
    p._reprocessTokenInMode(IN_HEAD_MODE, token);
}


//12.2.5.4.4 The "in head" insertion mode
_[IN_HEAD_MODE] = {};
_[IN_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterInHead;
_[IN_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentInHead;
_[IN_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInHead;
_[IN_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagInHead;
_[IN_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagInHead;
_[IN_HEAD_MODE][Tokenizer.EOF_TOKEN] = inHeadModeDefaultEntry;

function characterInHead(p, token) {
    if (isWhitespaceCharacter(token.ch))
        p._insertCharacter(token);

    else
        inHeadModeDefaultEntry(p, token);
}

function commentInHead(p, token) {
    p._appendCommentNode(token);
}

function doctypeInHead(p, token) {
    p._err('Parse error');
}

function startTagInHead(p, token) {
    if (token.tagName === 'html') {
        //TODO Process the token using the rules for the "in body" insertion mode.
    }

    else if (token.tagName === 'base' || token.tagName === 'basefont' ||
             token.tagName === 'bgsound' || token.tagName === 'link') {
        p._appendElementForToken(token, true);
    }

    else if (token.tagName === 'meta')
        p._appendElementForToken(token, true);

    else if (token.tagName === 'title') {
        //TODO Follow the generic RCDATA element parsing algorithm.
    }

    //NOTE: here we assume that we always act as an interactive user agent with enabled scripting, so we parse
    //<noscript> as a rawtext.
    else if (token.tagName === 'noscript' || token.tagName === 'noframes' || token.tagName === 'style') {
        //TODO Follow the generic raw text element parsing algorithm.
    }

    else if (token.tagName === 'script') {
        p._insertElementForToken(token, false);
        p.tokenizer.switchToScriptDataState();
        p.originalInsertionMode = IN_HEAD_MODE;
        p.insertionMode = TEXT_MODE;
    }

    else if (token.tagName === 'head')
        p._err('Parsing error');

    else
        inHeadModeDefaultEntry(p, token);
}

function endTagInHead(p, token) {
    if (token.tagName === 'head') {
        p._popNodeOffOpenElementsStack();
        p.insertionMode = AFTER_HEAD_MODE;
    }

    else if (token.tagName === 'body' || token.tagName === 'br' || token.tagName === 'html')
        inHeadModeDefaultEntry(p, token);

    else
        this._err('Parse error');
}

function inHeadModeDefaultEntry(p, token) {
    p._popNodeOffOpenElementsStack();
    p._reprocessTokenInMode(AFTER_HEAD_MODE);
}

//12.2.5.4.6 The "after head" insertion mode
_[AFTER_HEAD_MODE] = {};
_[AFTER_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.EOF_TOKEN] = afterHeadModeDefaultEntry;

function characterAfterHead(p, token) {
    if (isWhitespaceCharacter(token.ch))
        p._insertCharacter(token);
    else
        afterHeadModeDefaultEntry(p, token);
}

function commentAfterHead(p, token) {
    p._appendCommentNode(token);
}

function doctypeAfterHead(p, token) {
    p._err('Parse error');
}

function startTagAfterHead(p, token) {
    if (token.tagName === 'html') {
        //TODO Process the token using the rules for the "in body" insertion mode.
    }

    else if (token.tagName === 'body') {
        p._insertElementForToken(token, false);
        p.framesetOk = false;
        p.insertionMode = IN_BODY_MODE;
    }

    else if (token.tagName === 'frameset') {
        p._insertElementForToken(token, false);
        p.insertionMode = IN_FRAMESET_MODE;
    }

    else if (token.tagName === 'base' || token.tagName === 'basefont' || token.tagName === 'bgsound' ||
             token.tagName === 'link' || token.tagName === 'meta' || token.tagName === 'noframes' ||
             token.tagName === 'script' || token.tagName === 'style' || token.tagName === 'title') {
        p._pushNodeToOpenElementsStack(p.headElement);
        startTagInHead(p, token);
        //TODO: should we just pop element here or search and exclude it from stack? Check it when
        //tests will be up and running
        p._popNodeOffOpenElementsStack();
    }

    else if (token.tagName === 'head')
        this._err('Parse error');

    else
        afterHeadModeDefaultEntry(p, token);
}

function endTagAfterHead(p, token) {
    if (token.tagName === 'body' || token.tagName === 'html' || token.tagName === 'br')
        afterHeadModeDefaultEntry(p, token);
    else
        this._err('Parse error');
}

function afterHeadModeDefaultEntry(p, token) {
    p._explicitlyCreateElementAndInsert('body');
    p._reprocessTokenInMode(IN_BODY_MODE, token);
}

//12.2.5.4.7 The "in body" insertion mode
function characterInBody(p, token) {
    if (token.ch === '\u0000')
        p._err('Parse error');

    else {
        //TODO Reconstruct the active formatting elements, if any.
        this._insertCharacter(token);

        if (!isWhitespaceCharacter(token.ch))
            p.framesetOk = false;
    }
}

function commentInBody(p, token) {
    p._appendCommentNode(token);
}

function doctypeInBody(p, token) {
    this._err('Parse error');
}

function startTagInBody(p, token) {
    if (token.tagName === 'html') {
        p._err('Parse error');
        //TODO
    }
}

//Parser
var Parser = exports.Parser = function (html) {
    this.tokenizer = new Tokenizer(html);
    this.errBuff = [];

    this.insertionMode = INITIAL_MODE;
    this.originalInsertionMode = '';

    this.currentNode = this.document = createDocument();
    this.headElement = null;
    this.openElementsStack = [];

    this.framesetOk = true;
};

Parser.prototype._err = function (msg) {
    this.errBuff.push(msg);
};

Parser.prototype._popNodeOffOpenElementsStack = function () {
    this.openElementsStack.pop();
    this.currentNode = this.openElementsStack[this.openElementsStack.length - 1];
};

Parser.prototype._pushNodeToOpenElementsStack = function (element) {
    this.openElementsStack.push(element);
    this.currentNode = element;
};

Parser.prototype._insertElement = function (element) {
    appendNode(this.currentNode, element);
    this._pushNodeToOpenElementsStack(element);
};

Parser.prototype._createElementForToken = function (startTagToken, selfClosingAcknowledged) {
    if (startTagToken.selfClosing && !selfClosingAcknowledged)
        this._err('Parse error');

    return createElement(startTagToken.tagName, startTagToken.attrs, HTML_NAMESPACE);
};

//TODO looks like selfClosingAcknowledged always set to false when we insert node and to true when we append node
//check this assumption when all insertion modes will be accomplished
Parser.prototype._insertElementForToken = function (startTagToken, selfClosingAcknowledged) {
    var element = this._createElementForToken(startTagToken, selfClosingAcknowledged);
    this._insertElement(element);
};

Parser.prototype._appendElementForToken = function (startTagToken, selfClosingAcknowledged) {
    var element = this._createElementForToken(startTagToken, selfClosingAcknowledged);
    this._insertElement(element);
};

Parser.prototype._explicitlyCreateElementAndInsert = function (tagName) {
    var element = createElement(tagName, [], HTML_NAMESPACE);
    this._insertElement(element);
};

Parser.prototype._appendCommentNode = function (commentToken) {
    var commentNode = createCommentNode(commentToken.data);
    appendNode(this.currentNode, commentNode);
};

Parser.prototype._insertCharacter = function (characterToken) {
    insertCharacterToNode(this.currentNode, characterToken.ch);
};

Parser.prototype._reprocessTokenInMode = function (token, mode) {
    this.insertionMode = mode;
    _[mode](this, token);
};