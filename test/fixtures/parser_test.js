var fs = require('fs'),
    path = require('path'),
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

        testSet.split(/\n|\r/).forEach(function (line) {
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
                input: descr['#data'].join(''),
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

function serializeNode(node, indent) {
    var str = getSerializedTreeIndent(indent);

    switch (node.nodeName) {
        case '#comment':
            str += '<!-- ' + node.data + ' -->\n';
            break;

        case '#text':
            str += '"' + node.value + '"\n';
            break;

        default:
            str += '<' + node.tagName + '>\n';

            var childrenIndent = indent + 2;

            for (var i = 0; i < node.attrs.length; i++) {
                str += getSerializedTreeIndent(childrenIndent);
                str += node.attrs[i].name + '="' + node.attrs[i].value + '"\n';
            }

            for (var i = 0; i < node.childNodes.length; i++)
                str += serializeNode(node.childNodes[i], childrenIndent);
    }

    return str;
}

function serializeTree(document) {
    //TODO serialize doctype here
    var str = '';

    for (var i = 0; i < document.childNodes.length; i++)
        str += serializeNode(document.childNodes[i], 0);

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
    if (test.idx !== 11)
        return;
    exports[getFullTestName(test)] = function (t) {
        //TODO fragment parsing
        //TODO handler errors
        if (!test.fragmentCase) {
            var parser = new Parser(test.input),
                document = parser.parse(),
                serializedDocument = serializeTree(document);

            t.strictEqual(serializedDocument, test.expected, getAssertionMessage(serializedDocument, test.expected));
        }

        t.done();
    };
});

