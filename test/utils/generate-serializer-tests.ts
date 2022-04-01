import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as parse5 from 'parse5';
import { generateTestsForEachTreeAdapter, getStringDiffMsg } from './common.js';

export function generateSerializerTests(
    name: string,
    prefix: string,
    serialize: (
        document: parse5.TreeAdapterTypeMap['document'],
        opts: parse5.SerializerOptions<parse5.TreeAdapterTypeMap>
    ) => Promise<string> | string
): void {
    const data = fs.readFileSync(new URL('../data/serialization/tests.json', import.meta.url)).toString('utf8');
    const tests = JSON.parse(data) as {
        name: string;
        options?: parse5.SerializerOptions<parse5.TreeAdapterTypeMap>;
        input: string;
        expected: string;
    }[];

    generateTestsForEachTreeAdapter(name, (treeAdapter) => {
        for (const [idx, test] of tests.entries()) {
            it(`${prefix} - ${idx}.${test.name}`, async () => {
                const opts = { ...test.options, treeAdapter };
                const document = parse5.parse(test.input, opts);
                const serializedResult = await serialize(document, opts);

                //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
                assert.ok(serializedResult === test.expected, getStringDiffMsg(serializedResult, test.expected));
            });
        }
    });
}
