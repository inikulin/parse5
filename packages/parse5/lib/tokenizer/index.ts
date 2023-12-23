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
import { htmlDecodeTree, EntityDecoder, DecodingMode } from 'entities/lib/decode.js';
import { ERR, type ParserErrorHandler } from '../common/error-codes.js';
import { TAG_ID, getTagID } from '../common/html.js';

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
    AMBIGUOUS_AMPERSAND,
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
function toAsciiLower(cp: number): number {
    return cp + 0x00_20;
}

function isWhitespace(cp: number): boolean {
    return cp === $.SPACE || cp === $.LINE_FEED || cp === $.TABULATION || cp === $.FORM_FEED;
}

function isScriptDataDoubleEscapeSequenceEnd(cp: number): boolean {
    return isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN;
}

function getErrorForNumericCharacterReference(code: number): ERR | null {
    if (code === $.NULL) {
        return ERR.nullCharacterReference;
    } else if (code > 0x10_ff_ff) {
        return ERR.characterReferenceOutsideUnicodeRange;
    } else if (isSurrogate(code)) {
        return ERR.surrogateCharacterReference;
    } else if (isUndefinedCodePoint(code)) {
        return ERR.noncharacterCharacterReference;
    } else if (isControlCodePoint(code) || code === $.CARRIAGE_RETURN) {
        return ERR.controlCharacterReference;
    }

    return null;
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

    protected paused = false;
    /** Ensures that the parsing loop isn't run multiple times at once. */
    protected inLoop = false;

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
    protected returnState = State.DATA;

    /**
     * We use `entities`' `EntityDecoder` to parse character references.
     *
     * All of the following states are handled by the `EntityDecoder`:
     *
     * - Named character reference state
     * - Numeric character reference state
     * - Hexademical character reference start state
     * - Hexademical character reference state
     * - Decimal character reference state
     * - Numeric character reference end state
     */
    protected entityDecoder: EntityDecoder;
    protected entityStartPos = 0;
    protected consumedAfterSnapshot = -1;

    protected currentLocation: Location | null;
    protected currentCharacterToken: CharacterToken | null = null;
    protected currentToken: Token | null = null;
    protected currentAttr: Attribute = { name: '', value: '' };

    constructor(
        protected options: TokenizerOptions,
        protected handler: TokenHandler,
    ) {
        this.preprocessor = new Preprocessor(handler);
        this.currentLocation = this.getCurrentLocation(-1);

        this.entityDecoder = new EntityDecoder(
            htmlDecodeTree,
            (cp: number, consumed: number) => {
                // Note: Set `pos` _before_ flushing, as flushing might drop
                // the current chunk and invalidate `entityStartPos`.
                this.preprocessor.pos = this.entityStartPos + consumed - 1;
                this._flushCodePointConsumedAsCharacterReference(cp);
            },
            handler.onParseError
                ? {
                      missingSemicolonAfterCharacterReference: (): void => {
                          this._err(ERR.missingSemicolonAfterCharacterReference, 1);
                      },
                      absenceOfDigitsInNumericCharacterReference: (consumed: number): void => {
                          this._err(
                              ERR.absenceOfDigitsInNumericCharacterReference,
                              this.entityStartPos - this.preprocessor.pos + consumed,
                          );
                      },
                      validateNumericCharacterReference: (code: number): void => {
                          const error = getErrorForNumericCharacterReference(code);
                          if (error) this._err(error, 1);
                      },
                  }
                : undefined,
        );
    }

    //Errors
    protected _err(code: ERR, cpOffset = 0): void {
        this.handler.onParseError?.(this.preprocessor.getError(code, cpOffset));
    }

    // NOTE: `offset` may never run across line boundaries.
    protected getCurrentLocation(offset: number): Location | null {
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

    protected _runParsingLoop(): void {
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
    protected _ensureHibernation(): boolean {
        if (this.preprocessor.endOfChunkHit) {
            this.preprocessor.retreat(this.consumedAfterSnapshot);
            this.consumedAfterSnapshot = 0;
            this.active = false;

            return true;
        }

        return false;
    }

    //Consumption
    protected _consume(): number {
        this.consumedAfterSnapshot++;
        return this.preprocessor.advance();
    }

    protected _advanceBy(count: number): void {
        this.consumedAfterSnapshot += count;
        for (let i = 0; i < count; i++) {
            this.preprocessor.advance();
        }
    }

    protected _consumeSequenceIfMatch(pattern: string, caseSensitive: boolean): boolean {
        if (this.preprocessor.startsWith(pattern, caseSensitive)) {
            // We will already have consumed one character before calling this method.
            this._advanceBy(pattern.length - 1);
            return true;
        }
        return false;
    }

    //Token creation
    protected _createStartTagToken(): void {
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

    protected _createEndTagToken(): void {
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

    protected _createCommentToken(offset: number): void {
        this.currentToken = {
            type: TokenType.COMMENT,
            data: '',
            location: this.getCurrentLocation(offset),
        };
    }

    protected _createDoctypeToken(initialName: string | null): void {
        this.currentToken = {
            type: TokenType.DOCTYPE,
            name: initialName,
            forceQuirks: false,
            publicId: null,
            systemId: null,
            location: this.currentLocation,
        };
    }

    protected _createCharacterToken(type: CharacterToken['type'], chars: string): void {
        this.currentCharacterToken = {
            type,
            chars,
            location: this.currentLocation,
        };
    }

    //Tag attributes
    protected _createAttr(attrNameFirstCh: string): void {
        this.currentAttr = {
            name: attrNameFirstCh,
            value: '',
        };
        this.currentLocation = this.getCurrentLocation(0);
    }

    protected _leaveAttrName(): void {
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

    protected _leaveAttrValue(): void {
        if (this.currentLocation) {
            this.currentLocation.endLine = this.preprocessor.line;
            this.currentLocation.endCol = this.preprocessor.col;
            this.currentLocation.endOffset = this.preprocessor.offset;
        }
    }

    //Token emission
    protected prepareToken(ct: Token): void {
        this._emitCurrentCharacterToken(ct.location);
        this.currentToken = null;

        if (ct.location) {
            ct.location.endLine = this.preprocessor.line;
            ct.location.endCol = this.preprocessor.col + 1;
            ct.location.endOffset = this.preprocessor.offset + 1;
        }

        this.currentLocation = this.getCurrentLocation(-1);
    }

    protected emitCurrentTagToken(): void {
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

    protected emitCurrentComment(ct: CommentToken): void {
        this.prepareToken(ct);
        this.handler.onComment(ct);

        this.preprocessor.dropParsedChunk();
    }

    protected emitCurrentDoctype(ct: DoctypeToken): void {
        this.prepareToken(ct);
        this.handler.onDoctype(ct);

        this.preprocessor.dropParsedChunk();
    }

    protected _emitCurrentCharacterToken(nextLocation: Location | null): void {
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

    protected _emitEOFToken(): void {
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

    //OPTIMIZATION: The specification uses only one type of character token (one token per character).
    //This causes a huge memory overhead and a lot of unnecessary parser loops. parse5 uses 3 groups of characters.
    //If we have a sequence of characters that belong to the same group, the parser can process it
    //as a single solid character token.
    //So, there are 3 types of character tokens in parse5:
    //1)TokenType.NULL_CHARACTER - \u0000-character sequences (e.g. '\u0000\u0000\u0000')
    //2)TokenType.WHITESPACE_CHARACTER - any whitespace/new-line character sequences (e.g. '\n  \r\t   \f')
    //3)TokenType.CHARACTER - any character sequence which don't belong to groups 1 and 2 (e.g. 'abcdef1234@@#$%^')
    protected _appendCharToCurrentCharacterToken(type: CharacterToken['type'], ch: string): void {
        if (this.currentCharacterToken) {
            if (this.currentCharacterToken.type === type) {
                this.currentCharacterToken.chars += ch;
                return;
            } else {
                this.currentLocation = this.getCurrentLocation(0);
                this._emitCurrentCharacterToken(this.currentLocation);
                this.preprocessor.dropParsedChunk();
            }
        }

        this._createCharacterToken(type, ch);
    }

    protected _emitCodePoint(cp: number): void {
        const type = isWhitespace(cp)
            ? TokenType.WHITESPACE_CHARACTER
            : cp === $.NULL
              ? TokenType.NULL_CHARACTER
              : TokenType.CHARACTER;

        this._appendCharToCurrentCharacterToken(type, String.fromCodePoint(cp));
    }

    //NOTE: used when we emit characters explicitly.
    //This is always for non-whitespace and non-null characters, which allows us to avoid additional checks.
    protected _emitChars(ch: string): void {
        this._appendCharToCurrentCharacterToken(TokenType.CHARACTER, ch);
    }

    // Character reference helpers
    protected _startCharacterReference(): void {
        this.returnState = this.state;
        this.state = State.CHARACTER_REFERENCE;
        this.entityStartPos = this.preprocessor.pos;
        this.entityDecoder.startEntity(
            this._isCharacterReferenceInAttribute() ? DecodingMode.Attribute : DecodingMode.Legacy,
        );
    }

    protected _isCharacterReferenceInAttribute(): boolean {
        return (
            this.returnState === State.ATTRIBUTE_VALUE_DOUBLE_QUOTED ||
            this.returnState === State.ATTRIBUTE_VALUE_SINGLE_QUOTED ||
            this.returnState === State.ATTRIBUTE_VALUE_UNQUOTED
        );
    }

    protected _flushCodePointConsumedAsCharacterReference(cp: number): void {
        if (this._isCharacterReferenceInAttribute()) {
            this.currentAttr.value += String.fromCodePoint(cp);
        } else {
            this._emitCodePoint(cp);
        }
    }

    // Calling states this way turns out to be much faster than any other approach.
    protected _callState(cp: number): void {
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
                this._stateCharacterReference();
                break;
            }
            case State.AMBIGUOUS_AMPERSAND: {
                this._stateAmbiguousAmpersand(cp);
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
    protected _stateData(cp: number): void {
        switch (cp) {
            case $.LESS_THAN_SIGN: {
                this.state = State.TAG_OPEN;
                break;
            }
            case $.AMPERSAND: {
                this._startCharacterReference();
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
    protected _stateRcdata(cp: number): void {
        switch (cp) {
            case $.AMPERSAND: {
                this._startCharacterReference();
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
    protected _stateRawtext(cp: number): void {
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
    protected _stateScriptData(cp: number): void {
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
    protected _statePlaintext(cp: number): void {
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
    protected _stateTagOpen(cp: number): void {
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
    protected _stateEndTagOpen(cp: number): void {
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
    protected _stateTagName(cp: number): void {
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
    protected _stateRcdataLessThanSign(cp: number): void {
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
    protected _stateRcdataEndTagOpen(cp: number): void {
        if (isAsciiLetter(cp)) {
            this.state = State.RCDATA_END_TAG_NAME;
            this._stateRcdataEndTagName(cp);
        } else {
            this._emitChars('</');
            this.state = State.RCDATA;
            this._stateRcdata(cp);
        }
    }

    protected handleSpecialEndTag(_cp: number): boolean {
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
    protected _stateRcdataEndTagName(cp: number): void {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.RCDATA;
            this._stateRcdata(cp);
        }
    }

    // RAWTEXT less-than sign state
    //------------------------------------------------------------------
    protected _stateRawtextLessThanSign(cp: number): void {
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
    protected _stateRawtextEndTagOpen(cp: number): void {
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
    protected _stateRawtextEndTagName(cp: number): void {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.RAWTEXT;
            this._stateRawtext(cp);
        }
    }

    // Script data less-than sign state
    //------------------------------------------------------------------
    protected _stateScriptDataLessThanSign(cp: number): void {
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
    protected _stateScriptDataEndTagOpen(cp: number): void {
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
    protected _stateScriptDataEndTagName(cp: number): void {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }

    // Script data escape start state
    //------------------------------------------------------------------
    protected _stateScriptDataEscapeStart(cp: number): void {
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
    protected _stateScriptDataEscapeStartDash(cp: number): void {
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
    protected _stateScriptDataEscaped(cp: number): void {
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
    protected _stateScriptDataEscapedDash(cp: number): void {
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
    protected _stateScriptDataEscapedDashDash(cp: number): void {
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
    protected _stateScriptDataEscapedLessThanSign(cp: number): void {
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
    protected _stateScriptDataEscapedEndTagOpen(cp: number): void {
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
    protected _stateScriptDataEscapedEndTagName(cp: number): void {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }

    // Script data double escape start state
    //------------------------------------------------------------------
    protected _stateScriptDataDoubleEscapeStart(cp: number): void {
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
    protected _stateScriptDataDoubleEscaped(cp: number): void {
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
    protected _stateScriptDataDoubleEscapedDash(cp: number): void {
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
    protected _stateScriptDataDoubleEscapedDashDash(cp: number): void {
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
    protected _stateScriptDataDoubleEscapedLessThanSign(cp: number): void {
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
    protected _stateScriptDataDoubleEscapeEnd(cp: number): void {
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
    protected _stateBeforeAttributeName(cp: number): void {
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
    protected _stateAttributeName(cp: number): void {
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
    protected _stateAfterAttributeName(cp: number): void {
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
    protected _stateBeforeAttributeValue(cp: number): void {
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
    protected _stateAttributeValueDoubleQuoted(cp: number): void {
        switch (cp) {
            case $.QUOTATION_MARK: {
                this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                break;
            }
            case $.AMPERSAND: {
                this._startCharacterReference();
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
    protected _stateAttributeValueSingleQuoted(cp: number): void {
        switch (cp) {
            case $.APOSTROPHE: {
                this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                break;
            }
            case $.AMPERSAND: {
                this._startCharacterReference();
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
    protected _stateAttributeValueUnquoted(cp: number): void {
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
                this._startCharacterReference();
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
    protected _stateAfterAttributeValueQuoted(cp: number): void {
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
    protected _stateSelfClosingStartTag(cp: number): void {
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
    protected _stateBogusComment(cp: number): void {
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
    protected _stateMarkupDeclarationOpen(cp: number): void {
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
    protected _stateCommentStart(cp: number): void {
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
    protected _stateCommentStartDash(cp: number): void {
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
    protected _stateComment(cp: number): void {
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
    protected _stateCommentLessThanSign(cp: number): void {
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
    protected _stateCommentLessThanSignBang(cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH;
        } else {
            this.state = State.COMMENT;
            this._stateComment(cp);
        }
    }

    // Comment less-than sign bang dash state
    //------------------------------------------------------------------
    protected _stateCommentLessThanSignBangDash(cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;
        } else {
            this.state = State.COMMENT_END_DASH;
            this._stateCommentEndDash(cp);
        }
    }

    // Comment less-than sign bang dash dash state
    //------------------------------------------------------------------
    protected _stateCommentLessThanSignBangDashDash(cp: number): void {
        if (cp !== $.GREATER_THAN_SIGN && cp !== $.EOF) {
            this._err(ERR.nestedComment);
        }

        this.state = State.COMMENT_END;
        this._stateCommentEnd(cp);
    }

    // Comment end dash state
    //------------------------------------------------------------------
    protected _stateCommentEndDash(cp: number): void {
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
    protected _stateCommentEnd(cp: number): void {
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
    protected _stateCommentEndBang(cp: number): void {
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
    protected _stateDoctype(cp: number): void {
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
    protected _stateBeforeDoctypeName(cp: number): void {
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
    protected _stateDoctypeName(cp: number): void {
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
    protected _stateAfterDoctypeName(cp: number): void {
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
            default: {
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
    }

    // After DOCTYPE public keyword state
    //------------------------------------------------------------------
    protected _stateAfterDoctypePublicKeyword(cp: number): void {
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
    protected _stateBeforeDoctypePublicIdentifier(cp: number): void {
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
    protected _stateDoctypePublicIdentifierDoubleQuoted(cp: number): void {
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
    protected _stateDoctypePublicIdentifierSingleQuoted(cp: number): void {
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
    protected _stateAfterDoctypePublicIdentifier(cp: number): void {
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
    protected _stateBetweenDoctypePublicAndSystemIdentifiers(cp: number): void {
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
    protected _stateAfterDoctypeSystemKeyword(cp: number): void {
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
    protected _stateBeforeDoctypeSystemIdentifier(cp: number): void {
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
    protected _stateDoctypeSystemIdentifierDoubleQuoted(cp: number): void {
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
    protected _stateDoctypeSystemIdentifierSingleQuoted(cp: number): void {
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
    protected _stateAfterDoctypeSystemIdentifier(cp: number): void {
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
    protected _stateBogusDoctype(cp: number): void {
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
    protected _stateCdataSection(cp: number): void {
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
    protected _stateCdataSectionBracket(cp: number): void {
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
    protected _stateCdataSectionEnd(cp: number): void {
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
    protected _stateCharacterReference(): void {
        let length = this.entityDecoder.write(this.preprocessor.html, this.preprocessor.pos);

        if (length < 0) {
            if (this.preprocessor.lastChunkWritten) {
                length = this.entityDecoder.end();
            } else {
                // Wait for the rest of the entity.
                this.active = false;
                // Mark the entire buffer as read.
                this.preprocessor.pos = this.preprocessor.html.length - 1;
                this.consumedAfterSnapshot = 0;
                this.preprocessor.endOfChunkHit = true;
                return;
            }
        }

        if (length === 0) {
            // This was not a valid entity. Go back to the beginning, and
            // figure out what to do.
            this.preprocessor.pos = this.entityStartPos;
            this._flushCodePointConsumedAsCharacterReference($.AMPERSAND);

            this.state =
                !this._isCharacterReferenceInAttribute() && isAsciiAlphaNumeric(this.preprocessor.peek(1))
                    ? State.AMBIGUOUS_AMPERSAND
                    : this.returnState;
        } else {
            // We successfully parsed an entity. Switch to the return state.
            this.state = this.returnState;
        }
    }

    // Ambiguos ampersand state
    //------------------------------------------------------------------
    protected _stateAmbiguousAmpersand(cp: number): void {
        if (isAsciiAlphaNumeric(cp)) {
            this._flushCodePointConsumedAsCharacterReference(cp);
        } else {
            if (cp === $.SEMICOLON) {
                this._err(ERR.unknownNamedCharacterReference);
            }

            this.state = this.returnState;
            this._callState(cp);
        }
    }
}
