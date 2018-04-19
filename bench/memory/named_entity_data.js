'use strict';

const format = require('human-format');

main();

function main() {
    const before = process.memoryUsage().rss;

    require('../../lib/tokenizer/named_entity_data');

    const after = process.memoryUsage().rss;

    console.log('Initial memory consumption: ', format(after - before, { unit: 'B' }));
}
