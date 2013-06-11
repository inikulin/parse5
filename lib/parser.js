var Tokenizer = require('./tokenizer').Tokenizer,
    OpenElementStack = require('./open_element_stack').OpenElementStack,
    FormattingElementList = require('./formatting_element_list').FormattingElementList,
    defaultTreeAdapter = require('./default_tree_adapter'),
    idioms = require('./idioms'),
    unicode = require('./unicode'),
    HTML = require('./html');

//Aliases
var $ = HTML.TAG_NAMES,
    NAMESPACES = HTML.NAMESPACES;

//Attributes
var TYPE_ATTR = 'type',
    HIDDEN_INPUT_TYPE = 'hidden',
    COLOR_ATTR = 'color',
    FACE_ATTR = 'face',
    SIZE_ATTR = 'size';

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

//Insertion mode reset map
var INSERTION_MODE_RESET_MAP = {};

INSERTION_MODE_RESET_MAP[$.SELECT] = IN_SELECT_MODE;
INSERTION_MODE_RESET_MAP[$.TR] = IN_ROW_MODE;
INSERTION_MODE_RESET_MAP[$.TBODY] =
INSERTION_MODE_RESET_MAP[$.THEAD] =
INSERTION_MODE_RESET_MAP[$.TFOOT] = IN_TABLE_BODY_MODE;
INSERTION_MODE_RESET_MAP[$.CAPTION] = IN_CAPTION_MODE;
INSERTION_MODE_RESET_MAP[$.COLGROUP] = IN_COLUMN_GROUP_MODE;
INSERTION_MODE_RESET_MAP[$.TABLE] = IN_TABLE_MODE;
INSERTION_MODE_RESET_MAP[$.HEAD] =
INSERTION_MODE_RESET_MAP[$.BODY] = IN_BODY_MODE;
INSERTION_MODE_RESET_MAP[$.FRAMESET] = IN_FRAMESET_MODE;
INSERTION_MODE_RESET_MAP[$.HTML] = BEFORE_HEAD_MODE;

//Token handlers map for insertion modes
var _ = {};

_[INITIAL_MODE] = {};
_[INITIAL_MODE][Tokenizer.CHARACTER_TOKEN] = characterInInitialMode;
_[INITIAL_MODE][Tokenizer.COMMENT_TOKEN] = commentInInitialMode;
_[INITIAL_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInInitialMode;
_[INITIAL_MODE][Tokenizer.START_TAG_TOKEN] =
_[INITIAL_MODE][Tokenizer.END_TAG_TOKEN] =
_[INITIAL_MODE][Tokenizer.EOF_TOKEN] = initialModeDefaultHandler;

_[BEFORE_HTML_MODE] = {};
_[BEFORE_HTML_MODE][Tokenizer.CHARACTER_TOKEN] = characterBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.COMMENT_TOKEN] = commentBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.START_TAG_TOKEN] = startTagBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.END_TAG_TOKEN] = endTagBeforeHtml;
_[BEFORE_HTML_MODE][Tokenizer.EOF_TOKEN] = beforeHtmlModeDefaultHandler;

_[BEFORE_HEAD_MODE] = {};
_[BEFORE_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagBeforeHead;
_[BEFORE_HEAD_MODE][Tokenizer.EOF_TOKEN] = beforeHeadModeDefaultHandler;

_[IN_HEAD_MODE] = {};
_[IN_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterInHead;
_[IN_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentInHead;
_[IN_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInHead;
_[IN_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagInHead;
_[IN_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagInHead;
_[IN_HEAD_MODE][Tokenizer.EOF_TOKEN] = inHeadModeDefaultHandler;

_[AFTER_HEAD_MODE] = {};
_[AFTER_HEAD_MODE][Tokenizer.CHARACTER_TOKEN] = characterAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.COMMENT_TOKEN] = commentAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterHead;
_[AFTER_HEAD_MODE][Tokenizer.EOF_TOKEN] = afterHeadModeDefaultHandler;

_[IN_BODY_MODE] = {};
_[IN_BODY_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBody;
_[IN_BODY_MODE][Tokenizer.COMMENT_TOKEN] = commentInBody;
_[IN_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInBody;
_[IN_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagInBody;
_[IN_BODY_MODE][Tokenizer.END_TAG_TOKEN] = endTagInBody;
_[IN_BODY_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[TEXT_MODE] = {};
_[TEXT_MODE][Tokenizer.CHARACTER_TOKEN] = characterInText;
_[TEXT_MODE][Tokenizer.COMMENT_TOKEN] =
_[TEXT_MODE][Tokenizer.DOCTYPE_TOKEN] =
_[TEXT_MODE][Tokenizer.START_TAG_TOKEN] = doNothing;
_[TEXT_MODE][Tokenizer.END_TAG_TOKEN] = endTagInText;
_[TEXT_MODE][Tokenizer.EOF_TOKEN] = eofInText;

_[IN_TABLE_MODE] = {};
_[IN_TABLE_MODE][Tokenizer.CHARACTER_TOKEN] = characterInTable;
_[IN_TABLE_MODE][Tokenizer.COMMENT_TOKEN] = commentInTable;
_[IN_TABLE_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInTable;
_[IN_TABLE_MODE][Tokenizer.START_TAG_TOKEN] = startTagInTable;
_[IN_TABLE_MODE][Tokenizer.END_TAG_TOKEN] = endTagInTable;
_[IN_TABLE_MODE][Tokenizer.EOF_TOKEN] = eofInTable;

_[IN_TABLE_TEXT_MODE] = {};
_[IN_TABLE_TEXT_MODE][Tokenizer.CHARACTER_TOKEN] = characterInTableText;
_[IN_TABLE_TEXT_MODE][Tokenizer.COMMENT_TOKEN] =
_[IN_TABLE_TEXT_MODE][Tokenizer.DOCTYPE_TOKEN] =
_[IN_TABLE_TEXT_MODE][Tokenizer.START_TAG_TOKEN] =
_[IN_TABLE_TEXT_MODE][Tokenizer.END_TAG_TOKEN] =
_[IN_TABLE_TEXT_MODE][Tokenizer.EOF_TOKEN] = inTableTextModeDefaultHandler;

_[IN_CAPTION_MODE] = {};
_[IN_CAPTION_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBody;
_[IN_CAPTION_MODE][Tokenizer.COMMENT_TOKEN] = commentInBody;
_[IN_CAPTION_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInBody;
_[IN_CAPTION_MODE][Tokenizer.START_TAG_TOKEN] = startTagInCaption;
_[IN_CAPTION_MODE][Tokenizer.END_TAG_TOKEN] = endTagInCaption;
_[IN_CAPTION_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[IN_COLUMN_GROUP_MODE] = {};
_[IN_COLUMN_GROUP_MODE][Tokenizer.CHARACTER_TOKEN] = characterInColumnGroup;
_[IN_COLUMN_GROUP_MODE][Tokenizer.COMMENT_TOKEN] = commentInColumnGroup;
_[IN_COLUMN_GROUP_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInColumnGroup;
_[IN_COLUMN_GROUP_MODE][Tokenizer.START_TAG_TOKEN] = startTagInColumnGroup;
_[IN_COLUMN_GROUP_MODE][Tokenizer.END_TAG_TOKEN] = endTagInColumnGroup;
_[IN_COLUMN_GROUP_MODE][Tokenizer.EOF_TOKEN] = eofInColumnGroup;

_[IN_TABLE_BODY_MODE] = {};
_[IN_TABLE_BODY_MODE][Tokenizer.CHARACTER_TOKEN] = characterInTable;
_[IN_TABLE_BODY_MODE][Tokenizer.COMMENT_TOKEN] = commentInTable;
_[IN_TABLE_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInTable;
_[IN_TABLE_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagInTableBody;
_[IN_TABLE_BODY_MODE][Tokenizer.END_TAG_TOKEN] = endTagInTableBody;
_[IN_TABLE_BODY_MODE][Tokenizer.EOF_TOKEN] = eofInTable;

_[IN_ROW_MODE] = {};
_[IN_ROW_MODE][Tokenizer.CHARACTER_TOKEN] = characterInTable;
_[IN_ROW_MODE][Tokenizer.COMMENT_TOKEN] = commentInTable;
_[IN_ROW_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInTable;
_[IN_ROW_MODE][Tokenizer.START_TAG_TOKEN] = startTagInRow;
_[IN_ROW_MODE][Tokenizer.END_TAG_TOKEN] = endTagInRow;
_[IN_ROW_MODE][Tokenizer.EOF_TOKEN] = eofInTable;

_[IN_CELL_MODE] = {};
_[IN_CELL_MODE][Tokenizer.CHARACTER_TOKEN] = characterInBody;
_[IN_CELL_MODE][Tokenizer.COMMENT_TOKEN] = commentInBody;
_[IN_CELL_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInBody;
_[IN_CELL_MODE][Tokenizer.START_TAG_TOKEN] = startTagInCell;
_[IN_CELL_MODE][Tokenizer.END_TAG_TOKEN] = endTagInCell;
_[IN_CELL_MODE][Tokenizer.EOF_TOKEN] = eofInBody;

_[IN_SELECT_MODE] = {};
_[IN_SELECT_MODE][Tokenizer.CHARACTER_TOKEN] = characterInSelect;
_[IN_SELECT_MODE][Tokenizer.COMMENT_TOKEN] = commentInSelect;
_[IN_SELECT_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInSelect;
_[IN_SELECT_MODE][Tokenizer.START_TAG_TOKEN] = startTagInSelect;
_[IN_SELECT_MODE][Tokenizer.END_TAG_TOKEN] = endTagInSelect;
_[IN_SELECT_MODE][Tokenizer.EOF_TOKEN] = eofInSelect;

_[IN_SELECT_IN_TABLE_MODE] = {};
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.CHARACTER_TOKEN] = characterInSelect;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.COMMENT_TOKEN] = commentInSelect;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInSelect;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.START_TAG_TOKEN] = startTagInSelectInTable;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.END_TAG_TOKEN] = startTagInSelectInTable;
_[IN_SELECT_IN_TABLE_MODE][Tokenizer.EOF_TOKEN] = eofInSelect;

_[AFTER_BODY_MODE] = {};
_[AFTER_BODY_MODE][Tokenizer.CHARACTER_TOKEN] = characterAfterBody;
_[AFTER_BODY_MODE][Tokenizer.COMMENT_TOKEN] = commentAfterBody;
_[AFTER_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeAfterBody;
_[AFTER_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterBody;
_[AFTER_BODY_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterBody;
_[AFTER_BODY_MODE][Tokenizer.EOF_TOKEN] = eofAfterBody;

_[IN_FRAMESET_MODE] = {};
_[IN_FRAMESET_MODE][Tokenizer.CHARACTER_TOKEN] = characterInFrameset;
_[IN_FRAMESET_MODE][Tokenizer.COMMENT_TOKEN] = commentInFrameset;
_[IN_FRAMESET_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInFrameset;
_[IN_FRAMESET_MODE][Tokenizer.START_TAG_TOKEN] = startTagInFrameset;
_[IN_FRAMESET_MODE][Tokenizer.END_TAG_TOKEN] = endTagInFrameset;
_[IN_FRAMESET_MODE][Tokenizer.EOF_TOKEN] = eofInFrameset;

_[AFTER_FRAMESET_MODE] = {};
_[AFTER_FRAMESET_MODE][Tokenizer.CHARACTER_TOKEN] = characterAfterFrameset;
_[AFTER_FRAMESET_MODE][Tokenizer.COMMENT_TOKEN] = commentAfterFrameset;
_[AFTER_FRAMESET_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeAfterFrameset;
_[AFTER_FRAMESET_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterFrameset;
_[AFTER_FRAMESET_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterFrameset;
_[AFTER_FRAMESET_MODE][Tokenizer.EOF_TOKEN] = eofAfterFrameset;

_[AFTER_AFTER_BODY_MODE] = {};
_[AFTER_AFTER_BODY_MODE][Tokenizer.CHARACTER_TOKEN] = characterAfterAfterBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.COMMENT_TOKEN] = commentAfterAfterBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterAfterBody;
_[AFTER_AFTER_BODY_MODE][Tokenizer.END_TAG_TOKEN] = afterAfterBodyModeDefaultHandler;
_[AFTER_AFTER_BODY_MODE][Tokenizer.EOF_TOKEN] = eofAfterAfterBody;

_[AFTER_AFTER_FRAMESET_MODE] = {};
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.CHARACTER_TOKEN] = characterAfterAfterFrameset;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.COMMENT_TOKEN] = commentAfterAfterFrameset;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.DOCTYPE_TOKEN] = doctypeInBody;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.START_TAG_TOKEN] = startTagAfterAfterFrameset;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.END_TAG_TOKEN] = endTagAfterAfterFrameset;
_[AFTER_AFTER_FRAMESET_MODE][Tokenizer.EOF_TOKEN] = eofAfterAfterFrameset;

//Token handlers for foreign content
var foreignContentTokenHandlers = {};

//Utils
function doNothing() {
}

function isWhitespaceCharacter(ch) {
    return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f';
}

function getTokenAttr(token, attrName) {
    for (var i = token.attrs.length - 1; i >= 0; i--) {
        if (token.attrs[i].name === attrName)
            return token.attrs[i].value;
    }

    return null;
}

//Parser
var Parser = exports.Parser = function (html, treeAdapter) {
    this.tokenizer = new Tokenizer(html);
    this.treeAdapter = treeAdapter || defaultTreeAdapter;

    this.stopped = false;
    this.errBuff = [];

    this.insertionMode = INITIAL_MODE;
    this.originalInsertionMode = '';

    this.document = this.treeAdapter.createDocument();
    this.headElement = null;
    this.formElement = null;
    this.openElements = new OpenElementStack(this.document, this.treeAdapter);
    this.activeFormattingElements = new FormattingElementList(this.treeAdapter);
    this.pendingTableCharacterTokens = [];

    this.framesetOk = true;
};

Parser.prototype._err = function (msg) {
    this.errBuff.push(msg);
};

//Parse
Parser.prototype.parse = function () {
    while (!this.stopped) {
        var token = this.tokenizer.getToken();

        if (this._shouldProcessTokenInForeignContent(token))
            foreignContentTokenHandlers[token.type](this, token);

        else
            this._processToken(token);
    }

    return this.document;
};

Parser.prototype._parseText = function (currentToken, nextTokenizerState) {
    this._insertHtmlElementForToken(currentToken);
    this.tokenizer.state = nextTokenizerState;
    this.originalInsertionMode = this.insertionMode;
    this.insertionMode = TEXT_MODE;
};

//Create element
Parser.prototype._createElementForToken = function (token, namespaceURI, selfClosingAcknowledged) {
    if (token.selfClosing && !selfClosingAcknowledged)
        this._err('Parse error');

    return this.treeAdapter.createElement(token.tagName, token.attrs, namespaceURI);
};

//Tree mutation
Parser.prototype._appendHtmlElementForToken = function (token) {
    var element = this._createElementForToken(token, NAMESPACES.HTML, true);
    this.treeAdapter.appendNode(this.openElements.current, element);
};

Parser.prototype._insertHtmlElementForToken = function (token) {
    var element = this._createElementForToken(token, NAMESPACES.HTML, false);
    this.treeAdapter.appendNode(this.openElements.current, element);
    this.openElements.push(element);
};

Parser.prototype._insertFakeRootElement = function () {
    var element = this.treeAdapter.createElement($.HTML, [], NAMESPACES.HTML);
    this.treeAdapter.appendNode(this.openElements.current, element);
    this.openElements.push(element);
};

Parser.prototype._appendCommentNode = function (token) {
    var commentNode = this.treeAdapter.createCommentNode(token.data);
    this.treeAdapter.appendNode(this.openElements.current, commentNode);
};

Parser.prototype._appendCommentNodeToRootHtmlElement = function (token) {
    var commentNode = this.treeAdapter.createCommentNode(token.data);
    this.treeAdapter.appendNode(this.openElements.stack[0], commentNode);
};

Parser.prototype._appendCommentNodeToDocument = function (token) {
    var commentNode = this.treeAdapter.createCommentNode(token.data);
    this.treeAdapter.appendNode(this.document, commentNode);
};

Parser.prototype._insertCharacter = function (token) {
    this.treeAdapter.insertCharacterToNode(this.openElements.current, token.ch);
};

//Token processing
Parser.prototype._shouldProcessTokenInForeignContent = function (token) {
    var currentElement = this.openElements.current;

    if (currentElement === this.document || this.openElements.currentNamespaceURI === NAMESPACES.HTML)
        return false;

    if (this.openElements.isMathMLTextIntegrationPoint() &&
        (token.type === Tokenizer.CHARACTER_TOKEN || (token.type === Tokenizer.START_TAG_TOKEN &&
                                                      token.tagName !== $.MGLYPH &&
                                                      token.tagName !== $.MALIGNMARK))) {
        return false;
    }

    if (this.openElements.currentTagName === $.ANNOTATION_XML &&
        this.openElements.currentNamespaceURI === NAMESPACES.MATHML &&
        token.type === Tokenizer.START_TAG_TOKEN && token.tagName === $.SVG) {
        return false;
    }

    if (this.openElements.isHtmlIntegrationPoint() && (token.type === Tokenizer.START_TAG_TOKEN ||
                                                       token.type === Tokenizer.END_TAG_TOKEN)) {
        return false;
    }

    return token.type !== Tokenizer.EOF_TOKEN;
};

Parser.prototype._processToken = function (token) {
    _[this.insertionMode][token.type](this, token);
};

Parser.prototype._processFakeStartTag = function (tagName) {
    var fakeToken = this.tokenizer.buildStartTagToken(tagName);

    this._processToken(fakeToken);
    return fakeToken;
};

Parser.prototype._processFakeEndTag = function (tagName) {
    var fakeToken = this.tokenizer.buildEndTagToken(tagName);

    this._processToken(fakeToken);
    return fakeToken;
};

//Active formatting elements reconstruction
Parser.prototype._reconstructActiveFormattingElements = function () {
    var listLength = this.activeFormattingElements.length;

    if (listLength) {
        var unopenElementIdx = listLength,
            entry = null;

        for (var i = listLength - 1; i >= 0; i--) {
            entry = this.activeFormattingElements.list[i];

            if (entry.type === FormattingElementList.MARKER_ENTRY || this.openElements.contains(entry.element)) {
                unopenElementIdx = i + 1;
                break;
            }
        }

        for (var i = unopenElementIdx; i < listLength; i++) {
            entry = this.activeFormattingElements.list[i];
            //TODO here we should use _createElementForFormattingElementListEntry
            this._insertHtmlElementForToken(entry.token);
            entry.element = this.openElements.current;
        }
    }
};

//Check elements that should be closed after <body> tag
Parser.prototype._checkUnclosedElementsInBody = function () {
    for (var i = this.openElements.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getElementTagName(this.openElements.stack[i]);

        if (!idioms.CAN_REMAIN_OPEN_AFTER_BODY[tn]) {
            this._err('Parse error');
            break;
        }
    }
};

//Close cell
Parser.prototype._closeTableCell = function () {
    if (this.openElements.hasInTableScope($.TD))
        this._processFakeEndTag($.TD);

    else
        this._processFakeEndTag($.TH);
};

//Reset the insertion mode appropriately
Parser.prototype._resetInsertionModeAppropriately = function () {
    for (var i = this.openElements.stackTop, last = false; i >= 0; i--) {
        var element = this.openElements.stack[i];

        if (this.openElements.stack[0] === element) {
            last = true;
            //TODO set node to the context element. (fragment case)
        }

        var tn = this.treeAdapter.getElementTagName(element),
            resetInsertionMode = INSERTION_MODE_RESET_MAP[tn];

        if (resetInsertionMode) {
            this.insertionMode = resetInsertionMode;
            break;
        }

        else if (!last && (tn === $.TD || tn === $.TH)) {
            this.insertionMode = IN_CELL_MODE;
            break;
        }

        else if (last) {
            this.insertionMode = IN_BODY_MODE;
            break;
        }
    }
};

//Adoption agency alogrithm
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tree-construction.html#adoptionAgency)
Parser.prototype._obtainFormattingElementForAdoptionAgency = function (token) {
    //NOTE: step 4 of the algorithm
    var tn = token.tagName,
        formattingElement = this.activeFormattingElements.getElementInScopeWithTagName(tn);

    if (!formattingElement)
        endTagInBodyDefaultHandler(this, token);

    else if (this.openElements.contains(formattingElement)) {
        if (this.openElements.hasInScope(tn)) {
            if (formattingElement !== this.openElements.current)
                this._err('Parse error');
        }

        else {
            this._err('Parse error');
            formattingElement = null;
        }
    }

    else {
        this._err('Parse error');
        formattingElement = null;
    }

    return formattingElement;
};

Parser.prototype._obtainFurthestBlockForAdoptionAgency = function (formattingElement) {
    //NOTE: steps 5 and 6 of the algorithm
    var furthestBlock = null;

    for (var i = this.openElements.stackTop; i >= 0; i--) {
        var element = this.openElements.stack[i];

        if (element === formattingElement)
            break;

        if (this._isSpecialElement(element))
            furthestBlock = element;
    }

    if (!furthestBlock) {
        this.openElements.popUntilElementPopped(formattingElement);
        this.activeFormattingElements.remove(formattingElement);
    }

    return furthestBlock;
};

Parser.prototype._adoptionAgencyInnerLoop = function (furthestBlock, formattingElement) {
    var element = null,
        lastElement = furthestBlock,
        nextElement = this.openElements.getCommonAncestor(furthestBlock);

    for (var i = 0; i < 3; i++) {
        element = nextElement;

        //NOTE: store next element for the next loop iteration (it may be deleted from the stack by step 9.5)
        nextElement = this.openElements.getCommonAncestor(element);

        var elementEntry = this.activeFormattingElements.getElementEntry(element);

        if (!elementEntry) {
            this.openElements.remove(element);
            continue;
        }

        if (element === formattingElement)
            break;

        //TODO
    }
};

Parser.prototype._callAdoptionAgency = function (token) {
    for (var i = 0; i < 8; i++) {
        var formattingElement = this._obtainFormattingElementForAdoptionAgency(token);

        if (!formattingElement)
            break;

        var furthestBlock = this._obtainFurthestBlockForAdoptionAgency(formattingElement);

        if (!furthestBlock)
            break;

        var commonAncestor = this.openElements.getCommonAncestor(formattingElement),
            bookmark = this.activeFormattingElements.getElementBookmark(formattingElement);
    }
};

//Special elements
Parser.prototype._isSpecialElement = function (element) {
    var match = idioms.SPECIAL_ELEMENTS[this.treeAdapter.getElementTagName(element)];

    return match && match.indexOf(this.treeAdapter.getElementNamespaceURI(element)) > -1;
};

//12.2.5.4.1 The "initial" insertion mode
//------------------------------------------------------------------
function characterInInitialMode(p, token) {
    if (!isWhitespaceCharacter(token.ch))
        initialModeDefaultHandler(p, token);
}

function commentInInitialMode(p, token) {
    p._appendCommentNode(token)
}

function doctypeInInitialMode(p, token) {
    //TODO
}

function initialModeDefaultHandler(p, token) {
    p._err('Parse error');
    p.document.quirksMode = true;
    p.insertionMode = BEFORE_HTML_MODE;
    p._processToken(token);
}


//12.2.5.4.2 The "before html" insertion mode
//------------------------------------------------------------------
function characterBeforeHtml(p, token) {
    if (!isWhitespaceCharacter(token.ch))
        beforeHtmlModeDefaultHandler(p, token);
}

function commentBeforeHtml(p, token) {
    p._appendCommentNode(token);
}

function doctypeBeforeHtml(p, token) {
    p._err('Parse error');
}

function startTagBeforeHtml(p, token) {
    if (token.tagName === $.HTML) {
        p._insertHtmlElementForToken(token);
        p.insertionMode = BEFORE_HEAD_MODE;
    }

    else
        beforeHtmlModeDefaultHandler(p, token);
}

function endTagBeforeHtml(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML || tn === $.HEAD || tn === $.BODY || tn === $.BR)
        beforeHtmlModeDefaultHandler(p, token);

    else
        p._err('Parse error');
}

function beforeHtmlModeDefaultHandler(p, token) {
    p._insertFakeRootElement();
    p.insertionMode = BEFORE_HEAD_MODE;
    p._processToken(token);
}


//12.2.5.4.3 The "before head" insertion mode
//------------------------------------------------------------------
function characterBeforeHead(p, token) {
    if (!isWhitespaceCharacter(token.ch))
        beforeHeadModeDefaultHandler(p, token);
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
        p._insertHtmlElementForToken(token);
        p.headElement = p.openElements.current;
        p.insertionMode = IN_HEAD_MODE;
    }

    else
        beforeHeadModeDefaultHandler(p, token);
}

function endTagBeforeHead(p, token) {
    var tn = token.tagName;

    if (tn === $.HEAD || tn === $.BODY || tn === $.HTML || tn === $.BR)
        beforeHeadModeDefaultHandler(p, token);

    else
        p._err('Parse error');
}

function beforeHeadModeDefaultHandler(p, token) {
    p._processFakeStartTag($.HEAD);
    p._processToken(token);
}


//12.2.5.4.4 The "in head" insertion mode
//------------------------------------------------------------------
function characterInHead(p, token) {
    if (isWhitespaceCharacter(token.ch))
        p._insertCharacter(token);

    else
        inHeadModeDefaultHandler(p, token);
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
        p._appendHtmlElementForToken(token);

    else if (tn === $.TITLE)
        p._parseText(token, Tokenizer.RCDATA_STATE);

    //NOTE: here we assume that we always act as an interactive user agent with enabled scripting, so we parse
    //<noscript> as a rawtext.
    else if (tn === $.NOSCRIPT || tn === $.NOFRAMES || tn === $.STYLE)
        p._parseText(token, Tokenizer.RAWTEXT_STATE);

    else if (tn === $.SCRIPT) {
        p._insertHtmlElementForToken(token);
        p.tokenizer.state = Tokenizer.SCRIPT_DATA_STATE;
        p.originalInsertionMode = IN_HEAD_MODE;
        p.insertionMode = TEXT_MODE;
    }

    else if (tn === $.HEAD)
        p._err('Parsing error');

    else
        inHeadModeDefaultHandler(p, token);
}

function endTagInHead(p, token) {
    var tn = token.tagName;

    if (tn === $.HEAD) {
        p.openElements.pop();
        p.insertionMode = AFTER_HEAD_MODE;
    }

    else if (tn === $.BODY || tn === $.BR || tn === $.HTML)
        inHeadModeDefaultHandler(p, token);

    else
        p._err('Parse error');
}

function inHeadModeDefaultHandler(p, token) {
    p._processFakeEndTag($.HEAD);
    p._processToken(token);
}


//12.2.5.4.6 The "after head" insertion mode
//------------------------------------------------------------------
function characterAfterHead(p, token) {
    if (isWhitespaceCharacter(token.ch))
        p._insertCharacter(token);

    else
        afterHeadModeDefaultHandler(p, token);
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
        p._insertHtmlElementForToken(token);
        p.framesetOk = false;
        p.insertionMode = IN_BODY_MODE;
    }

    else if (tn === $.FRAMESET) {
        p._insertHtmlElementForToken(token);
        p.insertionMode = IN_FRAMESET_MODE;
    }

    else if (tn === $.BASE || tn === $.BASEFONT || tn === $.BGSOUND || tn === $.LINK || tn === $.META ||
             tn === $.NOFRAMES || tn === $.SCRIPT || tn === $.STYLE || tn === $.TITLE) {
        p.openElements.push(p.headElement);
        startTagInHead(p, token);
        p.openElements.remove(p.headElement);
    }

    else if (tn === $.HEAD)
        p._err('Parse error');

    else
        afterHeadModeDefaultHandler(p, token);
}

function endTagAfterHead(p, token) {
    var tn = token.tagName;

    if (tn === $.BODY || tn === $.HTML || tn === $.BR)
        afterHeadModeDefaultHandler(p, token);

    else
        p._err('Parse error');
}

function afterHeadModeDefaultHandler(p, token) {
    p._processFakeStartTag($.BODY);
    p._processToken(token);
}


//12.2.5.4.7 The "in body" insertion mode
//------------------------------------------------------------------
function characterInBody(p, token) {
    if (token.ch === unicode.NULL_CHARACTER)
        p._err('Parse error');

    else {
        p._reconstructActiveFormattingElements();
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

//Start tag in body handlers
var startTagInBodyHandlers = {};

startTagInBodyHandlers[$.HTML] = function htmlStartTagInBody(p, token) {
    p._err('Parse error');
    p.treeAdapter.adoptAttributes(p.openElements.current, token.attrs);
};

startTagInBodyHandlers[$.BASE] =
startTagInBodyHandlers[$.BASEFONT] =
startTagInBodyHandlers[$.BGSOUND] =
startTagInBodyHandlers[$.LINK] =
startTagInBodyHandlers[$.MENUITEM] =
startTagInBodyHandlers[$.META] =
startTagInBodyHandlers[$.SCRIPT] =
startTagInBodyHandlers[$.STYLE] =
startTagInBodyHandlers[$.TITLE] = startTagInHead;

startTagInBodyHandlers[$.BODY] = function bodyStartTagInBody(p, token) {
    p._err('Parse error');

    var bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();

    if (bodyElement) {
        p.framesetOk = false;
        p.treeAdapter.adoptAttributes(bodyElement, token.attrs);
    }
};

startTagInBodyHandlers[$.FRAMESET] = function framesetStartTagInBody(p, token) {
    p._err('Parse error');

    if (p.framesetOk && p.openElements.tryPeekProperlyNestedBodyElement()) {
        p.treeAdapter.detachNode(p.openElements.current);
        p.openElements.popAllUpToHtmlElement();
        p._insertHtmlElementForToken(token);
        p.insertionMode = IN_FRAMESET_MODE;
    }
};

startTagInBodyHandlers[$.ADDRESS] =
startTagInBodyHandlers[$.ARTICLE] =
startTagInBodyHandlers[$.ASIDE] =
startTagInBodyHandlers[$.BLOCKQUOTE] =
startTagInBodyHandlers[$.CENTER] =
startTagInBodyHandlers[$.DETAILS] =
startTagInBodyHandlers[$.DIR] =
startTagInBodyHandlers[$.DIV] =
startTagInBodyHandlers[$.DL] =
startTagInBodyHandlers[$.FIELDSET] =
startTagInBodyHandlers[$.FIGCAPTION] =
startTagInBodyHandlers[$.FIGURE] =
startTagInBodyHandlers[$.FOOTER] =
startTagInBodyHandlers[$.HEADER] =
startTagInBodyHandlers[$.HGROUP] =
startTagInBodyHandlers[$.MAIN] =
startTagInBodyHandlers[$.MENU] =
startTagInBodyHandlers[$.NAV] =
startTagInBodyHandlers[$.OL] =
startTagInBodyHandlers[$.P] =
startTagInBodyHandlers[$.SECTION] =
startTagInBodyHandlers[$.SUMMARY] =
startTagInBodyHandlers[$.UL] = function addressStartTagGroupInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._processFakeEndTag($.P);

    p._insertHtmlElementForToken(token);
};

startTagInBodyHandlers[$.H1] =
startTagInBodyHandlers[$.H2] =
startTagInBodyHandlers[$.H3] =
startTagInBodyHandlers[$.H4] =
startTagInBodyHandlers[$.H5] =
startTagInBodyHandlers[$.H6] = function numberedHeaderStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._processFakeEndTag($.P);

    var tn = p.openElements.currentTagName;

    if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6) {
        p._err('Parse error');
        p.openElements.pop();
    }

    p._insertHtmlElementForToken(token);
};

startTagInBodyHandlers[$.PRE] =
startTagInBodyHandlers[$.LISTING] = function preStartTagGroupInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._processFakeEndTag($.P);

    p._insertHtmlElementForToken(token);

    //TODO If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move on to the next one. (Newlines at the start of pre blocks are ignored as an authoring convenience.)
    p.framesetOk = false;
};

startTagInBodyHandlers[$.FORM] = function formStartTagInBody(p, token) {
    if (p.formElement)
        p._err('Parse error');

    else {
        if (p.openElements.hasInButtonScope($.P))
            p._processFakeEndTag($.P);

        p._insertHtmlElementForToken(token);
        p.formElement = p.openElements.current;
    }
};

startTagInBodyHandlers[$.LI] =
startTagInBodyHandlers[$.DD] =
startTagInBodyHandlers[$.DT] = function listItemGroupStartTagInBody(p, token) {
    p.framesetOk = false;

    for (var i = p.openElements.stackTop; i >= 0; i--) {
        var element = p.openElements.stack[i],
            tn = p.treeAdapter.getElementTagName(element);

        if (tn !== $.ADDRESS && tn !== $.DIV && tn !== $.P && p._isSpecialElement(element))
            break;

        if ((token.tagName === $.LI && tn === $.LI) ||
            ((token.tagName === $.DD || token.tagName === $.DT) && (tn === $.DD || tn == $.DT))) {
            p._processFakeEndTag(token.tagName);
            break;
        }
    }

    if (p.openElements.hasInButtonScope($.P))
        p._processFakeEndTag($.P);

    p._insertHtmlElementForToken(token);
};

startTagInBodyHandlers[$.PLAINTEXT] = function plaintextStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._processFakeEndTag($.P);

    p._insertHtmlElementForToken(token);
    p.tokenizer.state = Tokenizer.PLAINTEXT_STATE;
};

startTagInBodyHandlers[$.BUTTON] = function buttonStartTagInBody(p, token) {
    if (p.openElements.hasInScope($.BUTTON)) {
        p._err('Parse error');
        p._processFakeEndTag($.BUTTON);
        startTagInBodyHandlers[$.BUTTON](p, token);
    }

    else {
        p._reconstructActiveFormattingElements();
        p._insertHtmlElementForToken(token);
        p.framesetOk = false;
    }
};

startTagInBodyHandlers[$.A] = function aStartTagInBody(p, token) {
    var activeElement = p.activeFormattingElements.getElementInScopeWithTagName($.A);

    if (activeElement) {
        p._err('Parse error');
        p._processFakeEndTag($.A);
        p.openElements.remove(activeElement);
        p.activeFormattingElements.remove(activeElement);
    }

    p._reconstructActiveFormattingElements();
    p._insertHtmlElementForToken(token);
    p.activeFormattingElements.push(p.openElements.current, token);
};

startTagInBodyHandlers[$.B] =
startTagInBodyHandlers[$.BIG] =
startTagInBodyHandlers[$.CODE] =
startTagInBodyHandlers[$.EM] =
startTagInBodyHandlers[$.FONT] =
startTagInBodyHandlers[$.I] =
startTagInBodyHandlers[$.S] =
startTagInBodyHandlers[$.SMALL] =
startTagInBodyHandlers[$.STRIKE] =
startTagInBodyHandlers[$.STRONG] =
startTagInBodyHandlers[$.TT] =
startTagInBodyHandlers[$.U] = function bStartTagGroupInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertHtmlElementForToken(token);
    p.activeFormattingElements.push(p.openElements.current, token);
};

startTagInBodyHandlers[$.NOBR] = function nobrStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();

    if (p.openElements.hasInScope($.NOBR)) {
        p._err('Parse error');
        p._processFakeEndTag($.NOBR);
        p._reconstructActiveFormattingElements();
    }

    p._insertHtmlElementForToken(token);
    p.activeFormattingElements.push(p.openElements.current, token);
};

startTagInBodyHandlers[$.APPLET] =
startTagInBodyHandlers[$.MARQUEE] =
startTagInBodyHandlers[$.OBJECT] = function appletStartTagGroupInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertHtmlElementForToken(token);
    p.activeFormattingElements.insertMarker();
    p.framesetOk = false;
};

startTagInBodyHandlers[$.TABLE] = function tableStartTagInBody(p, token) {
    if (!p.document.quirksMode && p.openElements.hasInButtonScope($.P))
        p._processFakeEndTag($.P);

    p._insertHtmlElementForToken(token);
    p.framesetOk = false;
    p.insertionMode = IN_TABLE_MODE;
};

startTagInBodyHandlers[$.AREA] =
startTagInBodyHandlers[$.BR] =
startTagInBodyHandlers[$.EMBED] =
startTagInBodyHandlers[$.IMG] =
startTagInBodyHandlers[$.KEYGEN] =
startTagInBodyHandlers[$.WBR] = function areaStartTagGroupInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._appendHtmlElementForToken(token);
    p.framesetOk = false;
};

startTagInBodyHandlers[$.INPUT] = function inputStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._appendHtmlElementForToken(token);

    if (getTokenAttr(token, TYPE_ATTR).toLowerCase() === HIDDEN_INPUT_TYPE)
        p.framesetOk = false;

};

startTagInBodyHandlers[$.PARAM] =
startTagInBodyHandlers[$.SOURCE] =
startTagInBodyHandlers[$.TRACK] = function paramStartTagGroupInBody(p, token) {
    p._appendHtmlElementForToken(token);
};

startTagInBodyHandlers[$.HR] = function hrStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._processFakeEndTag($.P);

    p._appendHtmlElementForToken(token);
    p.framesetOk = false;
};

startTagInBodyHandlers[$.IMAGE] = function imageStartTagInBody(p, token) {
    p._err('Parse error');
    token.tagName = $.IMG;
    startTagInBodyHandlers[$.IMG](p, token);
};

startTagInBodyHandlers[$.ISINDEX] = function isindexStartTagInBody(p, token) {
    p._err('Parse error');

    if (!p.formElement) {
        //TODO
    }
};

startTagInBodyHandlers[$.TEXTAREA] = function textareaStartTagInBody(p, token) {
    p._insertHtmlElementForToken(token);
    //TODO If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move on to the next one. (Newlines at the start of textarea elements are ignored as an authoring convenience.)
    p.tokenizer.state = Tokenizer.RCDATA_STATE;
    p.originalInsertionMode = p.insertionMode;
    p.framesetOk = false;
    p.insertionMode = TEXT_MODE;
};

startTagInBodyHandlers[$.XMP] = function xmpStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P))
        p._processFakeEndTag($.P);

    p._reconstructActiveFormattingElements();
    p.framesetOk = false;
    p._parseText(token, Tokenizer.RAWTEXT_STATE);
};

startTagInBodyHandlers[$.IFRAME] = function iframeStartTagInBody(p, token) {
    p.framesetOk = false;
    p._parseText(token, Tokenizer.RAWTEXT_STATE);
};

//NOTE: here we assume that we always act as an interactive user agent with enabled scripting, so we parse
//<noscript> as a rawtext.
startTagInBodyHandlers[$.NOEMBED] =
startTagInBodyHandlers[$.NOSCRIPT] = function noembedStartTagGroupInBody(p, token) {
    p._parseText(token, Tokenizer.RAWTEXT_STATE);
};

startTagInBodyHandlers[$.SELECT] = function selectStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertHtmlElementForToken(token);
    p.framesetOk = false;

    if (p.insertionMode === IN_TABLE_MODE || p.insertionMode === IN_CAPTION_MODE ||
        p.insertionMode === IN_TABLE_BODY_MODE || p.insertionMode === IN_ROW_MODE ||
        p.insertionMode === IN_CELL_MODE) {
        p.insertionMode = IN_SELECT_IN_TABLE_MODE;
    }

    else
        p.insertionMode = IN_SELECT_MODE;
};

startTagInBodyHandlers[$.OPTGROUP] =
startTagInBodyHandlers[$.OPTION] = function optgroupStartTagInBody(p, token) {
    if (p.openElements.currentTagName === $.OPTION)
        p._processFakeEndTag($.OPTION);

    p._reconstructActiveFormattingElements();
    p._insertHtmlElementForToken(token);
};

startTagInBodyHandlers[$.RP] =
startTagInBodyHandlers[$.RT] = function rpStartTagGroupInBody(p, token) {
    if (p.openElements.hasInScope($.RUBY)) {
        p.openElements.generateImpliedEndTags();

        if (p.openElements.currentTagName !== $.RUBY)
            p._err('Parse error');
    }

    p._insertHtmlElementForToken(token);
};

startTagInBodyHandlers[$.MATH] = function mathStartTagInBody(p, token) {
    //TODO
};

startTagInBodyHandlers[$.SVG] = function svgStartTagInBody(p, token) {
    //TODO
};

startTagInBodyHandlers[$.CAPTION] =
startTagInBodyHandlers[$.COL] =
startTagInBodyHandlers[$.COLGROUP] =
startTagInBodyHandlers[$.FRAME] =
startTagInBodyHandlers[$.HEAD] =
startTagInBodyHandlers[$.TBODY] =
startTagInBodyHandlers[$.TD] =
startTagInBodyHandlers[$.TFOOT] =
startTagInBodyHandlers[$.TH] =
startTagInBodyHandlers[$.THEAD] =
startTagInBodyHandlers[$.TR] = function captionStartTagGroupInBody(p, token) {
    p._err('Parse error');
};

function startTagInBody(p, token) {
    var tn = token.tagName;

    if (startTagInBodyHandlers[tn])
        startTagInBodyHandlers[tn](p, token);

    else {
        p._reconstructActiveFormattingElements();
        p._insertHtmlElementForToken(token);
    }
}

//End tag in body
var endTagInBodyHandlers = {};

endTagInBodyHandlers[$.BODY] = function bodyEndTagInBody(p, token) {
    if (!p.openElements.hasInScope($.BODY)) {
        p._err('Parse error');
        token.ignored = true;
    }

    else {
        p._checkUnclosedElementsInBody();
        p.insertionMode = AFTER_BODY_MODE;
    }
};

endTagInBodyHandlers[$.HTML] = function htmlEndTagInBody(p, token) {
    var fakeToken = p._processFakeEndTag($.BODY);

    if (!fakeToken.ignored)
        p._processToken(token);
};

endTagInBodyHandlers[$.ADDRESS] =
endTagInBodyHandlers[$.ARTICLE] =
endTagInBodyHandlers[$.ASIDE] =
endTagInBodyHandlers[$.BLOCKQUOTE] =
endTagInBodyHandlers[$.CENTER] =
endTagInBodyHandlers[$.DETAILS] =
endTagInBodyHandlers[$.DIR] =
endTagInBodyHandlers[$.DIV] =
endTagInBodyHandlers[$.DL] =
endTagInBodyHandlers[$.FIELDSET] =
endTagInBodyHandlers[$.FIGCAPTION] =
endTagInBodyHandlers[$.FIGURE] =
endTagInBodyHandlers[$.FOOTER] =
endTagInBodyHandlers[$.HEADER] =
endTagInBodyHandlers[$.HGROUP] =
endTagInBodyHandlers[$.MAIN] =
endTagInBodyHandlers[$.MENU] =
endTagInBodyHandlers[$.NAV] =
endTagInBodyHandlers[$.OL] = 0
endTagInBodyHandlers[$.P] =
endTagInBodyHandlers[$.SECTION] =
endTagInBodyHandlers[$.SUMMARY] =
endTagInBodyHandlers[$.UL] = function addressEndTagGroupInBody(p, token) {
    var tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();

        if (p.openElements.currentTagName !== tn)
            p._err('Parse error');

        p.openElements.popUntilTagNamePopped(tn);
    }

    else
        p._err('Parse error');
};

endTagInBodyHandlers[$.FORM] = function formEndTagInBody(p, token) {
    var formElement = p.formElement;

    p.formElement = null;

    if (formElement && p.openElements.hasInScope($.FORM)) {
        p.openElements.generateImpliedEndTags();

        if (p.openElements.current !== formElement)
            p._err('Parse error');

        p.openElements.remove(formElement);
    }

    else
        p._err('Parse error');
};

endTagInBodyHandlers[$.P] = function pEndTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        p.openElements.generateImpliedEndTagsWithExclusion($.P);

        if (p.openElements.currentTagName !== $.P)
            p._err('Parse error');

        p.openElements.popUntilTagNamePopped($.P);
    }

    else {
        p._err('Parse error');
        p._processFakeStartTag($.P);
        p._processToken(token);
    }
};

endTagInBodyHandlers[$.LI] = function liEndTagInBody(p, token) {
    if (p.openElements.hasInListItemScope($.LI)) {
        p.openElements.generateImpliedEndTagsWithExclusion($.LI);

        if (p.openElements.currentTagName !== $.LI)
            p._err('Parse error');

        p.openElements.popUntilTagNamePopped($.LI);
    }

    else
        p._err('Parse error');
};

endTagInBodyHandlers[$.DD] =
endTagInBodyHandlers[$.DT] = function ddEndTagGroupInBody(p, token) {
    var tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTagsWithExclusion(tn);

        if (p.openElements.currentTagName !== tn)
            p._err('Parse error');

        p.openElements.popUntilTagNamePopped(tn);
    }

    else
        p._err('Parse error');
};

endTagInBodyHandlers[$.H1] =
endTagInBodyHandlers[$.H2] =
endTagInBodyHandlers[$.H3] =
endTagInBodyHandlers[$.H4] =
endTagInBodyHandlers[$.H5] =
endTagInBodyHandlers[$.H6] = function numberedHeaderEndTagInBody(p, token) {
    if (p.openElements.hasNumberedHeaderInScope()) {
        p.openElements.generateImpliedEndTags();

        var tn = token.tagName;

        if (p.openElements.currentTagName !== tn)
            p._err('Parse error');

        p.openElements.popUntilNumberedHeaderPopped();
    }
};

endTagInBodyHandlers[$.A] =
endTagInBodyHandlers[$.B] =
endTagInBodyHandlers[$.BIG] =
endTagInBodyHandlers[$.CODE] =
endTagInBodyHandlers[$.EM] =
endTagInBodyHandlers[$.FONT] =
endTagInBodyHandlers[$.I] =
endTagInBodyHandlers[$.NOBR] =
endTagInBodyHandlers[$.S] =
endTagInBodyHandlers[$.SMALL] =
endTagInBodyHandlers[$.STRIKE] =
endTagInBodyHandlers[$.STRONG] =
endTagInBodyHandlers[$.TT] =
endTagInBodyHandlers[$.U] = function aEndTagGroupInBody(p, token) {
    p._callAdoptionAgency(token);
};

endTagInBodyHandlers[$.APPLET] =
endTagInBodyHandlers[$.MARQUEE] =
endTagInBodyHandlers[$.OBJECT] = function appletEndTagInBody(p, token) {
    var tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();

        if (p.openElements.currentTagName !== tn)
            p._err('Parse error');

        p.openElements.popUntilTagNamePopped(tn);
        p.activeFormattingElements.clearToLastMarker();
    }

    else
        p._err('Parse error');
};

endTagInBodyHandlers[$.BR] = function brEndTagInBody(p, token) {
    p._err('Parse error');
    p._processFakeStartTag($.BR);
};


function endTagInBodyDefaultHandler(p, token) {
    var tn = token.tagName;

    for (var i = p.openElements.stackTop; i > 0; i--) {
        var element = p.openElements.stack[i];

        if (element.tagName === tn) {
            p.openElements.generateImpliedEndTagsWithExclusion(tn);

            if (p.openElements.currentTagName === tn)
                p._err('Parse error');

            p.openElements.popUntilElementPopped(element);
            break;
        }

        if (p._isSpecialElement(element)) {
            p._err('Parse error');
            break;
        }
    }
}

function endTagInBody(p, token) {
    var tn = token.tagName;

    if (endTagInBodyHandlers[tn])
        endTagInBodyHandlers[tn](p, token);

    else
        endTagInBodyDefaultHandler(p, token);
}

function eofInBody(p, token) {
    p._checkUnclosedElementsInBody();
    p.stopped = false;
}


//12.2.5.4.8 The "text" insertion mode
//------------------------------------------------------------------
function characterInText(p, token) {
    p._insertCharacter(token);
}

function endTagInText(p, token) {
    //NOTE: we are not in interactive user agent, so we don't process script here and just pop it out of the open
    //element stack like any other end tag.
    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
}

function eofInText(p, token) {
    p._err('Parse error');
    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
    p._processToken(token);
}

//12.2.5.4.9 The "in table" insertion mode
//------------------------------------------------------------------
function characterInTable(p, token) {
    var curTn = p.openElements.currentTagName;

    if (curTn === $.TABLE || curTn === $.TBODY || curTn === $.TFOOT || curTn === $.THEAD || curTn === $.TR) {
        p.pendingTableCharacterTokens = [];
        p.originalInsertionMode = p.insertionMode;
        p.insertionMode = IN_TABLE_TEXT_MODE;
        p._processToken(token);
    }

    else
        inTableModeDefaultHandler(p, token);
}

function commentInTable(p, token) {
    p._appendCommentNode(token);
}

function doctypeInTable(p, token) {
    p._err('Parse error');
}

//Start tag in table
var startTagInTableHandlers = {};

startTagInTableHandlers[$.CAPTION] = function captionStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p.activeFormattingElements.insertMarker();
    p._insertHtmlElementForToken(token);
    p.insertionMode = IN_CAPTION_MODE;
};

startTagInTableHandlers[$.COLGROUP] = function colgroupStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertHtmlElementForToken(token);
    p.insertionMode = IN_COLUMN_GROUP_MODE;
};

startTagInTableHandlers[$.COL] = function (p, token) {
    p._processFakeStartTag($.COLGROUP);
    p._processToken(token);
};

startTagInTableHandlers[$.TBODY] =
startTagInTableHandlers[$.TFOOT] =
startTagInTableHandlers[$.THEAD] = function tbodyStartTagGroupInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertHtmlElementForToken(token);
    p.insertionMode = IN_TABLE_BODY_MODE;
};

startTagInTableHandlers[$.TD] =
startTagInTableHandlers[$.TH] =
startTagInTableHandlers[$.TR] = function tdStartTagGroupInTable(p, token) {
    p._processFakeStartTag($.TBODY);
    p._processToken(token);
};

startTagInTableHandlers[$.TABLE] = function tableStartTagInTable(p, token) {
    p._err('Parse error');

    var fakeToken = p._processFakeEndTag($.TABLE);

    //NOTE: The fake end tag token here can only be ignored in the fragment case.
    if (!fakeToken.ignored)
        p._processToken(token);
};

startTagInTableHandlers[$.STYLE] =
startTagInTableHandlers[$.SCRIPT] = startTagInHead;

startTagInTableHandlers[$.INPUT] = function inputStartTagInTable(p, token) {
    if (getTokenAttr(token, TYPE_ATTR).toLowerCase() === HIDDEN_INPUT_TYPE) {
        p._err('Parse error');
        p._appendHtmlElementForToken(token);
    }

    else
        inTableModeDefaultHandler(p, token);
};

startTagInTableHandlers[$.FORM] = function formStartTagInTable(p, token) {
    p._err('Parse error');

    if (!p.formElement) {
        p._insertHtmlElementForToken(token);
        p.formElement = p.openElements.current;
        p.openElements.pop();
    }
};

function startTagInTable(p, token) {
    var tn = token.tagName;

    if (startTagInTableHandlers[tn])
        startTagInTableHandlers[tn](p, token);

    else
        inTableModeDefaultHandler(p, token);
}

function endTagInTable(p, token) {
    var tn = token.tagName;

    if (tn === $.TABLE) {
        if (p.openElements.hasInTableScope($.TABLE)) {
            p.openElements.popUntilTagNamePopped($.TABLE);
            p._resetInsertionModeAppropriately();
        }

        else {
            p._err('Parse error');
            token.ignored = true;
        }
    }

    else if (tn === $.BODY || tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.HTML ||
             tn === $.TBODY || tn === $.TD || tn === $.TFOOT || tn === $.TH || tn === $.THEAD || tn === $.TR) {
        p._err('Parse error');
    }

    else
        inTableModeDefaultHandler(p, token);
}

function eofInTable(p, token) {
    if (!p.openElements.isRootHtmlElementCurrent())
        p._err('Parse error');

    p.stopped = true;
}

function inTableModeDefaultHandler(p, token) {
    //TODO Parse error. Process the token using the rules for the "in body" insertion mode, except that whenever a node
    //would be inserted into the current node when the current node is a table, tbody, tfoot, thead, or tr
    //element, then it must instead be foster parented.
}


//12.2.5.4.10 The "in table text" insertion mode
//------------------------------------------------------------------
function characterInTableText(p, token) {
    if (token.ch === unicode.NULL_CHARACTER)
        p._err('Parse error');

    else
        p.pendingTableCharacterTokens.push(token);
}

function inTableTextModeDefaultHandler(p, token) {
    //TODO
}


//12.2.5.4.11 The "in caption" insertion mode
//------------------------------------------------------------------
function startTagInCaption(o, token) {
    var tn = token.tagName;

    if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.TBODY ||
        tn === $.TD || tn === $.TFOOT || tn === $.TH || tn === $.THEAD || tn === $.TR) {
        var fakeToken = p._processFakeEndTag($.CAPTION);

        //NOTE: The fake end tag token here can only be ignored in the fragment case.
        if (!fakeToken.ignored)
            p._processToken(token);
    }

    else
        startTagInBody(p, token);
}

function endTagInCaption(p, token) {
    var tn = token.tagName;

    if (tn === $.CAPTION) {
        if (p.openElements.hasInTableScope($.CAPTION)) {
            p.openElements.generateImpliedEndTags();

            if (p.openElements.currentTagName !== $.CAPTION)
                p._err('Parse error');

            p.openElements.popUntilTagNamePopped($.CAPTION);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = IN_TABLE_MODE;
        }

        else {
            p._err('Parse error');
            token.ignored = true;
        }
    }

    else if (tn === $.TABLE) {
        var fakeToken = p._processFakeEndTag($.CAPTION);

        //NOTE: The fake end tag token here can only be ignored in the fragment case.
        if (!fakeToken.ignored)
            p._processToken(token);
    }

    else if (tn === $.BODY || tn === $.COL || tn === $.COLGROUP || tn === $.HTML || tn === $.TBODY ||
             tn === $.TD || tn === $.TFOOT || tn === $.TH || tn === $.THEAD || tn === $.TR) {
        p._err('Parse error');
    }

    else
        endTagInBody(p, token);
}


//12.2.5.4.12 The "in column group" insertion mode
//------------------------------------------------------------------
function characterInColumnGroup(p, token) {
    if (isWhitespaceCharacter(token.ch))
        p._insertCharacter(token);

    else
        inColumnGroupModeDefaultHandler(p, token);
}

function commentInColumnGroup(p, token) {
    p._appendCommentNode(token);
}

function doctypeInColumnGroup(p, token) {
    p._err('Parse error');
}

function startTagInColumnGroup(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.COL)
        p._appendHtmlElementForToken(token);

    else
        inColumnGroupModeDefaultHandler(p, token);
}

function endTagInColumnGroup(p, token) {
    var tn = token.tagName;

    if (tn === $.COLGROUP) {
        if (p.openElements.isRootHtmlElementCurrent())
            p._err('Parse error');

        else {
            p.openElements.pop();
            p.insertionMode = IN_TABLE_MODE;
        }
    }

    else if (tn === $.COL)
        p._err('Parse error')

    else
        inColumnGroupModeDefaultHandler(p, token);
}

function eofInColumnGroup(p, token) {
    if (p.openElements.isRootHtmlElementCurrent())
        p.stopped = true;

    else
        inColumnGroupModeDefaultHandler(p, token);
}

function inColumnGroupModeDefaultHandler(p, token) {
    var fakeToken = p._processFakeEndTag($.COLGROUP);

    //NOTE: The fake end tag token here can only be ignored in the fragment case.
    if (!fakeToken.ignored)
        p._processToken(token);
}

//12.2.5.4.13 The "in table body" insertion mode
//------------------------------------------------------------------
function startTagInTableBody(p, token) {
    var tn = token.tagName;

    if (tn === $.TR) {
        p.openElements.clearBackToTableContext();
        p._insertHtmlElementForToken(token);
        p.insertionMode = IN_ROW_MODE;
    }

    else if (tn === $.TH || tn === $.TD) {
        p._err('Parse error');
        p._processFakeStartTag($.TR);
        p._processToken(token);
    }

    else if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP ||
             tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
        //TODO
    }

    else
        startTagInTable(p, token);
}

function endTagInTableBody(p, token) {
    var tn = token.tagName;

    if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.clearBackToTableContext();
            p.openElements.pop();
            p.insertionMode = IN_TABLE_MODE;
        }

        else
            p._err('Parse error');
    }

    else if (tn === $.TABLE) {
        //TODO
    }

    else if (tn === $.BODY || tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP ||
             tn === $.HTML || tn === $.TD || tn === $.TH || tn === $.TR) {
        p._err('Parse error');
    }

    else
        endTagInTable(p, token);
}

//12.2.5.4.14 The "in row" insertion mode
//------------------------------------------------------------------
function startTagInRow(p, token) {
    var tn = token.tagName;

    if (tn === $.TH || tn === $.TD) {
        p.openElements.clearBackToTableContext();
        p._insertHtmlElementForToken(token);
        p.insertionMode = IN_CELL_MODE;
        p.activeFormattingElements.insertMarker();
    }

    else if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.TBODY ||
             tn === $.TFOOT || tn === $.THEAD || tn === $.TR) {
        var fakeToken = p._processFakeEndTag($.TR);

        //NOTE: The fake end tag token here can only be ignored in the fragment case.
        if (!fakeToken.ignored)
            p._processToken(token);
    }

    else
        startTagInTable(p, token);
}

function endTagInRow(p, token) {
    var tn = token.tagName;

    if (tn === $.TR) {
        if (p.openElements.hasInTableScope($.TR)) {
            p.openElements.clearBackToTableRowContext();
            p.openElements.pop();
            p.insertionMode = IN_TABLE_BODY_MODE;
        }

        else {
            p._err('Parse error');
            token.ignored = true;
        }
    }

    else if (tn === $.TABLE) {
        var fakeToken = p._processFakeEndTag($.TR);

        //NOTE: The fake end tag token here can only be ignored in the fragment case.
        if (!fakeToken.ignored)
            p._processToken(token);
    }

    else if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
        if (p.openElements.hasInTableScope(tn)) {
            p._processFakeEndTag($.TR);
            p._processToken(token);
        }

        else
            p._err('Parse error');
    }

    else if (tn === $.BODY || tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP ||
             tn === $.HTML || tn === $.TD || tn === $.TH) {
        p._err('Parse error');
    }

    else
        endTagInTable(p, token);
}


//12.2.5.4.15 The "in cell" insertion mode
//------------------------------------------------------------------
function startTagInCell(p, token) {
    var tn = token.tagName;
    if (tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.TBODY ||
        tn === $.TD || tn === $.TFOOT || tn === $.TH || tn === $.THEAD || tn === $.TR) {
        if (p.openElements.hasInTableScope($.TD) || p.openElements.hasInTableScope($.TH)) {
            p._closeTableCell();
            p._processToken(token);
        }

        else
            p._err('Parse error');
    }

    else
        startTagInBody(p, token);
}

function endTagInCell(p, token) {
    var tn = token.tagName;

    if (tn === $.TD || tn === $.TH) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.generateImpliedEndTags();

            if (p.openElements.currentTagName !== tn)
                p._err('Parse error');

            p.openElements.popUntilTagNamePopped(tn);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = IN_ROW_MODE;
        }

        else
            p._err('Parse error');
    }

    else if (tn === $.BODY || tn === $.CAPTION || tn === $.COL || tn === $.COLGROUP || tn === $.HTML)
        p._err('Parse error');

    else if (tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD || tn === $.TR) {
        if (p.openElements.hasInTableScope(tn)) {
            p._closeTableCell();
            p._processToken(token);
        }

        else
            p._err('Parse error');
    }

    else
        endTagInBody(p, token);
}

//12.2.5.4.16 The "in select" insertion mode
//------------------------------------------------------------------
function characterInSelect(p, token) {
    if (token.ch === unicode.NULL_CHARACTER)
        p._err('Parse error');
    else
        p._insertCharacter(token);
}

function commentInSelect(p, token) {
    p._appendCommentNode(token);
}

function doctypeInSelect(p, token) {
    p._err('Parse error');
}

function startTagInSelect(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.OPTION) {
        if (p.openElements.currentTagName === $.OPTION)
            p._processFakeEndTag($.OPTION);

        p._insertHtmlElementForToken(token);
    }

    else if (tn === $.OPTGROUP) {
        if (p.openElements.currentTagName === $.OPTION)
            p._processFakeEndTag($.OPTION);

        if (p.openElements.currentTagName === $.OPTGROUP)
            p._processFakeEndTag($.OPTGROUP);

        p._insertHtmlElementForToken(token);
    }

    else if (tn === $.SELECT) {
        p._err('Parse error');
        p._processFakeEndTag($.SELECT);
    }

    else if (tn === $.INPUT || tn === $.KEYGEN || tn === $.TEXTAREA) {
        p._err('Parse error');

        if (p.openElements.hasInSelectScope($.SELECT)) {
            p._processFakeEndTag($.SELECT);
            p._processToken(token);
        }
    }

    else if (tn === $.SCRIPT)
        startTagInHead(p, token);

    else
        p._err('Parse error');
}

function endTagInSelect(p, token) {
    var tn = token.tagName;

    if (tn === $.OPTGROUP) {
        var prevOpenElement = p.openElements.stack[p.openElements.stackTop - 1],
            prevOpenElementTn = prevOpenElement && this.treeAdapter.getElementTagName(prevOpenElement);

        if (p.openElements.currentTagName === $.OPTION && prevOpenElementTn === $.OPTGROUP)
            p._processFakeEndTag($.OPTION);

        if (p.openElements.currentTagName === $.OPTGROUP)
            p.openElements.pop();

        else
            p._err('Parse error');
    }

    else if (tn === $.OPTION) {
        if (p.openElements.currentTagName === $.OPTION)
            p.openElements.pop();

        else
            p._err('Parse error');
    }

    else if (tn === $.SELECT) {
        if (p.openElements.hasInSelectScope($.SELECT)) {
            p.openElements.popUntilTagNamePopped($.SELECT);
            p._resetInsertionModeAppropriately();
        }

        else
            p._err('Parse error');
    }

    else
        p._err('Parse error');
}

function eofInSelect(p, token) {
    if (!p.openElements.isRootHtmlElementCurrent())
        p._err('Parse error');

    p.stopped = true;
}


//12.2.5.4.17 The "in select in table" insertion mode
//------------------------------------------------------------------
function startTagInSelectInTable(p, token) {
    var tn = token.tagName;

    if (tn === $.CAPTION || tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT ||
        tn === $.THEAD || tn === $.TR || tn === $.TD || tn === $.TH) {
        p._err('Parse error');
        p._processFakeEndTag($.SELECT);
        p._processToken(token);
    }

    else
        startTagInSelect(p, token);
}

function endTagInSelectInTable(p, token) {
    var tn = token.tagName;

    if (tn === $.CAPTION || tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT ||
        tn === $.THEAD || tn === $.TR || tn === $.TD || tn === $.TH) {
        p._err('Parse error');

        if (p.openElements.hasInTableScope(tn)) {
            p._processFakeEndTag($.SELECT);
            p._processToken(token);
        }
    }

    else
        endTagInSelect(p, token);
}

//12.2.5.4.18 The "after body" insertion mode
//------------------------------------------------------------------
function characterAfterBody(p, token) {
    if (isWhitespaceCharacter(token.ch))
        characterInBody(p, token);

    else
        afterBodyModeDefaultHandler(p, token);
}

function commentAfterBody(p, token) {
    p._appendCommentNodeToRootHtmlElement(token);
}

function doctypeAfterBody(p, token) {
    p._err('Parse error');
}

function startTagAfterBody(p, token) {
    if (token.tagName === $.HTML)
        startTagInBody(p, token);

    else
        afterBodyModeDefaultHandler(p, token);
}

function endTagAfterBody(p, token) {
    if (token.tagName === $.HTML) {
        //TODO If the parser was originally created as part of the HTML fragment parsing algorithm, this is a parse error; ignore the token. (fragment case)
        //Otherwise, switch the insertion mode to "after after body".
    }

    else
        afterBodyModeDefaultHandler(p, token);
}

function eofAfterBody(p, token) {
    p.stopped = true;
}

function afterBodyModeDefaultHandler(p, token) {
    p._err('Parse error');
    p.insertionMode = IN_BODY_MODE;
    p._processToken(token);
}

//12.2.5.4.19 The "in frameset" insertion mode
//------------------------------------------------------------------
function characterInFrameset(p, token) {
    if (isWhitespaceCharacter(token.ch))
        p._insertCharacter(token);

    else
        p._err('Parse error');
}

function commentInFrameset(p, token) {
    p._appendCommentNode(token);
}

function doctypeInFrameset(p, token) {
    p._err('Parse error');
}

function startTagInFrameset(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.FRAMESET)
        p._insertHtmlElementForToken(token);

    else if (tn === $.FRAME)
        p._appendHtmlElementForToken(token);

    else if (tn === $.NOFRAMES)
        startTagInHead(p, token);

    else
        p._err('Parse error');
}

function endTagInFrameset(p, token) {
    if (token.tagName === $.FRAMESET) {
        if (p.openElements.isRootHtmlElementCurrent())
            p._err('Parse error');

        else {
            p.openElements.pop();
            //TODO If the parser was not originally created as part of the HTML fragment parsing algorithm (fragment case),
            //and the current node is no longer a frameset element, then switch the insertion mode to "after frameset".
        }
    }

    else
        p._err('Parse error');
}

function eofInFrameset(p, token) {
    if (!p.openElements.isRootHtmlElementCurrent())
        p._err('Parse error');

    p.stopped = true;
}

//12.2.5.4.20 The "after frameset" insertion mode
//------------------------------------------------------------------
function characterAfterFrameset(p, token) {
    if (isWhitespaceCharacter(token.ch))
        p._insertCharacter(token);

    else
        p._err('Parse error');
}

function commentAfterFrameset(p, token) {
    p._appendCommentNode(token);
}

function doctypeAfterFrameset(p, token) {
    p._err('Parse error');
}

function startTagAfterFrameset(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.NOFRAMES)
        startTagInHead(p, token);

    else
        p._err('Parse error');
}

function endTagAfterFrameset(p, token) {
    if (token.tagName === $.HTML)
        p.insertionMode = AFTER_AFTER_FRAMESET_MODE;

    else
        p._err('Parse error');
}

function eofAfterFrameset(p, token) {
    p.stopped = true;
}

//12.2.5.4.21 The "after after body" insertion mode
//------------------------------------------------------------------
function characterAfterAfterBody(p, token) {
    if (isWhitespaceCharacter(token.ch))
        characterInBody(p, token);

    else
        afterAfterBodyModeDefaultHandler(p, token);
}

function commentAfterAfterBody(p, token) {
    p._appendCommentNodeToDocument(token);
}

function startTagAfterAfterBody(p, token) {
    if (token.tagName === $.HTML)
        startTagInBody(p, token);

    else
        afterAfterBodyModeDefaultHandler(p, token);
}

function eofAfterAfterBody(p, token) {
    p.stopped = true;
}

function afterAfterBodyModeDefaultHandler(p, token) {
    p._err('Parse error');
    p.insertionMode = IN_BODY_MODE;
    p._processToken(token);
}

//12.2.5.4.22 The "after after frameset" insertion mode
//------------------------------------------------------------------
function characterAfterAfterFrameset(p, token) {
    if (isWhitespaceCharacter(token.ch))
        characterInBody(p, token);

    else
        p._err('Parse error');
}

function commentAfterAfterFrameset(p, token) {
    p._appendCommentNodeToDocument(token);
}

function startTagAfterAfterFrameset(p, token) {
    var tn = token.tagName;

    if (tn === $.HTML)
        startTagInBody(p, token);

    else if (tn === $.NOFRAMES)
        startTagInHead(p, token);

    else
        p._err('Parse error');
}

function endTagAfterAfterFrameset(p, token) {
    p._err('Parse error');
}

function eofAfterAfterFrameset(p, token) {
    p.stopped = true;
}

//12.2.5.5 The rules for parsing tokens in foreign content
//------------------------------------------------------------------
function characterInForeignContent(p, token) {
    if (token.ch === unicode.NULL_CHARACTER) {
        p._err('Parse error');
        token.ch = unicode.REPLACEMENT_CHARACTER;
        p._insertCharacter(token);
    }

    else {
        p._insertCharacter(token);
        p.framesetOk &= isWhitespaceCharacter(token.ch);
    }
}

function commentInForeignContent(p, token) {
    p._appendCommentNode(token);
}

function doctypeInForeignContent(p, token) {
    p._err('Parse error');
}

function startTagInForeignContent(p, token) {
    var tn = token.tagName;

    if (idioms.NOT_ALLOWED_IN_FOREIGN_CONTENT[tn] ||
        (tn === $.FONT && (getTokenAttr(token, COLOR_ATTR) !== null ||
                           getTokenAttr(token, FACE_ATTR) !== null ||
                           getTokenAttr(token, SIZE_ATTR) !== null))) {
        p._err('Parse error');
        //TODO If the parser was originally created for the HTML fragment parsing algorithm, then act as described in the "any other start tag" entry below. (fragment case)
        //TODO
    }
}
