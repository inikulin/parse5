import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { escapeString } from '../../packages/parse5/lib/serializer/index.js';
import * as parse5 from '../../packages/parse5/lib/index.js';
import {
    removeNewLines,
    getSubstringByLineCol,
    getStringDiffMsg,
    normalizeNewLine,
    generateTestsForEachTreeAdapter,
} from './common.js';

function walkTree(document, treeAdapter, handler) {
    for (let stack = [...treeAdapter.getChildNodes(document)]; stack.length > 0; ) {
        const node = stack.shift();
        const children = treeAdapter.getChildNodes(node);

        handler(node);

        if (children && children.length > 0) {
            stack.unshift(...children);
        }
    }
}

function assertLocation(loc, expected, html, lines) {
    //Offsets
    let actual = html.substring(loc.startOffset, loc.endOffset);

    expected = removeNewLines(expected);
    actual = removeNewLines(actual);

    assert.strictEqual(expected, actual, getStringDiffMsg(actual, expected));

    //Line/col
    actual = getSubstringByLineCol(lines, loc);
    actual = removeNewLines(actual);

    assert.strictEqual(actual, expected, getStringDiffMsg(actual, expected));
}

//NOTE: Based on the idea that the serialized fragment starts with the startTag
export function assertStartTagLocation(location, serializedNode, html, lines) {
    const length = location.startTag.endOffset - location.startTag.startOffset;
    const expected = serializedNode.substring(0, length);

    assertLocation(location.startTag, expected, html, lines);
}

//NOTE: Based on the idea that the serialized fragment ends with the endTag
function assertEndTagLocation(location, serializedNode, html, lines) {
    const length = location.endTag.endOffset - location.endTag.startOffset;
    const expected = serializedNode.slice(-length);

    assertLocation(location.endTag, expected, html, lines);
}

function assertAttrsLocation(location, serializedNode, html, lines) {
    for (const attr of location.attrs) {
        const expected = serializedNode.slice(attr.startOffset, attr.endOffset);

        assertLocation(attr, expected, html, lines);
    }
}

export function assertNodeLocation(location, serializedNode, html, lines) {
    const expected = removeNewLines(serializedNode);

    assertLocation(location, expected, html, lines);
}

function loadParserLocationInfoTestData() {
    const dataDirPath = new URL('../data/location-info', import.meta.url);
    const testSetFileDirs = fs.readdirSync(dataDirPath);
    const tests = [];

    for (const dirName of testSetFileDirs) {
        const dataFilePath = path.join(dataDirPath.pathname, dirName, 'data.html');
        const data = fs.readFileSync(dataFilePath).toString();

        tests.push({
            name: dirName,
            data: normalizeNewLine(data),
        });
    }

    return tests;
}

export function generateLocationInfoParserTests(name, prefix, parse) {
    generateTestsForEachTreeAdapter(name, (_test, treeAdapter) => {
        for (const test of loadParserLocationInfoTestData()) {
            const testName = `Location info (Parser) - ${test.name}`;

            //NOTE: How it works: we parse document with the location info.
            //Then for each node in the tree we run serializer and compare results with the substring
            //obtained via location info from the expected serialization results.
            _test[testName] = async function () {
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
            };
        }
    });
}
