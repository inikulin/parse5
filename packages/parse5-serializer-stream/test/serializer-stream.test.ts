import { SerializerStream } from '../lib/index.js';
import { generateSerializerTests } from '../../../test/utils/generate-serializer-tests.js';
import { WritableStreamStub } from '../../../test/utils/common.js';

generateSerializerTests('SerializerStream', 'SerializerStream', (document: any, opts: any) => {
    const stream = new SerializerStream(document, opts);
    const writable = new WritableStreamStub();

    stream.pipe(writable);

    return new Promise((resolve) => {
        writable.once('finish', () => resolve(writable.writtenData));
    });
});
