var Tokenizer = require('./tokenizer').Tokenizer,
    defaultTreeBuilder = require('./default_tree_builder');

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
    var tn = token.tagName;

    if (tn === 'html' || tn === 'head' || tn === 'body' || tn === 'br')
        beforeHtmlModeDefaultEntry(p, token);

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
    var tn = token.tagName;

    if (tn === 'html')
        startTagInBody(p, token);

    else if (tn === 'head') {
        p._insertElementForToken(token, false);
        p.headElement = this.currentNode;
        p.insertionMode = IN_HEAD_MODE;
    }

    else
        beforeHeadModeDefaultEntry(p, token);
}

function endTagBeforeHead(p, token) {
    var tn = token.tagName;

    if (tn === 'head' || tn === 'body' || tn === 'html' || tn === 'br')
        beforeHeadModeDefaultEntry(p, token);

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
    var tn = token.tagName;

    if (tn === 'html')
        startTagInBody(p, token);

    else if (tn === 'base' || tn === 'basefont' || tn === 'bgsound' || tn === 'link')
        p._appendElementForToken(token, true);

    else if (tn === 'meta')
        p._appendElementForToken(token, true);

    else if (tn === 'title') {
        //TODO Follow the generic RCDATA element parsing algorithm.
    }

    //NOTE: here we assume that we always act as an interactive user agent with enabled scripting, so we parse
    //<noscript> as a rawtext.
    else if (tn === 'noscript' || tn === 'noframes' || tn === 'style') {
        //TODO Follow the generic raw text element parsing algorithm.
    }

    else if (tn === 'script') {
        p._insertElementForToken(token, false);
        p.tokenizer.switchToScriptDataState();
        p.originalInsertionMode = IN_HEAD_MODE;
        p.insertionMode = TEXT_MODE;
    }

    else if (tn === 'head')
        p._err('Parsing error');

    else
        inHeadModeDefaultEntry(p, token);
}

function endTagInHead(p, token) {
    var tn = token.tagName;

    if (tn === 'head') {
        p._popNodeOffOpenElementsStack();
        p.insertionMode = AFTER_HEAD_MODE;
    }

    else if (tn === 'body' || tn === 'br' || tn === 'html')
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
    var tn = token.tagName;

    if (tn === 'html')
        startTagInBody(p, token);

    else if (tn === 'body') {
        p._insertElementForToken(token, false);
        p.framesetOk = false;
        p.insertionMode = IN_BODY_MODE;
    }

    else if (tn === 'frameset') {
        p._insertElementForToken(token, false);
        p.insertionMode = IN_FRAMESET_MODE;
    }

    else if (tn === 'base' || tn === 'basefont' || tn === 'bgsound' || tn === 'link' || tn === 'meta' ||
             tn === 'noframes' || tn === 'script' || tn === 'style' || tn === 'title') {
        p._pushNodeToOpenElementsStack(p.headElement);
        startTagInHead(p, token);
        //TODO: should we just pop element here or search and exclude it from stack? Check it when
        //tests will be up and running
        p._popNodeOffOpenElementsStack();
    }

    else if (tn === 'head')
        this._err('Parse error');

    else
        afterHeadModeDefaultEntry(p, token);
}

function endTagAfterHead(p, token) {
    var tn = token.tagName;

    if (tn === 'body' || tn === 'html' || tn === 'br')
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
    var tn = token.tagName;

    if (tn === 'html') {
        p._err('Parse error');
        p.treeBuilder.adoptAttributes(p.currentNode, token.attrs);
    }

    else if (tn === 'base' || tn === 'basefont' || tn === 'bgsound' || tn === 'link' || tn === 'menuitem' ||
             tn === 'meta' || tn === 'noframes' || tn === 'script' || tn === 'style' || tn === 'title') {
        startTagInHead(p, token);
    }

    else if (tn === 'body') {
        p._err('Parse error');

        var secondOpenElement = p.openElementsStack[1];

        if (secondOpenElement && secondOpenElement.tagName === 'body') {
            p.framesetOk = false;
            p.treeBuilder.adoptAttributes(secondOpenElement, token.attrs);
        }
    }

    else if (tn === 'frameset') {
        p._err('Parse error');

        var secondOpenElement = p.openElementsStack[1];

        if (secondOpenElement && secondOpenElement.tagName === 'body' && p.framesetOk) {
            //TODO
        }
    }
}

//Parser
var Parser = exports.Parser = function (html, treeBuilder) {
    this.tokenizer = new Tokenizer(html);
    this.treeBuilder = treeBuilder || defaultTreeBuilder;
    this.errBuff = [];

    this.insertionMode = INITIAL_MODE;
    this.originalInsertionMode = '';

    this.currentNode = this.document = this.treeBuilder.createDocument();
    this.headElement = null;
    this.openElementsStack = [];

    this.framesetOk = true;
};

Parser.prototype._err = function (msg) {
    this.errBuff.push(msg);
};

//Open elements stack
Parser.prototype._popNodeOffOpenElementsStack = function () {
    this.openElementsStack.pop();
    this.currentNode = this.openElementsStack[this.openElementsStack.length - 1];
};

Parser.prototype._pushNodeToOpenElementsStack = function (element) {
    this.openElementsStack.push(element);
    this.currentNode = element;
};

//Insert element
Parser.prototype._insertElement = function (element) {
    this.treeBuilder.appendNode(this.currentNode, element);
    this._pushNodeToOpenElementsStack(element);
};

//Element for token
Parser.prototype._createElementForToken = function (startTagToken, selfClosingAcknowledged) {
    if (startTagToken.selfClosing && !selfClosingAcknowledged)
        this._err('Parse error');

    return this.treeBuilder.createElement(startTagToken.tagName, startTagToken.attrs, HTML_NAMESPACE);
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

//Explicityle create element
Parser.prototype._explicitlyCreateElementAndInsert = function (tagName) {
    var element = this.treeBuilder.createElement(tagName, [], HTML_NAMESPACE);
    this._insertElement(element);
};

//Comment node
Parser.prototype._appendCommentNode = function (commentToken) {
    var commentNode = this.treeBuilder.createCommentNode(commentToken.data);
    this.treeBuilder.appendNode(this.currentNode, commentNode);
};

//Insert character
Parser.prototype._insertCharacter = function (characterToken) {
    this.treeBuilder.insertCharacterToNode(this.currentNode, characterToken.ch);
};

//Insertion mode processing
Parser.prototype._reprocessTokenInMode = function (token, mode) {
    this.insertionMode = mode;
    _[mode](this, token);
};