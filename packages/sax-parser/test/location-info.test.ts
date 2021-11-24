import * as assert from 'node:assert';
import { SAXParser } from '../lib/index.js';
import { loadSAXParserTestData } from '../../../test/utils/load-sax-parser-test-data.js';
import { writeChunkedToStream } from '../../../test/utils/common.js';
import type { Location } from '@parse5/parse5/lib/common/token';

function handler({ sourceCodeLocation }: { sourceCodeLocation: Location }) {
    assert.strictEqual(typeof sourceCodeLocation.startLine, 'number');
    assert.strictEqual(typeof sourceCodeLocation.startCol, 'number');
    assert.strictEqual(typeof sourceCodeLocation.startOffset, 'number');
    assert.strictEqual(typeof sourceCodeLocation.endOffset, 'number');
    assert.ok(sourceCodeLocation.startOffset < sourceCodeLocation.endOffset);
}

describe('location-info', () => {
    it('Location info (SAX)', () => {
        for (const test of loadSAXParserTestData()) {
            //NOTE: we've already tested the correctness of the location info with the Tokenizer tests.
            //So here we just check that SAXParser provides this info in the handlers.
            const parser = new SAXParser({ sourceCodeLocationInfo: true });

            parser.on('startTag', handler);
            parser.on('endTag', handler);
            parser.on('doctype', handler);
            parser.on('comment', handler);
            parser.on('text', handler);

            writeChunkedToStream(test.src, parser);
        }
    });

    it('Regression - location info for text (GH-153, GH-266)', () => {
        const html = '<!DOCTYPE html><html><head><title>Here is a title</title></html>';
        const parser = new SAXParser({ sourceCodeLocationInfo: true });

        parser.on('text', ({ sourceCodeLocation }) => {
            assert.deepStrictEqual(sourceCodeLocation, {
                startLine: 1,
                startCol: 35,
                startOffset: 34,
                endLine: 1,
                endCol: 50,
                endOffset: 49,
            });
        });

        parser.end(html);
    });
});