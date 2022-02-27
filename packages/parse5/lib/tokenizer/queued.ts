import { TokenType, Token, CharacterToken, DoctypeToken, TagToken, EOFToken, CommentToken } from '../common/token.js';
import { TokenHandler, Tokenizer, TokenizerOptions, TokenizerMode } from './index.js';
import type { ParserErrorHandler } from '../common/error-codes.js';
import type { Preprocessor } from './preprocessor.js';

const HIBERNATION_TOKEN: Token = { type: TokenType.HIBERNATION, location: null };

/** A token handler implemnetation that calls the same function for all tokens. */
export abstract class SinglePathHandler implements TokenHandler {
    protected abstract handleToken(token: Token): void;

    onComment(token: CommentToken): void {
        this.handleToken(token);
    }
    onDoctype(token: DoctypeToken): void {
        this.handleToken(token);
    }
    onStartTag(token: TagToken): void {
        this.handleToken(token);
    }
    onEndTag(token: TagToken): void {
        this.handleToken(token);
    }
    onEof(token: EOFToken): void {
        this.handleToken(token);
    }
    onCharacter(token: CharacterToken): void {
        this.handleToken(token);
    }
    onNullCharacter(token: CharacterToken): void {
        this.handleToken(token);
    }
    onWhitespaceCharacter(token: CharacterToken): void {
        this.handleToken(token);
    }
}

class QueuedHandler extends SinglePathHandler {
    private tokenQueue: Token[] = [];

    protected handleToken(token: Token): void {
        this.tokenQueue.push(token);
    }

    constructor(public onParseError: ParserErrorHandler | null) {
        super();
    }

    public getNextToken(tokenizer: Tokenizer): Token {
        while (this.tokenQueue.length === 0 && tokenizer.active) {
            tokenizer.getNextToken();
        }

        if (this.tokenQueue.length === 0 && !tokenizer.active) {
            this.tokenQueue.push(HIBERNATION_TOKEN);
        }

        return this.tokenQueue.shift()!;
    }
}

export interface QueuedTokenizerOptions extends TokenizerOptions {
    onParseError?: ParserErrorHandler | null;
}

/**
 * Provides the same interface as the old tokenizer, while allowing users to
 * read data one token at a time.
 */
export class QueuedTokenizer {
    private tokenizer: Tokenizer;
    private handler: QueuedHandler;

    constructor(options: QueuedTokenizerOptions) {
        this.handler = new QueuedHandler(options.onParseError ?? null);
        this.tokenizer = new Tokenizer(options, this.handler);
    }

    set allowCDATA(val: boolean) {
        this.tokenizer.allowCDATA = val;
    }

    get preprocessor(): Preprocessor {
        return this.tokenizer.preprocessor;
    }
    get active(): boolean {
        return this.tokenizer.active;
    }

    set state(val: typeof TokenizerMode[keyof typeof TokenizerMode]) {
        this.tokenizer.state = val;
    }

    public write(chunk: string, isLastChunk: boolean): void {
        this.tokenizer.write(chunk, isLastChunk);
    }

    public insertHtmlAtCurrentPos(str: string): void {
        this.tokenizer.insertHtmlAtCurrentPos(str);
    }

    public getNextToken(): Token {
        return this.handler.getNextToken(this.tokenizer);
    }
}
