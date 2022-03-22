import { SerializerStream } from '../lib/index.js';
import { generateSerializerTests } from 'parse5-test-utils/utils/generate-serializer-tests.js';
import { WritableStreamStub } from 'parse5-test-utils/utils/common.js';
import { finished } from 'parse5-test-utils/utils/common.js';

generateSerializerTests('SerializerStream', 'SerializerStream', async (document, opts) => {
    const stream = new SerializerStream(document, opts);
    const writable = new WritableStreamStub();

    stream.pipe(writable);

    await finished(writable);

    return writable.writtenData;
});
