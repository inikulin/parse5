import { readFile } from 'node:fs/promises';
import { finished } from 'node:stream/promises';
import format from 'human-format';
import { SAXParser } from '../../packages/parse5-sax-parser/dist/index.js';

/* eslint-disable no-console */

const usageStart = process.memoryUsage().heapUsed;

const startDate = new Date();

const parsedDataSize = await parse();
const endDate = new Date();
const usageEnd = process.memoryUsage().heapUsed;

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
console.log('Memory before:', usageStart);
console.log('Memory after:', usageEnd);
