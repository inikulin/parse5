'use strict';

const { Writable } = require('stream');
const assert = require('assert');

const treeAdapters = {
    default: require('../../packages/parse5/lib/tree-adapters/default'),
    htmlparser2: require('../../packages/parse5-htmlparser2-tree-adapter/lib')
};

function addSlashes(str) {
    return str
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/\f/g, '\\f')
        .replace(/\r/g, '\\r')
        .replace(/\0/g, '\\u0000');
}

function createDiffMarker(markerPosition) {
    let marker = '';

    for (let i = 0; i < markerPosition - 1; i++) {
        marker += ' ';
    }

    return marker + '^\n';
}

function getRandomChunkSize(min, max) {
    const MIN = 1;
    const MAX = 10;

    min = min || MIN;
    max = max || MAX;

    return min + Math.floor(Math.random() * (max - min + 1));
}

function makeChunks(str, minSize, maxSize) {
    if (!str.length) {
        return [''];
    }

    const chunks = [];
    let start = 0;

    // NOTE: add 1 as well, so we avoid situation when we have just one huge chunk
    let end = Math.min(getRandomChunkSize(minSize, maxSize), str.length, 1);

    while (start < str.length) {
        chunks.push(str.substring(start, end));
        start = end;
        end = Math.min(end + getRandomChunkSize(minSize, maxSize), str.length);
    }

    return chunks;
}

class WritableStreamStub extends Writable {
    constructor() {
        super({ decodeStrings: false });

        this.writtenData = '';
    }

    _write(chunk, encoding, callback) {
        assert.strictEqual(typeof chunk, 'string', 'Expected output to be a string stream');
        this.writtenData += chunk;
        callback();
    }
}

module.exports = {
    WritableStreamStub,
    treeAdapters,
    addSlashes,
    makeChunks,

    normalizeNewLine(str) {
        return str.replace(/\r\n/g, '\n');
    },

    removeNewLines(str) {
        return str.replace(/\r/g, '').replace(/\n/g, '');
    },

    writeChunkedToStream(str, stream) {
        const chunks = makeChunks(str);
        const lastChunkIdx = chunks.length - 1;

        chunks.forEach((chunk, idx) => {
            if (idx === lastChunkIdx) {
                stream.end(chunk);
            } else {
                stream.write(chunk);
            }
        });
    },

    generateTestsForEachTreeAdapter(moduleExports, ctor) {
        Object.keys(treeAdapters).forEach(adapterName => {
            const tests = {};
            const adapter = treeAdapters[adapterName];

            ctor(tests, adapter);

            Object.keys(tests).forEach(testName => {
                moduleExports['Tree adapter: ' + adapterName + ' - ' + testName] = tests[testName];
            });
        });
    },

    getStringDiffMsg(actual, expected) {
        for (let i = 0; i < expected.length; i++) {
            if (actual[i] !== expected[i]) {
                let diffMsg = '\nString differ at index ' + i + '\n';

                const expectedStr = 'Expected: ' + addSlashes(expected.substring(i - 100, i + 1));
                const expectedDiffMarker = createDiffMarker(expectedStr.length);

                diffMsg += expectedStr + addSlashes(expected.substring(i + 1, i + 20)) + '\n' + expectedDiffMarker;

                const actualStr = 'Actual:   ' + addSlashes(actual.substring(i - 100, i + 1));
                const actualDiffMarker = createDiffMarker(actualStr.length);

                diffMsg += actualStr + addSlashes(actual.substring(i + 1, i + 20)) + '\n' + actualDiffMarker;

                return diffMsg;
            }
        }

        return '';
    },

    getSubstringByLineCol(lines, loc) {
        lines = lines.slice(loc.startLine - 1, loc.endLine);

        const last = lines.length - 1;

        lines[last] = lines[last].substring(0, loc.endCol - 1);
        lines[0] = lines[0].substring(loc.startCol - 1);

        return lines.join('\n');
    }
};
