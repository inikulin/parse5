import format from 'human-format';

main();

async function main() {
    const before = process.memoryUsage().rss;

    await import('../../packages/parse5/lib/tokenizer/named-entity-data.js');

    const after = process.memoryUsage().rss;

    console.log('Initial memory consumption: ', format(after - before, { unit: 'B' }));
}
