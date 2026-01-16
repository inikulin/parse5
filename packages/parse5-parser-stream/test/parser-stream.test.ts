import { it, assert, describe } from 'vitest';
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
            '0.foreign-fragment',
            '1.foreign-fragment',
            '38.foreign-fragment',
            '40.foreign-fragment',
            '47.foreign-fragment',
            '48.foreign-fragment',
            // Select parsing was relaxed in the HTML spec.
            // https://github.com/whatwg/html/pull/10548
            // The forked test suite still tests the old behaviour.
            '13.menuitem-element',
            '29.tests1',
            '101.tests1',
            '3.tests10',
            '4.tests10',
            '16.tests10',
            '17.tests10',
            '4.tests9',
            '5.tests9',
            '17.tests9',
            '18.tests9',
            '13.tests18',
            '14.tests18',
            '17.webkit02',
            '30.tests7',
            '79.tests_innerHTML_1',
            '80.tests_innerHTML_1',
            '81.tests_innerHTML_1',
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
});
