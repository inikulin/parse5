import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
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
    for (let stack = treeAdapter.getChildNodes(document).slice(); stack.length; ) {
        const node = stack.shift();
        const children = treeAdapter.getChildNodes(node);

        handler(node);

        if (children && children.length) {
            stack = children.concat(stack);
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
    location.attrs.forEach((attr) => {
        const expected = serializedNode.slice(attr.startOffset, attr.endOffset);

        assertLocation(attr, expected, html, lines);
    });
}

export function assertNodeLocation(location, serializedNode, html, lines) {
    const expected = removeNewLines(serializedNode);

    assertLocation(location, expected, html, lines);
}

function loadParserLocationInfoTestData() {
    const dataDirPath = new URL('../data/location-info', import.meta.url);
    const testSetFileDirs = fs.readdirSync(dataDirPath);
    const tests = [];

    testSetFileDirs.forEach((dirName) => {
        const dataFilePath = path.join(dataDirPath.pathname, dirName, 'data.html');
        const data = fs.readFileSync(dataFilePath).toString();

        tests.push({
            name: dirName,
            data: normalizeNewLine(data),
        });
    });

    return tests;
}

export function generateLocationInfoParserTests(name, prefix, parse) {
    generateTestsForEachTreeAdapter(name, (_test, treeAdapter) => {
        loadParserLocationInfoTestData().forEach((test) => {
            const testName = `Location info (Parser) - ${test.name}`;

            //NOTE: How it works: we parse document with the location info.
            //Then for each node in the tree we run serializer and compare results with the substring
            //obtained via location info from the expected serialization results.
            _test[testName] = async function () {
                const serializerOpts = { treeAdapter: treeAdapter };
                const html = escapeString(test.data);
                const lines = html.split(/\r?\n/g);

                const parserOpts = {
                    treeAdapter: treeAdapter,
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
        });
    });
}
