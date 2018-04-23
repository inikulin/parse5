const assert = require('assert');
const ParserStream = require('../lib');
const generateParsingTests = require('../../../test/utils/generate-parsing-tests');
const parseChunked = require('./utils/parse-chunked');

generateParsingTests(exports, 'ParserStream', { skipFragments: true }, (test, opts) => parseChunked(test.input, opts));

exports['Regression - Fix empty stream parsing with ParserStream (GH-196)'] = function(done) {
    const parser = new ParserStream().once('finish', () => {
        assert(parser.document.childNodes.length > 0);
        done();
    });

    parser.end();
};
