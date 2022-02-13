import { ParserOptions } from 'parse5/dist/parser/index';
import { Location, ElementLocation } from 'parse5/dist/common/token.js';
import { TreeAdapter, TreeAdapterTypeMap } from 'parse5/dist/tree-adapters/interface.js';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { escapeString } from 'parse5/dist/serializer/index.js';
import * as parse5 from 'parse5/dist/index.js';
import {
    removeNewLines,
    getSubstringByLineCol,
    getStringDiffMsg,
    normalizeNewLine,
    generateTestsForEachTreeAdapter,
} from './common.js';

function walkTree<T extends TreeAdapterTypeMap>(
    document: T['document'],
    treeAdapter: TreeAdapter<T>,
    handler: (node: T['node']) => void
): void {
    const stack = [...treeAdapter.getChildNodes(document)];
    let node;
    while ((node = stack.shift())) {
        const children = treeAdapter.getChildNodes(node);

        handler(node);

        if (children?.length) {
            stack.unshift(...children);
        }
    }
}

function assertLocation(loc: Location, expected: string, html: string, lines: string[]): void {
    //Offsets
    let actual = html.substring(loc.startOffset, loc.endOffset);

    expected = removeNewLines(expected);
    actual = removeNewLines(actual);

    assert.ok(expected === actual, getStringDiffMsg(actual, expected));

    //Line/col
    actual = getSubstringByLineCol(lines, loc);
    actual = removeNewLines(actual);

    assert.ok(actual === expected, getStringDiffMsg(actual, expected));
}

//NOTE: Based on the idea that the serialized fragment starts with the startTag
export function assertStartTagLocation(
    location: ElementLocation,
    serializedNode: string,
    html: string,
    lines: string[]
): void {
    assert.ok(location.startTag, 'Expected startTag to be defined');
    const length = location.startTag.endOffset - location.startTag.startOffset;
    const expected = serializedNode.substring(0, length);

    assertLocation(location.startTag, expected, html, lines);
}

//NOTE: Based on the idea that the serialized fragment ends with the endTag
function assertEndTagLocation(location: ElementLocation, serializedNode: string, html: string, lines: string[]): void {
    assert.ok(location.endTag, 'Expected endTag to be defined');
    const length = location.endTag.endOffset - location.endTag.startOffset;
    const expected = serializedNode.slice(-length);

    assertLocation(location.endTag, expected, html, lines);
}

function assertAttrsLocation(location: ElementLocation, serializedNode: string, html: string, lines: string[]): void {
    assert.ok(location.attrs, 'Expected attrs to be defined');

    for (const attr of Object.values(location.attrs)) {
        const expected = serializedNode.slice(attr.startOffset, attr.endOffset);

        assertLocation(attr, expected, html, lines);
    }
}

export function assertNodeLocation(location: Location, serializedNode: string, html: string, lines: string[]): void {
    const expected = removeNewLines(serializedNode);

    assertLocation(location, expected, html, lines);
}

function loadParserLocationInfoTestData(): { name: string; data: string }[] {
    const dataDirPath = new URL('../data/location-info', import.meta.url);
    const testSetFileDirs = fs.readdirSync(dataDirPath);

    return testSetFileDirs.map((dirName) => {
        const dataFilePath = path.join(dataDirPath.pathname, dirName, 'data.html');
        const data = fs.readFileSync(dataFilePath).toString();

        return {
            name: dirName,
            data: normalizeNewLine(data),
        };
    });
}

export function generateLocationInfoParserTests(
    name: string,
    _prefix: string,
    parse: (html: string, opts: ParserOptions<TreeAdapterTypeMap>) => { node: TreeAdapterTypeMap['node'] }
): void {
    generateTestsForEachTreeAdapter(name, (treeAdapter) => {
        for (const test of loadParserLocationInfoTestData()) {
            //NOTE: How it works: we parse document with the location info.
            //Then for each node in the tree we run serializer and compare results with the substring
            //obtained via location info from the expected serialization results.
            it(`Location info (Parser) - ${test.name}`, async () => {
                const serializerOpts = { treeAdapter };
                const html = escapeString(test.data);
                const lines = html.split(/\r?\n/g);

                const parserOpts = {
                    treeAdapter,
                    sourceCodeLocationInfo: true,
                };

                const parsingResult = await parse(html, parserOpts);
                const document = parsingResult.node;

                walkTree(document, treeAdapter, (node) => {
                    const location = treeAdapter.getNodeSourceCodeLocation(node);

                    if (location) {
                        const fragment = treeAdapter.createDocumentFragment();

                        treeAdapter.appendChild(fragment, node);

                        const serializedNode = parse5.serialize(fragment, serializerOpts);

                        assertNodeLocation(location, serializedNode, html, lines);

                        // TODO: None of the cases below are ever matched.

                        if (location.startTag) {
                            assertStartTagLocation(location, serializedNode, html, lines);
                        }

                        if (location.endTag) {
                            assertEndTagLocation(location, serializedNode, html, lines);
                        }

                        if (location.attrs) {
                            assertAttrsLocation(location, serializedNode, html, lines);
                        }
                    }
                });
            });
        }
    });
}
