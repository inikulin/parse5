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

export interface DoctypeToken {
    type: TokenType.DOCTYPE;
    name: string | null;
    forceQuirks: boolean;
    publicId: string | null;
    systemId: string | null;
}

export interface Attribute {
    name: string;
    value: string;
    prefix?: string;
    namespace?: string;
}

export interface TagToken {
    type: TokenType.START_TAG | TokenType.END_TAG;
    tagName: string;
    selfClosing: boolean;
    ackSelfClosing: boolean;
    attrs: Attribute[];
}

export interface CommentToken {
    type: TokenType.COMMENT;
    data: string;
}

interface EOFToken {
    type: TokenType.EOF;
}

interface HibernationToken {
    type: TokenType.HIBERNATION;
}

export interface CharacterToken {
    type: TokenType.CHARACTER | TokenType.NULL_CHARACTER | TokenType.WHITESPACE_CHARACTER;
    chars: string;
}

export type Token = DoctypeToken | TagToken | CommentToken | EOFToken | HibernationToken | CharacterToken;
