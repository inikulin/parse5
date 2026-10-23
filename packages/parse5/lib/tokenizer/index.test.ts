import { it, assert, describe } from 'vitest';
import { Tokenizer, TokenizerMode, type Token } from 'parse5';
import { generateTokenizationTests } from 'parse5-test-utils/utils/generate-tokenization-tests.js';

const dataPath = new URL('../../../../test/data/html5lib-tests/tokenizer', import.meta.url);
const tokenizerOpts = {
    sourceCodeLocationInfo: true,
};

generateTokenizationTests('Tokenizer', dataPath.pathname, (handler) => new Tokenizer(tokenizerOpts, handler));

function noop(): void {
    // Noop
}

/** Every token as text, with attributes as `name=value`, to compare tokenizations of the same input. */
function tokenize(chunks: string[], foreign = false, opts = tokenizerOpts): string[] {
    const tokens: string[] = [];
    const tokenizer = new Tokenizer(opts, {
        onStartTag(t): void {
            tokens.push(`<${t.tagName} ${t.attrs.map(({ name, value }) => `${name}=${value}`).join(' ')}>`);
            // The tree builder switches the state for these elements.
            if (t.tagName === 'textarea') tokenizer.state = TokenizerMode.RCDATA;
            if (t.tagName === 'script') tokenizer.state = TokenizerMode.SCRIPT_DATA;
        },
        onEndTag(t): void {
            tokens.push(`</${t.tagName}>`);
        },
        onCharacter(t): void {
            tokens.push(`c:${t.chars}`);
        },
        onWhitespaceCharacter(t): void {
            tokens.push(`w:${t.chars}`);
        },
        onNullCharacter(t): void {
            tokens.push(`n:${t.chars}`);
        },
        onComment(t): void {
            tokens.push(`#${t.data}`);
        },
        onDoctype: noop,
        onEof: noop,
    });
    tokenizer.inForeignNode = foreign;
    for (const [i, chunk] of chunks.entries()) {
        tokenizer.write(chunk, i === chunks.length - 1);
    }
    return tokens;
}

function chunked(input: string, size: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < input.length; i += size) chunks.push(input.slice(i, i + size));
    return chunks;
}

describe('Tokenizer methods', () => {
    // TODO: upstream to html5lib-tests
    it('should keep long attribute values and character runs exact', () => {
        const long = 'x'.repeat(40_000);
        const values: string[] = [];
        let chars = '';
        const tokenizer = new Tokenizer(tokenizerOpts, {
            onStartTag(t): void {
                values.push(...t.attrs.map(({ value }) => value));
            },
            onCharacter(t): void {
                chars += t.chars;
            },
            onComment: noop,
            onDoctype: noop,
            onEndTag: noop,
            onEof: noop,
            onNullCharacter: noop,
            onWhitespaceCharacter: noop,
        });

        tokenizer.write(`<p title="${long}&am`, false);
        tokenizer.write(`p;${long}" id=${long} id=${long}discarded end=ok>${long}&l`, false);
        tokenizer.write(`t;${long}</p>`, true);

        assert.deepStrictEqual(values, [`${long}&${long}`, long, 'ok']);
        assert.strictEqual(chars, `${long}<${long}`);
    });

    // TODO: upstream to html5lib-tests
    it.each([false, true])(
        'should append lookahead text that precedes a dropped chunk (locations: %s)',
        (locations) => {
            // Without locations, the token switch drops the parsed chunk before the lookahead text is appended.
            const whitespace = ' '.repeat(65_537);
            const opts = { sourceCodeLocationInfo: locations };

            assert.deepStrictEqual(tokenize([`${whitespace}<<x>`], false, opts), [`w:${whitespace}`, 'c:<', '<x >']);
            assert.deepStrictEqual(tokenize([`${whitespace}<![CDATA[]]]>x`], true, opts), [`w:${whitespace}`, 'c:]x']);
        },
    );

    it('should keep the text apart from a tag or comment that is being built', () => {
        const values: string[] = [];
        const comments: string[] = [];
        let chars = '';
        const tokenizer = new Tokenizer(tokenizerOpts, {
            onStartTag(t): void {
                values.push(...t.attrs.map(({ value }) => value));
            },
            onCharacter(t): void {
                chars += t.chars;
            },
            onComment(t): void {
                comments.push(t.data);
            },
            onDoctype: noop,
            onEndTag: noop,
            onEof: noop,
            onNullCharacter: noop,
            onWhitespaceCharacter: noop,
        });

        // A flush inside a value or comment, and EOF inside a value, must not move their text into the character token.
        tokenizer.write('abc<p x="de', false);
        tokenizer.flushCharacters();
        tokenizer.write('f"><!--gh', false);
        tokenizer.flushCharacters();
        tokenizer.write('i--><q y="jkl', true);

        assert.strictEqual(chars, 'abc');
        assert.deepStrictEqual(values, ['def']);
        assert.deepStrictEqual(comments, ['ghi']);
    });

    // TODO: upstream the whole-input expectations to html5lib-tests
    it('should tokenize transformed input the same in any chunking', () => {
        // Every way the emitted text differs from the input, and the text emitted after looking ahead.
        const input = [
            'a\r\nb\rc\n\r\rd \u0000 e&amp;f&NotEqualTilde;g&bogus;h&#x3b;i\uD83D\uDE00j&#x1F600;k\uDE00l',
            '<p title="a\r\nb\rc\u0000d&amp;e&bogus;f&#x3b;g\uD83D\uDE00h&#x1F600;" x=a&b\r\nc\u0000d>',
            '<textarea>a<b</c>d</textarea><script>a<!--b<!x</scr>c-d--e-->f</script><!--c\u0000d-->',
            '<![CDATA[a]b]]c]]]]>d',
            '<textarea>a<\uD83D\uDE00</\uD83D\uDE00b</textarea><script>c<!--d-\uD83D\uDE00--\uD83D\uDE00</\uD83D\uDE00-->e</script>',
        ].join('');
        const whole = tokenize([input], true);

        assert.deepStrictEqual(whole, [
            'c:a',
            'w:\n',
            'c:b',
            'w:\n',
            'c:c',
            'w:\n\n\n',
            'c:d',
            'w: ',
            'n:\u0000',
            'w: ',
            'c:e&f\u2242\u0338g&bogus;h;i\uD83D\uDE00j\uD83D\uDE00k\uDE00l',
            '<p title=a\nb\nc\uFFFDd&e&bogus;f;g\uD83D\uDE00h\uD83D\uDE00 x=a&b c\uFFFDd=>',
            '<textarea >',
            'c:a<b</c>d',
            '</textarea>',
            '<script >',
            'c:a<!--b<!x</scr>c-d--e-->f',
            '</script>',
            '#c\uFFFDd',
            'c:a]b]]c]]d',
            '<textarea >',
            'c:a<\uD83D\uDE00</\uD83D\uDE00b',
            '</textarea>',
            '<script >',
            'c:c<!--d-\uD83D\uDE00--\uD83D\uDE00</\uD83D\uDE00-->e',
            '</script>',
        ]);
        for (const size of [1, 2, 3, 5, 7, 11, 64]) {
            assert.deepStrictEqual(tokenize(chunked(input, size), true), whole, `chunk size ${size}`);
        }
    });

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
