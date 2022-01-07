import assert from 'node:assert';
import { ParserStream } from '../lib/index.js';
import { generateParsingTests } from '../../../test/utils/generate-parsing-tests.js';
import { parseChunked } from './utils/parse-chunked.js';

generateParsingTests('ParserStream', 'ParserStream', { skipFragments: true }, (test, opts) =>
    parseChunked(test.input, opts)
);

suite('ParserStream', () => {
    test('Fix empty stream parsing with ParserStream (GH-196)', (done) => {
        const parser = new ParserStream().once('finish', () => {
            assert(parser.document.childNodes.length > 0);
            done();
        });

        parser.end();
    });

    test('Should not accept binary input (GH-269)', () => {
        const stream = new ParserStream();
        const buf = Buffer.from('test');

        assert.throws(() => stream.write(buf), TypeError);
    });
});
