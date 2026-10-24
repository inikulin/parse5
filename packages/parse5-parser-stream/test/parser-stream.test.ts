import { it, assert, describe } from 'vitest';
import { ParserStream } from '../lib/index.js';
import { generateParsingTests } from 'parse5-test-utils/utils/generate-parsing-tests.js';
import { parseChunked } from './utils/parse-chunked.js';
import { finished } from 'parse5-test-utils/utils/common.js';
import type { DefaultTreeAdapterTypes } from 'parse5';

type Element = DefaultTreeAdapterTypes.Element;

generateParsingTests(
    'ParserStream',
    'ParserStream',
    {
        expectErrors: [
            //TODO(GH-448): Foreign content behaviour was updated in the HTML spec.
            //The old test suite still tests the old behaviour.
            '0.foreign-fragment',
            '1.foreign-fragment',
            '38.foreign-fragment',
            '40.foreign-fragment',
            '47.foreign-fragment',
            '48.foreign-fragment',
        ],
    },
    (test, opts) => parseChunked(test, opts),
);

describe('ParserStream', () => {
    it('Fix empty stream parsing with ParserStream (GH-196)', async () => {
        const parser = new ParserStream();

        parser.end();

        await finished(parser);

        assert.ok(parser.document.childNodes.length > 0);
    });

    it('Should not accept binary input (GH-269)', () => {
        const stream = new ParserStream();
        const buf = Buffer.from('test');

        assert.throws(() => stream.write(buf), TypeError);
    });

    it.each([
        ['merges <html> attributes against the names a script left', 0, '<html a=3 c=3>', 'c=1 b=2 a=3'],
        // Pins the default adapter's documented limit: a name a script gives an entry is missed, so it is appended again.
        ['appends a name a script gave an <html> attribute again', 1, '<html c=3>', 'a=1 c=2 c=3'],
    ])('%s', async (_name, renamed, tail, expected) => {
        const parser = new ParserStream();

        parser.on('script', (_scriptElement, _documentWrite, resume) => {
            (parser.document.childNodes[0] as Element).attrs[renamed].name = 'c';
            resume();
        });
        parser.end(`<html a=1><html b=2><script></script>${tail}`);

        await finished(parser);

        const { attrs } = parser.document.childNodes[0] as Element;
        assert.strictEqual(attrs.map(({ name, value }) => `${name}=${value}`).join(' '), expected);
    });
});
