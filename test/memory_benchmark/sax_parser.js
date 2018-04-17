'use strict';

var fs = require('fs'),
    format = require('human-format'),
    promisifyEvent = require('promisify-event'),
    memwatch = require('memwatch-next'),
    SAXParser = require('../../lib').SAXParser;

function parse() {
    var data = fs.readFileSync('test/data/huge-page/huge-page.html'),
        parsedDataSize = 0,
        stream = new SAXParser();

    for (var i = 0; i < 400; i++) {
        parsedDataSize += data.length;
        stream.write(data);
    }

    stream.end();

    return promisifyEvent(stream, 'finish').then(function() {
        return parsedDataSize;
    });
}

function getDuration(startDate, endDate) {
    var scale = new format.Scale({
        seconds: 1,
        minutes: 60,
        hours: 3600
    });

    return format((endDate - startDate) / 1000, { scale: scale });
}

function printResults(parsedDataSize, startDate, endDate, heapDiff, maxMemUsage) {
    console.log('Input data size:', format(parsedDataSize, { unit: 'B' }));
    console.log('Duration: ', getDuration(startDate, endDate));
    console.log('Memory before: ', heapDiff.before.size);
    console.log('Memory after: ', heapDiff.after.size);
    console.log('Memory max: ', format(maxMemUsage, { unit: 'B' }));
}

(function() {
    var parsedDataSize = 0,
        maxMemUsage = 0,
        startDate = null,
        endDate = null,
        heapDiffMeasurement = new memwatch.HeapDiff(),
        heapDiff = null;

    memwatch.on('stats', function(stats) {
        maxMemUsage = Math.max(maxMemUsage, stats['current_base']);
    });

    startDate = new Date();

    var parserPromise = parse().then(function(dataSize) {
        parsedDataSize = dataSize;
        endDate = new Date();
        heapDiff = heapDiffMeasurement.end();
    });

    Promise.all([
        parserPromise,
        promisifyEvent(memwatch, 'stats') // NOTE: we need at least one `stats` result
    ]).then(function() {
        return printResults(parsedDataSize, startDate, endDate, heapDiff, maxMemUsage);
    });
})();
