'use strict';

var path = require('path'),
    fs = require('fs'),
    upstream = require('parse5'),
    workingCopy = require('../../lib'),
    testUtils = require('../test_utils');

var usParser = new upstream.Parser(),
    micro = testUtils
        .loadTreeConstructionTestData([path.join(__dirname, '../data/tree_construction')], workingCopy.treeAdapters.default)
        .map(function (test) {
            return {
                html: test.input,
                fragmentContext: test.fragmentContext
            }
        });

function runMicro(parser) {
    for (var i = 0; i < micro.length; i++) {
        if (micro[i].fragmentContext)
            parser.parseFragment(micro[i].html, micro[i].fragmentContext);
        else
            parser.parse(micro[i].html);

    }
}

module.exports = {
    name: 'parse5 regression benchmark - MICRO',
    tests: [
        {
            name: 'Working copy',

            fn: function () {
                runMicro(workingCopy);
            }
        },
        {
            name: 'Upstream',

            fn: function () {
                runMicro(usParser);
            }
        }
    ]
};

