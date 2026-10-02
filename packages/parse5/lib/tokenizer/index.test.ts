import { it, assert, describe } from 'vitest';
import { Tokenizer, type Token } from 'parse5';
import { generateTokenizationTests } from 'parse5-test-utils/utils/generate-tokenization-tests.js';

const dataPath = new URL('../../../../test/data/html5lib-tests/tokenizer', import.meta.url);
const tokenizerOpts = {
    sourceCodeLocationInfo: true,
};

generateTokenizationTests('Tokenizer', dataPath.pathname, (handler) => new Tokenizer(tokenizerOpts, handler));

function noop(): void {
    // Noop
}

describe('Tokenizer methods', () => {
    it('keeps flushed CDATA character ranges ordered across a character-group boundary', () => {
        const tokens: Token.CharacterToken[] = [];
        const tokenizer = new Tokenizer(tokenizerOpts, {
            onCharacter: (token): void => {
                tokens.push(token);
            },
            onWhitespaceCharacter: (token): void => {
                tokens.push(token);
            },
            onNullCharacter: noop,
            onComment: noop,
            onDoctype: noop,
            onStartTag: noop,
            onEndTag: noop,
            onEof: noop,
        });
        tokenizer.inForeignNode = true;
        tokenizer.preprocessor.bufferWaterline = 8;
        tokenizer.write('<![CDATA[ ]]]', false);
        tokenizer.flushCharacters();
        assert.deepEqual(
            tokens.map(({ chars, location }) => ({ chars, location })),
            [
                {
                    chars: ' ',
                    location: { startLine: 1, startCol: 1, startOffset: 0, endLine: 1, endCol: 11, endOffset: 10 },
                },
                {
                    chars: ']',
                    location: { startLine: 1, startCol: 11, startOffset: 10, endLine: 1, endCol: 12, endOffset: 11 },
                },
            ],
        );
        tokenizer.write('>', true);
    });

    it('should pause and resume', () => {
        let count = 0;
        const tokenizer = new Tokenizer(tokenizerOpts, {
            onComment(t): void {
                assert.strictEqual(t.data, 'INIT');
                assert.strictEqual(count++, 0);

                tokenizer.pause();
                tokenizer.write('<!doctype foo>', false);
            },
            onDoctype(t): void {
                assert.strictEqual(t.name, 'foo');
                assert.strictEqual(count++, 2);

                assert.throws(() => tokenizer.resume(), 'Parser was already resumed');
                tokenizer.write('<next>', true);
            },
            onStartTag(t): void {
                assert.strictEqual(count++, 3);
                assert.strictEqual(t.tagName, 'next');
            },
            onEndTag: noop,
            onEof: noop,
            onCharacter: noop,
            onNullCharacter: noop,
            onWhitespaceCharacter: noop,
        });

        tokenizer.write('<!--INIT-->', false);
        assert.strictEqual(count++, 1);
        assert.ok(Object.prototype.hasOwnProperty.call(tokenizer, 'paused'));
        assert.equal((tokenizer as typeof tokenizer & { paused: boolean }).paused, true);

        tokenizer.resume();

        assert.strictEqual(count, 4);
    });

    it('should throw if setting the state to an unknown value', () => {
        const tokenizer = new Tokenizer(tokenizerOpts, {} as never);
        tokenizer.state = -1 as never;
        assert.throws(() => tokenizer.write('foo', true), 'Unknown state');
    });
});
