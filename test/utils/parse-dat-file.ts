import { TreeAdapterTypeMap } from './../../packages/parse5/lib/tree-adapters/interface';
import type { TreeAdapter } from '../../packages/parse5/lib/tree-adapters/interface';
import * as HTML from '../../packages/parse5/lib/common/html.js';

function createFragmentContext<T extends TreeAdapterTypeMap>(
    tagName: string | undefined,
    treeAdapter: TreeAdapter<T>
): T['element'] | null {
    if (!tagName) {
        return null;
    }

    let namespace = HTML.NAMESPACES.HTML;
    const parts = tagName.split(' ');

    if (parts.length > 1) {
        tagName = parts[1];

        if (parts[0] === 'svg') {
            namespace = HTML.NAMESPACES.SVG;
        } else if (parts[0] === 'math') {
            namespace = HTML.NAMESPACES.MATHML;
        }
    }

    return treeAdapter.createElement(tagName, namespace, []);
}

export interface DatFile<T extends TreeAdapterTypeMap> {
    input: string;
    expected: string;
    expectedErrors: string[];
    disableEntitiesDecoding: boolean;
    lineNum: number;
    scriptingEnabled: boolean;
    fragmentContext: T['element'] | null;
}

export function parseDatFile<T extends TreeAdapterTypeMap>(testSet: string, treeAdapter: TreeAdapter<T>): DatFile<T>[] {
    const testDescrs: Record<string, number | string[]>[] = [];
    let curDirective = '';
    let curDescr: Record<string, number | string[]> | null = null;

    testSet.split(/\r?\n/).forEach((line, idx) => {
        if (line === '#data') {
            curDescr = { '#line': idx + 1 };
            testDescrs.push(curDescr);
        }

        if (line[0] === '#') {
            curDirective = line;
            curDescr![curDirective] = [];
        } else {
            (curDescr![curDirective] as string[]).push(line);
        }
    });

    return testDescrs.map((descr) => {
        const fragmentContextTagName = (descr['#document-fragment'] as string[] | undefined)?.[0];

        return {
            input: (descr['#data'] as string[]).join('\n'),
            expected: (descr['#document'] as string[]).join('\n'),
            expectedErrors: descr['#new-errors'] || [],
            disableEntitiesDecoding: !!descr['#disable-html-entities-decoding'],
            lineNum: descr['#line'],
            scriptingEnabled: !descr['#script-off'],
            fragmentContext: createFragmentContext<T>(fragmentContextTagName, treeAdapter),
        } as DatFile<T>;
    });
}
