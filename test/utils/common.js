import { Writable } from 'node:stream';
import assert from 'node:assert';
import * as defaultTreeAdapter from '../../packages/parse5/lib/tree-adapters/default.js';
import * as htmlTreeAdapter from '../../packages/parse5-htmlparser2-tree-adapter/lib/index.js';

export const treeAdapters = {
    default: defaultTreeAdapter,
    htmlparser2: htmlTreeAdapter,
};

export function addSlashes(str) {
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

    return `${marker}^\n`;
}

function getRandomChunkSize(min, max) {
    const MIN = 1;
    const MAX = 10;

    min = min || MIN;
    max = max || MAX;

    return min + Math.floor(Math.random() * (max - min + 1));
}

export function makeChunks(str, minSize, maxSize) {
    if (str.length === 0) {
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

export class WritableStreamStub extends Writable {
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

export function normalizeNewLine(str) {
    return str.replace(/\r\n/g, '\n');
}

export function removeNewLines(str) {
    return str.replace(/\r/g, '').replace(/\n/g, '');
}

export function writeChunkedToStream(str, stream) {
    const chunks = makeChunks(str);
    const lastChunkIdx = chunks.length - 1;

    for (const [idx, chunk] of chunks.entries()) {
        if (idx === lastChunkIdx) {
            stream.end(chunk);
        } else {
            stream.write(chunk);
        }
    }
}

export function generateTestsForEachTreeAdapter(name, ctor) {
    suite(name, () => {
        for (const adapterName of Object.keys(treeAdapters)) {
            const tests = {};
            const adapter = treeAdapters[adapterName];

            ctor(tests, adapter);

            for (const testName of Object.keys(tests)) {
                test(`Tree adapter: ${adapterName} - ${testName}`, tests[testName]);
            }
        }
    });
}

export function getStringDiffMsg(actual, expected) {
    for (let i = 0; i < expected.length; i++) {
        if (actual[i] !== expected[i]) {
            let diffMsg = `\nString differ at index ${i}\n`;

            const expectedStr = `Expected: ${addSlashes(expected.substring(i - 100, i + 1))}`;
            const expectedDiffMarker = createDiffMarker(expectedStr.length);

            diffMsg += `${expectedStr + addSlashes(expected.substring(i + 1, i + 20))}\n${expectedDiffMarker}`;

            const actualStr = `Actual:   ${addSlashes(actual.substring(i - 100, i + 1))}`;
            const actualDiffMarker = createDiffMarker(actualStr.length);

            diffMsg += `${actualStr + addSlashes(actual.substring(i + 1, i + 20))}\n${actualDiffMarker}`;

            return diffMsg;
        }
    }

    return '';
}

export function getSubstringByLineCol(lines, loc) {
    lines = lines.slice(loc.startLine - 1, loc.endLine);

    const last = lines.length - 1;

    lines[last] = lines[last].substring(0, loc.endCol - 1);
    lines[0] = lines[0].substring(loc.startCol - 1);

    return lines.join('\n');
}
