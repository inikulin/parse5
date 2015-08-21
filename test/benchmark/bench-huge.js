'use strict';

var path = require('path'),
    fs = require('fs'),
    upstream = require('parse5'),
    workingCopy = require('../../lib');

var usParser = new upstream.Parser(),
    hugePage = fs.readFileSync(path.join(__dirname, '../data/benchmark/huge-page.html')).toString();

function runHugePage(parser) {
    parser.parse(hugePage);
}

module.exports = {
    name: 'parse5 regression benchmark - HUGE',
    tests: [
        {
            name: 'Working copy',

            fn: function () {
                runHugePage(workingCopy);
            }
        },
        {
            name: 'Upstream',

            fn: function () {
                runHugePage(usParser);
            }
        }
    ]
};

