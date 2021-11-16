export enum TokenType {
    CHARACTER = 'CHARACTER_TOKEN',
    NULL_CHARACTER = 'NULL_CHARACTER_TOKEN',
    WHITESPACE_CHARACTER = 'WHITESPACE_CHARACTER_TOKEN',
    START_TAG = 'START_TAG_TOKEN',
    END_TAG = 'END_TAG_TOKEN',
    COMMENT = 'COMMENT_TOKEN',
    DOCTYPE = 'DOCTYPE_TOKEN',
    EOF = 'EOF_TOKEN',
    HIBERNATION = 'HIBERNATION_TOKEN',
}

interface StartLocation {
    startLine: number;
    startCol: number;
    startOffset: number;
}

interface EndLocation {
    endLine: number;
    endCol: number;
    endOffset: number;
}

export interface Location extends StartLocation, EndLocation {}

export interface LocationWithAttributes extends Location {
    attrs: Record<string, Location>;
}

interface TokenBase {
    readonly type: TokenType;
    location?: Location;
}

export interface DoctypeToken extends TokenBase {
    readonly type: TokenType.DOCTYPE;
    name: string | null;
    forceQuirks: boolean;
    publicId: string | null;
    systemId: string | null;
}

export interface Attribute {
    /** The name of the attribute. */
    name: string;
    /** The namespace of the attribute. */
    namespace?: string;
    /** The namespace-related prefix of the attribute. */
    prefix?: string;
    /** The value of the attribute. */
    value: string;
}

export interface TagToken extends TokenBase {
    readonly type: TokenType.START_TAG | TokenType.END_TAG;
    tagName: string;
    selfClosing: boolean;
    ackSelfClosing: boolean;
    attrs: Attribute[];
    location?: LocationWithAttributes;
}

export interface CommentToken extends TokenBase {
    readonly type: TokenType.COMMENT;
    data: string;
}

export interface EOFToken extends TokenBase {
    readonly type: TokenType.EOF;
}

interface HibernationToken extends TokenBase {
    readonly type: TokenType.HIBERNATION;
}

export interface CharacterToken extends TokenBase {
    type: TokenType.CHARACTER | TokenType.NULL_CHARACTER | TokenType.WHITESPACE_CHARACTER;
    chars: string;
}

export type Token = DoctypeToken | TagToken | CommentToken | EOFToken | HibernationToken | CharacterToken;
