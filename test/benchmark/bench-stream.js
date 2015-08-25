'use strict';

var path = require('path'),
    upstreamParse5 = require('parse5');

//HACK: https://github.com/bestiejs/benchmark.js/issues/51
global.fs = require('fs');
global.Promise = require('promise');
global.upstreamParser = new upstreamParse5.Parser();
global.workingCopy = require('../../lib');
global.files = fs
    .readdirSync(path.join(__dirname, '../data/sax'))
    .map(function (dirName) {
        return path.join(__dirname, '../data/sax', dirName, 'src.html');
    });

module.exports = {
    name: 'parse5 regression benchmark - STREAM',
    tests: [
        {
            name: 'Working copy',
            defer: true,

            fn: function () {
                var parsePromises = files.map(function (fileName) {
                    return new Promise(function (resolve) {
                        var stream = fs.createReadStream(fileName),
                            parserStream = new workingCopy.ParserStream();

                        stream.pipe(parserStream);
                        parserStream.on('finish', resolve);
                    });
                });

                Promise
                    .all(parsePromises)
                    .then(function () {
                        deferred.resolve();
                    });
            }
        },
        {
            name: 'Upstream',
            defer: true,

            fn: function () {
                var parsePromises = files.map(function (fileName) {
                    return new Promise(function (resolve) {
                        var stream = fs.createReadStream(fileName),
                            data = '';

                        stream.on('data', function (chunk) {
                            data += chunk.toString('utf8');
                        });

                        stream.on('end', function () {
                            upstreamParser.parse(data);
                            resolve();
                        });
                    });
                });

                Promise
                    .all(parsePromises)
                    .then(function () {
                        deferred.resolve();
                    });
            }
        }
    ]
};

