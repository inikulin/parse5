var fs = require('fs'),
    path = require('path'),
    HTML = require('../../lib/html'),
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

            else if (line !== '')
                curDescr[curDirective].push(line);
        });

        testDescrs.forEach(function (descr) {
            tests.push({
                idx: ++testIdx,
                setName: setName,
                input: descr['#data'].join('\r\n'),
                expected: descr['#document'].join('\n') + '\n',
                expectedErrors: descr['#errors'],
                fragmentCase: !!descr['#document-fragment'],
                contextElement: descr['#document-fragment'] || null
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


    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

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

                for (var j = 0; j < parts.length; j++)
                    str += ' ' + parts[j];

                str += '>\n';
                break;

            default:
                str += '<' + getElementSerializedNamespaceURI(node) + node.tagName + '>\n';

                var childrenIndent = indent + 2;

                for (var j = 0; j < node.attrs.length; j++) {
                    str += getSerializedTreeIndent(childrenIndent);

                    if (node.attrs[j].prefix)
                        str += node.attrs[j].prefix + ' ';

                    str += node.attrs[j].name + '="' + node.attrs[j].value + '"\n';
                }

                str += serializeNodeList(node.childNodes, childrenIndent);
        }
    }

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
    if (test.idx !== 272)
        return;
    exports[getFullTestName(test)] = function (t) {
        //TODO fragment parsing
        //TODO handler errors
        if (!test.fragmentCase) {
            var parser = new Parser(test.input),
                document = parser.parse(),
                serializedDocument = serializeNodeList(document.childNodes, 0);

            t.strictEqual(serializedDocument, test.expected, getAssertionMessage(serializedDocument, test.expected));
        }

        t.done();
    };
});

