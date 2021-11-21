import { Preprocessor } from './preprocessor.js';
import * as unicode from '../common/unicode.js';
import { namedEntityData as neTree } from './named-entity-data.js';
import { ERR } from '../common/error-codes.js';

export interface Location {
    startLine: number;
    startCol: number;
    startOffset: number;
    endLine: number;
    endCol: number;
    endOffset: number;
}

export interface TokenBase {
    location?: Location;
}
export interface StartTagLocation extends Location {
    attrs?: Record<string, Location>;
    startTag?: Location;
}
export interface EndTagLocation {
    endTag?: Location;
    endLine: number;
    endCol: number;
    endOffset: number;
}
export interface StartTagToken extends TokenBase {
    type: 'START_TAG_TOKEN';
    tagName: string;
    selfClosing: boolean;
    ackSelfClosing: boolean;
    attrs: AttributeToken[];
    location?: StartTagLocation;
}
export interface EndTagToken extends TokenBase {
    type: 'END_TAG_TOKEN';
    tagName: string;
    selfClosing: boolean;
    attrs: AttributeToken[];
}
export interface CommentToken extends TokenBase {
    type: 'COMMENT_TOKEN';
    data: string;
}
export interface DocTypeToken extends TokenBase {
    type: 'DOCTYPE_TOKEN';
    name: string | null;
    forceQuirks: boolean;
    publicId: string | null;
    systemId: string | null;
}
export interface CharacterToken extends TokenBase {
    type: 'CHARACTER_TOKEN' | 'NULL_CHARACTER_TOKEN' | 'WHITESPACE_CHARACTER_TOKEN';
    chars: string;
}
export interface EOFToken extends TokenBase {
    type: 'EOF_TOKEN';
}
export interface HibernationToken extends TokenBase {
    type: 'HIBERNATION_TOKEN';
}
export interface AttributeToken {
    name: string;
    value: string;
    prefix?: string;
    namespace?: string;
}
export type Token =
    | StartTagToken
    | EndTagToken
    | CommentToken
    | DocTypeToken
    | CharacterToken
    | HibernationToken
    | EOFToken;

//Token types
// TODO (43081j): maybe somehow put these in their own namespace? or at least
// name them with a suffix like _TYPE
export const CHARACTER_TOKEN = 'CHARACTER_TOKEN';
export const NULL_CHARACTER_TOKEN = 'NULL_CHARACTER_TOKEN';
export const WHITESPACE_CHARACTER_TOKEN = 'WHITESPACE_CHARACTER_TOKEN';
export const START_TAG_TOKEN = 'START_TAG_TOKEN';
export const END_TAG_TOKEN = 'END_TAG_TOKEN';
export const COMMENT_TOKEN = 'COMMENT_TOKEN';
export const DOCTYPE_TOKEN = 'DOCTYPE_TOKEN';
export const EOF_TOKEN = 'EOF_TOKEN';
export const HIBERNATION_TOKEN = 'HIBERNATION_TOKEN';

//Aliases
const $ = unicode.CODE_POINTS;
const $$ = unicode.CODE_POINT_SEQUENCES;

//C1 Unicode control character reference replacements
const C1_CONTROLS_REFERENCE_REPLACEMENTS: Record<number, number> = {
    0x80: 0x20ac,
    0x82: 0x201a,
    0x83: 0x0192,
    0x84: 0x201e,
    0x85: 0x2026,
    0x86: 0x2020,
    0x87: 0x2021,
    0x88: 0x02c6,
    0x89: 0x2030,
    0x8a: 0x0160,
    0x8b: 0x2039,
    0x8c: 0x0152,
    0x8e: 0x017d,
    0x91: 0x2018,
    0x92: 0x2019,
    0x93: 0x201c,
    0x94: 0x201d,
    0x95: 0x2022,
    0x96: 0x2013,
    0x97: 0x2014,
    0x98: 0x02dc,
    0x99: 0x2122,
    0x9a: 0x0161,
    0x9b: 0x203a,
    0x9c: 0x0153,
    0x9e: 0x017e,
    0x9f: 0x0178,
};

// Named entity tree flags
const HAS_DATA_FLAG = 1 << 0;
const DATA_DUPLET_FLAG = 1 << 1;
const HAS_BRANCHES_FLAG = 1 << 2;
const MAX_BRANCH_MARKER_VALUE = HAS_DATA_FLAG | DATA_DUPLET_FLAG | HAS_BRANCHES_FLAG;

//States
export const states = {
    DATA_STATE: 'DATA_STATE',
    RCDATA_STATE: 'RCDATA_STATE',
    RAWTEXT_STATE: 'RAWTEXT_STATE',
    SCRIPT_DATA_STATE: 'SCRIPT_DATA_STATE',
    PLAINTEXT_STATE: 'PLAINTEXT_STATE',
    TAG_OPEN_STATE: 'TAG_OPEN_STATE',
    END_TAG_OPEN_STATE: 'END_TAG_OPEN_STATE',
    TAG_NAME_STATE: 'TAG_NAME_STATE',
    RCDATA_LESS_THAN_SIGN_STATE: 'RCDATA_LESS_THAN_SIGN_STATE',
    RCDATA_END_TAG_OPEN_STATE: 'RCDATA_END_TAG_OPEN_STATE',
    RCDATA_END_TAG_NAME_STATE: 'RCDATA_END_TAG_NAME_STATE',
    RAWTEXT_LESS_THAN_SIGN_STATE: 'RAWTEXT_LESS_THAN_SIGN_STATE',
    RAWTEXT_END_TAG_OPEN_STATE: 'RAWTEXT_END_TAG_OPEN_STATE',
    RAWTEXT_END_TAG_NAME_STATE: 'RAWTEXT_END_TAG_NAME_STATE',
    SCRIPT_DATA_LESS_THAN_SIGN_STATE: 'SCRIPT_DATA_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_END_TAG_OPEN_STATE: 'SCRIPT_DATA_END_TAG_OPEN_STATE',
    SCRIPT_DATA_END_TAG_NAME_STATE: 'SCRIPT_DATA_END_TAG_NAME_STATE',
    SCRIPT_DATA_ESCAPE_START_STATE: 'SCRIPT_DATA_ESCAPE_START_STATE',
    SCRIPT_DATA_ESCAPE_START_DASH_STATE: 'SCRIPT_DATA_ESCAPE_START_DASH_STATE',
    SCRIPT_DATA_ESCAPED_STATE: 'SCRIPT_DATA_ESCAPED_STATE',
    SCRIPT_DATA_ESCAPED_DASH_STATE: 'SCRIPT_DATA_ESCAPED_DASH_STATE',
    SCRIPT_DATA_ESCAPED_DASH_DASH_STATE: 'SCRIPT_DATA_ESCAPED_DASH_DASH_STATE',
    SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE: 'SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE: 'SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE',
    SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE: 'SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE: 'SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_STATE: 'SCRIPT_DATA_DOUBLE_ESCAPED_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE: 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE: 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE: 'SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE: 'SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE',
    BEFORE_ATTRIBUTE_NAME_STATE: 'BEFORE_ATTRIBUTE_NAME_STATE',
    ATTRIBUTE_NAME_STATE: 'ATTRIBUTE_NAME_STATE',
    AFTER_ATTRIBUTE_NAME_STATE: 'AFTER_ATTRIBUTE_NAME_STATE',
    BEFORE_ATTRIBUTE_VALUE_STATE: 'BEFORE_ATTRIBUTE_VALUE_STATE',
    ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE: 'ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE',
    ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE: 'ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE',
    ATTRIBUTE_VALUE_UNQUOTED_STATE: 'ATTRIBUTE_VALUE_UNQUOTED_STATE',
    AFTER_ATTRIBUTE_VALUE_QUOTED_STATE: 'AFTER_ATTRIBUTE_VALUE_QUOTED_STATE',
    SELF_CLOSING_START_TAG_STATE: 'SELF_CLOSING_START_TAG_STATE',
    BOGUS_COMMENT_STATE: 'BOGUS_COMMENT_STATE',
    MARKUP_DECLARATION_OPEN_STATE: 'MARKUP_DECLARATION_OPEN_STATE',
    COMMENT_START_STATE: 'COMMENT_START_STATE',
    COMMENT_START_DASH_STATE: 'COMMENT_START_DASH_STATE',
    COMMENT_STATE: 'COMMENT_STATE',
    COMMENT_LESS_THAN_SIGN_STATE: 'COMMENT_LESS_THAN_SIGN_STATE',
    COMMENT_LESS_THAN_SIGN_BANG_STATE: 'COMMENT_LESS_THAN_SIGN_BANG_STATE',
    COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE: 'COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE',
    COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE: 'COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE',
    COMMENT_END_DASH_STATE: 'COMMENT_END_DASH_STATE',
    COMMENT_END_STATE: 'COMMENT_END_STATE',
    COMMENT_END_BANG_STATE: 'COMMENT_END_BANG_STATE',
    DOCTYPE_STATE: 'DOCTYPE_STATE',
    BEFORE_DOCTYPE_NAME_STATE: 'BEFORE_DOCTYPE_NAME_STATE',
    DOCTYPE_NAME_STATE: 'DOCTYPE_NAME_STATE',
    AFTER_DOCTYPE_NAME_STATE: 'AFTER_DOCTYPE_NAME_STATE',
    AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE: 'AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE',
    BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE: 'BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE',
    DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE: 'DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE',
    DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE: 'DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE',
    AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE: 'AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE',
    BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE: 'BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE',
    AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE: 'AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE',
    BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE: 'BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE',
    DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE: 'DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE',
    DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE: 'DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE',
    AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE: 'AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE',
    BOGUS_DOCTYPE_STATE: 'BOGUS_DOCTYPE_STATE',
    CDATA_SECTION_STATE: 'CDATA_SECTION_STATE',
    CDATA_SECTION_BRACKET_STATE: 'CDATA_SECTION_BRACKET_STATE',
    CDATA_SECTION_END_STATE: 'CDATA_SECTION_END_STATE',
    CHARACTER_REFERENCE_STATE: 'CHARACTER_REFERENCE_STATE',
    NAMED_CHARACTER_REFERENCE_STATE: 'NAMED_CHARACTER_REFERENCE_STATE',
    AMBIGUOUS_AMPERSAND_STATE: 'AMBIGUOUS_AMPERSAND_STATE',
    NUMERIC_CHARACTER_REFERENCE_STATE: 'NUMERIC_CHARACTER_REFERENCE_STATE',
    HEXADEMICAL_CHARACTER_REFERENCE_START_STATE: 'HEXADEMICAL_CHARACTER_REFERENCE_START_STATE',
    DECIMAL_CHARACTER_REFERENCE_START_STATE: 'DECIMAL_CHARACTER_REFERENCE_START_STATE',
    HEXADEMICAL_CHARACTER_REFERENCE_STATE: 'HEXADEMICAL_CHARACTER_REFERENCE_STATE',
    DECIMAL_CHARACTER_REFERENCE_STATE: 'DECIMAL_CHARACTER_REFERENCE_STATE',
    NUMERIC_CHARACTER_REFERENCE_END_STATE: 'NUMERIC_CHARACTER_REFERENCE_END_STATE',
} as const;

export type State = keyof typeof states;

//Tokenizer initial states for different modes
export const MODE = {
    DATA: states.DATA_STATE,
    RCDATA: states.RCDATA_STATE,
    RAWTEXT: states.RAWTEXT_STATE,
    SCRIPT_DATA: states.SCRIPT_DATA_STATE,
    PLAINTEXT: states.PLAINTEXT_STATE,
} as const;

//Utils

//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').
function isWhitespace(cp: number): boolean {
    return cp === $.SPACE || cp === $.LINE_FEED || cp === $.TABULATION || cp === $.FORM_FEED;
}

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

function toAsciiLowerCodePoint(cp: number): number {
    return cp + 0x0020;
}

//NOTE: String.fromCharCode() function can handle only characters from BMP subset.
//So, we need to workaround this manually.
//(see: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/fromCharCode#Getting_it_to_work_with_higher_values)
function toChar(cp: number): string {
    if (cp <= 0xffff) {
        return String.fromCharCode(cp);
    }

    cp -= 0x10000;
    return String.fromCharCode(((cp >>> 10) & 0x3ff) | 0xd800) + String.fromCharCode(0xdc00 | (cp & 0x3ff));
}

function toAsciiLowerChar(cp: number): string {
    return String.fromCharCode(toAsciiLowerCodePoint(cp));
}

function findNamedEntityTreeBranch(nodeIx: number, cp: number): number {
    const branchCount = neTree[++nodeIx] ?? 0;
    let lo = ++nodeIx;
    let hi = lo + branchCount - 1;

    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const midCp = neTree[mid] ?? -1;

        if (midCp < cp) {
            lo = mid + 1;
        } else if (midCp > cp) {
            hi = mid - 1;
        } else {
            return neTree[mid + branchCount] ?? -1;
        }
    }

    return -1;
}

//Tokenizer
export class Tokenizer {
    public preprocessor: Preprocessor;
    public tokenQueue: Token[];
    public allowCDATA: boolean;
    public state: State;
    public returnState: State;
    public charRefCode: number;
    public tempBuff: number[];
    public lastStartTagName: string;
    public consumedAfterSnapshot: number;
    public active: boolean;
    public currentCharacterToken: CharacterToken | null;
    public currentToken: Token | null;
    public currentAttr: AttributeToken | null;

    public static getTokenAttr(token: StartTagToken | EndTagToken, attrName: string): string | null {
        for (let i = token.attrs.length - 1; i >= 0; i--) {
            const attr = token.attrs[i];
            if (attr?.name === attrName) {
                return attr.value;
            }
        }

        return null;
    }

    public constructor() {
        this.preprocessor = new Preprocessor();

        this.tokenQueue = [];

        this.allowCDATA = false;

        this.state = states.DATA_STATE;
        // TODO (43081j): this cast makes me sad, maybe we can just use null?
        this.returnState = '' as State;

        this.charRefCode = -1;
        this.tempBuff = [];
        this.lastStartTagName = '';

        this.consumedAfterSnapshot = -1;
        this.active = false;

        this.currentCharacterToken = null;
        this.currentToken = null;
        this.currentAttr = null;
    }

    //Errors
    public err(_err: unknown): void {
        // NOTE: err reporting is noop by default. Enabled by mixin.
    }

    protected _errOnNextCodePoint(err: unknown): void {
        this._consume();
        this.err(err);
        this._unconsume();
    }

    //API
    public getNextToken(): Token | undefined {
        while (!this.tokenQueue.length && this.active) {
            this.consumedAfterSnapshot = 0;

            const cp = this._consume();

            if (!this._ensureHibernation()) {
                this[this.state](cp);
            }
        }

        return this.tokenQueue.shift();
    }

    public write(chunk: string, isLastChunk: boolean): void {
        this.active = true;
        this.preprocessor.write(chunk, isLastChunk);
    }

    public insertHtmlAtCurrentPos(chunk: string): void {
        this.active = true;
        this.preprocessor.insertHtmlAtCurrentPos(chunk);
    }

    //Hibernation
    protected _ensureHibernation(): boolean {
        if (this.preprocessor.endOfChunkHit) {
            for (; this.consumedAfterSnapshot > 0; this.consumedAfterSnapshot--) {
                this.preprocessor.retreat();
            }

            this.active = false;
            this.tokenQueue.push({ type: HIBERNATION_TOKEN });

            return true;
        }

        return false;
    }

    //Consumption
    protected _consume(): number {
        this.consumedAfterSnapshot++;
        return this.preprocessor.advance();
    }

    protected _unconsume(): void {
        this.consumedAfterSnapshot--;
        this.preprocessor.retreat();
    }

    protected _reconsumeInState(state: State): void {
        this.state = state;
        this._unconsume();
    }

    protected _consumeSequenceIfMatch(pattern: number[], startCp: number, caseSensitive: boolean): boolean {
        let consumedCount = 0;
        let isMatch = true;
        const patternLength = pattern.length;
        let patternPos = 0;
        let cp = startCp;
        let patternCp: number | undefined;

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

            if (
                patternCp !== undefined &&
                cp !== patternCp &&
                (caseSensitive || cp !== toAsciiLowerCodePoint(patternCp))
            ) {
                isMatch = false;
                break;
            }
        }

        if (!isMatch) {
            while (consumedCount--) {
                this._unconsume();
            }
        }

        return isMatch;
    }

    //Temp buffer
    protected _isTempBufferEqualToScriptString(): boolean {
        if (this.tempBuff.length !== $$.SCRIPT_STRING.length) {
            return false;
        }

        for (let i = 0; i < this.tempBuff.length; i++) {
            if (this.tempBuff[i] !== $$.SCRIPT_STRING[i]) {
                return false;
            }
        }

        return true;
    }

    //Token creation
    public createStartTagToken(): void {
        this.currentToken = {
            type: START_TAG_TOKEN,
            tagName: '',
            selfClosing: false,
            ackSelfClosing: false,
            attrs: [],
        };
    }

    public createEndTagToken(): void {
        this.currentToken = {
            type: END_TAG_TOKEN,
            tagName: '',
            selfClosing: false,
            attrs: [],
        };
    }

    public createCommentToken(): void {
        this.currentToken = {
            type: COMMENT_TOKEN,
            data: '',
        };
    }

    public createDoctypeToken(initialName: string | null): void {
        this.currentToken = {
            type: DOCTYPE_TOKEN,
            name: initialName,
            forceQuirks: false,
            publicId: null,
            systemId: null,
        };
    }

    public createCharacterToken(type: CharacterToken['type'], ch: string): void {
        this.currentCharacterToken = {
            type: type,
            chars: ch,
        };
    }

    public createEOFToken(): void {
        this.currentToken = { type: EOF_TOKEN };
    }

    //Tag attributes
    public createAttr(attrNameFirstCh: string): void {
        this.currentAttr = {
            name: attrNameFirstCh,
            value: '',
        };
    }

    public leaveAttrName(toState: State): void {
        if (
            (this.currentToken?.type !== START_TAG_TOKEN && this.currentToken?.type !== END_TAG_TOKEN) ||
            !this.currentAttr
        ) {
            return;
        }
        if (Tokenizer.getTokenAttr(this.currentToken, this.currentAttr.name) === null) {
            this.currentToken.attrs.push(this.currentAttr);
        } else {
            this.err(ERR.duplicateAttribute);
        }

        this.state = toState;
    }

    public leaveAttrValue(toState: State): void {
        this.state = toState;
    }

    //Token emission
    public emitCurrentToken(): void {
        this.emitCurrentCharacterToken();

        const ct = this.currentToken;

        if (!ct) {
            return;
        }

        this.currentToken = null;

        //NOTE: store emited start tag's tagName to determine is the following end tag token is appropriate.
        if (ct.type === START_TAG_TOKEN) {
            this.lastStartTagName = ct.tagName;
        } else if (ct.type === END_TAG_TOKEN) {
            if (ct.attrs.length > 0) {
                this.err(ERR.endTagWithAttributes);
            }

            if (ct.selfClosing) {
                this.err(ERR.endTagWithTrailingSolidus);
            }
        }

        this.tokenQueue.push(ct);
    }

    public emitCurrentCharacterToken(): void {
        if (this.currentCharacterToken) {
            this.tokenQueue.push(this.currentCharacterToken);
            this.currentCharacterToken = null;
        }
    }

    protected _emitEOFToken(): void {
        this.createEOFToken();
        this.emitCurrentToken();
    }

    //Characters emission

    //OPTIMIZATION: specification uses only one type of character tokens (one token per character).
    //This causes a huge memory overhead and a lot of unnecessary parser loops. parse5 uses 3 groups of characters.
    //If we have a sequence of characters that belong to the same group, parser can process it
    //as a single solid character token.
    //So, there are 3 types of character tokens in parse5:
    //1)NULL_CHARACTER_TOKEN - \u0000-character sequences (e.g. '\u0000\u0000\u0000')
    //2)WHITESPACE_CHARACTER_TOKEN - any whitespace/new-line character sequences (e.g. '\n  \r\t   \f')
    //3)CHARACTER_TOKEN - any character sequence which don't belong to groups 1 and 2 (e.g. 'abcdef1234@@#$%^')
    protected _appendCharToCurrentCharacterToken(type: CharacterToken['type'], ch: string): void {
        if (this.currentCharacterToken && this.currentCharacterToken.type !== type) {
            this.emitCurrentCharacterToken();
        }

        if (this.currentCharacterToken) {
            this.currentCharacterToken.chars += ch;
        } else {
            this.createCharacterToken(type, ch);
        }
    }

    protected _emitCodePoint(cp: number): void {
        let type: Token['type'] = CHARACTER_TOKEN;

        if (isWhitespace(cp)) {
            type = WHITESPACE_CHARACTER_TOKEN;
        } else if (cp === $.NULL) {
            type = NULL_CHARACTER_TOKEN;
        }

        this._appendCharToCurrentCharacterToken(type, toChar(cp));
    }

    protected _emitSeveralCodePoints(codePoints: number[]): void {
        for (const codePoint of codePoints) {
            this._emitCodePoint(codePoint);
        }
    }

    //NOTE: used then we emit character explicitly. This is always a non-whitespace and a non-null character.
    //So we can avoid additional checks here.
    protected _emitChars(ch: string): void {
        this._appendCharToCurrentCharacterToken(CHARACTER_TOKEN, ch);
    }

    // Character reference helpers
    protected _matchNamedCharacterReference(startCp: number): number[] | null {
        let result: number[] | null = null;
        let excess = 1;
        let i = findNamedEntityTreeBranch(0, startCp);

        this.tempBuff.push(startCp);

        while (i > -1) {
            const current = neTree[i] ?? -1;
            const inNode = current < MAX_BRANCH_MARKER_VALUE;
            const nodeWithData = inNode && current & HAS_DATA_FLAG;

            if (nodeWithData) {
                //NOTE: we use greedy search, so we continue lookup at this point
                result = current & DATA_DUPLET_FLAG ? [neTree[++i] ?? -1, neTree[++i] ?? -1] : [neTree[++i] ?? -1];
                excess = 0;
            }

            const cp = this._consume();

            this.tempBuff.push(cp);
            excess++;

            if (cp === $.EOF) {
                break;
            }

            if (inNode) {
                i = current & HAS_BRANCHES_FLAG ? findNamedEntityTreeBranch(i, cp) : -1;
            } else {
                i = cp === current ? ++i : -1;
            }
        }

        while (excess--) {
            this.tempBuff.pop();
            this._unconsume();
        }

        return result;
    }

    protected _isCharacterReferenceInAttribute(): boolean {
        return (
            this.returnState === states.ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE ||
            this.returnState === states.ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE ||
            this.returnState === states.ATTRIBUTE_VALUE_UNQUOTED_STATE
        );
    }

    protected _isCharacterReferenceAttributeQuirk(withSemicolon: boolean): boolean {
        if (!withSemicolon && this._isCharacterReferenceInAttribute()) {
            const nextCp = this._consume();

            this._unconsume();

            return nextCp === $.EQUALS_SIGN || isAsciiAlphaNumeric(nextCp);
        }

        return false;
    }

    protected _flushCodePointsConsumedAsCharacterReference(): void {
        if (this._isCharacterReferenceInAttribute()) {
            if (this.currentAttr) {
                for (const cp of this.tempBuff) {
                    this.currentAttr.value += toChar(cp);
                }
            }
        } else {
            this._emitSeveralCodePoints(this.tempBuff);
        }

        this.tempBuff = [];
    }

    // State machine

    // Data state
    //------------------------------------------------------------------
    public [states.DATA_STATE](cp: number): void {
        this.preprocessor.dropParsedChunk();

        if (cp === $.LESS_THAN_SIGN) {
            this.state = states.TAG_OPEN_STATE;
        } else if (cp === $.AMPERSAND) {
            this.returnState = states.DATA_STATE;
            this.state = states.CHARACTER_REFERENCE_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this._emitCodePoint(cp);
        } else if (cp === $.EOF) {
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    //  RCDATA state
    //------------------------------------------------------------------
    public [states.RCDATA_STATE](cp: number): void {
        this.preprocessor.dropParsedChunk();

        if (cp === $.AMPERSAND) {
            this.returnState = states.RCDATA_STATE;
            this.state = states.CHARACTER_REFERENCE_STATE;
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = states.RCDATA_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // RAWTEXT state
    //------------------------------------------------------------------
    public [states.RAWTEXT_STATE](cp: number): void {
        this.preprocessor.dropParsedChunk();

        if (cp === $.LESS_THAN_SIGN) {
            this.state = states.RAWTEXT_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // Script data state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_STATE](cp: number): void {
        this.preprocessor.dropParsedChunk();

        if (cp === $.LESS_THAN_SIGN) {
            this.state = states.SCRIPT_DATA_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // PLAINTEXT state
    //------------------------------------------------------------------
    public [states.PLAINTEXT_STATE](cp: number): void {
        this.preprocessor.dropParsedChunk();

        if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // Tag open state
    //------------------------------------------------------------------
    public [states.TAG_OPEN_STATE](cp: number): void {
        if (cp === $.EXCLAMATION_MARK) {
            this.state = states.MARKUP_DECLARATION_OPEN_STATE;
        } else if (cp === $.SOLIDUS) {
            this.state = states.END_TAG_OPEN_STATE;
        } else if (isAsciiLetter(cp)) {
            this.createStartTagToken();
            this._reconsumeInState(states.TAG_NAME_STATE);
        } else if (cp === $.QUESTION_MARK) {
            this.err(ERR.unexpectedQuestionMarkInsteadOfTagName);
            this.createCommentToken();
            this._reconsumeInState(states.BOGUS_COMMENT_STATE);
        } else if (cp === $.EOF) {
            this.err(ERR.eofBeforeTagName);
            this._emitChars('<');
            this._emitEOFToken();
        } else {
            this.err(ERR.invalidFirstCharacterOfTagName);
            this._emitChars('<');
            this._reconsumeInState(states.DATA_STATE);
        }
    }

    // End tag open state
    //------------------------------------------------------------------
    public [states.END_TAG_OPEN_STATE](cp: number): void {
        if (isAsciiLetter(cp)) {
            this.createEndTagToken();
            this._reconsumeInState(states.TAG_NAME_STATE);
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.missingEndTagName);
            this.state = states.DATA_STATE;
        } else if (cp === $.EOF) {
            this.err(ERR.eofBeforeTagName);
            this._emitChars('</');
            this._emitEOFToken();
        } else {
            this.err(ERR.invalidFirstCharacterOfTagName);
            this.createCommentToken();
            this._reconsumeInState(states.BOGUS_COMMENT_STATE);
        }
    }

    // Tag name state
    //------------------------------------------------------------------
    public [states.TAG_NAME_STATE](cp: number): void {
        if (this.currentToken?.type !== START_TAG_TOKEN && this.currentToken?.type !== END_TAG_TOKEN) {
            return;
        }
        if (isWhitespace(cp)) {
            this.state = states.BEFORE_ATTRIBUTE_NAME_STATE;
        } else if (cp === $.SOLIDUS) {
            this.state = states.SELF_CLOSING_START_TAG_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (isAsciiUpper(cp)) {
            this.currentToken.tagName += toAsciiLowerChar(cp);
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentToken.tagName += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this.currentToken.tagName += toChar(cp);
        }
    }

    // RCDATA less-than sign state
    //------------------------------------------------------------------
    public [states.RCDATA_LESS_THAN_SIGN_STATE](cp: number): void {
        if (cp === $.SOLIDUS) {
            this.tempBuff = [];
            this.state = states.RCDATA_END_TAG_OPEN_STATE;
        } else {
            this._emitChars('<');
            this._reconsumeInState(states.RCDATA_STATE);
        }
    }

    // RCDATA end tag open state
    //------------------------------------------------------------------
    public [states.RCDATA_END_TAG_OPEN_STATE](cp: number): void {
        if (isAsciiLetter(cp)) {
            this.createEndTagToken();
            this._reconsumeInState(states.RCDATA_END_TAG_NAME_STATE);
        } else {
            this._emitChars('</');
            this._reconsumeInState(states.RCDATA_STATE);
        }
    }

    // RCDATA end tag name state
    //------------------------------------------------------------------
    public [states.RCDATA_END_TAG_NAME_STATE](cp: number): void {
        if (this.currentToken?.type !== END_TAG_TOKEN) {
            return;
        }

        if (isAsciiUpper(cp)) {
            this.currentToken.tagName += toAsciiLowerChar(cp);
            this.tempBuff.push(cp);
        } else if (isAsciiLower(cp)) {
            this.currentToken.tagName += toChar(cp);
            this.tempBuff.push(cp);
        } else {
            if (this.lastStartTagName === this.currentToken.tagName) {
                if (isWhitespace(cp)) {
                    this.state = states.BEFORE_ATTRIBUTE_NAME_STATE;
                    return;
                }

                if (cp === $.SOLIDUS) {
                    this.state = states.SELF_CLOSING_START_TAG_STATE;
                    return;
                }

                if (cp === $.GREATER_THAN_SIGN) {
                    this.state = states.DATA_STATE;
                    this.emitCurrentToken();
                    return;
                }
            }

            this._emitChars('</');
            this._emitSeveralCodePoints(this.tempBuff);
            this._reconsumeInState(states.RCDATA_STATE);
        }
    }

    // RAWTEXT less-than sign state
    //------------------------------------------------------------------
    public [states.RAWTEXT_LESS_THAN_SIGN_STATE](cp: number): void {
        if (cp === $.SOLIDUS) {
            this.tempBuff = [];
            this.state = states.RAWTEXT_END_TAG_OPEN_STATE;
        } else {
            this._emitChars('<');
            this._reconsumeInState(states.RAWTEXT_STATE);
        }
    }

    // RAWTEXT end tag open state
    //------------------------------------------------------------------
    public [states.RAWTEXT_END_TAG_OPEN_STATE](cp: number): void {
        if (isAsciiLetter(cp)) {
            this.createEndTagToken();
            this._reconsumeInState(states.RAWTEXT_END_TAG_NAME_STATE);
        } else {
            this._emitChars('</');
            this._reconsumeInState(states.RAWTEXT_STATE);
        }
    }

    // RAWTEXT end tag name state
    //------------------------------------------------------------------
    public [states.RAWTEXT_END_TAG_NAME_STATE](cp: number): void {
        if (this.currentToken?.type !== END_TAG_TOKEN) {
            return;
        }
        if (isAsciiUpper(cp)) {
            this.currentToken.tagName += toAsciiLowerChar(cp);
            this.tempBuff.push(cp);
        } else if (isAsciiLower(cp)) {
            this.currentToken.tagName += toChar(cp);
            this.tempBuff.push(cp);
        } else {
            if (this.lastStartTagName === this.currentToken.tagName) {
                if (isWhitespace(cp)) {
                    this.state = states.BEFORE_ATTRIBUTE_NAME_STATE;
                    return;
                }

                if (cp === $.SOLIDUS) {
                    this.state = states.SELF_CLOSING_START_TAG_STATE;
                    return;
                }

                if (cp === $.GREATER_THAN_SIGN) {
                    this.emitCurrentToken();
                    this.state = states.DATA_STATE;
                    return;
                }
            }

            this._emitChars('</');
            this._emitSeveralCodePoints(this.tempBuff);
            this._reconsumeInState(states.RAWTEXT_STATE);
        }
    }

    // Script data less-than sign state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_LESS_THAN_SIGN_STATE](cp: number): void {
        if (cp === $.SOLIDUS) {
            this.tempBuff = [];
            this.state = states.SCRIPT_DATA_END_TAG_OPEN_STATE;
        } else if (cp === $.EXCLAMATION_MARK) {
            this.state = states.SCRIPT_DATA_ESCAPE_START_STATE;
            this._emitChars('<!');
        } else {
            this._emitChars('<');
            this._reconsumeInState(states.SCRIPT_DATA_STATE);
        }
    }

    // Script data end tag open state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_END_TAG_OPEN_STATE](cp: number): void {
        if (isAsciiLetter(cp)) {
            this.createEndTagToken();
            this._reconsumeInState(states.SCRIPT_DATA_END_TAG_NAME_STATE);
        } else {
            this._emitChars('</');
            this._reconsumeInState(states.SCRIPT_DATA_STATE);
        }
    }

    // Script data end tag name state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_END_TAG_NAME_STATE](cp: number): void {
        if (this.currentToken?.type !== END_TAG_TOKEN) {
            return;
        }
        if (isAsciiUpper(cp)) {
            this.currentToken.tagName += toAsciiLowerChar(cp);
            this.tempBuff.push(cp);
        } else if (isAsciiLower(cp)) {
            this.currentToken.tagName += toChar(cp);
            this.tempBuff.push(cp);
        } else {
            if (this.lastStartTagName === this.currentToken.tagName) {
                if (isWhitespace(cp)) {
                    this.state = states.BEFORE_ATTRIBUTE_NAME_STATE;
                    return;
                } else if (cp === $.SOLIDUS) {
                    this.state = states.SELF_CLOSING_START_TAG_STATE;
                    return;
                } else if (cp === $.GREATER_THAN_SIGN) {
                    this.emitCurrentToken();
                    this.state = states.DATA_STATE;
                    return;
                }
            }

            this._emitChars('</');
            this._emitSeveralCodePoints(this.tempBuff);
            this._reconsumeInState(states.SCRIPT_DATA_STATE);
        }
    }

    // Script data escape start state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_ESCAPE_START_STATE](cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.SCRIPT_DATA_ESCAPE_START_DASH_STATE;
            this._emitChars('-');
        } else {
            this._reconsumeInState(states.SCRIPT_DATA_STATE);
        }
    }

    // Script data escape start dash state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_ESCAPE_START_DASH_STATE](cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
            this._emitChars('-');
        } else {
            this._reconsumeInState(states.SCRIPT_DATA_STATE);
        }
    }

    // Script data escaped state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_ESCAPED_STATE](cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.SCRIPT_DATA_ESCAPED_DASH_STATE;
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = states.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this.err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // Script data escaped dash state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_ESCAPED_DASH_STATE](cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = states.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.state = states.SCRIPT_DATA_ESCAPED_STATE;
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this.err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this.state = states.SCRIPT_DATA_ESCAPED_STATE;
            this._emitCodePoint(cp);
        }
    }

    // Script data escaped dash dash state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_ESCAPED_DASH_DASH_STATE](cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = states.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = states.SCRIPT_DATA_STATE;
            this._emitChars('>');
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.state = states.SCRIPT_DATA_ESCAPED_STATE;
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this.err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this.state = states.SCRIPT_DATA_ESCAPED_STATE;
            this._emitCodePoint(cp);
        }
    }

    // Script data escaped less-than sign state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE](cp: number): void {
        if (cp === $.SOLIDUS) {
            this.tempBuff = [];
            this.state = states.SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE;
        } else if (isAsciiLetter(cp)) {
            this.tempBuff = [];
            this._emitChars('<');
            this._reconsumeInState(states.SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE);
        } else {
            this._emitChars('<');
            this._reconsumeInState(states.SCRIPT_DATA_ESCAPED_STATE);
        }
    }

    // Script data escaped end tag open state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE](cp: number): void {
        if (isAsciiLetter(cp)) {
            this.createEndTagToken();
            this._reconsumeInState(states.SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE);
        } else {
            this._emitChars('</');
            this._reconsumeInState(states.SCRIPT_DATA_ESCAPED_STATE);
        }
    }

    // Script data escaped end tag name state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE](cp: number): void {
        if (this.currentToken?.type !== END_TAG_TOKEN) {
            return;
        }
        if (isAsciiUpper(cp)) {
            this.currentToken.tagName += toAsciiLowerChar(cp);
            this.tempBuff.push(cp);
        } else if (isAsciiLower(cp)) {
            this.currentToken.tagName += toChar(cp);
            this.tempBuff.push(cp);
        } else {
            if (this.lastStartTagName === this.currentToken.tagName) {
                if (isWhitespace(cp)) {
                    this.state = states.BEFORE_ATTRIBUTE_NAME_STATE;
                    return;
                }

                if (cp === $.SOLIDUS) {
                    this.state = states.SELF_CLOSING_START_TAG_STATE;
                    return;
                }

                if (cp === $.GREATER_THAN_SIGN) {
                    this.emitCurrentToken();
                    this.state = states.DATA_STATE;
                    return;
                }
            }

            this._emitChars('</');
            this._emitSeveralCodePoints(this.tempBuff);
            this._reconsumeInState(states.SCRIPT_DATA_ESCAPED_STATE);
        }
    }

    // Script data double escape start state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE](cp: number): void {
        if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN) {
            this.state = this._isTempBufferEqualToScriptString()
                ? states.SCRIPT_DATA_DOUBLE_ESCAPED_STATE
                : states.SCRIPT_DATA_ESCAPED_STATE;
            this._emitCodePoint(cp);
        } else if (isAsciiUpper(cp)) {
            this.tempBuff.push(toAsciiLowerCodePoint(cp));
            this._emitCodePoint(cp);
        } else if (isAsciiLower(cp)) {
            this.tempBuff.push(cp);
            this._emitCodePoint(cp);
        } else {
            this._reconsumeInState(states.SCRIPT_DATA_ESCAPED_STATE);
        }
    }

    // Script data double escaped state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_DOUBLE_ESCAPED_STATE](cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE;
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = states.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
            this._emitChars('<');
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this.err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // Script data double escaped dash state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE](cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE;
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = states.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
            this._emitChars('<');
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.state = states.SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this.err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this.state = states.SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
            this._emitCodePoint(cp);
        }
    }

    // Script data double escaped dash dash state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE](cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = states.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
            this._emitChars('<');
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = states.SCRIPT_DATA_STATE;
            this._emitChars('>');
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.state = states.SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this.err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this.state = states.SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
            this._emitCodePoint(cp);
        }
    }

    // Script data double escaped less-than sign state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE](cp: number): void {
        if (cp === $.SOLIDUS) {
            this.tempBuff = [];
            this.state = states.SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE;
            this._emitChars('/');
        } else {
            this._reconsumeInState(states.SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
        }
    }

    // Script data double escape end state
    //------------------------------------------------------------------
    public [states.SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE](cp: number): void {
        if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN) {
            this.state = this._isTempBufferEqualToScriptString()
                ? states.SCRIPT_DATA_ESCAPED_STATE
                : states.SCRIPT_DATA_DOUBLE_ESCAPED_STATE;

            this._emitCodePoint(cp);
        } else if (isAsciiUpper(cp)) {
            this.tempBuff.push(toAsciiLowerCodePoint(cp));
            this._emitCodePoint(cp);
        } else if (isAsciiLower(cp)) {
            this.tempBuff.push(cp);
            this._emitCodePoint(cp);
        } else {
            this._reconsumeInState(states.SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
        }
    }

    // Before attribute name state
    //------------------------------------------------------------------
    public [states.BEFORE_ATTRIBUTE_NAME_STATE](cp: number): void {
        if (isWhitespace(cp)) {
            return;
        }

        if (cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN || cp === $.EOF) {
            this._reconsumeInState(states.AFTER_ATTRIBUTE_NAME_STATE);
        } else if (cp === $.EQUALS_SIGN) {
            this.err(ERR.unexpectedEqualsSignBeforeAttributeName);
            this.createAttr('=');
            this.state = states.ATTRIBUTE_NAME_STATE;
        } else {
            this.createAttr('');
            this._reconsumeInState(states.ATTRIBUTE_NAME_STATE);
        }
    }

    // Attribute name state
    //------------------------------------------------------------------
    public [states.ATTRIBUTE_NAME_STATE](cp: number): void {
        if (!this.currentAttr) {
            return;
        }
        if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN || cp === $.EOF) {
            this.leaveAttrName(states.AFTER_ATTRIBUTE_NAME_STATE);
            this._unconsume();
        } else if (cp === $.EQUALS_SIGN) {
            this.leaveAttrName(states.BEFORE_ATTRIBUTE_VALUE_STATE);
        } else if (isAsciiUpper(cp)) {
            this.currentAttr.name += toAsciiLowerChar(cp);
        } else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN) {
            this.err(ERR.unexpectedCharacterInAttributeName);
            this.currentAttr.name += toChar(cp);
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentAttr.name += unicode.REPLACEMENT_CHARACTER;
        } else {
            this.currentAttr.name += toChar(cp);
        }
    }

    // After attribute name state
    //------------------------------------------------------------------
    public [states.AFTER_ATTRIBUTE_NAME_STATE](cp: number): void {
        if (isWhitespace(cp)) {
            return;
        }

        if (cp === $.SOLIDUS) {
            this.state = states.SELF_CLOSING_START_TAG_STATE;
        } else if (cp === $.EQUALS_SIGN) {
            this.state = states.BEFORE_ATTRIBUTE_VALUE_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.EOF) {
            this.err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this.createAttr('');
            this._reconsumeInState(states.ATTRIBUTE_NAME_STATE);
        }
    }

    // Before attribute value state
    //------------------------------------------------------------------
    public [states.BEFORE_ATTRIBUTE_VALUE_STATE](cp: number): void {
        if (isWhitespace(cp)) {
            return;
        }

        if (cp === $.QUOTATION_MARK) {
            this.state = states.ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this.state = states.ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.missingAttributeValue);
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else {
            this._reconsumeInState(states.ATTRIBUTE_VALUE_UNQUOTED_STATE);
        }
    }

    // Attribute value (double-quoted) state
    //------------------------------------------------------------------
    public [states.ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE](cp: number): void {
        if (!this.currentAttr) {
            return;
        }
        if (cp === $.QUOTATION_MARK) {
            this.state = states.AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;
        } else if (cp === $.AMPERSAND) {
            this.returnState = states.ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE;
            this.state = states.CHARACTER_REFERENCE_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentAttr.value += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this.currentAttr.value += toChar(cp);
        }
    }

    // Attribute value (single-quoted) state
    //------------------------------------------------------------------
    public [states.ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE](cp: number): void {
        if (!this.currentAttr) {
            return;
        }
        if (cp === $.APOSTROPHE) {
            this.state = states.AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;
        } else if (cp === $.AMPERSAND) {
            this.returnState = states.ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE;
            this.state = states.CHARACTER_REFERENCE_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentAttr.value += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this.currentAttr.value += toChar(cp);
        }
    }

    // Attribute value (unquoted) state
    //------------------------------------------------------------------
    public [states.ATTRIBUTE_VALUE_UNQUOTED_STATE](cp: number): void {
        if (!this.currentAttr) {
            return;
        }
        if (isWhitespace(cp)) {
            this.leaveAttrValue(states.BEFORE_ATTRIBUTE_NAME_STATE);
        } else if (cp === $.AMPERSAND) {
            this.returnState = states.ATTRIBUTE_VALUE_UNQUOTED_STATE;
            this.state = states.CHARACTER_REFERENCE_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.leaveAttrValue(states.DATA_STATE);
            this.emitCurrentToken();
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentAttr.value += unicode.REPLACEMENT_CHARACTER;
        } else if (
            cp === $.QUOTATION_MARK ||
            cp === $.APOSTROPHE ||
            cp === $.LESS_THAN_SIGN ||
            cp === $.EQUALS_SIGN ||
            cp === $.GRAVE_ACCENT
        ) {
            this.err(ERR.unexpectedCharacterInUnquotedAttributeValue);
            this.currentAttr.value += toChar(cp);
        } else if (cp === $.EOF) {
            this.err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this.currentAttr.value += toChar(cp);
        }
    }

    // After attribute value (quoted) state
    //------------------------------------------------------------------
    public [states.AFTER_ATTRIBUTE_VALUE_QUOTED_STATE](cp: number): void {
        if (isWhitespace(cp)) {
            this.leaveAttrValue(states.BEFORE_ATTRIBUTE_NAME_STATE);
        } else if (cp === $.SOLIDUS) {
            this.leaveAttrValue(states.SELF_CLOSING_START_TAG_STATE);
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.leaveAttrValue(states.DATA_STATE);
            this.emitCurrentToken();
        } else if (cp === $.EOF) {
            this.err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this.err(ERR.missingWhitespaceBetweenAttributes);
            this._reconsumeInState(states.BEFORE_ATTRIBUTE_NAME_STATE);
        }
    }

    // Self-closing start tag state
    //------------------------------------------------------------------
    public [states.SELF_CLOSING_START_TAG_STATE](cp: number): void {
        if (this.currentToken?.type !== START_TAG_TOKEN && this.currentToken?.type !== END_TAG_TOKEN) {
            return;
        }
        if (cp === $.GREATER_THAN_SIGN) {
            this.currentToken.selfClosing = true;
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.EOF) {
            this.err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this.err(ERR.unexpectedSolidusInTag);
            this._reconsumeInState(states.BEFORE_ATTRIBUTE_NAME_STATE);
        }
    }

    // Bogus comment state
    //------------------------------------------------------------------
    public [states.BOGUS_COMMENT_STATE](cp: number): void {
        if (this.currentToken?.type !== COMMENT_TOKEN) {
            return;
        }
        if (cp === $.GREATER_THAN_SIGN) {
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.EOF) {
            this.emitCurrentToken();
            this._emitEOFToken();
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentToken.data += unicode.REPLACEMENT_CHARACTER;
        } else {
            this.currentToken.data += toChar(cp);
        }
    }

    // Markup declaration open state
    //------------------------------------------------------------------
    public [states.MARKUP_DECLARATION_OPEN_STATE](cp: number): void {
        if (this._consumeSequenceIfMatch($$.DASH_DASH_STRING, cp, true)) {
            this.createCommentToken();
            this.state = states.COMMENT_START_STATE;
        } else if (this._consumeSequenceIfMatch($$.DOCTYPE_STRING, cp, false)) {
            this.state = states.DOCTYPE_STATE;
        } else if (this._consumeSequenceIfMatch($$.CDATA_START_STRING, cp, true)) {
            if (this.allowCDATA) {
                this.state = states.CDATA_SECTION_STATE;
            } else {
                this.err(ERR.cdataInHtmlContent);
                this.createCommentToken();
                (this.currentToken as CommentToken).data = '[CDATA[';
                this.state = states.BOGUS_COMMENT_STATE;
            }
        }

        //NOTE: sequence lookup can be abrupted by hibernation. In that case lookup
        //results are no longer valid and we will need to start over.
        else if (!this._ensureHibernation()) {
            this.err(ERR.incorrectlyOpenedComment);
            this.createCommentToken();
            this._reconsumeInState(states.BOGUS_COMMENT_STATE);
        }
    }

    // Comment start state
    //------------------------------------------------------------------
    public [states.COMMENT_START_STATE](cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.COMMENT_START_DASH_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.abruptClosingOfEmptyComment);
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else {
            this._reconsumeInState(states.COMMENT_STATE);
        }
    }

    // Comment start dash state
    //------------------------------------------------------------------
    public [states.COMMENT_START_DASH_STATE](cp: number): void {
        if (this.currentToken?.type !== COMMENT_TOKEN) {
            return;
        }
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.COMMENT_END_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.abruptClosingOfEmptyComment);
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.EOF) {
            this.err(ERR.eofInComment);
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.data += '-';
            this._reconsumeInState(states.COMMENT_STATE);
        }
    }

    // Comment state
    //------------------------------------------------------------------
    public [states.COMMENT_STATE](cp: number): void {
        if (this.currentToken?.type !== COMMENT_TOKEN) {
            return;
        }
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.COMMENT_END_DASH_STATE;
        } else if (cp === $.LESS_THAN_SIGN) {
            this.currentToken.data += '<';
            this.state = states.COMMENT_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentToken.data += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInComment);
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.data += toChar(cp);
        }
    }

    // Comment less-than sign state
    //------------------------------------------------------------------
    public [states.COMMENT_LESS_THAN_SIGN_STATE](cp: number): void {
        if (this.currentToken?.type !== COMMENT_TOKEN) {
            return;
        }
        if (cp === $.EXCLAMATION_MARK) {
            this.currentToken.data += '!';
            this.state = states.COMMENT_LESS_THAN_SIGN_BANG_STATE;
        } else if (cp === $.LESS_THAN_SIGN) {
            this.currentToken.data += '<';
        } else {
            this._reconsumeInState(states.COMMENT_STATE);
        }
    }

    // Comment less-than sign bang state
    //------------------------------------------------------------------
    public [states.COMMENT_LESS_THAN_SIGN_BANG_STATE](cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE;
        } else {
            this._reconsumeInState(states.COMMENT_STATE);
        }
    }

    // Comment less-than sign bang dash state
    //------------------------------------------------------------------
    public [states.COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE](cp: number): void {
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE;
        } else {
            this._reconsumeInState(states.COMMENT_END_DASH_STATE);
        }
    }

    // Comment less-than sign bang dash dash state
    //------------------------------------------------------------------
    public [states.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE](cp: number): void {
        if (cp !== $.GREATER_THAN_SIGN && cp !== $.EOF) {
            this.err(ERR.nestedComment);
        }

        this._reconsumeInState(states.COMMENT_END_STATE);
    }

    // Comment end dash state
    //------------------------------------------------------------------
    public [states.COMMENT_END_DASH_STATE](cp: number): void {
        if (this.currentToken?.type !== COMMENT_TOKEN) {
            return;
        }
        if (cp === $.HYPHEN_MINUS) {
            this.state = states.COMMENT_END_STATE;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInComment);
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.data += '-';
            this._reconsumeInState(states.COMMENT_STATE);
        }
    }

    // Comment end state
    //------------------------------------------------------------------
    public [states.COMMENT_END_STATE](cp: number): void {
        if (this.currentToken?.type !== COMMENT_TOKEN) {
            return;
        }
        if (cp === $.GREATER_THAN_SIGN) {
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.EXCLAMATION_MARK) {
            this.state = states.COMMENT_END_BANG_STATE;
        } else if (cp === $.HYPHEN_MINUS) {
            this.currentToken.data += '-';
        } else if (cp === $.EOF) {
            this.err(ERR.eofInComment);
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.data += '--';
            this._reconsumeInState(states.COMMENT_STATE);
        }
    }

    // Comment end bang state
    //------------------------------------------------------------------
    public [states.COMMENT_END_BANG_STATE](cp: number): void {
        if (this.currentToken?.type !== COMMENT_TOKEN) {
            return;
        }
        if (cp === $.HYPHEN_MINUS) {
            this.currentToken.data += '--!';
            this.state = states.COMMENT_END_DASH_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.incorrectlyClosedComment);
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.EOF) {
            this.err(ERR.eofInComment);
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.data += '--!';
            this._reconsumeInState(states.COMMENT_STATE);
        }
    }

    // DOCTYPE state
    //------------------------------------------------------------------
    public [states.DOCTYPE_STATE](cp: number): void {
        if (isWhitespace(cp)) {
            this.state = states.BEFORE_DOCTYPE_NAME_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._reconsumeInState(states.BEFORE_DOCTYPE_NAME_STATE);
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.createDoctypeToken(null);
            (this.currentToken as unknown as DocTypeToken).forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.err(ERR.missingWhitespaceBeforeDoctypeName);
            this._reconsumeInState(states.BEFORE_DOCTYPE_NAME_STATE);
        }
    }

    // Before DOCTYPE name state
    //------------------------------------------------------------------
    public [states.BEFORE_DOCTYPE_NAME_STATE](cp: number): void {
        if (isWhitespace(cp)) {
            return;
        }

        if (isAsciiUpper(cp)) {
            this.createDoctypeToken(toAsciiLowerChar(cp));
            this.state = states.DOCTYPE_NAME_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.createDoctypeToken(unicode.REPLACEMENT_CHARACTER);
            this.state = states.DOCTYPE_NAME_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.missingDoctypeName);
            this.createDoctypeToken(null);
            (this.currentToken as DocTypeToken).forceQuirks = true;
            this.emitCurrentToken();
            this.state = states.DATA_STATE;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.createDoctypeToken(null);
            (this.currentToken as DocTypeToken).forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.createDoctypeToken(toChar(cp));
            this.state = states.DOCTYPE_NAME_STATE;
        }
    }

    // DOCTYPE name state
    //------------------------------------------------------------------
    public [states.DOCTYPE_NAME_STATE](cp: number): void {
        if (this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }
        if (isWhitespace(cp)) {
            this.state = states.AFTER_DOCTYPE_NAME_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (isAsciiUpper(cp)) {
            this.currentToken.name += toAsciiLowerChar(cp);
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentToken.name += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.name += toChar(cp);
        }
    }

    // After DOCTYPE name state
    //------------------------------------------------------------------
    public [states.AFTER_DOCTYPE_NAME_STATE](cp: number): void {
        if (isWhitespace(cp) || this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }

        if (cp === $.GREATER_THAN_SIGN) {
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else if (this._consumeSequenceIfMatch($$.PUBLIC_STRING, cp, false)) {
            this.state = states.AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE;
        } else if (this._consumeSequenceIfMatch($$.SYSTEM_STRING, cp, false)) {
            this.state = states.AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE;
        }
        //NOTE: sequence lookup can be abrupted by hibernation. In that case lookup
        //results are no longer valid and we will need to start over.
        else if (!this._ensureHibernation()) {
            this.err(ERR.invalidCharacterSequenceAfterDoctypeName);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(states.BOGUS_DOCTYPE_STATE);
        }
    }

    // After DOCTYPE public keyword state
    //------------------------------------------------------------------
    public [states.AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE](cp: number): void {
        if (this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }
        if (isWhitespace(cp)) {
            this.state = states.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE;
        } else if (cp === $.QUOTATION_MARK) {
            this.err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
            this.currentToken.publicId = '';
            this.state = states.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this.err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
            this.currentToken.publicId = '';
            this.state = states.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.missingDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(states.BOGUS_DOCTYPE_STATE);
        }
    }

    // Before DOCTYPE public identifier state
    //------------------------------------------------------------------
    public [states.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE](cp: number): void {
        if (isWhitespace(cp) || this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }

        if (cp === $.QUOTATION_MARK) {
            this.currentToken.publicId = '';
            this.state = states.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this.currentToken.publicId = '';
            this.state = states.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.missingDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(states.BOGUS_DOCTYPE_STATE);
        }
    }

    // DOCTYPE public identifier (double-quoted) state
    //------------------------------------------------------------------
    public [states.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE](cp: number): void {
        if (this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }
        if (cp === $.QUOTATION_MARK) {
            this.state = states.AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentToken.publicId += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.abruptDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this.state = states.DATA_STATE;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.publicId += toChar(cp);
        }
    }

    // DOCTYPE public identifier (single-quoted) state
    //------------------------------------------------------------------
    public [states.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE](cp: number): void {
        if (this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }
        if (cp === $.APOSTROPHE) {
            this.state = states.AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentToken.publicId += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.abruptDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this.state = states.DATA_STATE;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.publicId += toChar(cp);
        }
    }

    // After DOCTYPE public identifier state
    //------------------------------------------------------------------
    public [states.AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE](cp: number): void {
        if (this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }
        if (isWhitespace(cp)) {
            this.state = states.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.QUOTATION_MARK) {
            this.err(ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
            this.currentToken.systemId = '';
            this.state = states.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this.err(ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
            this.currentToken.systemId = '';
            this.state = states.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(states.BOGUS_DOCTYPE_STATE);
        }
    }

    // Between DOCTYPE public and system identifiers state
    //------------------------------------------------------------------
    public [states.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE](cp: number): void {
        if (isWhitespace(cp) || this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }

        if (cp === $.GREATER_THAN_SIGN) {
            this.emitCurrentToken();
            this.state = states.DATA_STATE;
        } else if (cp === $.QUOTATION_MARK) {
            this.currentToken.systemId = '';
            this.state = states.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this.currentToken.systemId = '';
            this.state = states.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(states.BOGUS_DOCTYPE_STATE);
        }
    }

    // After DOCTYPE system keyword state
    //------------------------------------------------------------------
    public [states.AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE](cp: number): void {
        if (this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }
        if (isWhitespace(cp)) {
            this.state = states.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE;
        } else if (cp === $.QUOTATION_MARK) {
            this.err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
            this.currentToken.systemId = '';
            this.state = states.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this.err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
            this.currentToken.systemId = '';
            this.state = states.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.missingDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(states.BOGUS_DOCTYPE_STATE);
        }
    }

    // Before DOCTYPE system identifier state
    //------------------------------------------------------------------
    public [states.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE](cp: number): void {
        if (isWhitespace(cp) || this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }

        if (cp === $.QUOTATION_MARK) {
            this.currentToken.systemId = '';
            this.state = states.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this.currentToken.systemId = '';
            this.state = states.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.missingDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this.state = states.DATA_STATE;
            this.emitCurrentToken();
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(states.BOGUS_DOCTYPE_STATE);
        }
    }

    // DOCTYPE system identifier (double-quoted) state
    //------------------------------------------------------------------
    public [states.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE](cp: number): void {
        if (this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }
        if (cp === $.QUOTATION_MARK) {
            this.state = states.AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentToken.systemId += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.abruptDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this.state = states.DATA_STATE;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.systemId += toChar(cp);
        }
    }

    // DOCTYPE system identifier (single-quoted) state
    //------------------------------------------------------------------
    public [states.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE](cp: number): void {
        if (this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }
        if (cp === $.APOSTROPHE) {
            this.state = states.AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
            this.currentToken.systemId += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.err(ERR.abruptDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this.state = states.DATA_STATE;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.systemId += toChar(cp);
        }
    }

    // After DOCTYPE system identifier state
    //------------------------------------------------------------------
    public [states.AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE](cp: number): void {
        if (isWhitespace(cp) || this.currentToken?.type !== DOCTYPE_TOKEN) {
            return;
        }

        if (cp === $.GREATER_THAN_SIGN) {
            this.emitCurrentToken();
            this.state = states.DATA_STATE;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this.emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.err(ERR.unexpectedCharacterAfterDoctypeSystemIdentifier);
            this._reconsumeInState(states.BOGUS_DOCTYPE_STATE);
        }
    }

    // Bogus DOCTYPE state
    //------------------------------------------------------------------
    public [states.BOGUS_DOCTYPE_STATE](cp: number): void {
        if (cp === $.GREATER_THAN_SIGN) {
            this.emitCurrentToken();
            this.state = states.DATA_STATE;
        } else if (cp === $.NULL) {
            this.err(ERR.unexpectedNullCharacter);
        } else if (cp === $.EOF) {
            this.emitCurrentToken();
            this._emitEOFToken();
        }
    }

    // CDATA section state
    //------------------------------------------------------------------
    public [states.CDATA_SECTION_STATE](cp: number): void {
        if (cp === $.RIGHT_SQUARE_BRACKET) {
            this.state = states.CDATA_SECTION_BRACKET_STATE;
        } else if (cp === $.EOF) {
            this.err(ERR.eofInCdata);
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // CDATA section bracket state
    //------------------------------------------------------------------
    public [states.CDATA_SECTION_BRACKET_STATE](cp: number): void {
        if (cp === $.RIGHT_SQUARE_BRACKET) {
            this.state = states.CDATA_SECTION_END_STATE;
        } else {
            this._emitChars(']');
            this._reconsumeInState(states.CDATA_SECTION_STATE);
        }
    }

    // CDATA section end state
    //------------------------------------------------------------------
    public [states.CDATA_SECTION_END_STATE](cp: number): void {
        if (cp === $.GREATER_THAN_SIGN) {
            this.state = states.DATA_STATE;
        } else if (cp === $.RIGHT_SQUARE_BRACKET) {
            this._emitChars(']');
        } else {
            this._emitChars(']]');
            this._reconsumeInState(states.CDATA_SECTION_STATE);
        }
    }

    // Character reference state
    //------------------------------------------------------------------
    public [states.CHARACTER_REFERENCE_STATE](cp: number): void {
        this.tempBuff = [$.AMPERSAND];

        if (cp === $.NUMBER_SIGN) {
            this.tempBuff.push(cp);
            this.state = states.NUMERIC_CHARACTER_REFERENCE_STATE;
        } else if (isAsciiAlphaNumeric(cp)) {
            this._reconsumeInState(states.NAMED_CHARACTER_REFERENCE_STATE);
        } else {
            this._flushCodePointsConsumedAsCharacterReference();
            this._reconsumeInState(this.returnState);
        }
    }

    // Named character reference state
    //------------------------------------------------------------------
    public [states.NAMED_CHARACTER_REFERENCE_STATE](cp: number): void {
        const matchResult = this._matchNamedCharacterReference(cp);

        //NOTE: matching can be abrupted by hibernation. In that case match
        //results are no longer valid and we will need to start over.
        if (this._ensureHibernation()) {
            this.tempBuff = [$.AMPERSAND];
        } else if (matchResult) {
            const withSemicolon = this.tempBuff[this.tempBuff.length - 1] === $.SEMICOLON;

            if (!this._isCharacterReferenceAttributeQuirk(withSemicolon)) {
                if (!withSemicolon) {
                    this._errOnNextCodePoint(ERR.missingSemicolonAfterCharacterReference);
                }

                this.tempBuff = matchResult;
            }

            this._flushCodePointsConsumedAsCharacterReference();
            this.state = this.returnState;
        } else {
            this._flushCodePointsConsumedAsCharacterReference();
            this.state = states.AMBIGUOUS_AMPERSAND_STATE;
        }
    }

    // Ambiguos ampersand state
    //------------------------------------------------------------------
    public [states.AMBIGUOUS_AMPERSAND_STATE](cp: number): void {
        if (isAsciiAlphaNumeric(cp)) {
            if (this._isCharacterReferenceInAttribute()) {
                if (this.currentAttr) {
                    this.currentAttr.value += toChar(cp);
                }
            } else {
                this._emitCodePoint(cp);
            }
        } else {
            if (cp === $.SEMICOLON) {
                this.err(ERR.unknownNamedCharacterReference);
            }

            this._reconsumeInState(this.returnState);
        }
    }

    // Numeric character reference state
    //------------------------------------------------------------------
    public [states.NUMERIC_CHARACTER_REFERENCE_STATE](cp: number): void {
        this.charRefCode = 0;

        if (cp === $.LATIN_SMALL_X || cp === $.LATIN_CAPITAL_X) {
            this.tempBuff.push(cp);
            this.state = states.HEXADEMICAL_CHARACTER_REFERENCE_START_STATE;
        } else {
            this._reconsumeInState(states.DECIMAL_CHARACTER_REFERENCE_START_STATE);
        }
    }

    // Hexademical character reference start state
    //------------------------------------------------------------------
    public [states.HEXADEMICAL_CHARACTER_REFERENCE_START_STATE](cp: number): void {
        if (isAsciiHexDigit(cp)) {
            this._reconsumeInState(states.HEXADEMICAL_CHARACTER_REFERENCE_STATE);
        } else {
            this.err(ERR.absenceOfDigitsInNumericCharacterReference);
            this._flushCodePointsConsumedAsCharacterReference();
            this._reconsumeInState(this.returnState);
        }
    }

    // Decimal character reference start state
    //------------------------------------------------------------------
    public [states.DECIMAL_CHARACTER_REFERENCE_START_STATE](cp: number): void {
        if (isAsciiDigit(cp)) {
            this._reconsumeInState(states.DECIMAL_CHARACTER_REFERENCE_STATE);
        } else {
            this.err(ERR.absenceOfDigitsInNumericCharacterReference);
            this._flushCodePointsConsumedAsCharacterReference();
            this._reconsumeInState(this.returnState);
        }
    }

    // Hexademical character reference state
    //------------------------------------------------------------------
    public [states.HEXADEMICAL_CHARACTER_REFERENCE_STATE](cp: number): void {
        if (isAsciiUpperHexDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x37;
        } else if (isAsciiLowerHexDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x57;
        } else if (isAsciiDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x30;
        } else if (cp === $.SEMICOLON) {
            this.state = states.NUMERIC_CHARACTER_REFERENCE_END_STATE;
        } else {
            this.err(ERR.missingSemicolonAfterCharacterReference);
            this._reconsumeInState(states.NUMERIC_CHARACTER_REFERENCE_END_STATE);
        }
    }

    // Decimal character reference state
    //------------------------------------------------------------------
    public [states.DECIMAL_CHARACTER_REFERENCE_STATE](cp: number): void {
        if (isAsciiDigit(cp)) {
            this.charRefCode = this.charRefCode * 10 + cp - 0x30;
        } else if (cp === $.SEMICOLON) {
            this.state = states.NUMERIC_CHARACTER_REFERENCE_END_STATE;
        } else {
            this.err(ERR.missingSemicolonAfterCharacterReference);
            this._reconsumeInState(states.NUMERIC_CHARACTER_REFERENCE_END_STATE);
        }
    }

    // Numeric character reference end state
    //------------------------------------------------------------------
    public [states.NUMERIC_CHARACTER_REFERENCE_END_STATE](): void {
        if (this.charRefCode === $.NULL) {
            this.err(ERR.nullCharacterReference);
            this.charRefCode = $.REPLACEMENT_CHARACTER;
        } else if (this.charRefCode > 0x10ffff) {
            this.err(ERR.characterReferenceOutsideUnicodeRange);
            this.charRefCode = $.REPLACEMENT_CHARACTER;
        } else if (unicode.isSurrogate(this.charRefCode)) {
            this.err(ERR.surrogateCharacterReference);
            this.charRefCode = $.REPLACEMENT_CHARACTER;
        } else if (unicode.isUndefinedCodePoint(this.charRefCode)) {
            this.err(ERR.noncharacterCharacterReference);
        } else if (unicode.isControlCodePoint(this.charRefCode) || this.charRefCode === $.CARRIAGE_RETURN) {
            this.err(ERR.controlCharacterReference);

            const replacement = C1_CONTROLS_REFERENCE_REPLACEMENTS[this.charRefCode];

            if (replacement) {
                this.charRefCode = replacement;
            }
        }

        this.tempBuff = [this.charRefCode];

        this._flushCodePointsConsumedAsCharacterReference();
        this._reconsumeInState(this.returnState);
    }
}
