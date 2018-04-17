'use strict';

var assert = require('assert'),
    parse5 = require('../../lib'),
    testUtils = require('../test_utils');

testUtils.generateTestsForEachTreeAdapter(module.exports, function(_test, treeAdapter) {
    _test['Plain text conversion stream'] = function() {
        var converter = new parse5.PlainTextConversionStream({ treeAdapter: treeAdapter });

        converter.write('Hey');
        converter.write('\r\nyo');
        converter.write('\u0000');
        converter.end('<html><head><body>');

        var result = parse5.serialize(converter.document, { treeAdapter: treeAdapter });

        assert.strictEqual(
            result,
            '<html><head></head><body><pre>\nHey\nyo\uFFFD&lt;html&gt;&lt;head&gt;&lt;body&gt;</pre></body></html>'
        );
    };
});
