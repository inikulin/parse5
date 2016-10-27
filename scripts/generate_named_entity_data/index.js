const RadixTree = require('./radix_tree');
const ArrayMappedRadixTree = require('./array_mapped_radix_tree');

module.exports = function generateNamedEntityData(src) {
    const radixTree = new RadixTree(src);
    const arr = new ArrayMappedRadixTree(radixTree);

    return (
        `'use strict';\n\n` +
        `//NOTE: this file contains auto-generated array mapped radix tree that is used for the named entity references consumption\n` +
        `//(details: https://github.com/inikulin/parse5/tree/master/scripts/generate_named_entity_data/README.md)\n` +
        `module.exports = new Uint16Array(${JSON.stringify(arr)});`
    );
};
