const HTML = require('../../packages/parse5/lib/common/html');

function createFragmentContext(tagName, treeAdapter) {
    if (!tagName) {
        return null;
    }

    let namespace = HTML.NAMESPACES.HTML;
    const parts = tagName.split(' ');

    if (parts.length > 1) {
        tagName = parts[1];

        if (parts[0] === 'svg') {
            namespace = HTML.NAMESPACES.SVG;
        } else if (parts[0] === 'math') {
            namespace = HTML.NAMESPACES.MATHML;
        }
    }

    return treeAdapter.createElement(tagName, namespace, []);
}

module.exports = function parseDatFile(testSet, treeAdapter) {
    const testDescrs = [];
    let curDirective = '';
    let curDescr = null;

    testSet.split(/\r?\n/).forEach((line, idx) => {
        if (line === '#data') {
            curDescr = { '#line': idx + 1 };
            testDescrs.push(curDescr);
        }

        if (line[0] === '#') {
            curDirective = line;
            curDescr[curDirective] = [];
        } else {
            curDescr[curDirective].push(line);
        }
    });

    return testDescrs.map(descr => {
        const fragmentContextTagName = descr['#document-fragment'] && descr['#document-fragment'][0];

        return {
            input: descr['#data'].join('\n'),
            expected: descr['#document'].join('\n'),
            expectedErrors: descr['#new-errors'] || [],
            disableEntitiesDecoding: !!descr['#disable-html-entities-decoding'],
            lineNum: descr['#line'],
            scriptingEnabled: !descr['#script-off'],
            fragmentContext: createFragmentContext(fragmentContextTagName, treeAdapter)
        };
    });
};
