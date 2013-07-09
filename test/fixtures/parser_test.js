var fs = require('fs'),
    path = require('path'),
    HTML = require('../../lib/html'),
    treeAdapter = require('../../lib/default_tree_adapter'),
    Parser = require('../../lib/parser').Parser;

function loadTests() {
    var dataDirPath = path.join(__dirname, '../data/tree-construction'),
        testSetFileNames = fs.readdirSync(dataDirPath),
        testIdx = 0,
        tests = [];

    testSetFileNames.forEach(function (fileName) {
        var filePath = path.join(dataDirPath, fileName),
            testSet = fs.readFileSync(filePath).toString(),
            setName = fileName.replace('.dat', ''),
            testDescrs = [],
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

        testDescrs.forEach(function (descr) {
            var fragmentContextTagName = descr['#document-fragment'] && descr['#document-fragment'].join('');

            tests.push({
                idx: ++testIdx,
                setName: setName,
                input: descr['#data'].join('\r\n'),
                expected: descr['#document'].join('\n'),
                expectedErrors: descr['#errors'],
                fragmentContext: fragmentContextTagName ?
                    treeAdapter.createElement(fragmentContextTagName, HTML.NAMESPACES.HTML, []) : null
            });
        });
    });

    return tests;
}

//Tree serialization
function getSerializedTreeIndent(indent) {
    var str = '|';

    for (var i = 0; i < indent + 1; i++)
        str += ' ';

    return str;
}

function getElementSerializedNamespaceURI(element) {
    switch (element.namespaceURI) {
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

        switch (node.nodeName) {
            case '#comment':
                str += '<!-- ' + node.data + ' -->\n';
                break;

            case '#text':
                str += '"' + node.value + '"\n';
                break;

            case "#documentType":
                var parts = [];

                str += '<!DOCTYPE';

                parts.push(node.name || '');

                if (node.publicId !== null || node.systemId !== null) {
                    parts.push('"' + (node.publicId || '') + '"');
                    parts.push('"' + (node.systemId || '') + '"');
                }

                parts.forEach(function (part) {
                    str += ' ' + part;
                });

                str += '>\n';
                break;

            default:
                str += '<' + getElementSerializedNamespaceURI(node) + node.tagName + '>\n';

                var childrenIndent = indent + 2,
                    serializedAttrs = [];

                node.attrs.forEach(function (attr) {
                    var attrStr = getSerializedTreeIndent(childrenIndent);

                    if (attr.prefix)
                        attrStr += attr.prefix + ' ';

                    attrStr += attr.name + '="' + attr.value + '"\n';

                    serializedAttrs.push(attrStr);
                });

                str += serializedAttrs.sort().join('');
                str += serializeNodeList(node.childNodes, childrenIndent);
        }
    });

    return str;
}

function getFullTestName(test) {
    return [test.idx, '.', test.setName, ' - ', test.input].join('');
}

function getAssertionMessage(actual, expected) {
    var msg = '\nExpected:\n';
    msg += '-----------------\n';
    msg += expected + '\n';
    msg += '\nActual:\n';
    msg += '-----------------\n';
    msg += actual + '\n';

    return msg;
}

//Here we go..
loadTests().forEach(function (test) {
    exports[getFullTestName(test)] = function (t) {
        //TODO handle errors
        var parser = new Parser(test.input, test.fragmentContext),
            document = parser.parse(),
            serializedDocument = serializeNodeList(document.childNodes, 0);

        t.strictEqual(serializedDocument, test.expected, getAssertionMessage(serializedDocument, test.expected));
        t.done();
    };
});

