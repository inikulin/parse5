'use strict';

var fs = require('fs'),
    path = require('path'),
    parse5 = require('../lib/index'),
    HTML = require('../lib/common/html'),
    Tokenizer = require('../lib/tokenizer');

function addSlashes(str) {
    return str
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/\f/g, '\\f')
        .replace(/\r/g, '\\r')
        .replace(/\0/g, '\\u0000');
}

exports.addSlashes = addSlashes;

function createDiffMarker(markerPosition) {
    var marker = '';

    for (var i = 0; i < markerPosition - 1; i++)
        marker += ' ';

    return marker + '^\n';
}

function getRandomChunkSize(min, max) {
    var MIN = 1,
        MAX = 10;

    min = min || MIN;
    max = max || MAX;

    return min + Math.floor(Math.random() * (max - min + 1));
}


var normalizeNewLine = exports.normalizeNewLine = function (str) {
    return str.replace(/\r\n/g, '\n');
};

function createFragmentContext(tagName, treeAdapter) {
    if (!tagName)
        return null;

    var namespace = HTML.NAMESPACES.HTML,
        parts = tagName.split(' ');

    if (parts.length > 1) {
        tagName = parts[1];

        if (parts[0] === 'svg')
            namespace = HTML.NAMESPACES.SVG;

        else if (parts[0] === 'math')
            namespace = HTML.NAMESPACES.MATHML;
    }

    return treeAdapter.createElement(tagName, namespace, []);
}


//NOTE: creates test suites for each available tree adapter.
exports.generateTestsForEachTreeAdapter = function (moduleExports, ctor) {
    Object.keys(parse5.treeAdapters).forEach(function (adapterName) {
        var tests = {},
            adapter = parse5.treeAdapters[adapterName];

        ctor(tests, adapter);

        Object.keys(tests).forEach(function (testName) {
            moduleExports['Tree adapter: ' + adapterName + ' - ' + testName] = tests[testName];
        });
    });
};

exports.getStringDiffMsg = function (actual, expected) {
    for (var i = 0; i < expected.length; i++) {
        if (actual[i] !== expected[i]) {
            var diffMsg = '\nString differ at index ' + i + '\n';

            var expectedStr = 'Expected: ' + addSlashes(expected.substring(i - 100, i + 1)),
                expectedDiffMarker = createDiffMarker(expectedStr.length);

            diffMsg += expectedStr + addSlashes(expected.substring(i + 1, i + 20)) + '\n' + expectedDiffMarker;

            var actualStr = 'Actual:   ' + addSlashes(actual.substring(i - 100, i + 1)),
                actualDiffMarker = createDiffMarker(actualStr.length);

            diffMsg += actualStr + addSlashes(actual.substring(i + 1, i + 20)) + '\n' + actualDiffMarker;

            return diffMsg;
        }
    }

    return '';
};

exports.removeNewLines = function (str) {
    return str
        .replace(/\r/g, '')
        .replace(/\n/g, '');
};

exports.loadSAXParserTestData = function () {
    var dataDirPath = path.join(__dirname, './data/sax'),
        testSetFileDirs = fs.readdirSync(dataDirPath),
        tests = [];

    testSetFileDirs.forEach(function (dirName) {
        var srcFilePath = path.join(dataDirPath, dirName, 'src.html'),
            expectedFilePath = path.join(dataDirPath, dirName, 'expected.html'),
            src = fs.readFileSync(srcFilePath).toString(),
            expected = fs.readFileSync(expectedFilePath).toString();

        tests.push({
            name: dirName,
            src: normalizeNewLine(src),
            expected: normalizeNewLine(expected)
        });
    });

    return tests;
};

function parseTreeConstructionTestData(testSet, treeAdapter) {
    var testDescrs = [],
        curDirective = '',
        curDescr = null;

    testSet.split(/\r?\n/).forEach(function (line) {
        if (line === '#data') {
            curDescr = {};
            testDescrs.push(curDescr);
        }

        if (line[0] === '#') {
            curDirective = line;
            curDescr[curDirective] = [];
        }

        else
            curDescr[curDirective].push(line);
    });

    // NOTE: skip tests with the scripting disabled, since we are always act as the
    // interactive user agent.
    testDescrs = testDescrs.filter(function (descr) {
        return !descr['#script-off'];
    });

    return testDescrs.map(function (descr) {
        var fragmentContextTagName = descr['#document-fragment'] && descr['#document-fragment'][0];

        return {
            input: descr['#data'].join('\n'),
            expected: descr['#document'].join('\n'),
            expectedErrors: descr['#new-errors'] || [],
            disableEntitiesDecoding: !!descr['#disable-html-entities-decoding'],
            fragmentContext: createFragmentContext(fragmentContextTagName, treeAdapter)
        };
    });
}

exports.parseTreeConstructionTestData = parseTreeConstructionTestData;

exports.loadTreeConstructionTestData = function (dataDirs, treeAdapter) {
    var tests = [];

    dataDirs.forEach(function (dataDirPath) {
        var testSetFileNames = fs.readdirSync(dataDirPath),
            dirName = path.basename(dataDirPath);

        testSetFileNames.forEach(function (fileName) {
            if (path.extname(fileName) !== '.dat')
                return;

            var filePath = path.join(dataDirPath, fileName),
                testSet = fs.readFileSync(filePath, 'utf-8'),
                setName = fileName.replace('.dat', '');

            parseTreeConstructionTestData(testSet, treeAdapter).forEach(function (test) {
                tests.push(Object.assign(test, {
                    idx: tests.length,
                    setName: setName,
                    dirName: dirName
                }));
            });
        });
    });

    return tests;
};

exports.serializeToTestDataFormat = function (rootNode, treeAdapter) {
    function getSerializedTreeIndent(indent) {
        var str = '|';

        for (var i = 0; i < indent + 1; i++)
            str += ' ';

        return str;
    }

    function getElementSerializedNamespaceURI(element) {
        switch (treeAdapter.getNamespaceURI(element)) {
            case HTML.NAMESPACES.SVG:
                return 'svg ';
            case HTML.NAMESPACES.MATHML:
                return 'math ';
            default :
                return '';
        }
    }

    function serializeNodeList(nodes, indent) {
        var str = '';

        nodes.forEach(function (node) {
            str += getSerializedTreeIndent(indent);

            if (treeAdapter.isCommentNode(node))
                str += '<!-- ' + treeAdapter.getCommentNodeContent(node) + ' -->\n';

            else if (treeAdapter.isTextNode(node))
                str += '"' + treeAdapter.getTextNodeContent(node) + '"\n';

            else if (treeAdapter.isDocumentTypeNode(node)) {
                var parts = [],
                    publicId = treeAdapter.getDocumentTypeNodePublicId(node),
                    systemId = treeAdapter.getDocumentTypeNodeSystemId(node);

                str += '<!DOCTYPE';

                parts.push(treeAdapter.getDocumentTypeNodeName(node) || '');

                if (publicId !== null || systemId !== null) {
                    parts.push('"' + (publicId || '') + '"');
                    parts.push('"' + (systemId || '') + '"');
                }

                parts.forEach(function (part) {
                    str += ' ' + part;
                });

                str += '>\n';
            }

            else {
                var tn = treeAdapter.getTagName(node);

                str += '<' + getElementSerializedNamespaceURI(node) + tn + '>\n';

                var childrenIndent = indent + 2,
                    serializedAttrs = [];

                treeAdapter.getAttrList(node).forEach(function (attr) {
                    var attrStr = getSerializedTreeIndent(childrenIndent);

                    if (attr.prefix)
                        attrStr += attr.prefix + ' ';

                    attrStr += attr.name + '="' + attr.value + '"\n';

                    serializedAttrs.push(attrStr);
                });

                str += serializedAttrs.sort().join('');

                if (tn === HTML.TAG_NAMES.TEMPLATE && treeAdapter.getNamespaceURI(node) === HTML.NAMESPACES.HTML) {
                    str += getSerializedTreeIndent(childrenIndent) + 'content\n';
                    childrenIndent += 2;
                    node = treeAdapter.getTemplateContent(node);
                }

                str += serializeNodeList(treeAdapter.getChildNodes(node), childrenIndent);
            }
        });

        return str;
    }

    return serializeNodeList(treeAdapter.getChildNodes(rootNode), 0);
};

exports.prettyPrintParserAssertionArgs = function (actual, expected, chunks) {
    var msg = '\nExpected:\n';

    msg += '-----------------\n';
    msg += expected + '\n';
    msg += '\nActual:\n';
    msg += '-----------------\n';
    msg += actual + '\n';

    if (chunks) {
        msg += 'Chunks:\n';
        msg += JSON.stringify(chunks);
    }

    return msg;
};

exports.makeChunks = function (str, minSize, maxSize) {
    if (!str.length)
        return [''];

    var chunks = [],
        start = 0;

    // NOTE: add 1 as well, so we avoid situation when we have just one huge chunk
    var end = Math.min(getRandomChunkSize(minSize, maxSize), str.length, 1);

    while (start < str.length) {
        chunks.push(str.substring(start, end));
        start = end;
        end = Math.min(end + getRandomChunkSize(minSize, maxSize), str.length);
    }

    return chunks;
};

exports.parseChunked = function (html, opts, minChunkSize, maxChunkSize) {
    var parserStream = new parse5.ParserStream(opts),
        chunks = exports.makeChunks(html, minChunkSize, maxChunkSize);

    // NOTE: set small waterline for testing purposes
    parserStream.parser.tokenizer.preprocessor.bufferWaterline = 8;

    for (var i = 0; i < chunks.length - 1; i++)
        parserStream.write(chunks[i]);

    parserStream.end(chunks[chunks.length - 1]);

    return {
        document: parserStream.document,
        chunks: chunks
    };
};

exports.getSubstringByLineCol = function (lines, loc) {
    lines = lines.slice(loc.startLine - 1, loc.endLine);

    var last = lines.length - 1;

    lines[last] = lines[last].substring(0, loc.endCol - 1);
    lines[0] = lines[0].substring(loc.startCol - 1);

    return lines.join('\n');
};

exports.convertTokenToHtml5Lib = function (token) {
    switch (token.type) {
        case Tokenizer.CHARACTER_TOKEN:
        case Tokenizer.NULL_CHARACTER_TOKEN:
        case Tokenizer.WHITESPACE_CHARACTER_TOKEN:
            return ['Character', token.chars];

        case Tokenizer.START_TAG_TOKEN:
            var reformatedAttrs = {};

            token.attrs.forEach(function (attr) {
                reformatedAttrs[attr.name] = attr.value;
            });

            var startTagEntry = [
                'StartTag',
                token.tagName,
                reformatedAttrs
            ];

            if (token.selfClosing)
                startTagEntry.push(true);

            return startTagEntry;

        case Tokenizer.END_TAG_TOKEN:
            // NOTE: parser feedback simulator can produce adjusted SVG
            // tag names for end tag tokens so we need to lower case it
            return ['EndTag', token.tagName.toLowerCase()];

        case Tokenizer.COMMENT_TOKEN:
            return ['Comment', token.data];

        case Tokenizer.DOCTYPE_TOKEN:
            return [
                'DOCTYPE',
                token.name,
                token.publicId,
                token.systemId,
                !token.forceQuirks
            ];

        default:
            throw new TypeError('Unrecognized token type: ' + token.type);
    }
};
