import { writeFile } from 'fs';
import { promisify } from 'util';
import r2 from 'r2';
import { RadixTree } from './radix-tree.js';
import { ArrayMappedRadixTree } from './array-mapped-radix-tree.js';

const writeFileAsync = promisify(writeFile);

main();

async function main() {
    // NOTE: don't use r2.json directly due to https://github.com/mikeal/r2/issues/48
    const res = await r2('https://html.spec.whatwg.org/multipage/entities.json').response;
    const src = await res.json();
    const radixTree = new RadixTree(src);
    const arr = new ArrayMappedRadixTree(radixTree);

    const data =
        `//NOTE: this file contains auto-generated array mapped radix tree that is used for the named entity references consumption\n` +
        `//(details: https://github.com/inikulin/parse5/tree/master/scripts/generate-named-entity-data/README.md)\n` +
        `export const namedEntityData = new Uint16Array(${JSON.stringify(arr)});`;

    await writeFileAsync('packages/parse5/lib/tokenizer/named-entity-data.js', data);
}
