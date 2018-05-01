const assert = require('assert');
const generateLocationInfoParserTests = require('../../../test/utils/generate-location-info-parser-tests');
const { generateTestsForEachTreeAdapter } = require('../../../test/utils/common');
const parseChunked = require('./utils/parse-chunked');

generateLocationInfoParserTests(module.exports, 'ParserStream', (input, opts) =>
    // NOTE: because of performance use bigger chunks here
    parseChunked(input, opts, 100, 400)
);

generateTestsForEachTreeAdapter(module.exports, (_test, treeAdapter) => {
    _test['Regression - location info for the implicitly generated <body>, <html> and <head> (GH-44)'] = function() {
        const html = '</head><div class="test"></div></body></html>';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true
        };

        const document = parseChunked(html, opts).node;
        const htmlEl = treeAdapter.getChildNodes(document)[0];
        const headEl = treeAdapter.getChildNodes(htmlEl)[0];
        const bodyEl = treeAdapter.getChildNodes(htmlEl)[1];

        assert.strictEqual(treeAdapter.getNodeSourceCodeLocation(htmlEl), null);
        assert.strictEqual(treeAdapter.getNodeSourceCodeLocation(headEl), null);
        assert.strictEqual(treeAdapter.getNodeSourceCodeLocation(bodyEl), null);
    };
});
