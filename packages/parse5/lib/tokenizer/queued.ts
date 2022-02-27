import { Token, CharacterToken, DoctypeToken, TagToken, EOFToken, CommentToken } from '../common/token.js';
import { TokenHandler } from './index.js';

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
