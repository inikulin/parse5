const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parse5 = require('../../packages/parse5/lib');
const { generateTestsForEachTreeAdapter, getStringDiffMsg } = require('./common');

module.exports = function generateSeriliazerTests(moduleExports, prefix, serialize) {
    const data = fs.readFileSync(path.join(__dirname, '../data/serialization/tests.json'));
    const tests = JSON.parse(data);

    generateTestsForEachTreeAdapter(moduleExports, (_test, treeAdapter) => {
        tests.forEach((test, idx) => {
            _test[`${prefix} - ${idx}.${test.name}`] = async () => {
                const opts = { treeAdapter: treeAdapter };
                const document = parse5.parse(test.input, opts);
                const serializedResult = await serialize(document, opts);

                //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
                assert.ok(serializedResult === test.expected, getStringDiffMsg(serializedResult, test.expected));
            };
        });
    });
};
