'use strict';

const path = require('path');
const fs = require('fs');
const upstreamParse5 = require('parse5');

//HACK: https://github.com/bestiejs/benchmark.js/issues/51
/* global workingCopy, upstreamParser, hugePage */
global.workingCopy = require('../../lib');
global.upstreamParser = upstreamParse5;
global.hugePage = fs.readFileSync(path.join(__dirname, '../data/huge-page/huge-page.html')).toString();

module.exports = {
    name: 'parse5 regression benchmark - HUGE',
    tests: [
        {
            name: 'Working copy',

            fn: function() {
                workingCopy.parse(hugePage);
            }
        },
        {
            name: 'Upstream',
            fn: function() {
                upstreamParser.parse(hugePage);
            }
        }
    ]
};
