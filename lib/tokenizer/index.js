'use strict';

var Preprocessor = require('./preprocessor'),
    unicode = require('../common/unicode'),
    neTree = require('./named_entity_data'),
    ERR = require('../common/error_codes');

//Aliases
var $ = unicode.CODE_POINTS,
    $$ = unicode.CODE_POINT_SEQUENCES;

//C1 Unicode control character reference replacements
var C1_CONTROLS_REFERENCE_REPLACEMENTS = {
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
    0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018,
    0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC,
    0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178
};

// Named entity tree flags
var HAS_DATA_FLAG = 1 << 0;
var DATA_DUPLET_FLAG = 1 << 1;
var HAS_BRANCHES_FLAG = 1 << 2;
var MAX_BRANCH_MARKER_VALUE = HAS_DATA_FLAG | DATA_DUPLET_FLAG | HAS_BRANCHES_FLAG;


//States
var DATA_STATE = 'DATA_STATE',
    RCDATA_STATE = 'RCDATA_STATE',
    RAWTEXT_STATE = 'RAWTEXT_STATE',
    SCRIPT_DATA_STATE = 'SCRIPT_DATA_STATE',
    PLAINTEXT_STATE = 'PLAINTEXT_STATE',
    TAG_OPEN_STATE = 'TAG_OPEN_STATE',
    END_TAG_OPEN_STATE = 'END_TAG_OPEN_STATE',
    TAG_NAME_STATE = 'TAG_NAME_STATE',
    RCDATA_LESS_THAN_SIGN_STATE = 'RCDATA_LESS_THAN_SIGN_STATE',
    RCDATA_END_TAG_OPEN_STATE = 'RCDATA_END_TAG_OPEN_STATE',
    RCDATA_END_TAG_NAME_STATE = 'RCDATA_END_TAG_NAME_STATE',
    RAWTEXT_LESS_THAN_SIGN_STATE = 'RAWTEXT_LESS_THAN_SIGN_STATE',
    RAWTEXT_END_TAG_OPEN_STATE = 'RAWTEXT_END_TAG_OPEN_STATE',
    RAWTEXT_END_TAG_NAME_STATE = 'RAWTEXT_END_TAG_NAME_STATE',
    SCRIPT_DATA_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_END_TAG_OPEN_STATE = 'SCRIPT_DATA_END_TAG_OPEN_STATE',
    SCRIPT_DATA_END_TAG_NAME_STATE = 'SCRIPT_DATA_END_TAG_NAME_STATE',
    SCRIPT_DATA_ESCAPE_START_STATE = 'SCRIPT_DATA_ESCAPE_START_STATE',
    SCRIPT_DATA_ESCAPE_START_DASH_STATE = 'SCRIPT_DATA_ESCAPE_START_DASH_STATE',
    SCRIPT_DATA_ESCAPED_STATE = 'SCRIPT_DATA_ESCAPED_STATE',
    SCRIPT_DATA_ESCAPED_DASH_STATE = 'SCRIPT_DATA_ESCAPED_DASH_STATE',
    SCRIPT_DATA_ESCAPED_DASH_DASH_STATE = 'SCRIPT_DATA_ESCAPED_DASH_DASH_STATE',
    SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE = 'SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE',
    SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE = 'SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE',
    BEFORE_ATTRIBUTE_NAME_STATE = 'BEFORE_ATTRIBUTE_NAME_STATE',
    ATTRIBUTE_NAME_STATE = 'ATTRIBUTE_NAME_STATE',
    AFTER_ATTRIBUTE_NAME_STATE = 'AFTER_ATTRIBUTE_NAME_STATE',
    BEFORE_ATTRIBUTE_VALUE_STATE = 'BEFORE_ATTRIBUTE_VALUE_STATE',
    ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE = 'ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE',
    ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE = 'ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE',
    ATTRIBUTE_VALUE_UNQUOTED_STATE = 'ATTRIBUTE_VALUE_UNQUOTED_STATE',
    AFTER_ATTRIBUTE_VALUE_QUOTED_STATE = 'AFTER_ATTRIBUTE_VALUE_QUOTED_STATE',
    SELF_CLOSING_START_TAG_STATE = 'SELF_CLOSING_START_TAG_STATE',
    BOGUS_COMMENT_STATE = 'BOGUS_COMMENT_STATE',
    MARKUP_DECLARATION_OPEN_STATE = 'MARKUP_DECLARATION_OPEN_STATE',
    COMMENT_START_STATE = 'COMMENT_START_STATE',
    COMMENT_START_DASH_STATE = 'COMMENT_START_DASH_STATE',
    COMMENT_STATE = 'COMMENT_STATE',
    COMMENT_LESS_THAN_SIGN_STATE = 'COMMENT_LESS_THAN_SIGN_STATE',
    COMMENT_LESS_THAN_SIGN_BANG_STATE = 'COMMENT_LESS_THAN_SIGN_BANG_STATE',
    COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE = 'COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE',
    COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE = 'COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE',
    COMMENT_END_DASH_STATE = 'COMMENT_END_DASH_STATE',
    COMMENT_END_STATE = 'COMMENT_END_STATE',
    COMMENT_END_BANG_STATE = 'COMMENT_END_BANG_STATE',
    DOCTYPE_STATE = 'DOCTYPE_STATE',
    BEFORE_DOCTYPE_NAME_STATE = 'BEFORE_DOCTYPE_NAME_STATE',
    DOCTYPE_NAME_STATE = 'DOCTYPE_NAME_STATE',
    AFTER_DOCTYPE_NAME_STATE = 'AFTER_DOCTYPE_NAME_STATE',
    AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE = 'AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE',
    BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE = 'BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE',
    DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE = 'DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE',
    DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE = 'DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE',
    AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE = 'AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE',
    BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE = 'BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE',
    AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE = 'AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE',
    BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE = 'BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE',
    DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE = 'DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE',
    DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE = 'DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE',
    AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE = 'AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE',
    BOGUS_DOCTYPE_STATE = 'BOGUS_DOCTYPE_STATE',
    CDATA_SECTION_STATE = 'CDATA_SECTION_STATE',
    CDATA_SECTION_BRACKET_STATE = 'CDATA_SECTION_BRACKET_STATE',
    CDATA_SECTION_END_STATE = 'CDATA_SECTION_END_STATE',
    CHARACTER_REFERENCE_STATE = 'CHARACTER_REFERENCE_STATE',
    NAMED_CHARACTER_REFERENCE_STATE = 'NAMED_CHARACTER_REFERENCE_STATE',
    AMBIGUOUS_AMPERSAND_STATE = 'AMBIGUOS_AMPERSAND_STATE',
    NUMERIC_CHARACTER_REFERENCE_STATE = 'NUMERIC_CHARACTER_REFERENCE_STATE',
    HEXADEMICAL_CHARACTER_REFERENCE_START_STATE = 'HEXADEMICAL_CHARACTER_REFERENCE_START_STATE',
    DECIMAL_CHARACTER_REFERENCE_START_STATE = 'DECIMAL_CHARACTER_REFERENCE_START_STATE',
    HEXADEMICAL_CHARACTER_REFERENCE_STATE = 'HEXADEMICAL_CHARACTER_REFERENCE_STATE',
    DECIMAL_CHARACTER_REFERENCE_STATE = 'DECIMAL_CHARACTER_REFERENCE_STATE',
    NUMERIC_CHARACTER_REFERENCE_END_STATE = 'NUMERIC_CHARACTER_REFERENCE_END_STATE';


//Utils

//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').
function isWhitespace(cp) {
    return cp === $.SPACE || cp === $.LINE_FEED || cp === $.TABULATION || cp === $.FORM_FEED;
}

function isAsciiDigit(cp) {
    return cp >= $.DIGIT_0 && cp <= $.DIGIT_9;
}

function isAsciiUpper(cp) {
    return cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_Z;
}

function isAsciiLower(cp) {
    return cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_Z;
}

function isAsciiLetter(cp) {
    return isAsciiLower(cp) || isAsciiUpper(cp);
}

function isAsciiAlphaNumeric(cp) {
    return isAsciiLetter(cp) || isAsciiDigit(cp);
}

function isAsciiUpperHexDigit(cp) {
    return cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_F;
}

function isAsciiLowerHexDigit(cp) {
    return cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_F;
}

function isAsciiHexDigit(cp) {
    return isAsciiDigit(cp) || isAsciiUpperHexDigit(cp) || isAsciiLowerHexDigit(cp);
}

function toAsciiLowerCodePoint(cp) {
    return cp + 0x0020;
}

//NOTE: String.fromCharCode() function can handle only characters from BMP subset.
//So, we need to workaround this manually.
//(see: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/fromCharCode#Getting_it_to_work_with_higher_values)
function toChar(cp) {
    if (cp <= 0xFFFF)
        return String.fromCharCode(cp);

    cp -= 0x10000;
    return String.fromCharCode(cp >>> 10 & 0x3FF | 0xD800) + String.fromCharCode(0xDC00 | cp & 0x3FF);
}

function toAsciiLowerChar(cp) {
    return String.fromCharCode(toAsciiLowerCodePoint(cp));
}

function findNamedEntityTreeBranch(nodeIx, cp) {
    var branchCount = neTree[++nodeIx],
        lo = ++nodeIx,
        hi = lo + branchCount - 1;

    while (lo <= hi) {
        var mid = lo + hi >>> 1,
            midCp = neTree[mid];

        if (midCp < cp)
            lo = mid + 1;

        else if (midCp > cp)
            hi = mid - 1;

        else
            return neTree[mid + branchCount];
    }

    return -1;
}


//Tokenizer
var Tokenizer = module.exports = function () {
    this.preprocessor = new Preprocessor();

    this.tokenQueue = [];

    this.allowCDATA = false;

    this.state = DATA_STATE;
    this.returnState = '';

    this.charRefCode = -1;
    this.tempBuff = [];
    this.lastStartTagName = '';

    this.consumedAfterSnapshot = -1;
    this.active = false;

    this.currentCharacterToken = null;
    this.currentToken = null;
    this.currentAttr = null;
};

//Token types
Tokenizer.CHARACTER_TOKEN = 'CHARACTER_TOKEN';
Tokenizer.NULL_CHARACTER_TOKEN = 'NULL_CHARACTER_TOKEN';
Tokenizer.WHITESPACE_CHARACTER_TOKEN = 'WHITESPACE_CHARACTER_TOKEN';
Tokenizer.START_TAG_TOKEN = 'START_TAG_TOKEN';
Tokenizer.END_TAG_TOKEN = 'END_TAG_TOKEN';
Tokenizer.COMMENT_TOKEN = 'COMMENT_TOKEN';
Tokenizer.DOCTYPE_TOKEN = 'DOCTYPE_TOKEN';
Tokenizer.EOF_TOKEN = 'EOF_TOKEN';
Tokenizer.HIBERNATION_TOKEN = 'HIBERNATION_TOKEN';

//Tokenizer initial states for different modes
Tokenizer.MODE = {
    DATA: DATA_STATE,
    RCDATA: RCDATA_STATE,
    RAWTEXT: RAWTEXT_STATE,
    SCRIPT_DATA: SCRIPT_DATA_STATE,
    PLAINTEXT: PLAINTEXT_STATE
};

//Static
Tokenizer.getTokenAttr = function (token, attrName) {
    for (var i = token.attrs.length - 1; i >= 0; i--) {
        if (token.attrs[i].name === attrName)
            return token.attrs[i].value;
    }

    return null;
};

//Errors
Tokenizer.prototype._err = function () {
    // NOTE: err reporting is noop by default. Enabled by mixin.
};

Tokenizer.prototype._errOnNextCodePoint = function (err) {
    this._consume();
    this._err(err);
    this._unconsume();
};

//API
Tokenizer.prototype.getNextToken = function () {
    while (!this.tokenQueue.length && this.active) {
        this.consumedAfterSnapshot = 0;

        var cp = this._consume();

        if (!this._ensureHibernation())
            this[this.state](cp);
    }

    return this.tokenQueue.shift();
};

Tokenizer.prototype.write = function (chunk, isLastChunk) {
    this.active = true;
    this.preprocessor.write(chunk, isLastChunk);
};

Tokenizer.prototype.insertHtmlAtCurrentPos = function (chunk) {
    this.active = true;
    this.preprocessor.insertHtmlAtCurrentPos(chunk);
};

//Hibernation
Tokenizer.prototype._ensureHibernation = function () {
    if (this.preprocessor.endOfChunkHit) {
        for (; this.consumedAfterSnapshot > 0; this.consumedAfterSnapshot--)
            this.preprocessor.retreat();

        this.active = false;
        this.tokenQueue.push({type: Tokenizer.HIBERNATION_TOKEN});

        return true;
    }

    return false;
};


//Consumption
Tokenizer.prototype._consume = function () {
    this.consumedAfterSnapshot++;
    return this.preprocessor.advance();
};

Tokenizer.prototype._unconsume = function () {
    this.consumedAfterSnapshot--;
    this.preprocessor.retreat();
};

Tokenizer.prototype._reconsumeInState = function (state) {
    this.state = state;
    this._unconsume();
};

Tokenizer.prototype._consumeSequenceIfMatch = function (pattern, startCp, caseSensitive) {
    var consumedCount = 0,
        isMatch = true,
        patternLength = pattern.length,
        patternPos = 0,
        cp = startCp,
        patternCp = void 0;

    for (; patternPos < patternLength; patternPos++) {
        if (patternPos > 0) {
            cp = this._consume();
            consumedCount++;
        }

        if (cp === $.EOF) {
            isMatch = false;
            break;
        }

        patternCp = pattern[patternPos];

        if (cp !== patternCp && (caseSensitive || cp !== toAsciiLowerCodePoint(patternCp))) {
            isMatch = false;
            break;
        }
    }

    if (!isMatch) {
        while (consumedCount--)
            this._unconsume();
    }

    return isMatch;
};


//Temp buffer
Tokenizer.prototype._isTempBufferEqualToScriptString = function () {
    if (this.tempBuff.length !== $$.SCRIPT_STRING.length)
        return false;

    for (var i = 0; i < this.tempBuff.length; i++) {
        if (this.tempBuff[i] !== $$.SCRIPT_STRING[i])
            return false;
    }

    return true;
};

//Token creation
Tokenizer.prototype._createStartTagToken = function () {
    this.currentToken = {
        type: Tokenizer.START_TAG_TOKEN,
        tagName: '',
        selfClosing: false,
        ackSelfClosing: false,
        attrs: []
    };
};

Tokenizer.prototype._createEndTagToken = function () {
    this.currentToken = {
        type: Tokenizer.END_TAG_TOKEN,
        tagName: '',
        selfClosing: false,
        attrs: []
    };
};

Tokenizer.prototype._createCommentToken = function () {
    this.currentToken = {
        type: Tokenizer.COMMENT_TOKEN,
        data: ''
    };
};

Tokenizer.prototype._createDoctypeToken = function (initialName) {
    this.currentToken = {
        type: Tokenizer.DOCTYPE_TOKEN,
        name: initialName,
        forceQuirks: false,
        publicId: null,
        systemId: null
    };
};

Tokenizer.prototype._createCharacterToken = function (type, ch) {
    this.currentCharacterToken = {
        type: type,
        chars: ch
    };
};

//Tag attributes
Tokenizer.prototype._createAttr = function (attrNameFirstCh) {
    this.currentAttr = {
        name: attrNameFirstCh,
        value: ''
    };
};


Tokenizer.prototype._leaveAttrName = function (toState) {
    if (Tokenizer.getTokenAttr(this.currentToken, this.currentAttr.name) === null)
        this.currentToken.attrs.push(this.currentAttr);

    else
        this._err(ERR.duplicateAttribute);

    this.state = toState;
};

Tokenizer.prototype._leaveAttrValue = function (toState) {
    this.state = toState;
};


//Token emission
Tokenizer.prototype._emitCurrentToken = function () {
    this._emitCurrentCharacterToken();

    var ct = this.currentToken;

    this.currentToken = null;

    //NOTE: store emited start tag's tagName to determine is the following end tag token is appropriate.
    if (ct.type === Tokenizer.START_TAG_TOKEN)
        this.lastStartTagName = ct.tagName;

    else if (ct.type === Tokenizer.END_TAG_TOKEN) {
        if (ct.attrs.length > 0)
            this._err(ERR.endTagWithAttributes);

        if (ct.selfClosing)
            this._err(ERR.endTagWithTrailingSolidus);
    }

    this.tokenQueue.push(ct);
};

Tokenizer.prototype._emitCurrentCharacterToken = function () {
    if (this.currentCharacterToken) {
        this.tokenQueue.push(this.currentCharacterToken);
        this.currentCharacterToken = null;
    }
};

Tokenizer.prototype._emitEOFToken = function () {
    this._emitCurrentCharacterToken();
    this.tokenQueue.push({type: Tokenizer.EOF_TOKEN});
};

//Characters emission

//OPTIMIZATION: specification uses only one type of character tokens (one token per character).
//This causes a huge memory overhead and a lot of unnecessary parser loops. parse5 uses 3 groups of characters.
//If we have a sequence of characters that belong to the same group, parser can process it
//as a single solid character token.
//So, there are 3 types of character tokens in parse5:
//1)NULL_CHARACTER_TOKEN - \u0000-character sequences (e.g. '\u0000\u0000\u0000')
//2)WHITESPACE_CHARACTER_TOKEN - any whitespace/new-line character sequences (e.g. '\n  \r\t   \f')
//3)CHARACTER_TOKEN - any character sequence which don't belong to groups 1 and 2 (e.g. 'abcdef1234@@#$%^')
Tokenizer.prototype._appendCharToCurrentCharacterToken = function (type, ch) {
    if (this.currentCharacterToken && this.currentCharacterToken.type !== type)
        this._emitCurrentCharacterToken();

    if (this.currentCharacterToken)
        this.currentCharacterToken.chars += ch;

    else
        this._createCharacterToken(type, ch);
};

Tokenizer.prototype._emitCodePoint = function (cp) {
    var type = Tokenizer.CHARACTER_TOKEN;

    if (isWhitespace(cp))
        type = Tokenizer.WHITESPACE_CHARACTER_TOKEN;

    else if (cp === $.NULL)
        type = Tokenizer.NULL_CHARACTER_TOKEN;

    this._appendCharToCurrentCharacterToken(type, toChar(cp));
};

Tokenizer.prototype._emitSeveralCodePoints = function (codePoints) {
    for (var i = 0; i < codePoints.length; i++)
        this._emitCodePoint(codePoints[i]);
};

//NOTE: used then we emit character explicitly. This is always a non-whitespace and a non-null character.
//So we can avoid additional checks here.
Tokenizer.prototype._emitChars = function (ch) {
    this._appendCharToCurrentCharacterToken(Tokenizer.CHARACTER_TOKEN, ch);
};


// Character reference helpers
Tokenizer.prototype._matchNamedCharacterReference = function (startCp) {
    var result = null,
        excess = 1,
        i = findNamedEntityTreeBranch(0, startCp);

    this.tempBuff.push(startCp);

    while (i > -1) {
        var current = neTree[i],
            inNode = current < MAX_BRANCH_MARKER_VALUE,
            nodeWithData = inNode && current & HAS_DATA_FLAG;

        if (nodeWithData) {
            //NOTE: we use greedy search, so we continue lookup at this point
            result = current & DATA_DUPLET_FLAG ? [neTree[++i], neTree[++i]] : [neTree[++i]];
            excess = 0;
        }

        var cp = this._consume();

        this.tempBuff.push(cp);
        excess++;

        if (cp === $.EOF)
            break;

        if (inNode)
            i = current & HAS_BRANCHES_FLAG ? findNamedEntityTreeBranch(i, cp) : -1;

        else
            i = cp === current ? ++i : -1;
    }

    while (excess--) {
        this.tempBuff.pop();
        this._unconsume();
    }

    return result;
};

Tokenizer.prototype._isCharacterReferenceInAttribute = function () {
    return this.returnState === ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE ||
        this.returnState === ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE ||
        this.returnState === ATTRIBUTE_VALUE_UNQUOTED_STATE;
};

Tokenizer.prototype._isCharacterReferenceAttributeQuirk = function (withSemicolon) {
    if (!withSemicolon && this._isCharacterReferenceInAttribute()) {
        var nextCp = this._consume();

        this._unconsume();

        return nextCp === $.EQUALS_SIGN || isAsciiAlphaNumeric(nextCp);
    }

    return false;
};

Tokenizer.prototype._flushCodePointsConsumedAsCharacterReference = function () {
    if (this._isCharacterReferenceInAttribute()) {
        for (var i = 0; i < this.tempBuff.length; i++)
            this.currentAttr.value += toChar(this.tempBuff[i]);
    }

    else
        this._emitSeveralCodePoints(this.tempBuff);

    this.tempBuff = [];
};


//State machine
var _ = Tokenizer.prototype;

// Data state
//------------------------------------------------------------------
_[DATA_STATE] = function dataState(cp) {
    this.preprocessor.dropParsedChunk();

    if (cp === $.LESS_THAN_SIGN)
        this.state = TAG_OPEN_STATE;

    else if (cp === $.AMPERSAND) {
        this.returnState = DATA_STATE;
        this.state = CHARACTER_REFERENCE_STATE;
    }

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this._emitCodePoint(cp);
    }

    else if (cp === $.EOF)
        this._emitEOFToken();

    else
        this._emitCodePoint(cp);
};


//  RCDATA state
//------------------------------------------------------------------
_[RCDATA_STATE] = function rcdataState(cp) {
    this.preprocessor.dropParsedChunk();

    if (cp === $.AMPERSAND) {
        this.returnState = RCDATA_STATE;
        this.state = CHARACTER_REFERENCE_STATE;
    }

    else if (cp === $.LESS_THAN_SIGN)
        this.state = RCDATA_LESS_THAN_SIGN_STATE;

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this._emitChars(unicode.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF)
        this._emitEOFToken();

    else
        this._emitCodePoint(cp);
};

// RAWTEXT state
//------------------------------------------------------------------
_[RAWTEXT_STATE] = function rawtextState(cp) {
    this.preprocessor.dropParsedChunk();

    if (cp === $.LESS_THAN_SIGN)
        this.state = RAWTEXT_LESS_THAN_SIGN_STATE;

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this._emitChars(unicode.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF)
        this._emitEOFToken();

    else
        this._emitCodePoint(cp);
};


// Script data state
//------------------------------------------------------------------
_[SCRIPT_DATA_STATE] = function scriptDataState(cp) {
    this.preprocessor.dropParsedChunk();

    if (cp === $.LESS_THAN_SIGN)
        this.state = SCRIPT_DATA_LESS_THAN_SIGN_STATE;

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this._emitChars(unicode.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF)
        this._emitEOFToken();

    else
        this._emitCodePoint(cp);
};


// PLAINTEXT state
//------------------------------------------------------------------
_[PLAINTEXT_STATE] = function plaintextState(cp) {
    this.preprocessor.dropParsedChunk();

    if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this._emitChars(unicode.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF)
        this._emitEOFToken();

    else
        this._emitCodePoint(cp);
};


// Tag open state
//------------------------------------------------------------------
_[TAG_OPEN_STATE] = function tagOpenState(cp) {
    if (cp === $.EXCLAMATION_MARK)
        this.state = MARKUP_DECLARATION_OPEN_STATE;

    else if (cp === $.SOLIDUS)
        this.state = END_TAG_OPEN_STATE;

    else if (isAsciiLetter(cp)) {
        this._createStartTagToken();
        this._reconsumeInState(TAG_NAME_STATE);
    }

    else if (cp === $.QUESTION_MARK) {
        this._err(ERR.unexpectedQuestionMarkInsteadOfTagName);
        this._createCommentToken();
        this._reconsumeInState(BOGUS_COMMENT_STATE);
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofBeforeTagName);
        this._emitChars('<');
        this._emitEOFToken();
    }

    else {
        this._err(ERR.invalidFirstCharacterOfTagName);
        this._emitChars('<');
        this._reconsumeInState(DATA_STATE);
    }
};


// End tag open state
//------------------------------------------------------------------
_[END_TAG_OPEN_STATE] = function endTagOpenState(cp) {
    if (isAsciiLetter(cp)) {
        this._createEndTagToken();
        this._reconsumeInState(TAG_NAME_STATE);
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.missingEndTagName);
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofBeforeTagName);
        this._emitChars('</');
        this._emitEOFToken();
    }

    else {
        this._err(ERR.invalidFirstCharacterOfTagName);
        this._createCommentToken();
        this._reconsumeInState(BOGUS_COMMENT_STATE);
    }
};


// Tag name state
//------------------------------------------------------------------
_[TAG_NAME_STATE] = function tagNameState(cp) {
    if (isWhitespace(cp))
        this.state = BEFORE_ATTRIBUTE_NAME_STATE;

    else if (cp === $.SOLIDUS)
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (isAsciiUpper(cp))
        this.currentToken.tagName += toAsciiLowerChar(cp);

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.currentToken.tagName += unicode.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInTag);
        this._emitEOFToken();
    }

    else
        this.currentToken.tagName += toChar(cp);
};


// RCDATA less-than sign state
//------------------------------------------------------------------
_[RCDATA_LESS_THAN_SIGN_STATE] = function rcdataLessThanSignState(cp) {
    if (cp === $.SOLIDUS) {
        this.tempBuff = [];
        this.state = RCDATA_END_TAG_OPEN_STATE;
    }

    else {
        this._emitChars('<');
        this._reconsumeInState(RCDATA_STATE);
    }
};


// RCDATA end tag open state
//------------------------------------------------------------------
_[RCDATA_END_TAG_OPEN_STATE] = function rcdataEndTagOpenState(cp) {
    if (isAsciiLetter(cp)) {
        this._createEndTagToken();
        this._reconsumeInState(RCDATA_END_TAG_NAME_STATE);
    }

    else {
        this._emitChars('</');
        this._reconsumeInState(RCDATA_STATE);
    }
};


// RCDATA end tag name state
//------------------------------------------------------------------
_[RCDATA_END_TAG_NAME_STATE] = function rcdataEndTagNameState(cp) {
    if (isAsciiUpper(cp)) {
        this.currentToken.tagName += toAsciiLowerChar(cp);
        this.tempBuff.push(cp);
    }

    else if (isAsciiLower(cp)) {
        this.currentToken.tagName += toChar(cp);
        this.tempBuff.push(cp);
    }

    else {
        if (this.lastStartTagName === this.currentToken.tagName) {
            if (isWhitespace(cp)) {
                this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                return;
            }

            if (cp === $.SOLIDUS) {
                this.state = SELF_CLOSING_START_TAG_STATE;
                return;
            }

            if (cp === $.GREATER_THAN_SIGN) {
                this.state = DATA_STATE;
                this._emitCurrentToken();
                return;
            }
        }

        this._emitChars('</');
        this._emitSeveralCodePoints(this.tempBuff);
        this._reconsumeInState(RCDATA_STATE);
    }
};


// RAWTEXT less-than sign state
//------------------------------------------------------------------
_[RAWTEXT_LESS_THAN_SIGN_STATE] = function rawtextLessThanSignState(cp) {
    if (cp === $.SOLIDUS) {
        this.tempBuff = [];
        this.state = RAWTEXT_END_TAG_OPEN_STATE;
    }

    else {
        this._emitChars('<');
        this._reconsumeInState(RAWTEXT_STATE);
    }
};


// RAWTEXT end tag open state
//------------------------------------------------------------------
_[RAWTEXT_END_TAG_OPEN_STATE] = function rawtextEndTagOpenState(cp) {
    if (isAsciiLetter(cp)) {
        this._createEndTagToken();
        this._reconsumeInState(RAWTEXT_END_TAG_NAME_STATE);
    }

    else {
        this._emitChars('</');
        this._reconsumeInState(RAWTEXT_STATE);
    }
};


// RAWTEXT end tag name state
//------------------------------------------------------------------
_[RAWTEXT_END_TAG_NAME_STATE] = function rawtextEndTagNameState(cp) {
    if (isAsciiUpper(cp)) {
        this.currentToken.tagName += toAsciiLowerChar(cp);
        this.tempBuff.push(cp);
    }

    else if (isAsciiLower(cp)) {
        this.currentToken.tagName += toChar(cp);
        this.tempBuff.push(cp);
    }

    else {
        if (this.lastStartTagName === this.currentToken.tagName) {
            if (isWhitespace(cp)) {
                this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                return;
            }

            if (cp === $.SOLIDUS) {
                this.state = SELF_CLOSING_START_TAG_STATE;
                return;
            }

            if (cp === $.GREATER_THAN_SIGN) {
                this._emitCurrentToken();
                this.state = DATA_STATE;
                return;
            }
        }

        this._emitChars('</');
        this._emitSeveralCodePoints(this.tempBuff);
        this._reconsumeInState(RAWTEXT_STATE);
    }
};


// Script data less-than sign state
//------------------------------------------------------------------
_[SCRIPT_DATA_LESS_THAN_SIGN_STATE] = function scriptDataLessThanSignState(cp) {
    if (cp === $.SOLIDUS) {
        this.tempBuff = [];
        this.state = SCRIPT_DATA_END_TAG_OPEN_STATE;
    }

    else if (cp === $.EXCLAMATION_MARK) {
        this.state = SCRIPT_DATA_ESCAPE_START_STATE;
        this._emitChars('<!');
    }

    else {
        this._emitChars('<');
        this._reconsumeInState(SCRIPT_DATA_STATE);
    }
};


// Script data end tag open state
//------------------------------------------------------------------
_[SCRIPT_DATA_END_TAG_OPEN_STATE] = function scriptDataEndTagOpenState(cp) {
    if (isAsciiLetter(cp)) {
        this._createEndTagToken();
        this._reconsumeInState(SCRIPT_DATA_END_TAG_NAME_STATE);
    }

    else {
        this._emitChars('</');
        this._reconsumeInState(SCRIPT_DATA_STATE);
    }
};


// Script data end tag name state
//------------------------------------------------------------------
_[SCRIPT_DATA_END_TAG_NAME_STATE] = function scriptDataEndTagNameState(cp) {
    if (isAsciiUpper(cp)) {
        this.currentToken.tagName += toAsciiLowerChar(cp);
        this.tempBuff.push(cp);
    }

    else if (isAsciiLower(cp)) {
        this.currentToken.tagName += toChar(cp);
        this.tempBuff.push(cp);
    }

    else {
        if (this.lastStartTagName === this.currentToken.tagName) {
            if (isWhitespace(cp)) {
                this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                return;
            }

            else if (cp === $.SOLIDUS) {
                this.state = SELF_CLOSING_START_TAG_STATE;
                return;
            }

            else if (cp === $.GREATER_THAN_SIGN) {
                this._emitCurrentToken();
                this.state = DATA_STATE;
                return;
            }
        }

        this._emitChars('</');
        this._emitSeveralCodePoints(this.tempBuff);
        this._reconsumeInState(SCRIPT_DATA_STATE);
    }
};


// Script data escape start state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPE_START_STATE] = function scriptDataEscapeStartState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_ESCAPE_START_DASH_STATE;
        this._emitChars('-');
    }

    else
        this._reconsumeInState(SCRIPT_DATA_STATE);
};


// Script data escape start dash state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPE_START_DASH_STATE] = function scriptDataEscapeStartDashState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
        this._emitChars('-');
    }

    else
        this._reconsumeInState(SCRIPT_DATA_STATE);
};


// Script data escaped state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_STATE] = function scriptDataEscapedState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_ESCAPED_DASH_STATE;
        this._emitChars('-');
    }

    else if (cp === $.LESS_THAN_SIGN)
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this._emitChars(unicode.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
    }

    else
        this._emitCodePoint(cp);
};


// Script data escaped dash state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_DASH_STATE] = function scriptDataEscapedDashState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
        this._emitChars('-');
    }

    else if (cp === $.LESS_THAN_SIGN)
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitChars(unicode.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
    }

    else {
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCodePoint(cp);
    }
};


// Script data escaped dash dash state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_DASH_DASH_STATE] = function scriptDataEscapedDashDashState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this._emitChars('-');

    else if (cp === $.LESS_THAN_SIGN)
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = SCRIPT_DATA_STATE;
        this._emitChars('>');
    }

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitChars(unicode.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
    }

    else {
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCodePoint(cp);
    }
};


// Script data escaped less-than sign state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE] = function scriptDataEscapedLessThanSignState(cp) {
    if (cp === $.SOLIDUS) {
        this.tempBuff = [];
        this.state = SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE;
    }

    else if (isAsciiLetter(cp)) {
        this.tempBuff = [];
        this._emitChars('<');
        this._reconsumeInState(SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE);
    }

    else {
        this._emitChars('<');
        this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
    }
};


// Script data escaped end tag open state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE] = function scriptDataEscapedEndTagOpenState(cp) {
    if (isAsciiLetter(cp)) {
        this._createEndTagToken();
        this._reconsumeInState(SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE);
    }

    else {
        this._emitChars('</');
        this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
    }
};


// Script data escaped end tag name state
//------------------------------------------------------------------
_[SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE] = function scriptDataEscapedEndTagNameState(cp) {
    if (isAsciiUpper(cp)) {
        this.currentToken.tagName += toAsciiLowerChar(cp);
        this.tempBuff.push(cp);
    }

    else if (isAsciiLower(cp)) {
        this.currentToken.tagName += toChar(cp);
        this.tempBuff.push(cp);
    }

    else {
        if (this.lastStartTagName === this.currentToken.tagName) {
            if (isWhitespace(cp)) {
                this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                return;
            }

            if (cp === $.SOLIDUS) {
                this.state = SELF_CLOSING_START_TAG_STATE;
                return;
            }

            if (cp === $.GREATER_THAN_SIGN) {
                this._emitCurrentToken();
                this.state = DATA_STATE;
                return;
            }
        }

        this._emitChars('</');
        this._emitSeveralCodePoints(this.tempBuff);
        this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
    }
};


// Script data double escape start state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE] = function scriptDataDoubleEscapeStartState(cp) {
    if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN) {
        this.state = this._isTempBufferEqualToScriptString() ? SCRIPT_DATA_DOUBLE_ESCAPED_STATE : SCRIPT_DATA_ESCAPED_STATE;
        this._emitCodePoint(cp);
    }

    else if (isAsciiUpper(cp)) {
        this.tempBuff.push(toAsciiLowerCodePoint(cp));
        this._emitCodePoint(cp);
    }

    else if (isAsciiLower(cp)) {
        this.tempBuff.push(cp);
        this._emitCodePoint(cp);
    }

    else
        this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
};


// Script data double escaped state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPED_STATE] = function scriptDataDoubleEscapedState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE;
        this._emitChars('-');
    }

    else if (cp === $.LESS_THAN_SIGN) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitChars('<');
    }

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this._emitChars(unicode.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
    }

    else
        this._emitCodePoint(cp);
};


// Script data double escaped dash state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE] = function scriptDataDoubleEscapedDashState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE;
        this._emitChars('-');
    }

    else if (cp === $.LESS_THAN_SIGN) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitChars('<');
    }

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitChars(unicode.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
    }

    else {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCodePoint(cp);
    }
};


// Script data double escaped dash dash state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE] = function scriptDataDoubleEscapedDashDashState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this._emitChars('-');

    else if (cp === $.LESS_THAN_SIGN) {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitChars('<');
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = SCRIPT_DATA_STATE;
        this._emitChars('>');
    }

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitChars(unicode.REPLACEMENT_CHARACTER);
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
    }

    else {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCodePoint(cp);
    }
};


// Script data double escaped less-than sign state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE] = function scriptDataDoubleEscapedLessThanSignState(cp) {
    if (cp === $.SOLIDUS) {
        this.tempBuff = [];
        this.state = SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE;
        this._emitChars('/');
    }

    else
        this._reconsumeInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
};


// Script data double escape end state
//------------------------------------------------------------------
_[SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE] = function scriptDataDoubleEscapeEndState(cp) {
    if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN) {
        this.state = this._isTempBufferEqualToScriptString() ? SCRIPT_DATA_ESCAPED_STATE : SCRIPT_DATA_DOUBLE_ESCAPED_STATE;

        this._emitCodePoint(cp);
    }

    else if (isAsciiUpper(cp)) {
        this.tempBuff.push(toAsciiLowerCodePoint(cp));
        this._emitCodePoint(cp);
    }

    else if (isAsciiLower(cp)) {
        this.tempBuff.push(cp);
        this._emitCodePoint(cp);
    }

    else
        this._reconsumeInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
};


// Before attribute name state
//------------------------------------------------------------------
_[BEFORE_ATTRIBUTE_NAME_STATE] = function beforeAttributeNameState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN || cp === $.EOF)
        this._reconsumeInState(AFTER_ATTRIBUTE_NAME_STATE);

    else if (cp === $.EQUALS_SIGN) {
        this._err(ERR.unexpectedEqualsSignBeforeAttributeName);
        this._createAttr('=');
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else {
        this._createAttr('');
        this._reconsumeInState(ATTRIBUTE_NAME_STATE);
    }
};


// Attribute name state
//------------------------------------------------------------------
_[ATTRIBUTE_NAME_STATE] = function attributeNameState(cp) {
    if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN || cp === $.EOF) {
        this._leaveAttrName(AFTER_ATTRIBUTE_NAME_STATE);
        this._unconsume();
    }

    else if (cp === $.EQUALS_SIGN)
        this._leaveAttrName(BEFORE_ATTRIBUTE_VALUE_STATE);

    else if (isAsciiUpper(cp))
        this.currentAttr.name += toAsciiLowerChar(cp);

    else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN) {
        this._err(ERR.unexpectedCharacterInAttributeName);
        this.currentAttr.name += toChar(cp);
    }

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.currentAttr.name += unicode.REPLACEMENT_CHARACTER;
    }

    else
        this.currentAttr.name += toChar(cp);
};


// After attribute name state
//------------------------------------------------------------------
_[AFTER_ATTRIBUTE_NAME_STATE] = function afterAttributeNameState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.SOLIDUS)
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (cp === $.EQUALS_SIGN)
        this.state = BEFORE_ATTRIBUTE_VALUE_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInTag);
        this._emitEOFToken();
    }

    else {
        this._createAttr('');
        this._reconsumeInState(ATTRIBUTE_NAME_STATE);
    }
};


// Before attribute value state
//------------------------------------------------------------------
_[BEFORE_ATTRIBUTE_VALUE_STATE] = function beforeAttributeValueState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.QUOTATION_MARK)
        this.state = ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE;

    else if (cp === $.APOSTROPHE)
        this.state = ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.missingAttributeValue);
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else
        this._reconsumeInState(ATTRIBUTE_VALUE_UNQUOTED_STATE);
};


// Attribute value (double-quoted) state
//------------------------------------------------------------------
_[ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE] = function attributeValueDoubleQuotedState(cp) {
    if (cp === $.QUOTATION_MARK)
        this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;

    else if (cp === $.AMPERSAND) {
        this.returnState = ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE;
        this.state = CHARACTER_REFERENCE_STATE;
    }

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.currentAttr.value += unicode.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInTag);
        this._emitEOFToken();
    }

    else
        this.currentAttr.value += toChar(cp);
};


// Attribute value (single-quoted) state
//------------------------------------------------------------------
_[ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE] = function attributeValueSingleQuotedState(cp) {
    if (cp === $.APOSTROPHE)
        this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;

    else if (cp === $.AMPERSAND) {
        this.returnState = ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE;
        this.state = CHARACTER_REFERENCE_STATE;
    }

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.currentAttr.value += unicode.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInTag);
        this._emitEOFToken();
    }

    else
        this.currentAttr.value += toChar(cp);
};


// Attribute value (unquoted) state
//------------------------------------------------------------------
_[ATTRIBUTE_VALUE_UNQUOTED_STATE] = function attributeValueUnquotedState(cp) {
    if (isWhitespace(cp))
        this._leaveAttrValue(BEFORE_ATTRIBUTE_NAME_STATE);

    else if (cp === $.AMPERSAND) {
        this.returnState = ATTRIBUTE_VALUE_UNQUOTED_STATE;
        this.state = CHARACTER_REFERENCE_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._leaveAttrValue(DATA_STATE);
        this._emitCurrentToken();
    }

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.currentAttr.value += unicode.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN ||
        cp === $.EQUALS_SIGN || cp === $.GRAVE_ACCENT) {
        this._err(ERR.unexpectedCharacterInUnquotedAttributeValue);
        this.currentAttr.value += toChar(cp);
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInTag);
        this._emitEOFToken();
    }

    else
        this.currentAttr.value += toChar(cp);
};

// After attribute value (quoted) state
//------------------------------------------------------------------
_[AFTER_ATTRIBUTE_VALUE_QUOTED_STATE] = function afterAttributeValueQuotedState(cp) {
    if (isWhitespace(cp))
        this._leaveAttrValue(BEFORE_ATTRIBUTE_NAME_STATE);

    else if (cp === $.SOLIDUS)
        this._leaveAttrValue(SELF_CLOSING_START_TAG_STATE);

    else if (cp === $.GREATER_THAN_SIGN) {
        this._leaveAttrValue(DATA_STATE);
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInTag);
        this._emitEOFToken();
    }

    else {
        this._err(ERR.missingWhitespaceBetweenAttributes);
        this._reconsumeInState(BEFORE_ATTRIBUTE_NAME_STATE);
    }
};


// Self-closing start tag state
//------------------------------------------------------------------
_[SELF_CLOSING_START_TAG_STATE] = function selfClosingStartTagState(cp) {
    if (cp === $.GREATER_THAN_SIGN) {
        this.currentToken.selfClosing = true;
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInTag);
        this._emitEOFToken();
    }

    else {
        this._err(ERR.unexpectedSolidusInTag);
        this._reconsumeInState(BEFORE_ATTRIBUTE_NAME_STATE);
    }
};


// Bogus comment state
//------------------------------------------------------------------
_[BOGUS_COMMENT_STATE] = function bogusCommentState(cp) {
    if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else if (cp === $.NULL)
        this.currentToken.data += unicode.REPLACEMENT_CHARACTER;

    else
        this.currentToken.data += toChar(cp);
};

// Markup declaration open state
//------------------------------------------------------------------
_[MARKUP_DECLARATION_OPEN_STATE] = function markupDeclarationOpenState(cp) {
    if (this._consumeSequenceIfMatch($$.DASH_DASH_STRING, cp, true)) {
        this._createCommentToken();
        this.state = COMMENT_START_STATE;
    }

    else if (this._consumeSequenceIfMatch($$.DOCTYPE_STRING, cp, false))
        this.state = DOCTYPE_STATE;

    else if (this._consumeSequenceIfMatch($$.CDATA_START_STRING, cp, true)) {
        if (this.allowCDATA)
            this.state = CDATA_SECTION_STATE;

        else {
            this._err(ERR.cdataInHtmlContent);
            this._createCommentToken();
            this.currentToken.data = '[CDATA[';
            this.state = BOGUS_COMMENT_STATE;
        }
    }

    //NOTE: sequence lookup can be abrupted by hibernation. In that case lookup
    //results are no longer valid and we will need to start over.
    else if (!this._ensureHibernation()) {
        this._err(ERR.incorrectlyOpenedComment);
        this._createCommentToken();
        this._reconsumeInState(BOGUS_COMMENT_STATE);
    }
};


// Comment start state
//------------------------------------------------------------------
_[COMMENT_START_STATE] = function commentStartState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this.state = COMMENT_START_DASH_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.abruptClosingOfEmptyComment);
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else
        this._reconsumeInState(COMMENT_STATE);
};


// Comment start dash state
//------------------------------------------------------------------
_[COMMENT_START_DASH_STATE] = function commentStartDashState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this.state = COMMENT_END_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.abruptClosingOfEmptyComment);
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInComment);
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else {
        this.currentToken.data += '-';
        this._reconsumeInState(COMMENT_STATE);
    }
};


// Comment state
//------------------------------------------------------------------
_[COMMENT_STATE] = function commentState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this.state = COMMENT_END_DASH_STATE;

    else if (cp === $.LESS_THAN_SIGN) {
        this.currentToken.data += '<';
        this.state = COMMENT_LESS_THAN_SIGN_STATE;
    }

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.currentToken.data += unicode.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInComment);
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else
        this.currentToken.data += toChar(cp);
};


// Comment less-than sign state
//------------------------------------------------------------------
_[COMMENT_LESS_THAN_SIGN_STATE] = function commentLessThanSignState(cp) {
    if (cp === $.EXCLAMATION_MARK) {
        this.currentToken.data += '!';
        this.state = COMMENT_LESS_THAN_SIGN_BANG_STATE;
    }

    else if (cp === $.LESS_THAN_SIGN)
        this.currentToken.data += '!';

    else
        this._reconsumeInState(COMMENT_STATE);
};


// Comment less-than sign bang state
//------------------------------------------------------------------
_[COMMENT_LESS_THAN_SIGN_BANG_STATE] = function commentLessThanSignBangState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this.state = COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE;

    else
        this._reconsumeInState(COMMENT_STATE);
};


// Comment less-than sign bang dash state
//------------------------------------------------------------------
_[COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE] = function commentLessThanSignBangDashState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this.state = COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE;

    else
        this._reconsumeInState(COMMENT_END_DASH_STATE);
};


// Comment less-than sign bang dash dash state
//------------------------------------------------------------------
_[COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE] = function commentLessThanSignBangDashDashState(cp) {
    if (cp !== $.GREATER_THAN_SIGN && cp !== $.EOF)
        this._err(ERR.nestedComment);

    this._reconsumeInState(COMMENT_END_STATE);
};


// Comment end dash state
//------------------------------------------------------------------
_[COMMENT_END_DASH_STATE] = function commentEndDashState(cp) {
    if (cp === $.HYPHEN_MINUS)
        this.state = COMMENT_END_STATE;

    else if (cp === $.EOF) {
        this._err(ERR.eofInComment);
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else {
        this.currentToken.data += '-';
        this._reconsumeInState(COMMENT_STATE);
    }
};


// Comment end state
//------------------------------------------------------------------
_[COMMENT_END_STATE] = function commentEndState(cp) {
    if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EXCLAMATION_MARK)
        this.state = COMMENT_END_BANG_STATE;

    else if (cp === $.HYPHEN_MINUS)
        this.currentToken.data += '-';

    else if (cp === $.EOF) {
        this._err(ERR.eofInComment);
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else {
        this.currentToken.data += '--';
        this._reconsumeInState(COMMENT_STATE);
    }
};


// Comment end bang state
//------------------------------------------------------------------
_[COMMENT_END_BANG_STATE] = function commentEndBangState(cp) {
    if (cp === $.HYPHEN_MINUS) {
        this.currentToken.data += '--!';
        this.state = COMMENT_END_DASH_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.incorrectlyClosedComment);
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInComment);
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else {
        this.currentToken.data += '--!';
        this._reconsumeInState(COMMENT_STATE);
    }
};


// DOCTYPE state
//------------------------------------------------------------------
_[DOCTYPE_STATE] = function doctypeState(cp) {
    if (isWhitespace(cp))
        this.state = BEFORE_DOCTYPE_NAME_STATE;

    else if (cp === $.GREATER_THAN_SIGN)
        this._reconsumeInState(BEFORE_DOCTYPE_NAME_STATE);

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this._createDoctypeToken(null);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }
    else {
        this._err(ERR.missingWhitespaceBeforeDoctypeName);
        this._reconsumeInState(BEFORE_DOCTYPE_NAME_STATE);
    }
};

// Before DOCTYPE name state
//------------------------------------------------------------------
_[BEFORE_DOCTYPE_NAME_STATE] = function beforeDoctypeNameState(cp) {
    if (isWhitespace(cp))
        return;

    if (isAsciiUpper(cp)) {
        this._createDoctypeToken(toAsciiLowerChar(cp));
        this.state = DOCTYPE_NAME_STATE;
    }

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this._createDoctypeToken(unicode.REPLACEMENT_CHARACTER);
        this.state = DOCTYPE_NAME_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.missingDoctypeName);
        this._createDoctypeToken(null);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this._createDoctypeToken(null);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }
    else {
        this._createDoctypeToken(toChar(cp));
        this.state = DOCTYPE_NAME_STATE;
    }
};


// DOCTYPE name state
//------------------------------------------------------------------
_[DOCTYPE_NAME_STATE] = function doctypeNameState(cp) {
    if (isWhitespace(cp))
        this.state = AFTER_DOCTYPE_NAME_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (isAsciiUpper(cp))
        this.currentToken.name += toAsciiLowerChar(cp);

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.currentToken.name += unicode.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else
        this.currentToken.name += toChar(cp);
};


// After DOCTYPE name state
//------------------------------------------------------------------
_[AFTER_DOCTYPE_NAME_STATE] = function afterDoctypeNameState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else if (this._consumeSequenceIfMatch($$.PUBLIC_STRING, cp, false))
        this.state = AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE;

    else if (this._consumeSequenceIfMatch($$.SYSTEM_STRING, cp, false))
        this.state = AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE;

    //NOTE: sequence lookup can be abrupted by hibernation. In that case lookup
    //results are no longer valid and we will need to start over.
    else if (!this._ensureHibernation()) {
        this._err(ERR.invalidCharacterSequenceAfterDoctypeName);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};


// After DOCTYPE public keyword state
//------------------------------------------------------------------
_[AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE] = function afterDoctypePublicKeywordState(cp) {
    if (isWhitespace(cp))
        this.state = BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (cp === $.QUOTATION_MARK) {
        this._err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
        this.currentToken.publicId = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (cp === $.APOSTROPHE) {
        this._err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
        this.currentToken.publicId = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.missingDoctypePublicIdentifier);
        this.currentToken.forceQuirks = true;
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else {
        this._err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};


// Before DOCTYPE public identifier state
//------------------------------------------------------------------
_[BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE] = function beforeDoctypePublicIdentifierState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.QUOTATION_MARK) {
        this.currentToken.publicId = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (cp === $.APOSTROPHE) {
        this.currentToken.publicId = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.missingDoctypePublicIdentifier);
        this.currentToken.forceQuirks = true;
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else {
        this._err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
        this.currentToken.forceQuirks = true;
        this._reconsumeInState(BOGUS_DOCTYPE_STATE);
    }
};


// DOCTYPE public identifier (double-quoted) state
//------------------------------------------------------------------
_[DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE] = function doctypePublicIdentifierDoubleQuotedState(cp) {
    if (cp === $.QUOTATION_MARK)
        this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.currentToken.publicId += unicode.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.abruptDoctypePublicIdentifier);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else
        this.currentToken.publicId += toChar(cp);
};


// DOCTYPE public identifier (single-quoted) state
//------------------------------------------------------------------
_[DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE] = function doctypePublicIdentifierSingleQuotedState(cp) {
    if (cp === $.APOSTROPHE)
        this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.currentToken.publicId += unicode.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.abruptDoctypePublicIdentifier);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else
        this.currentToken.publicId += toChar(cp);
};

// After DOCTYPE public identifier state
//------------------------------------------------------------------
_[AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE] = function afterDoctypePublicIdentifierState(cp) {
    if (isWhitespace(cp))
        this.state = BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE;

    else if (cp === $.GREATER_THAN_SIGN) {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.QUOTATION_MARK) {
        this._err(ERR.missingWhitespaceBetweenDoctypePublicAndSytemIdentifier);
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (cp === $.APOSTROPHE) {
        this._err(ERR.missingWhitespaceBetweenDoctypePublicAndSytemIdentifier);
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else {
        this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

// Between DOCTYPE public and system identifiers state
//------------------------------------------------------------------
_[BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE] = function betweenDoctypePublicAndSystemIdentifiersState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.GREATER_THAN_SIGN) {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.QUOTATION_MARK) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }


    else if (cp === $.APOSTROPHE) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else {
        this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
        this.currentToken.forceQuirks = true;
        this._reconsumeInState(BOGUS_DOCTYPE_STATE);
    }
};


// After DOCTYPE system keyword state
//------------------------------------------------------------------
_[AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE] = function afterDoctypeSystemKeywordState(cp) {
    if (isWhitespace(cp))
        this.state = BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE;

    else if (cp === $.QUOTATION_MARK) {
        this._err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (cp === $.APOSTROPHE) {
        this._err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.missingDoctypeSystemIdentifier);
        this.currentToken.forceQuirks = true;
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else {
        this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};


// Before DOCTYPE system identifier state
//------------------------------------------------------------------
_[BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE] = function beforeDoctypeSystemIdentifierState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.QUOTATION_MARK) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (cp === $.APOSTROPHE) {
        this.currentToken.systemId = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.missingDoctypeSystemIdentifier);
        this.currentToken.forceQuirks = true;
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else {
        this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
        this.currentToken.forceQuirks = true;
        this._reconsumeInState(BOGUS_DOCTYPE_STATE);
    }
};


// DOCTYPE system identifier (double-quoted) state
//------------------------------------------------------------------
_[DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE] = function doctypeSystemIdentifierDoubleQuotedState(cp) {
    if (cp === $.QUOTATION_MARK)
        this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.currentToken.systemId += unicode.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.abruptDoctypeSystemIdentifier);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else
        this.currentToken.systemId += toChar(cp);
};


// DOCTYPE system identifier (single-quoted) state
//------------------------------------------------------------------
_[DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE] = function doctypeSystemIdentifierSingleQuotedState(cp) {
    if (cp === $.APOSTROPHE)
        this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;

    else if (cp === $.NULL) {
        this._err(ERR.unexpectedNullCharacter);
        this.currentToken.systemId += unicode.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.GREATER_THAN_SIGN) {
        this._err(ERR.abruptDoctypeSystemIdentifier);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else
        this.currentToken.systemId += toChar(cp);
};


// After DOCTYPE system identifier state
//------------------------------------------------------------------
_[AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE] = function afterDoctypeSystemIdentifierState(cp) {
    if (isWhitespace(cp))
        return;

    if (cp === $.GREATER_THAN_SIGN) {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this._err(ERR.eofInDoctype);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._emitEOFToken();
    }

    else {
        this._err(ERR.unexpectedCharacterAfterDoctypeSystemIdentifier);
        this.state = BOGUS_DOCTYPE_STATE;
    }
};


// Bogus DOCTYPE state
//------------------------------------------------------------------
_[BOGUS_DOCTYPE_STATE] = function bogusDoctypeState(cp) {
    if (cp === $.GREATER_THAN_SIGN) {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (cp === $.EOF) {
        this._emitCurrentToken();
        this._emitEOFToken();
    }
};


// CDATA section state
//------------------------------------------------------------------
_[CDATA_SECTION_STATE] = function cdataSectionState(cp) {
    if (cp === $.RIGHT_SQUARE_BRACKET)
        this.state = CDATA_SECTION_BRACKET_STATE;

    else if (cp === $.EOF) {
        this._err(ERR.eofInCdata);
        this._emitEOFToken();
    }

    else
        this._emitCodePoint(cp);
};


// CDATA section bracket state
//------------------------------------------------------------------
_[CDATA_SECTION_BRACKET_STATE] = function cdataSectionBracketState(cp) {
    if (cp === $.RIGHT_SQUARE_BRACKET)
        this.state = CDATA_SECTION_END_STATE;

    else {
        this._emitChars(']');
        this._reconsumeInState(CDATA_SECTION_STATE);
    }
};


// CDATA section end state
//------------------------------------------------------------------
_[CDATA_SECTION_END_STATE] = function cdataSectionEndState(cp) {
    if (cp === $.GREATER_THAN_SIGN)
        this.state = DATA_STATE;

    else if (cp === $.RIGHT_SQUARE_BRACKET)
        this._emitChars(']');

    else {
        this._emitChars(']]');
        this._reconsumeInState(CDATA_SECTION_STATE);
    }
};


// Character reference state
//------------------------------------------------------------------
_[CHARACTER_REFERENCE_STATE] = function characterReferenceState(cp) {
    this.tempBuff = [$.AMPERSAND];

    if (cp === $.NUMBER_SIGN) {
        this.tempBuff.push(cp);
        this.state = NUMERIC_CHARACTER_REFERENCE_STATE;
    }

    else if (isAsciiAlphaNumeric(cp))
        this._reconsumeInState(NAMED_CHARACTER_REFERENCE_STATE);

    else {
        this._flushCodePointsConsumedAsCharacterReference();
        this._reconsumeInState(this.returnState);
    }
};

// Named character reference state
//------------------------------------------------------------------
_[NAMED_CHARACTER_REFERENCE_STATE] = function (cp) {
    var matchResult = this._matchNamedCharacterReference(cp);

    //NOTE: matching can be abrupted by hibernation. In that case match
    //results are no longer valid and we will need to start over.
    if (this._ensureHibernation())
        this.tempBuff = [$.AMPERSAND];

    else if (matchResult) {
        var withSemicolon = this.tempBuff[this.tempBuff.length - 1] === $.SEMICOLON;

        if (!this._isCharacterReferenceAttributeQuirk(withSemicolon)) {
            if (!withSemicolon)
                this._errOnNextCodePoint(ERR.missingSemicolonAfterCharacterReference);

            this.tempBuff = matchResult;
        }

        this._flushCodePointsConsumedAsCharacterReference();
        this.state = this.returnState;
    }

    else {
        this._flushCodePointsConsumedAsCharacterReference();
        this.state = AMBIGUOUS_AMPERSAND_STATE;
    }
};

// Ambiguos ampersand state
//------------------------------------------------------------------
_[AMBIGUOUS_AMPERSAND_STATE] = function (cp) {
    if (isAsciiAlphaNumeric(cp)) {
        if (this._isCharacterReferenceInAttribute())
            this.currentAttr.value += toChar(cp);

        else
            this._emitCodePoint(cp);
    }

    else {
        if (cp === $.SEMICOLON)
            this._err(ERR.unknownNamedCharacterReference);

        this._reconsumeInState(this.returnState);
    }
};

// Numeric character reference state
//------------------------------------------------------------------
_[NUMERIC_CHARACTER_REFERENCE_STATE] = function numericCharacterReferenceState(cp) {
    this.charRefCode = 0;

    if (cp === $.LATIN_SMALL_X || cp === $.LATIN_CAPITAL_X) {
        this.tempBuff.push(cp);
        this.state = HEXADEMICAL_CHARACTER_REFERENCE_START_STATE;
    }

    else
        this._reconsumeInState(DECIMAL_CHARACTER_REFERENCE_START_STATE);
};


// Hexademical character reference start state
//------------------------------------------------------------------
_[HEXADEMICAL_CHARACTER_REFERENCE_START_STATE] = function hexademicalCharacterReferenceStartState(cp) {
    if (isAsciiHexDigit(cp))
        this._reconsumeInState(HEXADEMICAL_CHARACTER_REFERENCE_STATE);

    else {
        this._err(ERR.absenceOfDigitsInNumericCharacterReference);
        this._flushCodePointsConsumedAsCharacterReference();
        this._reconsumeInState(this.returnState);
    }
};


// Decimal character reference start state
//------------------------------------------------------------------
_[DECIMAL_CHARACTER_REFERENCE_START_STATE] = function decimalCharacterReferenceStartState(cp) {
    if (isAsciiDigit(cp))
        this._reconsumeInState(DECIMAL_CHARACTER_REFERENCE_STATE);

    else {
        this._err(ERR.absenceOfDigitsInNumericCharacterReference);
        this._flushCodePointsConsumedAsCharacterReference();
        this._reconsumeInState(this.returnState);
    }
};


// Hexademical character reference state
//------------------------------------------------------------------
_[HEXADEMICAL_CHARACTER_REFERENCE_STATE] = function hexademicalCharacterReferenceState(cp) {
    if (isAsciiUpperHexDigit(cp))
        this.charRefCode = this.charRefCode * 16 + cp - 0x37;

    else if (isAsciiLowerHexDigit(cp))
        this.charRefCode = this.charRefCode * 16 + cp - 0x57;

    else if (isAsciiDigit(cp))
        this.charRefCode = this.charRefCode * 16 + cp - 0x30;

    else if (cp === $.SEMICOLON)
        this.state = NUMERIC_CHARACTER_REFERENCE_END_STATE;

    else {
        this._err(ERR.missingSemicolonAfterCharacterReference);
        this._reconsumeInState(NUMERIC_CHARACTER_REFERENCE_END_STATE);
    }
};


// Decimal character reference state
//------------------------------------------------------------------
_[DECIMAL_CHARACTER_REFERENCE_STATE] = function decimalCharacterReferenceState(cp) {
    if (isAsciiDigit(cp))
        this.charRefCode = this.charRefCode * 10 + cp - 0x30;

    else if (cp === $.SEMICOLON)
        this.state = NUMERIC_CHARACTER_REFERENCE_END_STATE;

    else {
        this._err(ERR.missingSemicolonAfterCharacterReference);
        this._reconsumeInState(NUMERIC_CHARACTER_REFERENCE_END_STATE);
    }
};


// Numeric character reference end state
//------------------------------------------------------------------
_[NUMERIC_CHARACTER_REFERENCE_END_STATE] = function numericCharacterReferenceEndState() {
    if (this.charRefCode === $.NULL) {
        this._err(ERR.nullCharacterReference);
        this.charRefCode = $.REPLACEMENT_CHARACTER;
    }

    else if (this.charRefCode > 0x10FFFF) {
        this._err(ERR.characterReferenceOutsideUnicodeRange);
        this.charRefCode = $.REPLACEMENT_CHARACTER;
    }

    else if (unicode.isSurrogate(this.charRefCode)) {
        this._err(ERR.surrogateCharacterReference);
        this.charRefCode = $.REPLACEMENT_CHARACTER;
    }

    else if (unicode.isUndefinedCodePoint(this.charRefCode))
        this._err(ERR.noncharacterCharacterReference);

    else if (unicode.isControlCodePoint(this.charRefCode) || this.charRefCode === $.CARRIAGE_RETURN) {
        this._err(ERR.controlCharacterReference);

        var replacement = C1_CONTROLS_REFERENCE_REPLACEMENTS[this.charRefCode];

        if (replacement)
            this.charRefCode = replacement;
    }

    this.tempBuff = [this.charRefCode];

    this._flushCodePointsConsumedAsCharacterReference();
    this._reconsumeInState(this.returnState);
};
