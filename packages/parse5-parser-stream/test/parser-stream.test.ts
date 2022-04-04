import * as assert from 'node:assert';
import { ParserStream } from '../lib/index.js';
import { generateParsingTests } from 'parse5-test-utils/utils/generate-parsing-tests.js';
import { parseChunked } from './utils/parse-chunked.js';
import { finished } from 'parse5-test-utils/utils/common.js';

generateParsingTests(
    'ParserStream',
    'ParserStream',
    {
        expectErrors: [
            //TODO(GH-448): Foreign content behaviour was updated in the HTML spec.
            //The old test suite still tests the old behaviour.
            '269.foreign-fragment',
            '270.foreign-fragment',
            '307.foreign-fragment',
            '309.foreign-fragment',
            '316.foreign-fragment',
            '317.foreign-fragment',
        ],
    },
    (test, opts) => parseChunked(test, opts)
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
