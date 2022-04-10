import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { type TreeAdapterTypeMap, type TreeAdapter, type ParserOptions, type Token, serializeOuter } from 'parse5';
import {
    removeNewLines,
    getSubstringByLineCol,
    getStringDiffMsg,
    normalizeNewLine,
    generateTestsForEachTreeAdapter,
} from './common.js';
import { serializeDoctypeContent } from 'parse5-htmlparser2-tree-adapter';

function walkTree<T extends TreeAdapterTypeMap>(
    parent: T['parentNode'],
    treeAdapter: TreeAdapter<T>,
    handler: (node: T['node']) => void
): void {
    for (const node of treeAdapter.getChildNodes(parent)) {
        if (treeAdapter.isElementNode(node)) {
            walkTree(node, treeAdapter, handler);
        }

        handler(node);
    }
}

function assertLocation(loc: Token.Location, expected: string, html: string, lines: string[]): void {
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
    location: Token.ElementLocation,
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
function assertEndTagLocation(
    location: Token.ElementLocation,
    serializedNode: string,
    html: string,
    lines: string[]
): void {
    assert.ok(location.endTag, 'Expected endTag to be defined');
    const length = location.endTag.endOffset - location.endTag.startOffset;
    const expected = serializedNode.slice(-length);

    assertLocation(location.endTag, expected, html, lines);
}

function assertAttrsLocation(
    location: Token.ElementLocation,
    serializedNode: string,
    html: string,
    lines: string[]
): void {
    assert.ok(location.attrs, 'Expected attrs to be defined');

    for (const attr of Object.values(location.attrs)) {
        const expected = serializedNode.slice(
            attr.startOffset - location.startOffset,
            attr.endOffset - location.startOffset
        );

        assertLocation(attr, expected, html, lines);
    }
}

export function assertNodeLocation(
    location: Token.Location,
    serializedNode: string,
    html: string,
    lines: string[]
): void {
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
    parse: (html: string, opts: ParserOptions<TreeAdapterTypeMap>) => { node: TreeAdapterTypeMap['node'] }
): void {
    generateTestsForEachTreeAdapter(name, (treeAdapter) => {
        for (const test of loadParserLocationInfoTestData()) {
            //NOTE: How it works: we parse document with location info.
            //Then for each node in the tree we run the serializer and compare results with the substring
            //obtained via the location info from the expected serialization results.
            it(`Location info (Parser) - ${test.name}`, async () => {
                const html = test.data;
                const lines = html.split(/\r?\n/g);

                const parserOpts = {
                    treeAdapter,
                    sourceCodeLocationInfo: true,
                };

                const parsingResult = parse(html, parserOpts);
                const document = parsingResult.node;

                walkTree(document, treeAdapter, (node) => {
                    const location = treeAdapter.getNodeSourceCodeLocation(node);

                    assert.ok(location);

                    const serializedNode = treeAdapter.isDocumentTypeNode(node)
                        ? `<${serializeDoctypeContent(
                              treeAdapter.getDocumentTypeNodeName(node),
                              treeAdapter.getDocumentTypeNodePublicId(node),
                              treeAdapter.getDocumentTypeNodeSystemId(node)
                          )}>`
                        : serializeOuter(node, { treeAdapter });

                    assertLocation(location, serializedNode, html, lines);

                    if (treeAdapter.isElementNode(node)) {
                        assertStartTagLocation(location, serializedNode, html, lines);

                        if (location.endTag) {
                            assertEndTagLocation(location, serializedNode, html, lines);
                        }

                        if (location.attrs) {
                            assertAttrsLocation(location, serializedNode, html, lines);
                        } else {
                            // If we don't have `location.attrs`, we expect that the node has no attributes.
                            assert.strictEqual(treeAdapter.getAttrList(node).length, 0);
                        }
                    }
                });
            });
        }
    });
}
