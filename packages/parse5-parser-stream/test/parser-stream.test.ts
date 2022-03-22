import * as assert from 'node:assert';
import { ParserStream } from '../lib/index.js';
import { generateParsingTests } from 'parse5-test-utils/utils/generate-parsing-tests.js';
import { parseChunked } from './utils/parse-chunked.js';
import { finished } from 'parse5-test-utils/utils/common.js';

generateParsingTests('ParserStream', 'ParserStream', { skipFragments: true }, (test, opts) =>
    parseChunked(test.input, opts)
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
});
