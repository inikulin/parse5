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
                expected: descr['#document'].join('\n'),
                expectedErrors: descr['#errors'],
                fragmentCase: !!descr['#document-fragment'],
                contextElement: descr['#document-fragment'] || null
            });
        });
    });

    return tests;
}

function getFullTestName(test) {
    return [test.idx, '.', test.setName, ' - ', test.input].join('');
}

//Here we go..
loadTests().forEach(function (test) {
    //TODO
    return;
    exports[getFullTestName(test)] = function (t) {
        if(!test.fragmentCase){
            var parser = new Parser(test.input);
            parser.parse();
        }

        t.done();
    };
});

