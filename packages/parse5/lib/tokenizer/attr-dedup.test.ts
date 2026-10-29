import { describe, it, assert } from 'vitest';
import { Tokenizer, type TokenHandler } from './index.js';
import {
    type TagToken,
    type CommentToken,
    type DoctypeToken,
    type CharacterToken,
    type EOFToken,
} from '../common/token.js';
import { type ParserError, ERR } from '../common/error-codes.js';

class AttrCollector implements TokenHandler {
    startTags: TagToken[] = [];
    endTags: TagToken[] = [];
    errors: ParserError[] = [];

    onStartTag(token: TagToken): void {
        this.startTags.push({ ...token, attrs: [...token.attrs] });
    }

    onEndTag(token: TagToken): void {
        this.endTags.push({ ...token, attrs: [...token.attrs] });
    }

    onParseError = (error: ParserError): void => {
        this.errors.push(error);
    };

    onComment(_token: CommentToken): void {}
    onDoctype(_token: DoctypeToken): void {}
    onCharacter(_token: CharacterToken): void {}
    onNullCharacter(_token: CharacterToken): void {}
    onWhitespaceCharacter(_token: CharacterToken): void {}
    onEof(_token: EOFToken): void {}
}

function tokenize(chunks: string[]): AttrCollector {
    const handler = new AttrCollector();
    const tokenizer = new Tokenizer({}, handler);

    for (let i = 0; i < chunks.length; i++) {
        tokenizer.write(chunks[i], i === chunks.length - 1);
    }

    return handler;
}

describe('Attribute deduplication (Tokenizer)', () => {
    it('keeps the first duplicate attribute and reports a duplicate-attribute error', () => {
        const { startTags, errors } = tokenize(['<div a="1" a="2" b="3" a="4">']);

        assert.deepStrictEqual(startTags[0]?.attrs, [
            { name: 'a', value: '1' },
            { name: 'b', value: '3' },
        ]);
        assert.strictEqual(errors.filter((e) => e.code === ERR.duplicateAttribute).length, 2);
    });

    it('detects duplicate attribute names case-insensitively', () => {
        const { startTags, errors } = tokenize(['<div A="1" a="2">']);

        assert.deepStrictEqual(startTags[0]?.attrs, [{ name: 'a', value: '1' }]);
        assert.strictEqual(errors.filter((e) => e.code === ERR.duplicateAttribute).length, 1);
    });

    it('resets attribute name tracking for every start and end tag', () => {
        const { startTags, endTags, errors } = tokenize(['<div a="1"><span a="2" a="3"></span></div a="9">']);

        assert.deepStrictEqual(startTags[0]?.attrs, [{ name: 'a', value: '1' }]);
        assert.deepStrictEqual(startTags[1]?.attrs, [{ name: 'a', value: '2' }]);
        assert.deepStrictEqual(endTags[0]?.attrs, []);
        assert.deepStrictEqual(endTags[1]?.attrs, [{ name: 'a', value: '9' }]);
        assert.strictEqual(errors.filter((e) => e.code === ERR.duplicateAttribute).length, 1);
    });

    it('detects duplicates across chunk boundaries (hibernation)', () => {
        const { startTags, errors } = tokenize(['<div a="1" a', '="2" b="3"', '>']);

        assert.deepStrictEqual(startTags[0]?.attrs, [
            { name: 'a', value: '1' },
            { name: 'b', value: '3' },
        ]);
        assert.strictEqual(errors.filter((e) => e.code === ERR.duplicateAttribute).length, 1);
    });

    it('detects duplicates when a tag spans chunk boundaries', () => {
        const { startTags, errors } = tokenize(['<div a="1"><s', 'pan a="2" a="3">']);

        assert.deepStrictEqual(startTags[1]?.attrs, [{ name: 'a', value: '2' }]);
        assert.strictEqual(errors.filter((e) => e.code === ERR.duplicateAttribute).length, 1);
    });
});
