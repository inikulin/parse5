import { ParserStream } from '../../lib/index.js';
import { makeChunks } from '../../../../test/utils/common.js';

export function parseChunked(html, opts, minChunkSize, maxChunkSize) {
    const parserStream = new ParserStream(opts);
    const chunks = makeChunks(html, minChunkSize, maxChunkSize);

    // NOTE: set small waterline for testing purposes
    parserStream.parser.tokenizer.preprocessor.bufferWaterline = 8;

    for (let i = 0; i < chunks.length - 1; i++) {
        if (typeof chunks[i] !== 'string') {
            throw new TypeError('Expected chunk to be a string');
        }
        parserStream.write(chunks[i]);
    }

    parserStream.end(chunks[chunks.length - 1]);

    return {
        node: parserStream.document,
        chunks,
    };
}
