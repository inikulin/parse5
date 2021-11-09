import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as parse5 from '../../packages/parse5/lib/index.js';
import { generateTestsForEachTreeAdapter, getStringDiffMsg } from './common.js';

export function generateSerializerTests(name: string, prefix: string, serialize: any) {
    const data = fs.readFileSync(new URL('../data/serialization/tests.json', import.meta.url));
    const tests = JSON.parse(data) as {
        name: string;
        input: string;
        expected: string;
    }[];

    generateTestsForEachTreeAdapter(name, (_test, treeAdapter) => {
        for (const [idx, test] of tests.entries()) {
            _test[`${prefix} - ${idx}.${test.name}`] = async () => {
                const opts = { treeAdapter };
                const document = parse5.parse(test.input, opts);
                const serializedResult = await serialize(document, opts);

                //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
                assert.ok(serializedResult === test.expected, getStringDiffMsg(serializedResult, test.expected));
            };
        }
    });
}
