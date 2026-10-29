import { it, assert, describe } from 'vitest';
import * as fs from 'node:fs';
import type { SAXParserOptions } from '../lib/index.js';
import { SAXParser } from '../lib/index.js';
import { loadSAXParserTestData } from 'parse5-test-utils/utils/load-sax-parser-test-data.js';
import {
    finished,
    getStringDiffMsg,
    writeChunkedToStream,
    removeNewLines,
    WritableStreamStub,
} from 'parse5-test-utils/utils/common.js';

function sanitizeForComparison(str: string): string {
    return removeNewLines(str).replace(/\s/g, '').replace(/'/g, '"').toLowerCase();
}

function createBasicTest(html: string, expected: string, options?: SAXParserOptions) {
    return async function (): Promise<void> {
        //NOTE: the idea of the test is to serialize back given HTML using SAXParser handlers
        let actual = '';
        const parser = new SAXParser(options);

        parser.on('doctype', ({ name, publicId, systemId }) => {
            actual += `<!DOCTYPE ${name}`;

            if (publicId !== null) {
                actual += ` PUBLIC "${publicId}"`;
            } else if (systemId !== null) {
                actual += ' SYSTEM';
            }

            if (systemId !== null) {
                actual += ` "${systemId}"`;
            }

            actual += '>';
        });

        parser.on('startTag', ({ tagName, attrs, selfClosing }) => {
            actual += `<${tagName}`;
            for (const attr of attrs) {
                actual += ` ${attr.name}="${attr.value}"`;
            }
            actual += selfClosing ? '/>' : '>';
        });

        parser.on('endTag', ({ tagName }) => {
            actual += `</${tagName}>`;
        });

        parser.on('text', ({ text }) => {
            actual += text;
        });

        parser.on('comment', ({ text }) => {
            actual += `<!--${text}-->`;
        });

        writeChunkedToStream(html, parser);

        await finished(parser);

        expected = sanitizeForComparison(expected);
        actual = sanitizeForComparison(actual);

        //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
        assert.ok(actual === expected, getStringDiffMsg(actual, expected));
    };
}

const hugePage = new URL('../../../test/data/huge-page/huge-page.html', import.meta.url);

describe('SAX parser', () => {
    //Basic tests
    for (const [idx, data] of loadSAXParserTestData().entries())
        it(`${idx + 1}.${data.name}`, createBasicTest(data.src, data.expected));

    it('Piping and .stop()', async () => {
        const parser = new SAXParser();
        const writable = new WritableStreamStub();
        let handlerCallCount = 0;

        function handler(): void {
            handlerCallCount++;

            if (handlerCallCount === 10) {
                parser.stop();
            }
        }

        fs.createReadStream(hugePage, 'utf8').pipe(parser).pipe(writable);

        parser.on('startTag', handler);
        parser.on('endTag', handler);
        parser.on('doctype', handler);
        parser.on('comment', handler);
        parser.on('text', handler);

        await finished(writable);

        const expected = fs.readFileSync(hugePage).toString();

        assert.strictEqual(handlerCallCount, 10);
        assert.strictEqual(writable.writtenData, expected);
    });

    it('Parser silently exits on big files (GH-97)', () => {
        const parser = new SAXParser();

        fs.createReadStream(hugePage, 'utf8').pipe(parser);

        //NOTE: This is a smoke test - in case of regression it will fail with timeout.
        return finished(parser);
    });

    it('Last text chunk must be flushed (GH-271)', async () => {
        const parser = new SAXParser();
        let foundText = false;

        parser.on('text', ({ text }) => {
            foundText = true;
            assert.strictEqual(text, 'text');
        });

        parser.write('text');
        parser.end();

        await finished(parser);

        assert.ok(foundText);
    });

    it('Should not accept binary input (GH-269)', () => {
        const stream = new SAXParser();
        const buf = Buffer.from('test');

        assert.throws(() => stream.write(buf), TypeError);
    });

    it('Should treat NULL characters as normal text', async () => {
        const parser = new SAXParser();
        let foundText = false;

        parser.on('text', ({ text }) => {
            foundText = true;
            assert.strictEqual(text, '\0');
        });

        parser.write('\0');
        parser.end();

        await finished(parser);

        assert.strictEqual(foundText, true);
    });
});

it.each([
    ['data', '', 'a'.repeat(16_384)],
    ['style', '<style>', 'a'.repeat(16_384)],
    ['script', '<script>', 'a'.repeat(16_384)],
    ['textarea', '<textarea>', 'a'.repeat(16_384)],
    ['plaintext', '<plaintext>', 'a'.repeat(16_384)],
    ['chunks ending in a surrogate pair', '', `${'a'.repeat(16_382)}\u{1F600}`],
])('flushes uninterrupted text before EOF: %s', async (_label, prefix, chunk) => {
    const parser = new SAXParser({ sourceCodeLocationInfo: true });
    const input = prefix + chunk.repeat(16);
    let text = '';
    let end = prefix.length;
    parser.on('text', (token) => {
        assert.equal(token.sourceCodeLocation!.startOffset, end);
        end = token.sourceCodeLocation!.endOffset;
        assert.equal(token.sourceCodeLocation!.endCol, end + 1);
        text += token.text;
    });
    parser.write(prefix);
    for (let i = 0; i < 16; i++) parser.write(chunk);
    assert.isAtLeast(text.length, chunk.length * 12);
    parser.end();
    await finished(parser);
    assert.equal(text, chunk.repeat(16));
    assert.equal(end, input.length);
});

it.each([
    ['a CDATA end delimiter', '<svg><![CDATA[', `${'a'.repeat(16_382)}]]`],
    ['a character reference', '', `${'a'.repeat(16_380)}&not`],
    ['a less-than sign in escaped script data', '<script><!--', `${'a'.repeat(16_383)}<`],
    ['an ambiguous ampersand', '&q', 'a'.repeat(16_384)],
])('flushes text before EOF when every chunk ends in %s', async (_label, prefix, chunk) => {
    const parser = new SAXParser({ sourceCodeLocationInfo: true });
    const input = prefix + chunk.repeat(16);
    let length = 0;
    let end = -1;
    parser.on('text', ({ text, sourceCodeLocation }) => {
        const { startOffset, endOffset, endCol } = sourceCodeLocation!;
        if (end !== -1) assert.equal(startOffset, end);
        // Each event covers exactly the source of its text, without the delimiter or reference that follows.
        assert.equal(text, input.slice(startOffset, endOffset).replace('<![CDATA[', '').replaceAll('&not', '¬'));
        assert.equal(endCol, endOffset + 1);
        end = endOffset;
        length += text.length;
    });
    parser.write(prefix);
    for (let i = 0; i < 16; i++) parser.write(chunk);
    assert.isAtLeast(length, chunk.length * 12);
    parser.end();
    await finished(parser);
    assert.equal(end, input.length);
});

it('adds no replacement character after flushed null characters in foreign content', async () => {
    const parser = new SAXParser();
    let actual = '';
    parser.on('text', (token) => {
        actual += token.text;
    });
    parser.write(`<svg>${'\0'.repeat(70_000)}`);
    parser.end('x');
    await finished(parser);
    // The null-character token becomes one replacement character; the empty token that follows the flush adds none.
    assert.equal(actual, '\uFFFDx');
});

it.each([
    ['svg', '<svg/>'],
    ['math', '<math/>'],
    ['repeated svg', '<svg/><svg/><svg/>'],
    ['svg inside math', '<math><svg/></math>'],
])('leaves the namespace of a self-closing %s root', async (_name, prefix) => {
    const parser = new SAXParser();
    const events: string[] = [];
    parser.on('comment', ({ text }) => events.push(`comment:${text}`));
    parser.on('text', ({ text }) => events.push(`text:${text}`));
    parser.end(`${prefix}<![CDATA[x]]>`);
    await finished(parser);
    // Back in HTML content, a CDATA section is a bogus comment rather than text.
    assert.deepEqual(events, ['comment:[CDATA[x]]']);
});

it.each([
    [
        'after the end tag of an annotation-xml integration point',
        '<math><annotation-xml encoding="text/html"></annotation-xml>',
    ],
    ['in desc inside svg inside math', '<math><svg><desc>'],
    ['in mglyph inside mi', '<math><mi><mglyph>'],
])('tokenizes MathML content %s', async (_name, prefix) => {
    const parser = new SAXParser();
    const events: string[] = [];
    parser.on('comment', ({ text }) => events.push(`comment:${text}`));
    parser.on('text', ({ text }) => events.push(`text:${text}`));
    parser.end(`${prefix}<![CDATA[x]]>`);
    await finished(parser);
    // In MathML content, a CDATA section is text, as tree construction sees it.
    assert.deepEqual(events, ['text:x']);
});

it.each([
    ['mo end tag inside mi', '<math><mi></mo>'],
    ['mi end tag inside annotation-xml', '<math><annotation-xml encoding="text/html"></mi>'],
    [
        'end tag of a nested HTML annotation-xml',
        '<math><annotation-xml encoding="text/html"><annotation-xml></annotation-xml>',
    ],
    ['p end tag in svg inside mi', '<math><mi><svg></p>'],
])("keeps an HTML integration-point frame open for another element's end tag: %s", async (_name, prefix) => {
    const parser = new SAXParser();
    const events: string[] = [];
    parser.on('comment', ({ text }) => events.push(`comment:${text}`));
    parser.on('text', ({ text }) => events.push(`text:${text}`));
    parser.end(`${prefix}<![CDATA[x]]>`);
    await finished(parser);
    // Tree construction ignores a stray end tag or closes the nested element with it, so the CDATA section is still a
    // bogus comment in HTML content.
    assert.deepEqual(events, ['comment:[CDATA[x]]']);
});

it('only skips the first newline after pre, even when whitespace is flushed', async () => {
    const parser = new SAXParser();
    let text = '';
    parser.on('text', (token) => {
        text += token.text;
    });
    parser.write(`<pre>${' '.repeat(70_000)}`);
    // The whitespace is flushed before the newline arrives.
    assert.equal(text.length, 70_000);
    parser.end('\ntext');
    await finished(parser);
    assert.equal(text, `${' '.repeat(70_000)}\ntext`);
});
