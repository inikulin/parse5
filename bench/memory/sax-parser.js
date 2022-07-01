import { readFile } from 'node:fs/promises';
import format from 'human-format';
import memwatch from '@airbnb/node-memwatch';
import { SAXParser } from '../../packages/parse5-sax-parser/dist/index.js';
import { finished } from 'parse5-test-utils/dist/common.js';

const heapDiffMeasurement = new memwatch.HeapDiff();

let maxMemUsage = 0;

memwatch.on('stats', (stats) => {
    maxMemUsage = Math.max(maxMemUsage, stats.used_heap_size);
});

const statsPromise = new Promise((resolve) => memwatch.once('stats', resolve));

const startDate = new Date();

const parsedDataSize = await parse();
const endDate = new Date();
const heapDiff = heapDiffMeasurement.end();

// NOTE: we need at least one `stats` result to get maxMemUsage
await statsPromise;

async function parse() {
    const data = await readFile(new URL('../../test/data/huge-page/huge-page.html', import.meta.url), 'utf8');
    let parsedDataSize = 0;
    const stream = new SAXParser();

    for (let i = 0; i < 200; i++) {
        parsedDataSize += data.length;
        stream.write(data);
    }

    stream.end();

    await finished(stream);

    return parsedDataSize;
}

console.log('Input data size:', format(parsedDataSize, { unit: 'B' }));

const scale = new format.Scale({
    seconds: 1,
    minutes: 60,
    hours: 3600,
});

console.log('Duration:', format((endDate - startDate) / 1000, { scale }));
console.log('Memory before:', heapDiff.before.size);
console.log('Memory after:', heapDiff.after.size);
console.log('Memory max:', format(maxMemUsage, { unit: 'B' }));
