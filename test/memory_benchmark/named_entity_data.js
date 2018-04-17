'use strict';

var format = require('human-format');

(function() {
    var before = process.memoryUsage().rss;

    require('../../lib/tokenizer/named_entity_data');

    var after = process.memoryUsage().rss;

    console.log('Initial memory consumption: ', format(after - before, { unit: 'B' }));
})();
