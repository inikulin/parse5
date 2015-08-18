'use strict';

var path = require('path'),
    fs = require('fs'),
    upstream = require('parse5'),
    workingCopy = require('../../index'),
    testUtils = require('../test_utils');

var wcParser = new workingCopy.Parser(),
    usParser = new upstream.Parser(),
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
                runHugePage(wcParser);
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

