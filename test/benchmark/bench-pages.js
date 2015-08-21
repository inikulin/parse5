'use strict';

var path = require('path'),
    fs = require('fs'),
    upstream = require('parse5'),
    workingCopy = require('../../lib'),
    testUtils = require('../test_utils');

var usParser = new upstream.Parser(),
    pages = testUtils
        .loadSerializationTestData(path.join(__dirname, '../data/sax'))
        .map(function (test) {
            return test.src;
        });

function runPages(parser) {
    for (var j = 0; j < pages.length; j++)
        parser.parse(pages[j]);
}

module.exports = {
    name: 'parse5 regression benchmark - PAGES',
    tests: [
        {
            name: 'Working copy',

            fn: function () {
                runPages(workingCopy);
            }
        },
        {
            name: 'Upstream',

            fn: function () {
                runPages(usParser);
            }
        }
    ]
};

