let { writeFile } = require('fs');
const { promisify } = require('util');
const r2 = require('r2');
const RadixTree = require('./radix_tree');
const ArrayMappedRadixTree = require('./array_mapped_radix_tree');

writeFile = promisify(writeFile);

main();

async function main() {
    // NOTE: don't use r2.json directly due to https://github.com/mikeal/r2/issues/48
    const res = await r2('https://html.spec.whatwg.org/multipage/entities.json').response;
    const src = await res.json();
    const radixTree = new RadixTree(src);
    const arr = new ArrayMappedRadixTree(radixTree);

    const data =
        `'use strict';\n\n` +
        `//NOTE: this file contains auto-generated array mapped radix tree that is used for the named entity references consumption\n` +
        `//(details: https://github.com/inikulin/parse5/tree/master/scripts/generate_named_entity_data/README.md)\n` +
        `module.exports = new Uint16Array(${JSON.stringify(arr)});`;

    await writeFile('lib/tokenizer/named_entity_data.js', data);
}
