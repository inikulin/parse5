var ParsingFrame = require('./parsing_frame').ParsingFrame,
    namedEntitiesTrie = require('./named_entities_trie').TRIE,
    textUtils = require('./text_utils'),
    err = require('./err');

var undefined,
    CHARS = textUtils.CHARS;

//Replacement codes for numeric entities
var NUMERIC_ENTITY_REPLACEMENTS = {
    0x00: CHARS.REPLACEMENT_CHARACTER,
    0x0D: '\u000D', 0x80: '\u20AC', 0x81: '\u0081', 0x82: '\u201A',
    0x83: '\u0192', 0x84: '\u201E', 0x85: '\u2026', 0x86: '\u2020',
    0x87: '\u2021', 0x88: '\u02C6', 0x89: '\u2030', 0x8A: '\u0160',
    0x8B: '\u2039', 0x8C: '\u0152', 0x8D: '\u008D', 0x8E: '\u017D',
    0x8F: '\u008F', 0x90: '\u0090', 0x91: '\u2018', 0x92: '\u2019',
    0x93: '\u201C', 0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013',
    0x97: '\u2014', 0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161',
    0x9B: '\u203A', 0x9C: '\u0153', 0x9D: '\u009D', 0x9E: '\u017E',
    0x9F: '\u0178'
};

//States
var DATA_STATE = 'DATA_STATE',
    CHARACTER_REFERENCE_IN_DATA_STATE = 'CHARACTER_REFERENCE_IN_DATA_STATE',
    RCDATA_STATE = 'RCDATA_STATE',
    CHARACTER_REFERENCE_IN_RCDATA_STATE = 'CHARACTER_REFERENCE_IN_RCDATA_STATE',
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
    CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE = 'CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE',
    AFTER_ATTRIBUTE_VALUE_QUOTED_STATE = 'AFTER_ATTRIBUTE_VALUE_QUOTED_STATE',
    SELF_CLOSING_START_TAG_STATE = 'SELF_CLOSING_START_TAG_STATE',
    BOGUS_COMMENT_STATE = 'BOGUS_COMMENT_STATE',
    MARKUP_DECLARATION_OPEN_STATE = 'MARKUP_DECLARATION_OPEN_STATE',
    COMMENT_START_STATE = 'COMMENT_START_STATE',
    COMMENT_START_DASH_STATE = 'COMMENT_START_DASH_STATE',
    COMMENT_STATE = 'COMMENT_STATE',
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
    CDATA_SECTION_STATE = 'CDATA_SECTION_STATE';

//TODO there is an issue with character tokens in case of surrogate pairs. Use arrays instead of strings

//Tokenizer
var Tokenizer = exports.Tokenizer = function (html) {
    //Output
    this.tokenQueue = [];
    this.errs = [];

    //Parsing frame
    this.parsingFrame = new ParsingFrame(html, this.errs);

    //Flags
    this.allowCDATA = false;

    //State machine
    this.consumptionPos = 0;
    this.state = DATA_STATE;
    this.tempBuff = '';
    this.additionalAllowedCh = undefined;
    this.returnState = null;
    this.lastStartTagName = null;
    this.currentToken = null;
    this.currentAttr = {};
};

//Token types
Tokenizer.CHARACTER_TOKEN = 'CHARACTER_TOKEN';
Tokenizer.START_TAG_TOKEN = 'START_TAG_TOKEN';
Tokenizer.END_TAG_TOKEN = 'END_TAG_TOKEN';
Tokenizer.COMMENT_TOKEN = 'COMMENT_TOKEN';
Tokenizer.DOCTYPE_TOKEN = 'DOCTYPE_TOKEN';
Tokenizer.EOF_TOKEN = 'EOF_TOKEN';

//Get token
Tokenizer.prototype.getToken = function () {
    while (!this.tokenQueue.length)
        this[this.state](this._consumeChar());

    return this.tokenQueue.shift();
};

//Consumption and lookahead
Tokenizer.prototype._consumeChar = function () {
    this.consumptionPos++;
    return this.parsingFrame.advanceAndPeekChar();
};

Tokenizer.prototype._unconsumeChar = function () {
    this.consumptionPos--;
    this.parsingFrame.retreat();
};

Tokenizer.prototype._unconsumeSeveralChars = function (count) {
    while (count--)
        this._unconsumeChar();
};

Tokenizer.prototype._reconsumeCharInState = function (state) {
    this.state = state;
    this._unconsumeChar();
};

Tokenizer.prototype._lookahead = function () {
    var ch = this.parsingFrame.advanceAndPeekChar();
    this.parsingFrame.retreat();

    return ch;
};

Tokenizer.prototype._consumeSubsequentCharsIfMatch = function (str, startCh, caseSensitive) {
    var rollbackPos = this.consumptionPos,
        isMatch = true;

    for (var strPos = 0, ch = startCh, strCh = str[0]; strPos < str.length; strPos++) {
        if (strPos > 0)
            ch = this._consumeChar();

        if (ch === CHARS.EOF) {
            isMatch = false;
            break;
        }

        strCh = str[strPos];

        if (ch !== strCh && (caseSensitive || ch !== textUtils.asciiToLower(strCh))) {
            isMatch = false;
            break;
        }
    }

    if (!isMatch)
        this._unconsumeSeveralChars(this.consumptionPos - rollbackPos);

    return isMatch;
};

//Error handling
Tokenizer.prototype._err = function (code) {
    this.errs.push({
        code: code,
        line: this.parsingFrame.line,
        col: this.parsingFrame.col
    });
};

Tokenizer.prototype._unexpectedEOF = function () {
    this._err(err.UNEXPECTED_END_OF_FILE);
    this._reconsumeCharInState(DATA_STATE);
};

//Token creation
Tokenizer.prototype._createStartTagToken = function (tagNameFirstCh) {
    this.currentToken = {
        type: Tokenizer.START_TAG_TOKEN,
        tagName: tagNameFirstCh,
        selfClosing: false,
        attrs: []
    };
};

Tokenizer.prototype._createEndTagToken = function (tagNameFirstCh) {
    this.currentToken = {
        type: Tokenizer.END_TAG_TOKEN,
        tagName: tagNameFirstCh,
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

Tokenizer.prototype._createDoctypeToken = function (doctypeNameFirstCh) {
    this.currentToken = {
        type: Tokenizer.DOCTYPE_TOKEN,
        name: doctypeNameFirstCh || '',
        forceQuirks: false,
        publicID: null,
        systemID: null
    };
};

//Tag attributes
Tokenizer.prototype._createAttr = function (attrNameFirstCh) {
    this.currentAttr = {
        name: attrNameFirstCh,
        value: ''
    };
};

Tokenizer.prototype._isDuplicateAttr = function () {
    var attrs = this.currentToken.attrs;

    for (var i = 0; i < attrs.length; i++) {
        if (attrs[i].name === this.currentAttr.name)
            return true;
    }

    return false;
};

Tokenizer.prototype._leaveAttrName = function (toState) {
    this.state = toState;

    if (this._isDuplicateAttr())
        this._err(err.DUPLICATE_ATTRIBUTE);
    else
        this.currentToken.attrs.push(this.currentAttr);
};

//Appropriate end tag token
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#appropriate-end-tag-token)
Tokenizer.prototype._isAppropriateEndTagToken = function () {
    return this.lastStartTagName === this.currentToken.tagName;
};

//Token emission
Tokenizer.prototype._emitCurrentToken = function () {
    //NOTE: store emited start tag's tagName to determine is the following end tag token is appropriate.
    if (this.currentToken.type === Tokenizer.START_TAG_TOKEN)
        this.lastStartTagName = this.currentToken.tagName;

    if (this.currentToken.type === Tokenizer.END_TAG_TOKEN) {
        if (this.currentToken.attrs.length)
            this._err('Parse error');

        if (this.currentToken.selfClosing)
            this._err('Parse error');
    }

    this.tokenQueue.push(this.currentToken);
    this.currentToken = null;
};

Tokenizer.prototype._emitCharacterToken = function (ch) {
    this.tokenQueue.push({
        type: Tokenizer.CHARACTER_TOKEN,
        ch: ch
    });
};

Tokenizer.prototype._emitSeveralCharacterTokens = function (chars) {
    for (var i = 0; i < chars.length; i++)
        this._emitCharacterToken(chars[i]);
};

Tokenizer.prototype._emitEOFToken = function () {
    this.tokenQueue.push({type: Tokenizer.EOF_TOKEN});
};

//Character reference tokenization
Tokenizer.prototype._consumeNumericEntity = function (isHex) {
    var digits = '',
        nextCh = undefined,
        isDigit = isHex ? textUtils.isAsciiAlphaNumeric : textUtils.isAsciiDigit;

    do {
        digits += this._consumeChar();
        nextCh = this._lookahead();
    } while (nextCh !== CHARS.EOF && isDigit(nextCh));

    if (this._lookahead() === ';')
        this._consumeChar();
    else
        this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

    var charCode = parseInt(digits, isHex ? 16 : 10),
        replacement = NUMERIC_ENTITY_REPLACEMENTS[charCode];

    if (replacement) {
        this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);
        return replacement;
    }

    if (textUtils.isUnicodeReservedCharCode(charCode)) {
        this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);
        return CHARS.REPLACEMENT_CHARACTER;
    }

    if (textUtils.isIllegalCharCode(charCode))
        this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

    return textUtils.getStringFromCharCode(charCode);
};

Tokenizer.prototype._consumeNamedEntity = function (startCh, inAttr) {
    var entityChars = null,
        entityCharsCount = 0,
        ch = startCh,
        leaf = namedEntitiesTrie[ch],
        consumedCount = 1,
        semicolonTerminated = false;

    for (; ch !== CHARS.EOF; ch = this._consumeChar(), consumedCount++, leaf = leaf.$l && leaf.$l[ch]) {
        if (!leaf)
            break;

        if (leaf.$c) {
            //NOTE: we have at least one named reference match. But we don't stop lookup at this point,
            //because longer matches still can be found (e.g. '&not' and '&notin;') except the case
            //then found match is terminated by semicolon.
            entityChars = leaf.$c;
            entityCharsCount = consumedCount;

            if (ch === ';') {
                semicolonTerminated = true;
                break;
            }
        }
    }

    if (entityChars) {
        if (!semicolonTerminated) {
            this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

             //NOTE: unconsume excess (e.g. 'it' in '&notit')
            this._unconsumeSeveralChars(consumedCount - entityCharsCount);

            //NOTE: If the character reference is being consumed as part of an attribute and the next character
            //is either a U+003D EQUALS SIGN character (=) or an alphanumeric ASCII character, then, for historical
            //reasons, all the characters that were matched after the U+0026 AMPERSAND character (&) must be
            //unconsumed, and nothing is returned.
            //However, if this next character is in fact a U+003D EQUALS SIGN character (=), then this is a
            //parse error, because some legacy user agents will misinterpret the markup in those cases.
            //(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#tokenizing-character-references)
            if (inAttr) {
                var nextCh = this._lookahead();

                if (nextCh === '=' || textUtils.isAsciiAlphaNumeric(nextCh)) {
                    if (nextCh === '=')
                        this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

                    this._unconsumeSeveralChars(entityCharsCount);
                    return null;
                }
            }
        }

        return entityChars;
    }

    this._unconsumeSeveralChars(consumedCount);
    this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

    return null;
};

Tokenizer.prototype._consumeCharacterReference = function (startCh, inAttr) {
    if (startCh === '\n' || startCh === '\f' || startCh === '\t' || startCh === ' ' ||
        startCh === '<' || startCh === '&' || startCh === CHARS.EOF || startCh === this.additionalAllowedCh) {
        //NOTE: not a character reference. No characters are consumed, and nothing is returned.
        this._unconsumeChar();
        return null;
    }

    else if (startCh === '#') {
        //NOTE: we have a numeric entity candidate, now we should determine if it's hex or decimal
        var isHex = false,
            nextCh = this._lookahead();

        if (nextCh === 'x' || nextCh === 'X') {
            this._consumeChar();
            isHex = true;
        }

        var isDigit = isHex ? textUtils.isAsciiAlphaNumeric : textUtils.isAsciiDigit;

        nextCh = this._lookahead();

        //NOTE: if we have at least one digit this is a numeric entity for sure, so we consume it
        if (nextCh !== CHARS.EOF && isDigit(nextCh))
            return this._consumeNumericEntity(isHex);
        else {
            //NOTE: otherwise this is a bogus number entity and a parse error. Unconsume the number sign
            //and the 'x'-character if appropriate.
            this._unconsumeSeveralChars(isHex ? 2 : 1);
            this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

            return null;
        }
    }

    else
        return this._consumeNamedEntity(startCh, inAttr);
};

//State machine
var _ = Tokenizer.prototype;

//12.2.4.1 Data state
_[DATA_STATE] = function (ch) {
    if (ch === '&')
        this.state = CHARACTER_REFERENCE_IN_DATA_STATE;

    else if (ch === '<')
        this.state = TAG_OPEN_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(ch);
    }

    else if (ch === CHARS.EOF)
        this._emitEOFToken();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.2 Character reference in data state
_[CHARACTER_REFERENCE_IN_DATA_STATE] = function (ch) {
    this.state = DATA_STATE;
    this.additionalAllowedCh = undefined;

    var replacementChars = this._consumeCharacterReference(ch, false);

    if (replacementChars)
        this._emitSeveralCharacterTokens(replacementChars);
    else
        this._emitCharacterToken('&');
};

//12.2.4.3 RCDATA state
_[RCDATA_STATE] = function (ch) {
    if (ch === '&')
        this.state = CHARACTER_REFERENCE_IN_RCDATA_STATE;

    else if (ch === '<')
        this.state = RCDATA_LESS_THAN_SIGN_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(CHARS.REPLACEMENT_CHARACTER);
    }

    else if (ch === CHARS.EOF)
        this._emitEOFToken();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.4 Character reference in RCDATA state
_[CHARACTER_REFERENCE_IN_RCDATA_STATE] = function (ch) {
    this.state = RCDATA_STATE;
    this.additionalAllowedCh = undefined;

    var replacementChars = this._consumeCharacterReference(ch, false);

    if (replacementChars)
        this._emitSeveralCharacterTokens(replacementChars);
    else
        this._emitCharacterToken('&');
};

//12.2.4.5 RAWTEXT state
_[RAWTEXT_STATE] = function (ch) {
    if (ch === '<')
        this.state = RAWTEXT_LESS_THAN_SIGN_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(CHARS.REPLACEMENT_CHARACTER);
    }

    else if (ch === CHARS.EOF)
        this._emitEOFToken();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.6 Script data state
_[SCRIPT_DATA_STATE] = function (ch) {
    if (ch === '<')
        this.state = SCRIPT_DATA_LESS_THAN_SIGN_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(CHARS.REPLACEMENT_CHARACTER);
    }

    else if (ch === CHARS.EOF)
        this._emitEOFToken();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.7 PLAINTEXT state
_[PLAINTEXT_STATE] = function (ch) {
    if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(CHARS.REPLACEMENT_CHARACTER);
    }

    else if (ch === CHARS.EOF)
        this._emitEOFToken();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.8 Tag open state
_[TAG_OPEN_STATE] = function (ch) {
    if (ch === '!')
        this.state = MARKUP_DECLARATION_OPEN_STATE;

    else if (ch === '/')
        this.state = END_TAG_OPEN_STATE;

    else if (ch >= 'A' && ch <= 'Z') {
        this._createStartTagToken(textUtils.asciiToLower(ch));
        this.state = TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createStartTagToken(ch);
        this.state = TAG_NAME_STATE;
    }

    else if (ch === '?') {
        this._err(err.MAILFORMED_COMMENT);
        //NOTE: call bogus comment state directly with current consumed character to avoid unnecessary reconsumption.
        this[BOGUS_COMMENT_STATE](ch);
    }

    else {
        this._err(err.UNEXPECTED_CHARACTER_IN_TAG_NAME);
        this._emitCharacterToken('<');
        this._reconsumeCharInState(DATA_STATE);
    }
};

//12.2.4.9 End tag open state
_[END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(textUtils.asciiToLower(ch));
        this.state = TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.state = TAG_NAME_STATE;
    }

    else if (ch === '>') {
        this._err(err.MISSING_END_TAG_NAME);
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this._unexpectedEOF();
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
    }

    else {
        this._err(err.MAILFORMED_COMMENT);
        //NOTE: call bogus comment state directly with current consumed character to avoid unnecessary reconsumption.
        this[BOGUS_COMMENT_STATE](ch);
    }
};

//12.2.4.10 Tag name state
_[TAG_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BEFORE_ATTRIBUTE_NAME_STATE;

    else if (ch === '/')
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch >= 'A' && ch <= 'Z')
        this.currentToken.tagName += textUtils.asciiToLower(ch);

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.tagName += CHARS.REPLACEMENT_CHARACTER;
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else
        this.currentToken.tagName += ch;
};

//12.2.4.11 RCDATA less-than sign state
_[RCDATA_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = RCDATA_END_TAG_OPEN_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._reconsumeCharInState(RCDATA_STATE);
    }
};

//12.2.4.12 RCDATA end tag open state
_[RCDATA_END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(textUtils.asciiToLower(ch));
        this.tempBuff += ch;
        this.state = RCDATA_END_TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.tempBuff += ch;
        this.state = RCDATA_END_TAG_NAME_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
        this._reconsumeCharInState(RCDATA_STATE);
    }
};

//12.2.4.13 RCDATA end tag name state
_[RCDATA_END_TAG_NAME_STATE] = function (ch) {
    var tokenizer = this,
        defaultEntry = function () {
            tokenizer._emitCharacterToken('<');
            tokenizer._emitCharacterToken('/');

            for (var i = 0; i < tokenizer.tempBuff.length; i++)
                tokenizer._emitCharacterToken(tokenizer.tempBuff[i]);

            tokenizer._reconsumeCharInState(RCDATA_STATE);
        };

    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ') {
        if (this._isAppropriateEndTagToken())
            this.state = BEFORE_ATTRIBUTE_NAME_STATE;
        else
            defaultEntry();
    }

    else if (ch === '/') {
        if (this._isAppropriateEndTagToken())
            this.state = SELF_CLOSING_START_TAG_STATE;
        else
            defaultEntry();
    }

    else if (ch === '>') {
        if (this._isAppropriateEndTagToken()) {
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else
            defaultEntry();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.currentToken.tagName += textUtils.asciiToLower(ch);
        this.tempBuff += ch;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.currentToken.tagName += ch;
        this.tempBuff += ch;
    }

    else
        defaultEntry();
};

//12.2.4.14 RAWTEXT less-than sign state
_[RAWTEXT_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = RAWTEXT_END_TAG_OPEN_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._reconsumeCharInState(RAWTEXT_STATE);
    }
};

//12.2.4.15 RAWTEXT end tag open state
_[RAWTEXT_END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(textUtils.asciiToLower(ch));
        this.tempBuff += ch;
        this.state = RAWTEXT_END_TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.tempBuff += ch;
        this.state = RAWTEXT_END_TAG_NAME_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
        this._reconsumeCharInState(RAWTEXT_STATE);
    }
};

//12.2.4.16 RAWTEXT end tag name state
_[RAWTEXT_END_TAG_NAME_STATE] = function (ch) {
    var tokenizer = this,
        defaultEntry = function () {
            tokenizer._emitCharacterToken('<');
            tokenizer._emitCharacterToken('/');

            for (var i = 0; i < tokenizer.tempBuff.length; i++)
                tokenizer._emitCharacterToken(tokenizer.tempBuff[i]);

            tokenizer._reconsumeCharInState(RAWTEXT_STATE);
        };

    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ') {
        if (this._isAppropriateEndTagToken())
            this.state = BEFORE_ATTRIBUTE_NAME_STATE;
        else
            defaultEntry();
    }

    else if (ch === '/') {
        if (this._isAppropriateEndTagToken())
            this.state = SELF_CLOSING_START_TAG_STATE;
        else
            defaultEntry();
    }

    else if (ch === '>') {
        if (this._isAppropriateEndTagToken()) {
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else
            defaultEntry();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.currentToken.tagName += textUtils.asciiToLower(ch);
        this.tempBuff += ch;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.currentToken.tagName += ch;
        this.tempBuff += ch;
    }

    else
        defaultEntry();
};

//12.2.4.17 Script data less-than sign state
_[SCRIPT_DATA_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = SCRIPT_DATA_END_TAG_OPEN_STATE;
    }

    else if (ch === '!') {
        this.state = SCRIPT_DATA_ESCAPE_START_STATE;
        this._emitCharacterToken('<');
        this._emitCharacterToken('!');
    }

    else {
        this._emitCharacterToken('<');
        this._reconsumeCharInState(SCRIPT_DATA_STATE);
    }
};

//12.2.4.18 Script data end tag open state
_[SCRIPT_DATA_END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(textUtils.asciiToLower(ch));
        this.tempBuff += ch;
        this.state = SCRIPT_DATA_END_TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.tempBuff += ch;
        this.state = SCRIPT_DATA_END_TAG_NAME_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
        this._reconsumeCharInState(SCRIPT_DATA_STATE);
    }
};

//12.2.4.19 Script data end tag name state
_[SCRIPT_DATA_END_TAG_NAME_STATE] = function (ch) {
    var tokenizer = this,
        defaultEntry = function () {
            tokenizer._emitCharacterToken('<');
            tokenizer._emitCharacterToken('/');

            for (var i = 0; i < tokenizer.tempBuff.length; i++)
                tokenizer._emitCharacterToken(tokenizer.tempBuff[i]);

            tokenizer._reconsumeCharInState(SCRIPT_DATA_STATE);
        };

    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ') {
        if (this._isAppropriateEndTagToken())
            this.state = BEFORE_ATTRIBUTE_NAME_STATE;
        else
            defaultEntry();
    }

    else if (ch === '/') {
        if (this._isAppropriateEndTagToken())
            this.state = SELF_CLOSING_START_TAG_STATE;
        else
            defaultEntry();
    }

    else if (ch === '>') {
        if (this._isAppropriateEndTagToken()) {
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else
            defaultEntry();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.currentToken.tagName += textUtils.asciiToLower(ch);
        this.tempBuff += ch;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.currentToken.tagName += ch;
        this.tempBuff += ch;
    }

    else
        defaultEntry();
};

//12.2.4.20 Script data escape start state
_[SCRIPT_DATA_ESCAPE_START_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_ESCAPE_START_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else
        this._reconsumeCharInState(SCRIPT_DATA_STATE);
};

//12.2.4.21 Script data escape start dash state
_[SCRIPT_DATA_ESCAPE_START_DASH_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else
        this._reconsumeCharInState(SCRIPT_DATA_STATE);
};

//12.2.4.22 Script data escaped state
_[SCRIPT_DATA_ESCAPED_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_ESCAPED_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else if (ch === '<')
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(CHARS.REPLACEMENT_CHARACTER);
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.23 Script data escaped dash state
_[SCRIPT_DATA_ESCAPED_DASH_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else if (ch === '<')
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCharacterToken(CHARS.REPLACEMENT_CHARACTER);
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else {
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }
};

//12.2.4.24 Script data escaped dash dash state
_[SCRIPT_DATA_ESCAPED_DASH_DASH_STATE] = function (ch) {
    if (ch === '-')
        this._emitCharacterToken('-');

    else if (ch === '<')
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (ch === '>') {
        this.state = SCRIPT_DATA_STATE;
        this._emitCharacterToken('>');
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCharacterToken(CHARS.REPLACEMENT_CHARACTER);
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else {
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }
};

//12.2.4.25 Script data escaped less-than sign state
_[SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE;
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.tempBuff = textUtils.asciiToLower(ch);
        this.state = SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE;
        this._emitCharacterToken('<');
        this._emitCharacterToken(ch);
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.tempBuff = ch;
        this.state = SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE;
        this._emitCharacterToken('<');
        this._emitCharacterToken(ch);
    }

    else {
        this._emitCharacterToken('<');
        this._reconsumeCharInState(SCRIPT_DATA_ESCAPED_STATE);
    }
};

//12.2.4.26 Script data escaped end tag open state
_[SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(textUtils.asciiToLower(ch));
        this.tempBuff += ch;
        this.state = SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.tempBuff += ch;
        this.state = SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
        this._reconsumeCharInState(SCRIPT_DATA_ESCAPED_STATE);
    }
};

//12.2.4.27 Script data escaped end tag name state
_[SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE] = function (ch) {
    var tokenizer = this,
        defaultEntry = function () {
            tokenizer._emitCharacterToken('<');
            tokenizer._emitCharacterToken('/');

            for (var i = 0; i < tokenizer.tempBuff.length; i++)
                tokenizer._emitCharacterToken(tokenizer.tempBuff[i]);

            tokenizer._reconsumeCharInState(SCRIPT_DATA_ESCAPED_STATE);
        };

    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ') {
        if (this._isAppropriateEndTagToken())
            this.state = BEFORE_ATTRIBUTE_NAME_STATE;
        else
            defaultEntry();
    }

    else if (ch === '/') {
        if (this._isAppropriateEndTagToken())
            this.state = SELF_CLOSING_START_TAG_STATE;
        else
            defaultEntry();
    }

    else if (ch === '>') {
        if (this._isAppropriateEndTagToken()) {
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else
            defaultEntry();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.currentToken.tagName += textUtils.asciiToLower(ch);
        this.tempBuff += ch;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.currentToken.tagName += ch;
        this.tempBuff += ch;
    }

    else
        defaultEntry();
};

//12.2.4.28 Script data double escape start state
_[SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ' || ch === '/' || ch === '>') {
        this.state = this.tempBuff === 'script' ? SCRIPT_DATA_DOUBLE_ESCAPED_STATE : SCRIPT_DATA_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.tempBuff += textUtils.asciiToLower(ch);
        this._emitCharacterToken(ch);
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.tempBuff += ch;
        this._emitCharacterToken(ch);
    }

    else
        this._reconsumeCharInState(SCRIPT_DATA_ESCAPED_STATE);
};

//12.2.4.29 Script data double escaped state
_[SCRIPT_DATA_DOUBLE_ESCAPED_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else if (ch === '<') {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitCharacterToken('<');
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(CHARS.REPLACEMENT_CHARACTER);
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.30 Script data double escaped dash state
_[SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else if (ch === '<') {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitCharacterToken('<');
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCharacterToken(CHARS.REPLACEMENT_CHARACTER);
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }
};

//12.2.4.31 Script data double escaped dash dash state
_[SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE] = function (ch) {
    if (ch === '-')
        this._emitCharacterToken('-');

    else if (ch === '<') {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitCharacterToken('<');
    }

    else if (ch === '>') {
        this.state = SCRIPT_DATA_STATE;
        this._emitCharacterToken('>');
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCharacterToken(CHARS.REPLACEMENT_CHARACTER);
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }
};

//12.2.4.32 Script data double escaped less-than sign state
_[SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE;
        this._emitCharacterToken('/');
    }

    else
        this._reconsumeCharInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
};

//12.2.4.33 Script data double escape end state
_[SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ' || ch === '/' || ch === '>') {
        this.state = this.tempBuff === 'script' ? SCRIPT_DATA_ESCAPED_STATE : SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.tempBuff += textUtils.asciiToLower(ch);
        this._emitCharacterToken(ch);
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.tempBuff += ch;
        this._emitCharacterToken(ch);
    }

    else
        this._reconsumeCharInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
};

//12.2.4.34 Before attribute name state
_[BEFORE_ATTRIBUTE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '/')
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this._createAttr(textUtils.asciiToLower(ch));
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._createAttr(CHARS.REPLACEMENT_CHARACTER);
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === '\'' || ch === '"' || ch === '<' || ch === '=') {
        this._err(err.MAILFORMED_ATTRIBUTE_NAME);
        this._createAttr(ch);
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else {
        this._createAttr(ch);
        this.state = ATTRIBUTE_NAME_STATE;
    }
};

//12.2.4.35 Attribute name state
_[ATTRIBUTE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this._leaveAttrName(AFTER_ATTRIBUTE_NAME_STATE);

    else if (ch === '/')
        this._leaveAttrName(SELF_CLOSING_START_TAG_STATE);

    else if (ch === '=')
        this._leaveAttrName(BEFORE_ATTRIBUTE_VALUE_STATE);

    else if (ch === '>') {
        this._leaveAttrName(DATA_STATE);
        this._emitCurrentToken();
    }

    else if (ch >= 'A' && ch <= 'Z')
        this.currentAttr.name += textUtils.asciiToLower(ch);

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentAttr.name += CHARS.REPLACEMENT_CHARACTER;
    }

    else if (ch === '\'' || ch === '"' || ch === '<') {
        this._err(err.MAILFORMED_ATTRIBUTE_NAME);
        this.currentAttr.name += ch;
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else
        this.currentAttr.name += ch;
};

//12.2.4.36 After attribute name state
_[AFTER_ATTRIBUTE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '/')
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (ch === '=')
        this.state = BEFORE_ATTRIBUTE_VALUE_STATE;

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this._createAttr(textUtils.asciiToLower(ch));
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._createAttr(CHARS.REPLACEMENT_CHARACTER);
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === '\'' || ch === '"' || ch === '<') {
        this._err(err.MAILFORMED_ATTRIBUTE_NAME);
        this._createAttr(ch);
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else {
        this._createAttr(ch);
        this.state = ATTRIBUTE_NAME_STATE;
    }
};

//12.2.4.37 Before attribute value state
_[BEFORE_ATTRIBUTE_VALUE_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '"')
        this.state = ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE;

    else if (ch === '&')
        this._reconsumeCharInState(ATTRIBUTE_VALUE_UNQUOTED_STATE);

    else if (ch === '\'')
        this.state = ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentAttr.value += CHARS.REPLACEMENT_CHARACTER;
        this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
    }

    else if (ch === '>') {
        this._err(err.INVALID_ATTRIBUTE_DEFINITION);
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === '<' || ch === '=' || ch === CHARS.GRAVE_ACCENT) {
        this._err(err.MAILFORMED_ATTRIBUTE_VALUE);
        this.currentAttr.value += ch;
        this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else {
        this.currentAttr.value += ch;
        this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
    }
};

//12.2.4.38 Attribute value (double-quoted) state
_[ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE] = function (ch) {
    if (ch === '"')
        this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;

    else if (ch === '&') {
        this.additionalAllowedCh = '"';
        this.returnState = this.state;
        this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentAttr.value += CHARS.REPLACEMENT_CHARACTER
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else
        this.currentAttr.value += ch;
};

//12.2.4.39 Attribute value (single-quoted) state
_[ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE] = function (ch) {
    if (ch === '\'')
        this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;

    else if (ch === '&') {
        this.additionalAllowedCh = '\'';
        this.returnState = this.state;
        this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentAttr.value += CHARS.REPLACEMENT_CHARACTER;
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else
        this.currentAttr.value += ch;
};

//12.2.4.40 Attribute value (unquoted) state
_[ATTRIBUTE_VALUE_UNQUOTED_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BEFORE_ATTRIBUTE_NAME_STATE;

    else if (ch === '&') {
        this.additionalAllowedCh = '>';
        this.returnState = this.state;
        this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
    }

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentAttr.value += CHARS.REPLACEMENT_CHARACTER;
    }

    else if (ch === '\'' || ch === '"' || ch === '<' || ch === '=' || ch === CHARS.GRAVE_ACCENT) {
        this._err(err.MAILFORMED_ATTRIBUTE_VALUE);
        this.currentAttr.value += ch;
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else
        this.currentAttr.value += ch;
};

//12.2.4.41 Character reference in attribute value state
_[CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE] = function (ch) {
    var chars = this._consumeCharacterReference(ch, true);

    if (chars) {
        for (var i = 0; i < chars.length; i++)
            this.currentAttr.value += chars[i];
    } else
        this.currentAttr.value += '&';

    this.state = this.returnState;
};

//12.2.4.42 After attribute value (quoted) state
_[AFTER_ATTRIBUTE_VALUE_QUOTED_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BEFORE_ATTRIBUTE_NAME_STATE;

    else if (ch === '/')
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else {
        this._err(err.UNEXPECTED_CHARACTER_IN_TAG_DEFINITION);
        this._reconsumeCharInState(BEFORE_ATTRIBUTE_NAME_STATE);
    }
};

//12.2.4.43 Self-closing start tag state
_[SELF_CLOSING_START_TAG_STATE] = function (ch) {
    if (ch === '>') {
        this.currentToken.selfClosing = true;
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === CHARS.EOF)
        this._unexpectedEOF();

    else {
        this._err(err.UNEXPECTED_CHARACTER_IN_TAG_DEFINITION);
        this._reconsumeCharInState(BEFORE_ATTRIBUTE_NAME_STATE);
    }
};

//12.2.4.44 Bogus comment state
_[BOGUS_COMMENT_STATE] = function (ch) {
    this._createCommentToken();

    while (true) {
        if (ch === '>') {
            this.state = DATA_STATE;
            break;
        }

        else if (ch === CHARS.EOF) {
            this._reconsumeCharInState(DATA_STATE);
            break;
        }

        else {
            if (ch === CHARS.NULL)
                ch = CHARS.REPLACEMENT_CHARACTER;

            this.currentToken.data += ch;
            ch = this._consumeChar();
        }
    }

    this._emitCurrentToken();
};

//12.2.4.45 Markup declaration open state
_[MARKUP_DECLARATION_OPEN_STATE] = function (ch) {
    if (this._consumeSubsequentCharsIfMatch('--', ch, true)) {
        this._createCommentToken();
        this.state = COMMENT_START_STATE;
    }

    else if (this._consumeSubsequentCharsIfMatch('DOCTYPE', ch, false))
        this.state = DOCTYPE_STATE;

    else if (this.allowCDATA && this._consumeSubsequentCharsIfMatch('[CDATA[', true))
        this.state = CDATA_SECTION_STATE;

    else {
        this._err('Parse error');
        //NOTE: call bogus comment state directly with current consumed character to avoid unnecessary reconsumption.
        this[BOGUS_COMMENT_STATE](ch);
    }
};

//12.2.4.46 Comment start state
_[COMMENT_START_STATE] = function (ch) {
    if (ch === '-')
        this.state = COMMENT_START_DASH_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += CHARS.REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_COMMENT);
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === CHARS.EOF) {
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this.currentToken.data += ch;
        this.state = COMMENT_STATE;
    }
};

//12.2.4.47 Comment start dash state
_[COMMENT_START_DASH_STATE] = function (ch) {
    if (ch === '-')
        this.state = COMMENT_END_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += '-';
        this.currentToken.data += CHARS.REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_COMMENT);
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === CHARS.EOF) {
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this.currentToken.data += '-';
        this.currentToken.data += ch;
        this.state = COMMENT_STATE;
    }
};

//12.2.4.48 Comment state
_[COMMENT_STATE] = function (ch) {
    if (ch === '-')
        this.state = COMMENT_END_DASH_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += CHARS.REPLACEMENT_CHARACTER;
    }

    else if (ch === CHARS.EOF) {
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.data += ch;
};

//12.2.4.49 Comment end dash state
_[COMMENT_END_DASH_STATE] = function (ch) {
    if (ch === '-')
        this.state = COMMENT_END_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += '-';
        this.currentToken.data += CHARS.REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (ch === CHARS.EOF) {
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this.currentToken.data += '-';
        this.currentToken.data += ch;
        this.state = COMMENT_STATE;
    }
};

//12.2.4.50 Comment end state
_[COMMENT_END_STATE] = function (ch) {
    if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += '--';
        this.currentToken.data += CHARS.REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (ch === '!') {
        this._err(err.MAILFORMED_COMMENT);
        this.state = COMMENT_END_BANG_STATE;
    }

    else if (ch === '-') {
        this._err(err.MAILFORMED_COMMENT);
        this.currentToken.data += '-';
    }

    else if (ch === CHARS.EOF) {
        this._unexpectedEOF();
        this._emitCurrentToken();
    }

    else {
        this._err(err.MAILFORMED_COMMENT);
        this.currentToken.data += '--';
        this.currentToken.data += ch;
        this.state = COMMENT_STATE;
    }
};

//12.2.4.51 Comment end bang state
_[COMMENT_END_BANG_STATE] = function (ch) {
    if (ch === '-') {
        this.currentToken.data += '--!';
        this.state = COMMENT_END_DASH_STATE;
    }

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += '--!';
        this.currentToken.data += CHARS.REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (ch === CHARS.EOF) {
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this.currentToken.data += '--!';
        this.currentToken.data += ch;
        this.state = COMMENT_STATE;
    }
};

//12.2.4.52 DOCTYPE state
_[DOCTYPE_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BEFORE_DOCTYPE_NAME_STATE;

    else if (ch === CHARS.EOF) {
        this._createDoctypeToken();
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MAILFORMED_DOCTYPE);
        this._reconsumeCharInState(BEFORE_DOCTYPE_NAME_STATE);
    }
};

//12.2.4.53 Before DOCTYPE name state
_[BEFORE_DOCTYPE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch >= 'A' && ch <= 'Z') {
        this._createDoctypeToken(textUtils.asciiToLower(ch));
        this.state = DOCTYPE_NAME_STATE;
    }

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._createDoctypeToken(CHARS.REPLACEMENT_CHARACTER);
        this.state = DOCTYPE_NAME_STATE;
    }

    else if (ch === '>') {
        this._err('Parse error');
        this._createDoctypeToken();
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this._createDoctypeToken();
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._createDoctypeToken(ch);
        this.state = DOCTYPE_NAME_STATE;
    }
};

//12.2.4.54 DOCTYPE name state
_[DOCTYPE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = AFTER_DOCTYPE_NAME_STATE;

    else if (ch === '>') {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch >= 'A' && ch <= 'Z')
        this.currentToken.name += textUtils.asciiToLower(ch);

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.name += CHARS.REPLACEMENT_CHARACTER;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.name += ch;
};

//12.2.4.55 After DOCTYPE name state
_[AFTER_DOCTYPE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else if (this._consumeSubsequentCharsIfMatch('PUBLIC', ch, false))
        this.state = AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE;

    else if (this._consumeSubsequentCharsIfMatch('SYSTEM', ch, false))
        this.state = AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE;

    else {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.56 After DOCTYPE public keyword state
_[AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (ch === '"') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.publicID = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (ch === '\'') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.publicID = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === '>') {
        this._err(err.MISSING_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MISSING_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.57 Before DOCTYPE public identifier state
_[BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '"') {
        this.currentToken.publicID = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (ch === '\'') {
        this.currentToken.publicID = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === '>') {
        this._err(err.MISSING_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MISSING_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.58 DOCTYPE public identifier (double-quoted) state
_[DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE] = function (ch) {
    if (ch === '"')
        this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.publicID += CHARS.REPLACEMENT_CHARACTER;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.publicID += ch;
};

//12.2.4.59 DOCTYPE public identifier (single-quoted) state
_[DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE] = function (ch) {
    if (ch === '\'')
        this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.publicID += CHARS.REPLACEMENT_CHARACTER;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.publicID += ch;
};

//12.2.4.60 After DOCTYPE public identifier state
_[AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE;

    else if (ch === '>') {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === '"') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }


    else if (ch === '\'') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.61 Between DOCTYPE public and system identifiers state
_[BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '>') {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === '"') {
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }


    else if (ch === '\'') {
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.62 After DOCTYPE system keyword state
_[AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE;
    else if (ch === '"') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (ch === '\'') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === '>') {
        this._err(err.MISSING_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MISSING_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.63 Before DOCTYPE system identifier state
_[BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '"') {
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (ch === '\'') {
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === '>') {
        this._err(err.MISSING_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MISSING_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.64 DOCTYPE system identifier (double-quoted) state
_[DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE] = function (ch) {
    if (ch === '"')
        this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.systemID += CHARS.REPLACEMENT_CHARACTER;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.systemID += ch;
};

//12.2.4.65 DOCTYPE system identifier (single-quoted) state
_[DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE] = function (ch) {
    if (ch === '\'')
        this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;

    else if (ch === CHARS.NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.systemID += CHARS.REPLACEMENT_CHARACTER;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.systemID += ch;
};

//12.2.4.66 After DOCTYPE system identifier state
_[AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '>') {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MAILFORMED_DOCTYPE);
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.67 Bogus DOCTYPE state
_[BOGUS_DOCTYPE_STATE] = function (ch) {
    if (ch === '>') {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === CHARS.EOF) {
        this._emitCurrentToken();
        this._reconsumeCharInState(DATA_STATE);
    }
};

//12.2.4.68 CDATA section state
_[CDATA_SECTION_STATE] = function (ch) {
    var consumedChars = '';

    while (true) {
        if (ch === CHARS.EOF) {
            this._reconsumeCharInState(DATA_STATE);
            break;
        }

        else if (this._consumeSubsequentCharsIfMatch(']]>', ch, true))
            break;

        else
            consumedChars += ch;

        ch = this._consumeChar();
    }

    this._emitSeveralCharacterTokens(consumedChars);
};