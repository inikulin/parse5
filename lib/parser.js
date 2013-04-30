var Tokenizer = require('./tokenizer').Tokenizer,
    OpenElementStack = require('./open_element_stack').OpenElementStack,
    defaultTreeBuilder = require('./default_tree_builder'),
    html = require('./html'),
    idioms = require('./idioms');

//Aliases
var $ = html.TAG_NAMES;

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

//Insertion mode token processors aliases
var _ = {};

_[INITIAL_MODE] = {};
_[INITIAL_MODE][Tokenizer.CHARACTER_TOKEN] = characterInInitialMode;
_[INITIAL_MODE][Tokenizer.COMMENT_TOKEN] = commentInInitialMode;
_[INITIAL_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInInitialMode;
_[INITIAL_MODE][Tokenizer.START_TAG_TOKEN] =
_[INITIAL_MODE][Tokenizer.END_TAG_TOKEN] =
_[INITIAL_MODE][Tokenizer.EOF_TOKEN] = initialModeDefaultEntry;

_[BEFORE_HTML_MODE] = {};
_[BEFORE_HTML_MODE][Tokenizer.CHARACTER_TOKEN] = characterBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.COMMENT_TOKEN] = commentBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.START_TAG_TOKEN] = startTagBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.END_TAG_TOKEN] = endTagBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.EOF_TOKEN] = beforeHtmlModeDefaultEntry;

_[BEFORE_HEAD_MODE] = {};
_[BEFORE_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.EOF_TOKEN] = beforeHeadModeDefaultEntry;

_[IN_HEAD_MODE] = {};
_[IN_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterInHead;
_[IN_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentInHead;
_[IN_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInHead;
_[IN_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagInHead;
_[IN_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagInHead;
_[IN_HEAD_MODE][Tokenizer.EOF_TOKEN] = inHeadModeDefaultEntry;

_[AFTER_HEAD_MODE] = {};
_[AFTER_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.EOF_TOKEN] = afterHeadModeDefaultEntry;

//Utils
function isWhitespaceCharacter(ch) {
    return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f';
}

function isSpecialElement(element) {
    var ns = idioms.SCOPING_ELEMENTS[element.tagName];

    return ns && ns.indexOf(element.namespaceURI) > -1;
}

//12.2.5.4.1 The "initial" insertion mode
//------------------------------------------------------------------
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
//------------------------------------------------------------------
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
    if (token.tagName === $.HTML) {
        p._insertElementForToken(token, false);
        p.insertionMode = BEFORE_HEAD_MODE;
    }

    else
        beforeHtmlModeDefaultEntry(p, token);
}

function endTagBeforeHtml(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML || tn === $.HEAD || tn === $.BODY || tn === $.BR)
        beforeHtmlModeDefaultEntry(p, token);

    else
        p._err('Parse error');
}

function beforeHtmlModeDefaultEntry(p, token) {
    p._explicitlyCreateElementAndInsert($.HTML);
    p._reprocessTokenInMode(BEFORE_HEAD_MODE, token);
}


//12.2.5.4.3 The "before head" insertion mode
//------------------------------------------------------------------
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

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.HEAD) {
        p._insertElementForToken(token, false);
        p.headElement = p.openElements.current;
        p.insertionMode = IN_HEAD_MODE;
    }

    else
        beforeHeadModeDefaultEntry(p, token);
}

function endTagBeforeHead(p, token) {
    var tn = token.tagName;

    if (tn === $.HEAD || tn === $.BODY || tn === $.HTML || tn === $.BR)
        beforeHeadModeDefaultEntry(p, token);

    else
        p._err('Parse error');
}

function beforeHeadModeDefaultEntry(p, token) {
    p._explicitlyCreateElementAndInsert($.HEAD);
    p.headElement = p.openElements.current;
    p._reprocessTokenInMode(IN_HEAD_MODE, token);
}


//12.2.5.4.4 The "in head" insertion mode
//------------------------------------------------------------------
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

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.BASE || tn === $.BASEFONT || tn === $.BGSOUND || tn === $.LINK || tn === $.META)
        p._appendElementForToken(token, true);

    else if (tn === $.TITLE)
        p._followGenericTextParsingAlgorithm(token, Tokenizer.RCDATA_STATE);

    //NOTE: here we assume that we always act as an interactive user agent with enabled scripting, so we parse
    //<noscript> as a rawtext.
    else if (tn === $.NOSCRIPT || tn === $.NOFRAMES || tn === $.STYLE)
        p._followGenericTextParsingAlgorithm(token, Tokenizer.RAWTEXT_STATE);

    else if (tn === $.SCRIPT) {
        p._insertElementForToken(token, false);
        p.tokenizer.state = Tokenizer.SCRIPT_DATA_STATE;
        p.originalInsertionMode = IN_HEAD_MODE;
        p.insertionMode = TEXT_MODE;
    }

    else if (tn === $.HEAD)
        p._err('Parsing error');

    else
        inHeadModeDefaultEntry(p, token);
}

function endTagInHead(p, token) {
    var tn = token.tagName;

    if (tn === $.HEAD) {
        p.openElements.pop();
        p.insertionMode = AFTER_HEAD_MODE;
    }

    else if (tn === $.BODY || tn === $.BR || tn === $.HTML)
        inHeadModeDefaultEntry(p, token);

    else
        p._err('Parse error');
}

function inHeadModeDefaultEntry(p, token) {
    p.openElements.pop();
    p._reprocessTokenInMode(AFTER_HEAD_MODE);
}


//12.2.5.4.6 The "after head" insertion mode
//------------------------------------------------------------------
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

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.BODY) {
        p._insertElementForToken(token, false);
        p.framesetOk = false;
        p.insertionMode = IN_BODY_MODE;
    }

    else if (tn === $.FRAMESET) {
        p._insertElementForToken(token, false);
        p.insertionMode = IN_FRAMESET_MODE;
    }

    else if (tn === $.BASE || tn === $.BASEFONT || tn === $.BGSOUND || tn === $.LINK || tn === $.META ||
             tn === $.NOFRAMES || tn === $.SCRIPT || tn === $.STYLE || tn === $.TITLE) {
        p.openElements.push(p.headElement);
        startTagInHead(p, token);
        //TODO: should we just pop element here or search and exclude it from stack? Check it when
        //tests will be up and running
        p.openElements.pop();
    }

    else if (tn === $.HEAD)
        p._err('Parse error');

    else
        afterHeadModeDefaultEntry(p, token);
}

function endTagAfterHead(p, token) {
    var tn = token.tagName;

    if (tn === $.BODY || tn === $.HTML || tn === $.BR)
        afterHeadModeDefaultEntry(p, token);
    else
        p._err('Parse error');
}

function afterHeadModeDefaultEntry(p, token) {
    p._explicitlyCreateElementAndInsert($.BODY);
    p._reprocessTokenInMode(IN_BODY_MODE, token);
}


//12.2.5.4.7 The "in body" insertion mode
//------------------------------------------------------------------
function characterInBody(p, token) {
    if (token.ch === '\u0000')
        p._err('Parse error');

    else {
        //TODO Reconstruct the active formatting elements, if any.
        p._insertCharacter(token);

        if (!isWhitespaceCharacter(token.ch))
            p.framesetOk = false;
    }
}

function commentInBody(p, token) {
    p._appendCommentNode(token);
}

function doctypeInBody(p, token) {
    p._err('Parse error');
}

var startTagInBodyProcessors = {};

startTagInBodyProcessors[$.HTML] = function (p, token) {
    p._err('Parse error');
    p.treeBuilder.adoptAttributes(p.openElements.current, token.attrs);
};

startTagInBodyProcessors[$.BASE] =
startTagInBodyProcessors[$.BASEFONT] =
startTagInBodyProcessors[$.BGSOUND] =
startTagInBodyProcessors[$.LINK] =
startTagInBodyProcessors[$.MENUITEM] =
startTagInBodyProcessors[$.META] =
startTagInBodyProcessors[$.SCRIPT] =
startTagInBodyProcessors[$.STYLE] =
startTagInBodyProcessors[$.TITLE] = startTagInHead;

startTagInBodyProcessors[$.BODY] = function (p, token) {
    p._err('Parse error');

    var bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();

    if (bodyElement) {
        p.framesetOk = false;
        p.treeBuilder.adoptAttributes(bodyElement, token.attrs);
    }
};

startTagInBodyProcessors[$.FRAMESET] = function (p, token) {
    p._err('Parse error');

    if (p.openElements.tryPeekProperlyNestedBodyElement()) {
        p.treeBuilder.detachNode(p.openElements.current);
        p.openElements.popAllUpToHtmlElement();
        p._insertElementForToken(token, false);
        p.insertionMode = IN_FRAMESET_MODE;
    }
};

startTagInBodyProcessors[$.ADDRESS] =
startTagInBodyProcessors[$.ARTICLE] =
startTagInBodyProcessors[$.ASIDE] =
startTagInBodyProcessors[$.BLOCKQUOTE] =
startTagInBodyProcessors[$.CENTER] =
startTagInBodyProcessors[$.DETAILS] =
startTagInBodyProcessors[$.DIR] =
startTagInBodyProcessors[$.DIV] =
startTagInBodyProcessors[$.DL] =
startTagInBodyProcessors[$.FIELDSET] =
startTagInBodyProcessors[$.FIGCAPTION] =
startTagInBodyProcessors[$.FIGURE] =
startTagInBodyProcessors[$.FOOTER] =
startTagInBodyProcessors[$.HEADER] =
startTagInBodyProcessors[$.HGROUP] =
startTagInBodyProcessors[$.MAIN] =
startTagInBodyProcessors[$.MENU] =
startTagInBodyProcessors[$.NAV] =
startTagInBodyProcessors[$.OL] =
startTagInBodyProcessors[$.P] =
startTagInBodyProcessors[$.SECTION] =
startTagInBodyProcessors[$.SUMMARY] =
startTagInBodyProcessors[$.UL] = function (p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        //TODO act as if an end tag with the tag name "p" had been seen.
    }

    p._insertElementForToken(token, false);
};

startTagInBodyProcessors[$.H1] =
startTagInBodyProcessors[$.H2] =
startTagInBodyProcessors[$.H3] =
startTagInBodyProcessors[$.H4] =
startTagInBodyProcessors[$.H5] =
startTagInBodyProcessors[$.H6] = function (p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        //TODO act as if an end tag with the tag name "p" had been seen.
    }

    var tn = p.openElements.current.tagName;

    if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6) {
        p._err('Parse error');
        p.openElements.pop();
    }

    p._insertElementForToken(token, false);
};

startTagInBodyProcessors[$.PRE] =
startTagInBodyProcessors[$.LISTING] = function (p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        //TODO act as if an end tag with the tag name "p" had been seen.
    }

    p._insertElementForToken(token, false);

    //TODO If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move on to the next one. (Newlines at the start of pre blocks are ignored as an authoring convenience.)
    p.framesetOk = false;
};

startTagInBodyProcessors[$.FORM] = function (p, token) {
    if (p.formElement)
        p._err('Parse error');

    else {
        if (p.openElements.hasInButtonScope($.P)) {
            //TODO act as if an end tag with the tag name "p" had been seen.
        }

        p._insertElementForToken(token, false);
        p.formElement = p.openElements.current;
    }
};

startTagInBodyProcessors[$.LI] =
startTagInBodyProcessors[$.DD] =
startTagInBodyProcessors[$.DT] = function (p, token) {
    var stopNames = token.tagName === $.LI ? [$.LI] : [$.DD, $.DT];

    p.framesetOk = false;

    for (var i = p.openElements.stackTop; i >= 0; i--) {
        var element = p.openElements.stack[i],
            tn = element.tagName;

        if (tn !== $.ADDRESS && tn !== $.DIV && tn !== $.P && isSpecialElement(element))
            break;

        if (stopNames.indexOf(tn) > -1) {
            //TODO  act as if an end tag with the same tag name as node had been seen, then jump to the last step.
            break;
        }
    }

    if (p.openElements.hasInButtonScope($.P)) {
        //TODO act as if an end tag with the tag name "p" had been seen.
    }

    p._insertElementForToken(token, false);
};

startTagInBodyProcessors[$.PLAINTEXT] = function (p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        //TODO act as if an end tag with the tag name "p" had been seen.
    }

    p._insertElementForToken(token, false);
    p.tokenizer.state = Tokenizer.PLAINTEXT_STATE;
};

startTagInBodyProcessors[$.BUTTON] = function (p, token) {
    if (p.openElements.hasInScope($.BUTTON)) {
        p._err('Parse error');
        //TODO act as if an end tag with the tag name "button" had been seen
        startTagInBody(p, token);
    }

    else {
        //TODO Reconstruct the active formatting elements, if any.
        p._insertElementForToken(token, false);
        p.framesetOk = false;
    }
};

//TODO implement active formatting elements list and move to next start tag

function startTagInBody(p, token) {
    var tn = token.tagName;

    if (startTagInBodyProcessors[tn])
        startTagInBodyProcessors[tn](p, token);
    else {
        //TODO default start tag processor
    }
}

//Parser
var Parser = exports.Parser = function (html, treeBuilder) {
    this.tokenizer = new Tokenizer(html);
    this.treeBuilder = treeBuilder || defaultTreeBuilder;
    this.errBuff = [];

    this.insertionMode = INITIAL_MODE;
    this.originalInsertionMode = '';

    this.document = this.treeBuilder.createDocument();
    this.headElement = null;
    this.formElement = null;
    this.openElements = new OpenElementStack(this.document);

    this.framesetOk = true;
};

Parser.prototype._err = function (msg) {
    this.errBuff.push(msg);
};

//Elements
Parser.prototype._insertElement = function (element) {
    this.treeBuilder.appendNode(this.openElements.current, element);
    this.openElements.push(element);
};

Parser.prototype._createElementForToken = function (token, selfClosingAcknowledged) {
    if (token.selfClosing && !selfClosingAcknowledged)
        this._err('Parse error');

    return this.treeBuilder.createElement(token.tagName, token.attrs, html.NAMESPACES.HTML);
};

//TODO looks like selfClosingAcknowledged always set to false when we insert node and to true when we append node
//check this assumption when all insertion modes will be accomplished
Parser.prototype._insertElementForToken = function (token, selfClosingAcknowledged) {
    var element = this._createElementForToken(token, selfClosingAcknowledged);
    this._insertElement(element);
};

Parser.prototype._appendElementForToken = function (token, selfClosingAcknowledged) {
    var element = this._createElementForToken(token, selfClosingAcknowledged);
    this._insertElement(element);
};

Parser.prototype._explicitlyCreateElementAndInsert = function (tagName) {
    var element = this.treeBuilder.createElement(tagName, [], html.NAMESPACES.HTML);
    this._insertElement(element);
};

Parser.prototype._appendCommentNode = function (token) {
    var commentNode = this.treeBuilder.createCommentNode(token.data);
    this.treeBuilder.appendNode(this.openElements.current, commentNode);
};

Parser.prototype._insertCharacter = function (token) {
    this.treeBuilder.insertCharacterToNode(this.openElements.current, token.ch);
};

Parser.prototype._followGenericTextParsingAlgorithm = function (token, tokenizerState) {
    this._insertElementForToken(token);
    this.tokenizer.state = tokenizerState;
    this.originalInsertionMode = this.insertionMode;
    this.insertionMode = TEXT_MODE;
};

//Insertion mode processing
Parser.prototype._reprocessTokenInMode = function (token, mode) {
    this.insertionMode = mode;
    _[mode][token.type](this, token);
};