'use strict';

const path = require('path');
const upstreamParse5 = require('parse5');

//HACK: https://github.com/bestiejs/benchmark.js/issues/51
/* global fs, Promise, upstreamParser, workingCopy, files, deferred */
global.fs = require('fs');
global.upstreamParser = upstreamParse5;
global.workingCopy = require('../../lib');
global.files = fs.readdirSync(path.join(__dirname, '../data/sax')).map(dirName => {
    return path.join(__dirname, '../data/sax', dirName, 'src.html');
});

module.exports = {
    name: 'parse5 regression benchmark - STREAM',
    tests: [
        {
            name: 'Working copy',
            defer: true,

            fn: function() {
                const parsePromises = files.map(fileName => {
                    return new Promise(resolve => {
                        const stream = fs.createReadStream(fileName);
                        const parserStream = new workingCopy.ParserStream();

                        stream.pipe(parserStream);
                        parserStream.on('finish', resolve);
                    });
                });

                Promise.all(parsePromises).then(() => {
                    deferred.resolve();
                });
            }
        },
        {
            name: 'Upstream',
            defer: true,

            fn: function() {
                const parsePromises = files.map(fileName => {
                    return new Promise(resolve => {
                        const stream = fs.createReadStream(fileName);
                        let data = '';

                        stream.on('data', chunk => {
                            data += chunk.toString('utf8');
                        });

                        stream.on('end', () => {
                            upstreamParser.parse(data);
                            resolve();
                        });
                    });
                });

                Promise.all(parsePromises).then(() => {
                    deferred.resolve();
                });
            }
        }
    ]
};
