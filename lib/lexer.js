var err = require('./err');

//Const
var EOF = null;

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
    CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUES_STATE = 'CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUES_STATE',
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

//Utils
function asciiToLower(ch) {
    //NOTE: it's pretty fast, faster than String.toLowerCase
    return String.fromCharCode(ch.charCodeAt(0) + 0x0020);
}

var Lexer = exports.Lexer = function (html) {
    //Input data
    this.html = html;

    //Positioning
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.lineLengths = [];

    //Tokenization
    this.state = DATA_STATE;
    this.tempBuff = '';
    this.lastStartTagName = null;
    this.currentTagToken = null;
    this.tokenQueue = [];
    this.errs = [];
};

//Token types
Lexer.CHARACTER_TOKEN = 'CHARACTER_TOKEN';
Lexer.START_TAG_TOKEN = 'START_TAG_TOKEN';
Lexer.END_TAG_TOKEN = 'END_TAG_TOKEN';
Lexer.EOF_TOKEN = 'EOF_TOKEN';

//Proto
Lexer.prototype.getToken = function () {
    var ch = EOF,
        prevCh = this.html[this.pos - 1];

    //NOTE: iterate through states until we don't get at least one token in the queue
    while (!this.tokenQueue.length) {
        if (this.pos < this.html.length)
            ch = this.html[this.pos];

        //NOTE: treat CR+LF as single line break
        if ((ch === '\n' && prevCh !== '\r') || ch === '\r' || ch === '\v' || ch === '\f') {
            this.lineLengths.push(this.col);
            this.line++;
            this.col = 1;
        } else if (ch !== '\n' && prevCh !== '\r')
            this.col++;

        _[this.state].call(this, ch);

        prevCh = ch;
        this.pos++;
    }

    return this.tokenQueue.shift();
};

Lexer.prototype._reconsume = function (inState) {
    this.state = inState;

    this.pos--;
    this.col--;

    if (!this.col) {
        this.line--;
        this.col = this.lineLengths[this.line];
    }
};

Lexer.prototype._err = function (code) {
    this.errs.push({
        code: code,
        line: this.line,
        col: this.col
    });
};

Lexer.prototype._emitCharacterToken = function (ch) {
    this.tokenQueue.push({
        type: Lexer.CHARACTER_TOKEN,
        ch: ch
    });
};

Lexer.prototype._emitEOFToken = function () {
    this.tokenQueue.push({type: Lexer.EOF_TOKEN});
};

Lexer.prototype._emitCurrentTagToken = function () {
    if (this.currentTagToken.type === Lexer.START_TAG_TOKEN)
        this.lastStartTagName = this.currentTagToken.tagName;

    this.tokenQueue.push(this.currentTagToken);
    this.currentTagToken = null;
};

Lexer.prototype._createStartTagToken = function (firstTagNameCh) {
    this.currentTagToken = {
        type: Lexer.START_TAG_TOKEN,
        tagName: firstTagNameCh
    };
};

Lexer.prototype._createEndTagToken = function (firstTagNameCh) {
    this.currentTagToken = {
        type: Lexer.END_TAG_TOKEN,
        tagName: firstTagNameCh
    };
};

Lexer.prototype._isAppropriateEndTagToken = function () {
    return this.lastStartTagName === this.currentTagToken.tagName;
};

//State processors
var _ = {};

//8.2.4.1 Data state
_[DATA_STATE] = function (ch) {
    if (ch === '&')
        this.state = CHARACTER_REFERENCE_IN_DATA_STATE;
    else if (ch === '<')
        this.state = TAG_OPEN_STATE;
    else if (ch === '\u0000') {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(ch);
    } else if (ch === EOF)
        this._emitEOFToken();
    else
        this._emitCharacterToken(ch);
};

//8.2.4.2 Character reference in data state
_[CHARACTER_REFERENCE_IN_DATA_STATE] = function (ch) {
    //TODO
};

//8.2.4.3 RCDATA state
_[RCDATA_STATE] = function (ch) {
    if (ch === '&')
        this.state = CHARACTER_REFERENCE_IN_RCDATA_STATE;
    else if (ch === '<')
        this.state = RCDATA_LESS_THAN_SIGN_STATE;
    else if (ch === '\u0000') {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken('\ufffd');
    } else if (ch === EOF)
        this._emitEOFToken();
    else
        this._emitCharacterToken(ch);
};

//8.2.4.4 Character reference in RCDATA state
_[CHARACTER_REFERENCE_IN_RCDATA_STATE] = function (ch) {
    //TODO
};

//8.2.4.5 RAWTEXT state
_[RAWTEXT_STATE] = function (ch) {
    if (ch === '<')
        this.state = RAWTEXT_LESS_THAN_SIGN_STATE;
    else if (ch === '\u0000') {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken('\ufffd');
    } else if (ch === EOF)
        this._emitEOFToken();
    else
        this._emitCharacterToken(ch);
};

//8.2.4.6 Script data state
_[SCRIPT_DATA_STATE] = function (ch) {
    if (ch === '<')
        this.state = SCRIPT_DATA_LESS_THAN_SIGN_STATE;
    else if (ch === '\u0000') {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken('\ufffd');
    } else if (ch === EOF)
        this._emitEOFToken();
    else
        this._emitCharacterToken(ch);
};

//8.2.4.7 PLAINTEXT state
_[PLAINTEXT_STATE] = function (ch) {
    if (ch === '\u0000') {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken('\ufffd');
    } else if (ch === EOF)
        this._emitEOFToken();
    else
        this._emitCharacterToken(ch);
};

//8.2.4.8 Tag open state
_[TAG_OPEN_STATE] = function (ch) {
    if (ch === '!')
        this.state = MARKUP_DECLARATION_OPEN_STATE;
    else if (ch === '/')
        this.state = END_TAG_OPEN_STATE;
    else if (ch >= 'A' && ch <= 'Z') {
        this._createStartTagToken(asciiToLower(ch));
        this.state = TAG_NAME_STATE;
    } else if (ch >= 'a' && ch <= 'z') {
        this._createStartTagToken(ch);
        this.state = TAG_NAME_STATE;
    } else if (ch === '?') {
        this._err(err.BOGUS_COMMENT);
        this.state = BOGUS_COMMENT_STATE;
    } else {
        this._err(err.UNEXPECTED_CHARACTER_IN_TAG_NAME);
        this._emitCharacterToken('<');
        this._reconsume(DATA_STATE);
    }
};

//8.2.4.9 End tag open state
_[END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(asciiToLower(ch));
        this.state = TAG_NAME_STATE;
    } else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.state = TAG_NAME_STATE;
    } else if (ch === '>') {
        this._err(err.MISSING_END_TAG_NAME);
        this.state = DATA_STATE;
    } else if (ch === EOF) {
        this._err(err.EOF_IN_TAG_NAME);
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
        this._reconsume(DATA_STATE);
    } else {
        this._err(err.BOGUS_COMMENT);
        this.state = BOGUS_COMMENT_STATE;
    }
};

//8.2.4.10 Tag name state
_[TAG_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\r' || ch === '\v' || ch === '\f' || ch === ' ')
        this.state = BEFORE_ATTRIBUTE_NAME_STATE;
    else if (ch === '/')
        this.state = SELF_CLOSING_START_TAG_STATE;
    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentTagToken();
    } else if (ch >= 'A' && ch <= 'Z')
        this.currentTagToken.tagName += asciiToLower(ch);
    else if (ch === '\u0000') {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentTagToken.tagName += '\ufffd';
    } else if (ch === EOF) {
        this._err(err.EOF_IN_TAG_NAME);
        this._reconsume(DATA_STATE);
    } else
        this.currentTagToken.tagName += ch;
};

//8.2.4.11 RCDATA less-than sign state
_[RCDATA_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = RCDATA_END_TAG_OPEN_STATE;
    } else {
        this._emitCharacterToken('<');
        this._reconsume(RCDATA_STATE);
    }
};

//8.2.4.12 RCDATA end tag open state
_[RCDATA_END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createStartTagToken(asciiToLower(ch));
        this.tempBuff += ch;
        this.state = RCDATA_END_TAG_NAME_STATE;
    } else if (ch >= 'a' && ch <= 'z') {
        this._createStartTagToken(ch);
        this.tempBuff += ch;
        this.state = RCDATA_END_TAG_NAME_STATE;
    } else {
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
        this._reconsume(RCDATA_STATE);
    }
};

//8.2.4.13 RCDATA end tag name state
_[RCDATA_END_TAG_NAME_STATE] = function (ch) {
    var lexer = this,
        defaultEntry = function () {
            lexer._emitCharacterToken('<');
            lexer._emitCharacterToken('/');

            for (var i = 0; i < lexer.tempBuff.length; i++)
                lexer._emitCharacterToken(lexer.tempBuff[i]);

            lexer._reconsume(RCDATA_STATE);
        };

    if (ch === '\n' || ch === '\r' || ch === '\v' || ch === '\f' || ch === ' ') {
        if (this._isAppropriateEndTagToken())
            this.state = BEFORE_ATTRIBUTE_NAME_STATE;
        else
            defaultEntry();
    } else if (ch === '/') {
        if (this._isAppropriateEndTagToken())
            this.state = SELF_CLOSING_START_TAG_STATE;
        else
            defaultEntry();
    } else if (ch === '>') {
        if (this._isAppropriateEndTagToken()) {
            this._emitCurrentTagToken();
            this.state = DATA_STATE;
        } else
            defaultEntry();
    } else if (ch >= 'A' && ch <= 'Z') {
        this.currentTagToken.tagName += asciiToLower(ch);
        this.tempBuff += ch;
    } else if (ch >= 'a' && ch <= 'z') {
        this.currentTagToken.tagName += ch;
        this.tempBuff += ch;
    } else
        defaultEntry();
};

//8.2.4.14 RAWTEXT less-than sign state
_[RAWTEXT_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = RAWTEXT_END_TAG_OPEN_STATE;
    } else {
        this._emitCharacterToken('<');
        this._reconsume(RAWTEXT_STATE);
    }
};

//8.2.4.15 RAWTEXT end tag open state
_[RAWTEXT_END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(asciiToLower(ch));
        this.tempBuff += ch;
        this.state = RAWTEXT_END_TAG_NAME_STATE;
    } else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.tempBuff += ch;
        this.state = RAWTEXT_END_TAG_NAME_STATE;
    } else {
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
        this._reconsume(RAWTEXT_STATE);
    }
};

//8.2.4.16 RAWTEXT end tag name state
_[RAWTEXT_END_TAG_NAME_STATE] = function (ch) {
    var lexer = this,
        defaultEntry = function () {
            this._emitCharacterToken('<');
            this._emitCharacterToken('/');

            for (var i = 0; i < lexer.tempBuff.length; i++)
                lexer._emitCharacterToken(lexer.tempBuff[i]);

            lexer._reconsume(RAWTEXT_STATE);
        };

    if (ch === '\n' || ch === '\r' || ch === '\v' || ch === '\f' || ch === ' ') {
        if (this._isAppropriateEndTagToken())
            this.state = BEFORE_ATTRIBUTE_NAME_STATE;
        else
            defaultEntry();
    } else if (ch === '/') {
        if (this._isAppropriateEndTagToken())
            this.state = SELF_CLOSING_START_TAG_STATE;
        else
            defaultEntry();
    } else if (ch === '>') {
        if (this._isAppropriateEndTagToken())
            this.state = DATA_STATE;
        else
            defaultEntry();
    } else if (ch >= 'A' && ch <= 'Z') {
        this.currentTagToken.tagName += asciiToLower(ch);
        this.tempBuff += ch;
    } else if (ch >= 'a' && ch <= 'z') {
        this.currentTagToken.tagName += ch;
        this.tempBuff += ch;
    } else
        defaultEntry();
};