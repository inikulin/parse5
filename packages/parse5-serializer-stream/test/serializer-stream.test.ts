import { SerializerStream } from '../lib/index.js';
import { generateSerializerTests } from 'parse5-test-utils/utils/generate-serializer-tests.js';
import { WritableStreamStub } from 'parse5-test-utils/utils/common.js';

generateSerializerTests('SerializerStream', 'SerializerStream', (document, opts) => {
    const stream = new SerializerStream(document, opts);
    const writable = new WritableStreamStub();

    stream.pipe(writable);

    return new Promise((resolve) => {
        writable.once('finish', () => resolve(writable.writtenData));
    });
});
