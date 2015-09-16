'use strict';

var path = require('path'),
    upstreamParse5 = require('parse5'),
    testUtils = require('../test_utils');

//HACK: https://github.com/bestiejs/benchmark.js/issues/51
/* global upstreamParser, workingCopy, pages, runPages */
global.upstreamParser = new upstreamParse5.Parser();
global.workingCopy = require('../../lib');
global.pages = testUtils
    .loadSerializationTestData(path.join(__dirname, '../data/sax'))
    .map(function (test) {
        return test.src;
    });

global.runPages = function (parser) {
    for (var j = 0; j < pages.length; j++)
        parser.parse(pages[j]);
};

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
                runPages(upstreamParser);
            }
        }
    ]
};

