import * as assert from 'node:assert';
import { ParserStream } from '../lib/index.js';
import { generateParsingTests } from 'parse5-test-utils/utils/generate-parsing-tests.js';
import { parseChunked } from './utils/parse-chunked.js';

generateParsingTests('ParserStream', 'ParserStream', { skipFragments: true }, (test, opts) =>
    parseChunked(test.input, opts)
);

describe('ParserStream', () => {
    it('Fix empty stream parsing with ParserStream (GH-196)', (done) => {
        const parser = new ParserStream().once('finish', () => {
            assert.ok(parser.document.childNodes.length > 0);
            done();
        });

        parser.end();
    });

    it('Should not accept binary input (GH-269)', () => {
        const stream = new ParserStream();
        const buf = Buffer.from('test');

        assert.throws(() => stream.write(buf), TypeError);
    });
});
