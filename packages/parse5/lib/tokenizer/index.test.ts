import { Tokenizer } from 'parse5';
import { generateTokenizationTests } from 'parse5-test-utils/utils/generate-tokenization-tests.js';
import * as assert from 'node:assert';

const dataPath = new URL('../../../../test/data/html5lib-tests/tokenizer', import.meta.url);
const tokenizerOpts = {
    sourceCodeLocationInfo: true,
};

generateTokenizationTests('Tokenizer', dataPath.pathname, (handler) => new Tokenizer(tokenizerOpts, handler));

function noop(): void {
    // Noop
}

describe('Tokenizer methods', () => {
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

                expect(() => tokenizer.resume()).toThrow('Parser was already resumed');
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
        expect(tokenizer).toHaveProperty('paused', true);

        tokenizer.resume();

        assert.strictEqual(count, 4);
    });

    it('should throw if setting the state to an unknown value', () => {
        const tokenizer = new Tokenizer(tokenizerOpts, {} as any);
        tokenizer.state = -1 as never;
        expect(() => tokenizer.write('foo', true)).toThrow('Unknown state');
    });
});
