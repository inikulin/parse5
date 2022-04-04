import { Preprocessor } from './preprocessor.js';
import {
    CODE_POINTS as $,
    SEQUENCES as $$,
    REPLACEMENT_CHARACTER,
    isSurrogate,
    isUndefinedCodePoint,
    isControlCodePoint,
} from '../common/unicode.js';
import {
    TokenType,
    getTokenAttr,
    type Token,
    type CharacterToken,
    type DoctypeToken,
    type TagToken,
    type EOFToken,
    type CommentToken,
    type Attribute,
    type Location,
} from '../common/token.js';
import { htmlDecodeTree, BinTrieFlags, determineBranch } from 'entities/lib/decode.js';
import { ERR, type ParserErrorHandler } from '../common/error-codes.js';
import { TAG_ID, getTagID } from '../common/html.js';

//C1 Unicode control character reference replacements
const C1_CONTROLS_REFERENCE_REPLACEMENTS = new Map([
    [0x80, 0x20_ac],
    [0x82, 0x20_1a],
    [0x83, 0x01_92],
    [0x84, 0x20_1e],
    [0x85, 0x20_26],
    [0x86, 0x20_20],
    [0x87, 0x20_21],
    [0x88, 0x02_c6],
    [0x89, 0x20_30],
    [0x8a, 0x01_60],
    [0x8b, 0x20_39],
    [0x8c, 0x01_52],
    [0x8e, 0x01_7d],
    [0x91, 0x20_18],
    [0x92, 0x20_19],
    [0x93, 0x20_1c],
    [0x94, 0x20_1d],
    [0x95, 0x20_22],
    [0x96, 0x20_13],
    [0x97, 0x20_14],
    [0x98, 0x02_dc],
    [0x99, 0x21_22],
    [0x9a, 0x01_61],
    [0x9b, 0x20_3a],
    [0x9c, 0x01_53],
    [0x9e, 0x01_7e],
    [0x9f, 0x01_78],
]);

//States
const enum State {
    DATA,
    RCDATA,
    RAWTEXT,
    SCRIPT_DATA,
    PLAINTEXT,
    TAG_OPEN,
    END_TAG_OPEN,
    TAG_NAME,
    RCDATA_LESS_THAN_SIGN,
    RCDATA_END_TAG_OPEN,
    RCDATA_END_TAG_NAME,
    RAWTEXT_LESS_THAN_SIGN,
    RAWTEXT_END_TAG_OPEN,
    RAWTEXT_END_TAG_NAME,
    SCRIPT_DATA_LESS_THAN_SIGN,
    SCRIPT_DATA_END_TAG_OPEN,
    SCRIPT_DATA_END_TAG_NAME,
    SCRIPT_DATA_ESCAPE_START,
    SCRIPT_DATA_ESCAPE_START_DASH,
    SCRIPT_DATA_ESCAPED,
    SCRIPT_DATA_ESCAPED_DASH,
    SCRIPT_DATA_ESCAPED_DASH_DASH,
    SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN,
    SCRIPT_DATA_ESCAPED_END_TAG_OPEN,
    SCRIPT_DATA_ESCAPED_END_TAG_NAME,
    SCRIPT_DATA_DOUBLE_ESCAPE_START,
    SCRIPT_DATA_DOUBLE_ESCAPED,
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH,
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH,
    SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN,
    SCRIPT_DATA_DOUBLE_ESCAPE_END,
    BEFORE_ATTRIBUTE_NAME,
    ATTRIBUTE_NAME,
    AFTER_ATTRIBUTE_NAME,
    BEFORE_ATTRIBUTE_VALUE,
    ATTRIBUTE_VALUE_DOUBLE_QUOTED,
    ATTRIBUTE_VALUE_SINGLE_QUOTED,
    ATTRIBUTE_VALUE_UNQUOTED,
    AFTER_ATTRIBUTE_VALUE_QUOTED,
    SELF_CLOSING_START_TAG,
    BOGUS_COMMENT,
    MARKUP_DECLARATION_OPEN,
    COMMENT_START,
    COMMENT_START_DASH,
    COMMENT,
    COMMENT_LESS_THAN_SIGN,
    COMMENT_LESS_THAN_SIGN_BANG,
    COMMENT_LESS_THAN_SIGN_BANG_DASH,
    COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH,
    COMMENT_END_DASH,
    COMMENT_END,
    COMMENT_END_BANG,
    DOCTYPE,
    BEFORE_DOCTYPE_NAME,
    DOCTYPE_NAME,
    AFTER_DOCTYPE_NAME,
    AFTER_DOCTYPE_PUBLIC_KEYWORD,
    BEFORE_DOCTYPE_PUBLIC_IDENTIFIER,
    DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED,
    DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED,
    AFTER_DOCTYPE_PUBLIC_IDENTIFIER,
    BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS,
    AFTER_DOCTYPE_SYSTEM_KEYWORD,
    BEFORE_DOCTYPE_SYSTEM_IDENTIFIER,
    DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED,
    DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED,
    AFTER_DOCTYPE_SYSTEM_IDENTIFIER,
    BOGUS_DOCTYPE,
    CDATA_SECTION,
    CDATA_SECTION_BRACKET,
    CDATA_SECTION_END,
    CHARACTER_REFERENCE,
    NAMED_CHARACTER_REFERENCE,
    AMBIGUOUS_AMPERSAND,
    NUMERIC_CHARACTER_REFERENCE,
    HEXADEMICAL_CHARACTER_REFERENCE_START,
    DECIMAL_CHARACTER_REFERENCE_START,
    HEXADEMICAL_CHARACTER_REFERENCE,
    DECIMAL_CHARACTER_REFERENCE,
    NUMERIC_CHARACTER_REFERENCE_END,
}

//Tokenizer initial states for different modes
export const TokenizerMode = {
    DATA: State.DATA,
    RCDATA: State.RCDATA,
    RAWTEXT: State.RAWTEXT,
    SCRIPT_DATA: State.SCRIPT_DATA,
    PLAINTEXT: State.PLAINTEXT,
    CDATA_SECTION: State.CDATA_SECTION,
} as const;

//Utils

//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').

function isAsciiDigit(cp: number): boolean {
    return cp >= $.DIGIT_0 && cp <= $.DIGIT_9;
}

function isAsciiUpper(cp: number): boolean {
    return cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_Z;
}

function isAsciiLower(cp: number): boolean {
    return cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_Z;
}

function isAsciiLetter(cp: number): boolean {
    return isAsciiLower(cp) || isAsciiUpper(cp);
}

function isAsciiAlphaNumeric(cp: number): boolean {
    return isAsciiLetter(cp) || isAsciiDigit(cp);
}

function isAsciiUpperHexDigit(cp: number): boolean {
    return cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_F;
}

function isAsciiLowerHexDigit(cp: number): boolean {
    return cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_F;
}

function isAsciiHexDigit(cp: number): boolean {
    return isAsciiDigit(cp) || isAsciiUpperHexDigit(cp) || isAsciiLowerHexDigit(cp);
}

function toAsciiLower(cp: number): number {
    return cp + 0x00_20;
}

function isWhitespace(cp: number): boolean {
    return cp === $.SPACE || cp === $.LINE_FEED || cp === $.TABULATION || cp === $.FORM_FEED;
}

function isEntityInAttributeInvalidEnd(nextCp: number): boolean {
    return nextCp === $.EQUALS_SIGN || isAsciiAlphaNumeric(nextCp);
}

function isScriptDataDoubleEscapeSequenceEnd(cp: number): boolean {
    return isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN;
}

export interface TokenizerOptions {
    sourceCodeLocationInfo?: boolean;
}

export interface TokenHandler {
    onComment(token: CommentToken): void;
    onDoctype(token: DoctypeToken): void;
    onStartTag(token: TagToken): void;
    onEndTag(token: TagToken): void;
    onEof(token: EOFToken): void;
    onCharacter(token: CharacterToken): void;
    onNullCharacter(token: CharacterToken): void;
    onWhitespaceCharacter(token: CharacterToken): void;

    onParseError?: ParserErrorHandler | null;
}

//Tokenizer
export class Tokenizer {
    public preprocessor: Preprocessor;

    private paused = false;
    /** Ensures that the parsing loop isn't run multiple times at once. */
    private inLoop = false;

    /**
     * Indicates that the current adjusted node exists, is not an element in the HTML namespace,
     * and that it is not an integration point for either MathML or HTML.
     *
     * @see {@link https://html.spec.whatwg.org/multipage/parsing.html#tree-construction}
     */
    public inForeignNode = false;
    public lastStartTagName = '';
    public active = false;

    public state = State.DATA;
    private returnState = State.DATA;

    private charRefCode = -1;

    private consumedAfterSnapshot = -1;

    private currentLocation: Location | null;
    private currentCharacterToken: CharacterToken | null = null;
    private currentToken: Token | null = null;
    private currentAttr: Attribute = { name: '', value: '' };

    constructor(private options: TokenizerOptions, private handler: TokenHandler) {
        this.preprocessor = new Preprocessor(handler);
        this.currentLocation = this.getCurrentLocation(-1);
    }

    //Errors
    private _err(code: ERR): void {
        this.handler.onParseError?.(this.preprocessor.getError(code));
    }

    // NOTE: `offset` may never run across line boundaries.
    private getCurrentLocation(offset: number): Location | null {
        if (!this.options.sourceCodeLocationInfo) {
            return null;
        }

        return {
            startLine: this.preprocessor.line,
            startCol: this.preprocessor.col - offset,
            startOffset: this.preprocessor.offset - offset,
            endLine: -1,
            endCol: -1,
            endOffset: -1,
        };
    }

    private _runParsingLoop(): void {
        if (this.inLoop) return;

        this.inLoop = true;

        while (this.active && !this.paused) {
            this.consumedAfterSnapshot = 0;

            const cp = this._consume();

            if (!this._ensureHibernation()) {
                this._callState(cp);
            }
        }

        this.inLoop = false;
    }

    //API
    public pause(): void {
        this.paused = true;
    }

    public resume(writeCallback?: () => void): void {
        if (!this.paused) {
            throw new Error('Parser was already resumed');
        }

        this.paused = false;

        // Necessary for synchronous resume.
        if (this.inLoop) return;

        this._runParsingLoop();

        if (!this.paused) {
            writeCallback?.();
        }
    }

    public write(chunk: string, isLastChunk: boolean, writeCallback?: () => void): void {
        this.active = true;
        this.preprocessor.write(chunk, isLastChunk);
        this._runParsingLoop();

        if (!this.paused) {
            writeCallback?.();
        }
    }

    public insertHtmlAtCurrentPos(chunk: string): void {
        this.active = true;
        this.preprocessor.insertHtmlAtCurrentPos(chunk);
        this._runParsingLoop();
    }

    //Hibernation
    private _ensureHibernation(): boolean {
        if (this.preprocessor.endOfChunkHit) {
            this._unconsume(this.consumedAfterSnapshot);
            this.active = false;

            return true;
        }

        return false;
    }

    //Consumption
    private _consume(): number {
        this.consumedAfterSnapshot++;
        return this.preprocessor.advance();
    }

    private _unconsume(count: number): void {
        this.consumedAfterSnapshot -= count;
        this.preprocessor.retreat(count);
    }

    private _reconsumeInState(state: State): void {
        this.state = state;
        this._unconsume(1);
    }

    private _advanceBy(count: number): void {
        this.consumedAfterSnapshot += count;
        for (let i = 0; i < count; i++) {
            this.preprocessor.advance();
        }
    }

    private _consumeSequenceIfMatch(pattern: string, caseSensitive: boolean): boolean {
        if (this.preprocessor.startsWith(pattern, caseSensitive)) {
            // We will already have consumed one character before calling this method.
            this._advanceBy(pattern.length - 1);
            return true;
        }
        return false;
    }

    //Token creation
    private _createStartTagToken(): void {
        this.currentToken = {
            type: TokenType.START_TAG,
            tagName: '',
            tagID: TAG_ID.UNKNOWN,
            selfClosing: false,
            ackSelfClosing: false,
            attrs: [],
            location: this.getCurrentLocation(1),
        };
    }

    private _createEndTagToken(): void {
        this.currentToken = {
            type: TokenType.END_TAG,
            tagName: '',
            tagID: TAG_ID.UNKNOWN,
            selfClosing: false,
            ackSelfClosing: false,
            attrs: [],
            location: this.getCurrentLocation(2),
        };
    }

    private _createCommentToken(offset: number): void {
        this.currentToken = {
            type: TokenType.COMMENT,
            data: '',
            location: this.getCurrentLocation(offset),
        };
    }

    private _createDoctypeToken(initialName: string | null): void {
        this.currentToken = {
            type: TokenType.DOCTYPE,
            name: initialName,
            forceQuirks: false,
            publicId: null,
            systemId: null,
            location: this.currentLocation,
        };
    }

    private _createCharacterToken(type: CharacterToken['type'], chars: string): void {
        this.currentCharacterToken = {
            type,
            chars,
            location: this.currentLocation,
        };
    }

    //Tag attributes
    private _createAttr(attrNameFirstCh: string): void {
        this.currentAttr = {
            name: attrNameFirstCh,
            value: '',
        };
        this.currentLocation = this.getCurrentLocation(0);
    }

    private _leaveAttrName(): void {
        const token = this.currentToken as TagToken;

        if (getTokenAttr(token, this.currentAttr.name) === null) {
            token.attrs.push(this.currentAttr);

            if (token.location && this.currentLocation) {
                const attrLocations = (token.location.attrs ??= Object.create(null));
                attrLocations[this.currentAttr.name] = this.currentLocation;

                // Set end location
                this._leaveAttrValue();
            }
        } else {
            this._err(ERR.duplicateAttribute);
        }
    }

    private _leaveAttrValue(): void {
        if (this.currentLocation) {
            this.currentLocation.endLine = this.preprocessor.line;
            this.currentLocation.endCol = this.preprocessor.col;
            this.currentLocation.endOffset = this.preprocessor.offset;
        }
    }

    //Token emission
    private prepareToken(ct: Token): void {
        this._emitCurrentCharacterToken(ct.location);
        this.currentToken = null;

        if (ct.location) {
            ct.location.endLine = this.preprocessor.line;
            ct.location.endCol = this.preprocessor.col + 1;
            ct.location.endOffset = this.preprocessor.offset + 1;
        }

        this.currentLocation = this.getCurrentLocation(-1);
    }

    private emitCurrentTagToken(): void {
        const ct = this.currentToken as TagToken;

        this.prepareToken(ct);

        ct.tagID = getTagID(ct.tagName);

        if (ct.type === TokenType.START_TAG) {
            this.lastStartTagName = ct.tagName;
            this.handler.onStartTag(ct);
        } else {
            if (ct.attrs.length > 0) {
                this._err(ERR.endTagWithAttributes);
            }

            if (ct.selfClosing) {
                this._err(ERR.endTagWithTrailingSolidus);
            }

            this.handler.onEndTag(ct);
        }

        this.preprocessor.dropParsedChunk();
    }

    private emitCurrentComment(ct: CommentToken): void {
        this.prepareToken(ct);
        this.handler.onComment(ct);

        this.preprocessor.dropParsedChunk();
    }

    private emitCurrentDoctype(ct: DoctypeToken): void {
        this.prepareToken(ct);
        this.handler.onDoctype(ct);

        this.preprocessor.dropParsedChunk();
    }

    private _emitCurrentCharacterToken(nextLocation: Location | null): void {
        if (this.currentCharacterToken) {
            //NOTE: if we have a pending character token, make it's end location equal to the
            //current token's start location.
            if (nextLocation && this.currentCharacterToken.location) {
                this.currentCharacterToken.location.endLine = nextLocation.startLine;
                this.currentCharacterToken.location.endCol = nextLocation.startCol;
                this.currentCharacterToken.location.endOffset = nextLocation.startOffset;
            }

            switch (this.currentCharacterToken.type) {
                case TokenType.CHARACTER: {
                    this.handler.onCharacter(this.currentCharacterToken);
                    break;
                }
                case TokenType.NULL_CHARACTER: {
                    this.handler.onNullCharacter(this.currentCharacterToken);
                    break;
                }
                case TokenType.WHITESPACE_CHARACTER: {
                    this.handler.onWhitespaceCharacter(this.currentCharacterToken);
                    break;
                }
            }

            this.currentCharacterToken = null;
        }
    }

    private _emitEOFToken(): void {
        const location = this.getCurrentLocation(0);

        if (location) {
            location.endLine = location.startLine;
            location.endCol = location.startCol;
            location.endOffset = location.startOffset;
        }

        this._emitCurrentCharacterToken(location);
        this.handler.onEof({ type: TokenType.EOF, location });
        this.active = false;
    }

    //Characters emission

    //OPTIMIZATION: specification uses only one type of character tokens (one token per character).
    //This causes a huge memory overhead and a lot of unnecessary parser loops. parse5 uses 3 groups of characters.
    //If we have a sequence of characters that belong to the same group, the parser can process it
    //as a single solid character token.
    //So, there are 3 types of character tokens in parse5:
    //1)TokenType.NULL_CHARACTER - \u0000-character sequences (e.g. '\u0000\u0000\u0000')
    //2)TokenType.WHITESPACE_CHARACTER - any whitespace/new-line character sequences (e.g. '\n  \r\t   \f')
    //3)TokenType.CHARACTER - any character sequence which don't belong to groups 1 and 2 (e.g. 'abcdef1234@@#$%^')
    private _appendCharToCurrentCharacterToken(type: CharacterToken['type'], ch: string): void {
        if (this.currentCharacterToken) {
            if (this.currentCharacterToken.type !== type) {
                this.currentLocation = this.getCurrentLocation(0);
                this._emitCurrentCharacterToken(this.currentLocation);
                this.preprocessor.dropParsedChunk();
            } else {
                this.currentCharacterToken.chars += ch;
                return;
            }
        }

        this._createCharacterToken(type, ch);
    }

    private _emitCodePoint(cp: number): void {
        let type = TokenType.CHARACTER;

        if (isWhitespace(cp)) {
            type = TokenType.WHITESPACE_CHARACTER;
        } else if (cp === $.NULL) {
            type = TokenType.NULL_CHARACTER;
        }

        this._appendCharToCurrentCharacterToken(type, String.fromCodePoint(cp));
    }

    //NOTE: used when we emit characters explicitly.
    //This is always for non-whitespace and non-null characters, which allows us to avoid additional checks.
    private _emitChars(ch: string): void {
        this._appendCharToCurrentCharacterToken(TokenType.CHARACTER, ch);
    }

    // Character reference helpers
    private _matchNamedCharacterReference(cp: number): number[] | null {
        let result: number[] | null = null;
        let excess = 0;
        let withoutSemicolon = false;

        for (let i = 0, current = htmlDecodeTree[0]; i >= 0; cp = this._consume()) {
            i = determineBranch(htmlDecodeTree, current, i + 1, cp);

            if (i < 0) break;

            excess += 1;

            current = htmlDecodeTree[i];

            const masked = current & BinTrieFlags.VALUE_LENGTH;

            // If the branch is a value, store it and continue
            if (masked) {
                // The mask is the number of bytes of the value, including the current byte.
                const valueLength = (masked >> 14) - 1;

                // Attribute values that aren't terminated properly aren't parsed, and shouldn't lead to a parser error.
                // See the example in https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
                if (
                    cp !== $.SEMICOLON &&
                    this._isCharacterReferenceInAttribute() &&
                    isEntityInAttributeInvalidEnd(this.preprocessor.peek(1))
                ) {
                    //NOTE: we don't flush all consumed code points here, and instead switch back to the original state after
                    //emitting an ampersand. This is fine, as alphanumeric characters won't be parsed differently in attributes.
                    result = [$.AMPERSAND];

                    // Skip over the value.
                    i += valueLength;
                } else {
                    // If this is a surrogate pair, consume the next two bytes.
                    result =
                        valueLength === 0
                            ? [htmlDecodeTree[i] & ~BinTrieFlags.VALUE_LENGTH]
                            : valueLength === 1
                            ? [htmlDecodeTree[++i]]
                            : [htmlDecodeTree[++i], htmlDecodeTree[++i]];
                    excess = 0;
                    withoutSemicolon = cp !== $.SEMICOLON;
                }

                if (valueLength === 0) {
                    // If the value is zero-length, we're done.
                    this._consume();
                    break;
                }
            }
        }

        this._unconsume(excess);

        if (withoutSemicolon && !this.preprocessor.endOfChunkHit) {
            this._err(ERR.missingSemicolonAfterCharacterReference);
        }

        // We want to emit the error above on the code point after the entity.
        // We always consume one code point too many in the loop, and we wait to
        // unconsume it until after the error is emitted.
        this._unconsume(1);

        return result;
    }

    private _isCharacterReferenceInAttribute(): boolean {
        return (
            this.returnState === State.ATTRIBUTE_VALUE_DOUBLE_QUOTED ||
            this.returnState === State.ATTRIBUTE_VALUE_SINGLE_QUOTED ||
            this.returnState === State.ATTRIBUTE_VALUE_UNQUOTED
        );
    }

    private _flushCodePointConsumedAsCharacterReference(cp: number): void {
        if (this._isCharacterReferenceInAttribute()) {
            this.currentAttr.value += String.fromCodePoint(cp);
        } else {
            this._emitCodePoint(cp);
        }
    }

    // Calling states this way turns out to be much faster than any other approach.
    private _callState(cp: number): void {
        switch (this.state) {
            case State.DATA: {
                this._stateData(cp);
                break;
            }
            case State.RCDATA: {
                this._stateRcdata(cp);
                break;
            }
            case State.RAWTEXT: {
                this._stateRawtext(cp);
                break;
            }
            case State.SCRIPT_DATA: {
                this._stateScriptData(cp);
                break;
            }
            case State.PLAINTEXT: {
                this._statePlaintext(cp);
                break;
            }
            case State.TAG_OPEN: {
                this._stateTagOpen(cp);
                break;
            }
            case State.END_TAG_OPEN: {
                this._stateEndTagOpen(cp);
                break;
            }
            case State.TAG_NAME: {
                this._stateTagName(cp);
                break;
            }
            case State.RCDATA_LESS_THAN_SIGN: {
                this._stateRcdataLessThanSign(cp);
                break;
            }
            case State.RCDATA_END_TAG_OPEN: {
                this._stateRcdataEndTagOpen(cp);
                break;
            }
            case State.RCDATA_END_TAG_NAME: {
                this._stateRcdataEndTagName(cp);
                break;
            }
            case State.RAWTEXT_LESS_THAN_SIGN: {
                this._stateRawtextLessThanSign(cp);
                break;
            }
            case State.RAWTEXT_END_TAG_OPEN: {
                this._stateRawtextEndTagOpen(cp);
                break;
            }
            case State.RAWTEXT_END_TAG_NAME: {
                this._stateRawtextEndTagName(cp);
                break;
            }
            case State.SCRIPT_DATA_LESS_THAN_SIGN: {
                this._stateScriptDataLessThanSign(cp);
                break;
            }
            case State.SCRIPT_DATA_END_TAG_OPEN: {
                this._stateScriptDataEndTagOpen(cp);
                break;
            }
            case State.SCRIPT_DATA_END_TAG_NAME: {
                this._stateScriptDataEndTagName(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPE_START: {
                this._stateScriptDataEscapeStart(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPE_START_DASH: {
                this._stateScriptDataEscapeStartDash(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED: {
                this._stateScriptDataEscaped(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_DASH: {
                this._stateScriptDataEscapedDash(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_DASH_DASH: {
                this._stateScriptDataEscapedDashDash(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN: {
                this._stateScriptDataEscapedLessThanSign(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN: {
                this._stateScriptDataEscapedEndTagOpen(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_END_TAG_NAME: {
                this._stateScriptDataEscapedEndTagName(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPE_START: {
                this._stateScriptDataDoubleEscapeStart(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED: {
                this._stateScriptDataDoubleEscaped(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH: {
                this._stateScriptDataDoubleEscapedDash(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: {
                this._stateScriptDataDoubleEscapedDashDash(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN: {
                this._stateScriptDataDoubleEscapedLessThanSign(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPE_END: {
                this._stateScriptDataDoubleEscapeEnd(cp);
                break;
            }
            case State.BEFORE_ATTRIBUTE_NAME: {
                this._stateBeforeAttributeName(cp);
                break;
            }
            case State.ATTRIBUTE_NAME: {
                this._stateAttributeName(cp);
                break;
            }
            case State.AFTER_ATTRIBUTE_NAME: {
                this._stateAfterAttributeName(cp);
                break;
            }
            case State.BEFORE_ATTRIBUTE_VALUE: {
                this._stateBeforeAttributeValue(cp);
                break;
            }
            case State.ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
                this._stateAttributeValueDoubleQuoted(cp);
                break;
            }
            case State.ATTRIBUTE_VALUE_SINGLE_QUOTED: {
                this._stateAttributeValueSingleQuoted(cp);
                break;
            }
            case State.ATTRIBUTE_VALUE_UNQUOTED: {
                this._stateAttributeValueUnquoted(cp);
                break;
            }
            case State.AFTER_ATTRIBUTE_VALUE_QUOTED: {
                this._stateAfterAttributeValueQuoted(cp);
                break;
            }
            case State.SELF_CLOSING_START_TAG: {
                this._stateSelfClosingStartTag(cp);
                break;
            }
            case State.BOGUS_COMMENT: {
                this._stateBogusComment(cp);
                break;
            }
            case State.MARKUP_DECLARATION_OPEN: {
                this._stateMarkupDeclarationOpen(cp);
                break;
            }
            case State.COMMENT_START: {
                this._stateCommentStart(cp);
                break;
            }
            case State.COMMENT_START_DASH: {
                this._stateCommentStartDash(cp);
                break;
            }
            case State.COMMENT: {
                this._stateComment(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN: {
                this._stateCommentLessThanSign(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN_BANG: {
                this._stateCommentLessThanSignBang(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN_BANG_DASH: {
                this._stateCommentLessThanSignBangDash(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH: {
                this._stateCommentLessThanSignBangDashDash(cp);
                break;
            }
            case State.COMMENT_END_DASH: {
                this._stateCommentEndDash(cp);
                break;
            }
            case State.COMMENT_END: {
                this._stateCommentEnd(cp);
                break;
            }
            case State.COMMENT_END_BANG: {
                this._stateCommentEndBang(cp);
                break;
            }
            case State.DOCTYPE: {
                this._stateDoctype(cp);
                break;
            }
            case State.BEFORE_DOCTYPE_NAME: {
                this._stateBeforeDoctypeName(cp);
                break;
            }
            case State.DOCTYPE_NAME: {
                this._stateDoctypeName(cp);
                break;
            }
            case State.AFTER_DOCTYPE_NAME: {
                this._stateAfterDoctypeName(cp);
                break;
            }
            case State.AFTER_DOCTYPE_PUBLIC_KEYWORD: {
                this._stateAfterDoctypePublicKeyword(cp);
                break;
            }
            case State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER: {
                this._stateBeforeDoctypePublicIdentifier(cp);
                break;
            }
            case State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED: {
                this._stateDoctypePublicIdentifierDoubleQuoted(cp);
                break;
            }
            case State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED: {
                this._stateDoctypePublicIdentifierSingleQuoted(cp);
                break;
            }
            case State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER: {
                this._stateAfterDoctypePublicIdentifier(cp);
                break;
            }
            case State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS: {
                this._stateBetweenDoctypePublicAndSystemIdentifiers(cp);
                break;
            }
            case State.AFTER_DOCTYPE_SYSTEM_KEYWORD: {
                this._stateAfterDoctypeSystemKeyword(cp);
                break;
            }
            case State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER: {
                this._stateBeforeDoctypeSystemIdentifier(cp);
                break;
            }
            case State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED: {
                this._stateDoctypeSystemIdentifierDoubleQuoted(cp);
                break;
            }
            case State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED: {
                this._stateDoctypeSystemIdentifierSingleQuoted(cp);
                break;
            }
            case State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER: {
                this._stateAfterDoctypeSystemIdentifier(cp);
                break;
            }
            case State.BOGUS_DOCTYPE: {
                this._stateBogusDoctype(cp);
                break;
            }
            case State.CDATA_SECTION: {
                this._stateCdataSection(cp);
                break;
            }
            case State.CDATA_SECTION_BRACKET: {
                this._stateCdataSectionBracket(cp);
                break;
            }
            case State.CDATA_SECTION_END: {
                this._stateCdataSectionEnd(cp);
                break;
            }
            case State.CHARACTER_REFERENCE: {
                this._stateCharacterReference(cp);
                break;
            }
            case State.NAMED_CHARACTER_REFERENCE: {
                this._stateNamedCharacterReference(cp);
                break;
            }
            case State.AMBIGUOUS_AMPERSAND: {
                this._stateAmbiguousAmpersand(cp);
                break;
            }
            case State.NUMERIC_CHARACTER_REFERENCE: {
                this._stateNumericCharacterReference(cp);
                break;
            }
            case State.HEXADEMICAL_CHARACTER_REFERENCE_START: {
                this._stateHexademicalCharacterReferenceStart(cp);
                break;
            }
            case State.DECIMAL_CHARACTER_REFERENCE_START: {
                this._stateDecimalCharacterReferenceStart(cp);
                break;
            }
            case State.HEXADEMICAL_CHARACTER_REFERENCE: {
                this._stateHexademicalCharacterReference(cp);
                break;
            }
            case State.DECIMAL_CHARACTER_REFERENCE: {
                this._stateDecimalCharacterReference(cp);
                break;
            }
            case State.NUMERIC_CHARACTER_REFERENCE_END: {
                this._stateNumericCharacterReferenceEnd();
                break;
            }
            default: {
                throw new Error('Unknown state');
            }
        }
    }

    // State machine

    // Data state
    //------------------------------------------------------------------
    private _stateData(cp: number): void {
        switch (cp) {
            case $.LESS_THAN_SIGN: {
                this.state = State.TAG_OPEN;
                break;
            }
            case $.AMPERSAND: {
                this.returnState = State.DATA;
                this.state = State.CHARACTER_REFERENCE;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitCodePoint(cp);
                break;
            }
            case $.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }

    //  RCDATA state
    //------------------------------------------------------------------
    private _stateRcdata(cp: number): void {
        switch (cp) {
            case $.AMPERSAND: {
                this.returnState = State.RCDATA;
                this.state = State.CHARACTER_REFERENCE;
                break;
            }
            case $.LESS_THAN_SIGN: {
                this.state = State.RCDATA_LESS_THAN_SIGN;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case $.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }

    // RAWTEXT state
    //------------------------------------------------------------------
    private _stateRawtext(cp: number): void {
        switch (cp) {
            case $.LESS_THAN_SIGN: {
                this.state = State.RAWTEXT_LESS_THAN_SIGN;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case $.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }

    // Script data state
    //------------------------------------------------------------------
    private _stateScriptData(cp: number): void {
        switch (cp) {
            case $.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_LESS_THAN_SIGN;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case $.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }

    // PLAINTEXT state
    //------------------------------------------------------------------
    private _statePlaintext(cp: number): void {
        switch (cp) {
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case $.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }

    // Tag open state
    //------------------------------------------------------------------
    private _stateTagOpen(cp: number): void {
        if (isAsciiLetter(cp)) {
            this._createStartTagToken();
            this.state = State.TAG_NAME;
            this._stateTagName(cp);
        } else
            switch (cp) {
                case $.EXCLAMATION_MARK: {
                    this.state = State.MARKUP_DECLARATION_OPEN;
                    break;
                }
                case $.SOLIDUS: {
                    this.state = State.END_TAG_OPEN;
                    break;
                }
                case $.QUESTION_MARK: {
                    this._err(ERR.unexpectedQuestionMarkInsteadOfTagName);
                    this._createCommentToken(1);
                    this.state = State.BOGUS_COMMENT;
                    this._stateBogusComment(cp);
                    break;
                }
                case $.EOF: {
                    this._err(ERR.eofBeforeTagName);
                    this._emitChars('<');
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.invalidFirstCharacterOfTagName);
                    this._emitChars('<');
                    this.state = State.DATA;
                    this._stateData(cp);
                }
            }
    }

    // End tag open state
    //------------------------------------------------------------------
    private _stateEndTagOpen(cp: number): void {
        if (isAsciiLetter(cp)) {
            this._createEndTagToken();
            this.state = State.TAG_NAME;
            this._stateTagName(cp);
        } else
            switch (cp) {
                case $.GREATER_THAN_SIGN: {
                    this._err(ERR.missingEndTagName);
                    this.state = State.DATA;
                    break;
                }
                case $.EOF: {
                    this._err(ERR.eofBeforeTagName);
                    this._emitChars('</');
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.invalidFirstCharacterOfTagName);
                    this._createCommentToken(2);
                    this.state = State.BOGUS_COMMENT;
                    this._stateBogusComment(cp);
                }
            }
    }

    // Tag name state
    //------------------------------------------------------------------
    private _stateTagName(cp: number): void {
        const token = this.currentToken as TagToken;

        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                break;
            }
            case $.SOLIDUS: {
                this.state = State.SELF_CLOSING_START_TAG;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.tagName += REPLACEMENT_CHARACTER;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                token.tagName += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
            }
        }
    }

    // RCDATA less-than sign state
    //------------------------------------------------------------------
    private _stateRcdataLessThanSign(cp: number): void {
        if (cp === $.SOLIDUS) {
            this.state = State.RCDATA_END_TAG_OPEN;
        } else {
            this._emitChars('<');
            this.state = State.RCDATA;
            this._stateRcdata(cp);
        }
    }

    // RCDATA end tag open state
    //------------------------------------------------------------------
    private _stateRcdataEndTagOpen(cp: number): void {
        if (isAsciiLetter(cp)) {
            this.state = State.RCDATA_END_TAG_NAME;
            this._stateRcdataEndTagName(cp);
        } else {
            this._emitChars('</');
            this.state = State.RCDATA;
            this._stateRcdata(cp);
        }
    }

    private handleSpecialEndTag(_cp: number): boolean {
        if (!this.preprocessor.startsWith(this.lastStartTagName, false)) {
            return !this._ensureHibernation();
        }

        this._createEndTagToken();
        const token = this.currentToken as TagToken;
        token.tagName = this.lastStartTagName;

        const cp = this.preprocessor.peek(this.lastStartTagName.length);

        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                this._advanceBy(this.lastStartTagName.length);
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                return false;
            }
            case $.SOLIDUS: {
                this._advanceBy(this.lastStartTagName.length);
                this.state = State.SELF_CLOSING_START_TAG;
                return false;
            }
            case $.GREATER_THAN_SIGN: {
                this._advanceBy(this.lastStartTagName.length);
                this.emitCurrentTagToken();
                this.state = State.DATA;
                return false;
            }
            default: {
                return !this._ensureHibernation();
            }
        }
    }

    // RCDATA end tag name state
    //------------------------------------------------------------------
    private _stateRcdataEndTagName(cp: number): void {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.RCDATA;
            this._stateRcdata(cp);
        }
    }

    // RAWTEXT less-than sign state
    //------------------------------------------------------------------
    private _stateRawtextLessThanSign(cp: number): void {
        if (cp === $.SOLIDUS) {
            this.state = State.RAWTEXT_END_TAG_OPEN;
        } else {
            this._emitChars('<');
            this.state = State.RAWTEXT;
            this._stateRawtext(cp);
        }
    }

    // RAWTEXT end tag open state
    //------------------------------------------------------------------
    private _stateRawtextEndTagOpen(cp: number): void {
        if (isAsciiLetter(cp)) {
            this.state = State.RAWTEXT_END_TAG_NAME;
            this._stateRawtextEndTagName(cp);
        } else {
            this._emitChars('</');
            this.state = State.RAWTEXT;
            this._stateRawtext(cp);
        }
    }

    // RAWTEXT end tag name state
    //------------------------------------------------------------------
    private _stateRawtextEndTagName(cp: number): void {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.RAWTEXT;
            this._stateRawtext(cp);
        }
    }

    // Script data less-than sign state
    //------------------------------------------------------------------
    private _stateScriptDataLessThanSign(cp: number): void {
        switch (cp) {
            case $.SOLIDUS: {
                this.state = State.SCRIPT_DATA_END_TAG_OPEN;
                break;
            }
            case $.EXCLAMATION_MARK: {
                this.state = State.SCRIPT_DATA_ESCAPE_START;
                this._emitChars('<!');
                break;
            }
            default: {
                this._emitChars('<');
                this.state = State.SCRIPT_DATA;
                this._stateScriptData(cp);
            }
        }
    }

    // Script data end tag open state
    //------------------------------------------------------------------
    private _stateScriptDataEndTagOpen(cp: number): void {
        if (isAsciiLetter(cp)) {
            this.state = State.SCRIPT_DATA_END_TAG_NAME;
            this._stateScriptDataEndTagName(cp);
        } else {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }

    // Script data end tag name state
    //------------------------------------------------------------------
    private _stateScriptDataEndTagName(cp: number): void {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }

    // Script data escape start state
    //------------------------------------------------------------------
    private _stateScriptDataEscapeStart(cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = State.SCRIPT_DATA_ESCAPE_START_DASH;
            this._emitChars('-');
        } else {
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }

    // Script data escape start dash state
    //------------------------------------------------------------------
    private _stateScriptDataEscapeStartDash(cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
            this._emitChars('-');
        } else {
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }

    // Script data escaped state
    //------------------------------------------------------------------
    private _stateScriptDataEscaped(cp: number): void {
        switch (cp) {
            case $.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_ESCAPED_DASH;
                this._emitChars('-');
                break;
            }
            case $.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }

    // Script data escaped dash state
    //------------------------------------------------------------------
    private _stateScriptDataEscapedDash(cp: number): void {
        switch (cp) {
            case $.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
                this._emitChars('-');
                break;
            }
            case $.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }

    // Script data escaped dash dash state
    //------------------------------------------------------------------
    private _stateScriptDataEscapedDashDash(cp: number): void {
        switch (cp) {
            case $.HYPHEN_MINUS: {
                this._emitChars('-');
                break;
            }
            case $.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this.state = State.SCRIPT_DATA;
                this._emitChars('>');
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }

    // Script data escaped less-than sign state
    //------------------------------------------------------------------
    private _stateScriptDataEscapedLessThanSign(cp: number): void {
        if (cp === $.SOLIDUS) {
            this.state = State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN;
        } else if (isAsciiLetter(cp)) {
            this._emitChars('<');
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_START;
            this._stateScriptDataDoubleEscapeStart(cp);
        } else {
            this._emitChars('<');
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }

    // Script data escaped end tag open state
    //------------------------------------------------------------------
    private _stateScriptDataEscapedEndTagOpen(cp: number): void {
        if (isAsciiLetter(cp)) {
            this.state = State.SCRIPT_DATA_ESCAPED_END_TAG_NAME;
            this._stateScriptDataEscapedEndTagName(cp);
        } else {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }

    // Script data escaped end tag name state
    //------------------------------------------------------------------
    private _stateScriptDataEscapedEndTagName(cp: number): void {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }

    // Script data double escape start state
    //------------------------------------------------------------------
    private _stateScriptDataDoubleEscapeStart(cp: number): void {
        if (
            this.preprocessor.startsWith($$.SCRIPT, false) &&
            isScriptDataDoubleEscapeSequenceEnd(this.preprocessor.peek($$.SCRIPT.length))
        ) {
            this._emitCodePoint(cp);
            for (let i = 0; i < $$.SCRIPT.length; i++) {
                this._emitCodePoint(this._consume());
            }

            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        } else if (!this._ensureHibernation()) {
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }

    // Script data double escaped state
    //------------------------------------------------------------------
    private _stateScriptDataDoubleEscaped(cp: number): void {
        switch (cp) {
            case $.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH;
                this._emitChars('-');
                break;
            }
            case $.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                this._emitChars('<');
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }

    // Script data double escaped dash state
    //------------------------------------------------------------------
    private _stateScriptDataDoubleEscapedDash(cp: number): void {
        switch (cp) {
            case $.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH;
                this._emitChars('-');
                break;
            }
            case $.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                this._emitChars('<');
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }

    // Script data double escaped dash dash state
    //------------------------------------------------------------------
    private _stateScriptDataDoubleEscapedDashDash(cp: number): void {
        switch (cp) {
            case $.HYPHEN_MINUS: {
                this._emitChars('-');
                break;
            }
            case $.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                this._emitChars('<');
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this.state = State.SCRIPT_DATA;
                this._emitChars('>');
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitChars(REPLACEMENT_CHARACTER);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }

    // Script data double escaped less-than sign state
    //------------------------------------------------------------------
    private _stateScriptDataDoubleEscapedLessThanSign(cp: number): void {
        if (cp === $.SOLIDUS) {
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_END;
            this._emitChars('/');
        } else {
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
            this._stateScriptDataDoubleEscaped(cp);
        }
    }

    // Script data double escape end state
    //------------------------------------------------------------------
    private _stateScriptDataDoubleEscapeEnd(cp: number): void {
        if (
            this.preprocessor.startsWith($$.SCRIPT, false) &&
            isScriptDataDoubleEscapeSequenceEnd(this.preprocessor.peek($$.SCRIPT.length))
        ) {
            this._emitCodePoint(cp);
            for (let i = 0; i < $$.SCRIPT.length; i++) {
                this._emitCodePoint(this._consume());
            }

            this.state = State.SCRIPT_DATA_ESCAPED;
        } else if (!this._ensureHibernation()) {
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
            this._stateScriptDataDoubleEscaped(cp);
        }
    }

    // Before attribute name state
    //------------------------------------------------------------------
    private _stateBeforeAttributeName(cp: number): void {
        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case $.SOLIDUS:
            case $.GREATER_THAN_SIGN:
            case $.EOF: {
                this.state = State.AFTER_ATTRIBUTE_NAME;
                this._stateAfterAttributeName(cp);
                break;
            }
            case $.EQUALS_SIGN: {
                this._err(ERR.unexpectedEqualsSignBeforeAttributeName);
                this._createAttr('=');
                this.state = State.ATTRIBUTE_NAME;
                break;
            }
            default: {
                this._createAttr('');
                this.state = State.ATTRIBUTE_NAME;
                this._stateAttributeName(cp);
            }
        }
    }

    // Attribute name state
    //------------------------------------------------------------------
    private _stateAttributeName(cp: number): void {
        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED:
            case $.SOLIDUS:
            case $.GREATER_THAN_SIGN:
            case $.EOF: {
                this._leaveAttrName();
                this.state = State.AFTER_ATTRIBUTE_NAME;
                this._stateAfterAttributeName(cp);
                break;
            }
            case $.EQUALS_SIGN: {
                this._leaveAttrName();
                this.state = State.BEFORE_ATTRIBUTE_VALUE;
                break;
            }
            case $.QUOTATION_MARK:
            case $.APOSTROPHE:
            case $.LESS_THAN_SIGN: {
                this._err(ERR.unexpectedCharacterInAttributeName);
                this.currentAttr.name += String.fromCodePoint(cp);
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.currentAttr.name += REPLACEMENT_CHARACTER;
                break;
            }
            default: {
                this.currentAttr.name += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
            }
        }
    }

    // After attribute name state
    //------------------------------------------------------------------
    private _stateAfterAttributeName(cp: number): void {
        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case $.SOLIDUS: {
                this.state = State.SELF_CLOSING_START_TAG;
                break;
            }
            case $.EQUALS_SIGN: {
                this.state = State.BEFORE_ATTRIBUTE_VALUE;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this._createAttr('');
                this.state = State.ATTRIBUTE_NAME;
                this._stateAttributeName(cp);
            }
        }
    }

    // Before attribute value state
    //------------------------------------------------------------------
    private _stateBeforeAttributeValue(cp: number): void {
        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case $.QUOTATION_MARK: {
                this.state = State.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                break;
            }
            case $.APOSTROPHE: {
                this.state = State.ATTRIBUTE_VALUE_SINGLE_QUOTED;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.missingAttributeValue);
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            default: {
                this.state = State.ATTRIBUTE_VALUE_UNQUOTED;
                this._stateAttributeValueUnquoted(cp);
            }
        }
    }

    // Attribute value (double-quoted) state
    //------------------------------------------------------------------
    private _stateAttributeValueDoubleQuoted(cp: number): void {
        switch (cp) {
            case $.QUOTATION_MARK: {
                this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                break;
            }
            case $.AMPERSAND: {
                this.returnState = State.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                this.state = State.CHARACTER_REFERENCE;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.currentAttr.value += REPLACEMENT_CHARACTER;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this.currentAttr.value += String.fromCodePoint(cp);
            }
        }
    }

    // Attribute value (single-quoted) state
    //------------------------------------------------------------------
    private _stateAttributeValueSingleQuoted(cp: number): void {
        switch (cp) {
            case $.APOSTROPHE: {
                this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                break;
            }
            case $.AMPERSAND: {
                this.returnState = State.ATTRIBUTE_VALUE_SINGLE_QUOTED;
                this.state = State.CHARACTER_REFERENCE;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.currentAttr.value += REPLACEMENT_CHARACTER;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this.currentAttr.value += String.fromCodePoint(cp);
            }
        }
    }

    // Attribute value (unquoted) state
    //------------------------------------------------------------------
    private _stateAttributeValueUnquoted(cp: number): void {
        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                this._leaveAttrValue();
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                break;
            }
            case $.AMPERSAND: {
                this.returnState = State.ATTRIBUTE_VALUE_UNQUOTED;
                this.state = State.CHARACTER_REFERENCE;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._leaveAttrValue();
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                this.currentAttr.value += REPLACEMENT_CHARACTER;
                break;
            }
            case $.QUOTATION_MARK:
            case $.APOSTROPHE:
            case $.LESS_THAN_SIGN:
            case $.EQUALS_SIGN:
            case $.GRAVE_ACCENT: {
                this._err(ERR.unexpectedCharacterInUnquotedAttributeValue);
                this.currentAttr.value += String.fromCodePoint(cp);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this.currentAttr.value += String.fromCodePoint(cp);
            }
        }
    }

    // After attribute value (quoted) state
    //------------------------------------------------------------------
    private _stateAfterAttributeValueQuoted(cp: number): void {
        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                this._leaveAttrValue();
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                break;
            }
            case $.SOLIDUS: {
                this._leaveAttrValue();
                this.state = State.SELF_CLOSING_START_TAG;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._leaveAttrValue();
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingWhitespaceBetweenAttributes);
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                this._stateBeforeAttributeName(cp);
            }
        }
    }

    // Self-closing start tag state
    //------------------------------------------------------------------
    private _stateSelfClosingStartTag(cp: number): void {
        switch (cp) {
            case $.GREATER_THAN_SIGN: {
                const token = this.currentToken as TagToken;
                token.selfClosing = true;
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.unexpectedSolidusInTag);
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                this._stateBeforeAttributeName(cp);
            }
        }
    }

    // Bogus comment state
    //------------------------------------------------------------------
    private _stateBogusComment(cp: number): void {
        const token = this.currentToken as CommentToken;

        switch (cp) {
            case $.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case $.EOF: {
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.data += REPLACEMENT_CHARACTER;
                break;
            }
            default: {
                token.data += String.fromCodePoint(cp);
            }
        }
    }

    // Markup declaration open state
    //------------------------------------------------------------------
    private _stateMarkupDeclarationOpen(cp: number): void {
        if (this._consumeSequenceIfMatch($$.DASH_DASH, true)) {
            this._createCommentToken($$.DASH_DASH.length + 1);
            this.state = State.COMMENT_START;
        } else if (this._consumeSequenceIfMatch($$.DOCTYPE, false)) {
            // NOTE: Doctypes tokens are created without fixed offsets. We keep track of the moment a doctype *might* start here.
            this.currentLocation = this.getCurrentLocation($$.DOCTYPE.length + 1);
            this.state = State.DOCTYPE;
        } else if (this._consumeSequenceIfMatch($$.CDATA_START, true)) {
            if (this.inForeignNode) {
                this.state = State.CDATA_SECTION;
            } else {
                this._err(ERR.cdataInHtmlContent);
                this._createCommentToken($$.CDATA_START.length + 1);
                (this.currentToken as CommentToken).data = '[CDATA[';
                this.state = State.BOGUS_COMMENT;
            }
        }

        //NOTE: Sequence lookups can be abrupted by hibernation. In that case, lookup
        //results are no longer valid and we will need to start over.
        else if (!this._ensureHibernation()) {
            this._err(ERR.incorrectlyOpenedComment);
            this._createCommentToken(2);
            this.state = State.BOGUS_COMMENT;
            this._stateBogusComment(cp);
        }
    }

    // Comment start state
    //------------------------------------------------------------------
    private _stateCommentStart(cp: number): void {
        switch (cp) {
            case $.HYPHEN_MINUS: {
                this.state = State.COMMENT_START_DASH;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.abruptClosingOfEmptyComment);
                this.state = State.DATA;
                const token = this.currentToken as CommentToken;
                this.emitCurrentComment(token);
                break;
            }
            default: {
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }

    // Comment start dash state
    //------------------------------------------------------------------
    private _stateCommentStartDash(cp: number): void {
        const token = this.currentToken as CommentToken;
        switch (cp) {
            case $.HYPHEN_MINUS: {
                this.state = State.COMMENT_END;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.abruptClosingOfEmptyComment);
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '-';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }

    // Comment state
    //------------------------------------------------------------------
    private _stateComment(cp: number): void {
        const token = this.currentToken as CommentToken;

        switch (cp) {
            case $.HYPHEN_MINUS: {
                this.state = State.COMMENT_END_DASH;
                break;
            }
            case $.LESS_THAN_SIGN: {
                token.data += '<';
                this.state = State.COMMENT_LESS_THAN_SIGN;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.data += REPLACEMENT_CHARACTER;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += String.fromCodePoint(cp);
            }
        }
    }

    // Comment less-than sign state
    //------------------------------------------------------------------
    private _stateCommentLessThanSign(cp: number): void {
        const token = this.currentToken as CommentToken;

        switch (cp) {
            case $.EXCLAMATION_MARK: {
                token.data += '!';
                this.state = State.COMMENT_LESS_THAN_SIGN_BANG;
                break;
            }
            case $.LESS_THAN_SIGN: {
                token.data += '<';
                break;
            }
            default: {
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }

    // Comment less-than sign bang state
    //------------------------------------------------------------------
    private _stateCommentLessThanSignBang(cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH;
        } else {
            this.state = State.COMMENT;
            this._stateComment(cp);
        }
    }

    // Comment less-than sign bang dash state
    //------------------------------------------------------------------
    private _stateCommentLessThanSignBangDash(cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;
        } else {
            this.state = State.COMMENT_END_DASH;
            this._stateCommentEndDash(cp);
        }
    }

    // Comment less-than sign bang dash dash state
    //------------------------------------------------------------------
    private _stateCommentLessThanSignBangDashDash(cp: number): void {
        if (cp !== $.GREATER_THAN_SIGN && cp !== $.EOF) {
            this._err(ERR.nestedComment);
        }

        this.state = State.COMMENT_END;
        this._stateCommentEnd(cp);
    }

    // Comment end dash state
    //------------------------------------------------------------------
    private _stateCommentEndDash(cp: number): void {
        const token = this.currentToken as CommentToken;
        switch (cp) {
            case $.HYPHEN_MINUS: {
                this.state = State.COMMENT_END;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '-';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }

    // Comment end state
    //------------------------------------------------------------------
    private _stateCommentEnd(cp: number): void {
        const token = this.currentToken as CommentToken;

        switch (cp) {
            case $.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case $.EXCLAMATION_MARK: {
                this.state = State.COMMENT_END_BANG;
                break;
            }
            case $.HYPHEN_MINUS: {
                token.data += '-';
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '--';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }

    // Comment end bang state
    //------------------------------------------------------------------
    private _stateCommentEndBang(cp: number): void {
        const token = this.currentToken as CommentToken;

        switch (cp) {
            case $.HYPHEN_MINUS: {
                token.data += '--!';
                this.state = State.COMMENT_END_DASH;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.incorrectlyClosedComment);
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '--!';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }

    // DOCTYPE state
    //------------------------------------------------------------------
    private _stateDoctype(cp: number): void {
        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                this.state = State.BEFORE_DOCTYPE_NAME;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this.state = State.BEFORE_DOCTYPE_NAME;
                this._stateBeforeDoctypeName(cp);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                this._createDoctypeToken(null);
                const token = this.currentToken as DoctypeToken;
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingWhitespaceBeforeDoctypeName);
                this.state = State.BEFORE_DOCTYPE_NAME;
                this._stateBeforeDoctypeName(cp);
            }
        }
    }

    // Before DOCTYPE name state
    //------------------------------------------------------------------
    private _stateBeforeDoctypeName(cp: number): void {
        if (isAsciiUpper(cp)) {
            this._createDoctypeToken(String.fromCharCode(toAsciiLower(cp)));
            this.state = State.DOCTYPE_NAME;
        } else
            switch (cp) {
                case $.SPACE:
                case $.LINE_FEED:
                case $.TABULATION:
                case $.FORM_FEED: {
                    // Ignore whitespace
                    break;
                }
                case $.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this._createDoctypeToken(REPLACEMENT_CHARACTER);
                    this.state = State.DOCTYPE_NAME;
                    break;
                }
                case $.GREATER_THAN_SIGN: {
                    this._err(ERR.missingDoctypeName);
                    this._createDoctypeToken(null);
                    const token = this.currentToken as DoctypeToken;
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this.state = State.DATA;
                    break;
                }
                case $.EOF: {
                    this._err(ERR.eofInDoctype);
                    this._createDoctypeToken(null);
                    const token = this.currentToken as DoctypeToken;
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._createDoctypeToken(String.fromCodePoint(cp));
                    this.state = State.DOCTYPE_NAME;
                }
            }
    }

    // DOCTYPE name state
    //------------------------------------------------------------------
    private _stateDoctypeName(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                this.state = State.AFTER_DOCTYPE_NAME;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.name += REPLACEMENT_CHARACTER;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.name += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
            }
        }
    }

    // After DOCTYPE name state
    //------------------------------------------------------------------
    private _stateAfterDoctypeName(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default:
                if (this._consumeSequenceIfMatch($$.PUBLIC, false)) {
                    this.state = State.AFTER_DOCTYPE_PUBLIC_KEYWORD;
                } else if (this._consumeSequenceIfMatch($$.SYSTEM, false)) {
                    this.state = State.AFTER_DOCTYPE_SYSTEM_KEYWORD;
                }
                //NOTE: sequence lookup can be abrupted by hibernation. In that case lookup
                //results are no longer valid and we will need to start over.
                else if (!this._ensureHibernation()) {
                    this._err(ERR.invalidCharacterSequenceAfterDoctypeName);
                    token.forceQuirks = true;
                    this.state = State.BOGUS_DOCTYPE;
                    this._stateBogusDoctype(cp);
                }
        }
    }

    // After DOCTYPE public keyword state
    //------------------------------------------------------------------
    private _stateAfterDoctypePublicKeyword(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                this.state = State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
                break;
            }
            case $.QUOTATION_MARK: {
                this._err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case $.APOSTROPHE: {
                this._err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.missingDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }

    // Before DOCTYPE public identifier state
    //------------------------------------------------------------------
    private _stateBeforeDoctypePublicIdentifier(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case $.QUOTATION_MARK: {
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case $.APOSTROPHE: {
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.missingDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }

    // DOCTYPE public identifier (double-quoted) state
    //------------------------------------------------------------------
    private _stateDoctypePublicIdentifierDoubleQuoted(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.QUOTATION_MARK: {
                this.state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.publicId += REPLACEMENT_CHARACTER;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.abruptDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.publicId += String.fromCodePoint(cp);
            }
        }
    }

    // DOCTYPE public identifier (single-quoted) state
    //------------------------------------------------------------------
    private _stateDoctypePublicIdentifierSingleQuoted(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.APOSTROPHE: {
                this.state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.publicId += REPLACEMENT_CHARACTER;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.abruptDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.publicId += String.fromCodePoint(cp);
            }
        }
    }

    // After DOCTYPE public identifier state
    //------------------------------------------------------------------
    private _stateAfterDoctypePublicIdentifier(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                this.state = State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case $.QUOTATION_MARK: {
                this._err(ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case $.APOSTROPHE: {
                this._err(ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }

    // Between DOCTYPE public and system identifiers state
    //------------------------------------------------------------------
    private _stateBetweenDoctypePublicAndSystemIdentifiers(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case $.QUOTATION_MARK: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case $.APOSTROPHE: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }

    // After DOCTYPE system keyword state
    //------------------------------------------------------------------
    private _stateAfterDoctypeSystemKeyword(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                this.state = State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
                break;
            }
            case $.QUOTATION_MARK: {
                this._err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case $.APOSTROPHE: {
                this._err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.missingDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }

    // Before DOCTYPE system identifier state
    //------------------------------------------------------------------
    private _stateBeforeDoctypeSystemIdentifier(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case $.QUOTATION_MARK: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case $.APOSTROPHE: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.missingDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }

    // DOCTYPE system identifier (double-quoted) state
    //------------------------------------------------------------------
    private _stateDoctypeSystemIdentifierDoubleQuoted(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.QUOTATION_MARK: {
                this.state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.systemId += REPLACEMENT_CHARACTER;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.abruptDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.systemId += String.fromCodePoint(cp);
            }
        }
    }

    // DOCTYPE system identifier (single-quoted) state
    //------------------------------------------------------------------
    private _stateDoctypeSystemIdentifierSingleQuoted(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.APOSTROPHE: {
                this.state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                token.systemId += REPLACEMENT_CHARACTER;
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this._err(ERR.abruptDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.systemId += String.fromCodePoint(cp);
            }
        }
    }

    // After DOCTYPE system identifier state
    //------------------------------------------------------------------
    private _stateAfterDoctypeSystemIdentifier(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.SPACE:
            case $.LINE_FEED:
            case $.TABULATION:
            case $.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case $.GREATER_THAN_SIGN: {
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(ERR.unexpectedCharacterAfterDoctypeSystemIdentifier);
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }

    // Bogus DOCTYPE state
    //------------------------------------------------------------------
    private _stateBogusDoctype(cp: number): void {
        const token = this.currentToken as DoctypeToken;

        switch (cp) {
            case $.GREATER_THAN_SIGN: {
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case $.NULL: {
                this._err(ERR.unexpectedNullCharacter);
                break;
            }
            case $.EOF: {
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default:
            // Do nothing
        }
    }

    // CDATA section state
    //------------------------------------------------------------------
    private _stateCdataSection(cp: number): void {
        switch (cp) {
            case $.RIGHT_SQUARE_BRACKET: {
                this.state = State.CDATA_SECTION_BRACKET;
                break;
            }
            case $.EOF: {
                this._err(ERR.eofInCdata);
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }

    // CDATA section bracket state
    //------------------------------------------------------------------
    private _stateCdataSectionBracket(cp: number): void {
        if (cp === $.RIGHT_SQUARE_BRACKET) {
            this.state = State.CDATA_SECTION_END;
        } else {
            this._emitChars(']');
            this.state = State.CDATA_SECTION;
            this._stateCdataSection(cp);
        }
    }

    // CDATA section end state
    //------------------------------------------------------------------
    private _stateCdataSectionEnd(cp: number): void {
        switch (cp) {
            case $.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                break;
            }
            case $.RIGHT_SQUARE_BRACKET: {
                this._emitChars(']');
                break;
            }
            default: {
                this._emitChars(']]');
                this.state = State.CDATA_SECTION;
                this._stateCdataSection(cp);
            }
        }
    }

    // Character reference state
    //------------------------------------------------------------------
    private _stateCharacterReference(cp: number): void {
        if (cp === $.NUMBER_SIGN) {
            this.state = State.NUMERIC_CHARACTER_REFERENCE;
        } else if (isAsciiAlphaNumeric(cp)) {
            this.state = State.NAMED_CHARACTER_REFERENCE;
            this._stateNamedCharacterReference(cp);
        } else {
            this._flushCodePointConsumedAsCharacterReference($.AMPERSAND);
            this._reconsumeInState(this.returnState);
        }
    }

    // Named character reference state
    //------------------------------------------------------------------
    private _stateNamedCharacterReference(cp: number): void {
        const matchResult = this._matchNamedCharacterReference(cp);

        //NOTE: Matching can be abrupted by hibernation. In that case, match
        //results are no longer valid and we will need to start over.
        if (this._ensureHibernation()) {
            // Stay in the state, try again.
        } else if (matchResult) {
            for (let i = 0; i < matchResult.length; i++) {
                this._flushCodePointConsumedAsCharacterReference(matchResult[i]);
            }
            this.state = this.returnState;
        } else {
            this._flushCodePointConsumedAsCharacterReference($.AMPERSAND);
            this.state = State.AMBIGUOUS_AMPERSAND;
        }
    }

    // Ambiguos ampersand state
    //------------------------------------------------------------------
    private _stateAmbiguousAmpersand(cp: number): void {
        if (isAsciiAlphaNumeric(cp)) {
            this._flushCodePointConsumedAsCharacterReference(cp);
        } else {
            if (cp === $.SEMICOLON) {
                this._err(ERR.unknownNamedCharacterReference);
            }

            this._reconsumeInState(this.returnState);
        }
    }

    // Numeric character reference state
    //------------------------------------------------------------------
    private _stateNumericCharacterReference(cp: number): void {
        this.charRefCode = 0;

        if (cp === $.LATIN_SMALL_X || cp === $.LATIN_CAPITAL_X) {
            this.state = State.HEXADEMICAL_CHARACTER_REFERENCE_START;
        } else {
            this.state = State.DECIMAL_CHARACTER_REFERENCE_START;
            this._stateDecimalCharacterReferenceStart(cp);
        }
    }

    // Hexademical character reference start state
    //------------------------------------------------------------------
    private _stateHexademicalCharacterReferenceStart(cp: number): void {
        if (isAsciiHexDigit(cp)) {
            this.state = State.HEXADEMICAL_CHARACTER_REFERENCE;
            this._stateHexademicalCharacterReference(cp);
        } else {
            this._err(ERR.absenceOfDigitsInNumericCharacterReference);
            this._flushCodePointConsumedAsCharacterReference($.AMPERSAND);
            this._flushCodePointConsumedAsCharacterReference($.NUMBER_SIGN);
            this._unconsume(2);
            this.state = this.returnState;
        }
    }

    // Decimal character reference start state
    //------------------------------------------------------------------
    private _stateDecimalCharacterReferenceStart(cp: number): void {
        if (isAsciiDigit(cp)) {
            this.state = State.DECIMAL_CHARACTER_REFERENCE;
            this._stateDecimalCharacterReference(cp);
        } else {
            this._err(ERR.absenceOfDigitsInNumericCharacterReference);
            this._flushCodePointConsumedAsCharacterReference($.AMPERSAND);
            this._flushCodePointConsumedAsCharacterReference($.NUMBER_SIGN);
            this._reconsumeInState(this.returnState);
        }
    }

    // Hexademical character reference state
    //------------------------------------------------------------------
    private _stateHexademicalCharacterReference(cp: number): void {
        if (isAsciiUpperHexDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x37;
        } else if (isAsciiLowerHexDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x57;
        } else if (isAsciiDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x30;
        } else if (cp === $.SEMICOLON) {
            this.state = State.NUMERIC_CHARACTER_REFERENCE_END;
        } else {
            this._err(ERR.missingSemicolonAfterCharacterReference);
            this.state = State.NUMERIC_CHARACTER_REFERENCE_END;
            this._stateNumericCharacterReferenceEnd();
        }
    }

    // Decimal character reference state
    //------------------------------------------------------------------
    private _stateDecimalCharacterReference(cp: number): void {
        if (isAsciiDigit(cp)) {
            this.charRefCode = this.charRefCode * 10 + cp - 0x30;
        } else if (cp === $.SEMICOLON) {
            this.state = State.NUMERIC_CHARACTER_REFERENCE_END;
        } else {
            this._err(ERR.missingSemicolonAfterCharacterReference);
            this.state = State.NUMERIC_CHARACTER_REFERENCE_END;
            this._stateNumericCharacterReferenceEnd();
        }
    }

    // Numeric character reference end state
    //------------------------------------------------------------------
    private _stateNumericCharacterReferenceEnd(): void {
        if (this.charRefCode === $.NULL) {
            this._err(ERR.nullCharacterReference);
            this.charRefCode = $.REPLACEMENT_CHARACTER;
        } else if (this.charRefCode > 0x10_ff_ff) {
            this._err(ERR.characterReferenceOutsideUnicodeRange);
            this.charRefCode = $.REPLACEMENT_CHARACTER;
        } else if (isSurrogate(this.charRefCode)) {
            this._err(ERR.surrogateCharacterReference);
            this.charRefCode = $.REPLACEMENT_CHARACTER;
        } else if (isUndefinedCodePoint(this.charRefCode)) {
            this._err(ERR.noncharacterCharacterReference);
        } else if (isControlCodePoint(this.charRefCode) || this.charRefCode === $.CARRIAGE_RETURN) {
            this._err(ERR.controlCharacterReference);

            const replacement = C1_CONTROLS_REFERENCE_REPLACEMENTS.get(this.charRefCode);

            if (replacement !== undefined) {
                this.charRefCode = replacement;
            }
        }

        this._flushCodePointConsumedAsCharacterReference(this.charRefCode);
        this._reconsumeInState(this.returnState);
    }
}
