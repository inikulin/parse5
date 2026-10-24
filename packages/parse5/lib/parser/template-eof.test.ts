import { describe, it, expect } from 'vitest';
import { parse, parseFragment, type TreeAdapter } from 'parse5';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';

describe.each(Object.entries(treeAdapters) as [string, TreeAdapter][])('template EOF (%s)', (_name, treeAdapter) => {
    it.each([
        '<template>',
        '<template><div>',
        '<template><table>',
        '<template><svg><html><desc>',
        '<template><math><html><annotation-xml encoding=text/html>',
    ])('%s', (markup) => {
        const input = markup.repeat(12_000);

        expect(() => parse(input, { treeAdapter })).not.toThrow();
        expect(() => parseFragment(input, { treeAdapter })).not.toThrow();
    });
});
