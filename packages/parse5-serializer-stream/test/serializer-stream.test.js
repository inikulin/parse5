'use strict';

const SerializerStream = require('../lib');
const generateSeriliazerTests = require('../../../test/utils/generate-serializer-tests');
const { WritableStreamStub } = require('../../../test/utils/common');

generateSeriliazerTests(exports, 'SeriliazerStream', (document, opts) => {
    const stream = new SerializerStream(document, opts);
    const writable = new WritableStreamStub();

    stream.pipe(writable);

    return new Promise(resolve => {
        writable.once('finish', () => resolve(writable.writtenData));
    });
});
