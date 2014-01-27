var fs = require('fs'),
    path = require('path'),
    HTML = require('../../lib/html'),
    Parser = require('../../lib/parser'),
    testGenerator = require('../test_generator');

testGenerator.defineForEachTreeAdapter(module.exports, function (_test, adapterName, treeAdapter) {
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
        switch (treeAdapter.getNamespaceURI(element)) {
            case HTML.NAMESPACES.SVG:
                return 'svg ';
            case HTML.NAMESPACES.MATHML:
                return 'math ';
            default :
                return '';
        }
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
                str += '<' + getElementSerializedNamespaceURI(node) + treeAdapter.getTagName(node) + '>\n';

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
                str += serializeNodeList(treeAdapter.getChildNodes(node), childrenIndent);
            }
        });

        return str;
    }

    //Here we go..
    loadTests().forEach(function (test) {
        _test[getFullTestName(test)] = function (t) {
            var parser = new Parser(treeAdapter),
                result = test.fragmentContext ? parser.parseFragment(test.input, test.fragmentContext) : parser.parse(test.input),
                serializedResult = serializeNodeList(treeAdapter.getChildNodes(result), 0);

            t.strictEqual(serializedResult, test.expected, getAssertionMessage(serializedResult, test.expected));
            t.done();
        };
    });
});

