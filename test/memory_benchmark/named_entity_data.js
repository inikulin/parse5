var format = require('human-format');

(function () {
    var before = new process.memoryUsage().rss;

    require('../../lib/tokenizer/named_entity_trie');

    var after = new process.memoryUsage().rss;

    console.log('Initial memory consumption: ', format(after - before, {unit: 'B'}));
})();
