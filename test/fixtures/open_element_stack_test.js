var HTML = require('../../lib/common/html'),
    OpenElementStack = require('../../lib/tree_construction/open_element_stack'),
    TestUtils = require('../test_utils');

//Aliases
var $ = HTML.TAG_NAMES,
    NS = HTML.NAMESPACES;

TestUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, adapterName, treeAdapter) {
    _test['Push element'] = function (t) {
        var document = treeAdapter.createDocument(),
            element1 = treeAdapter.createElement('#element1', 'namespace1', []),
            element2 = treeAdapter.createElement('#element2', 'namespace2', []),
            stack = new OpenElementStack(document, treeAdapter);

        t.strictEqual(stack.current, document);
        t.strictEqual(stack.stackTop, -1);

        stack.push(element1);
        t.strictEqual(stack.current, element1);
        t.strictEqual(stack.currentTagName, treeAdapter.getTagName(element1));
        t.strictEqual(stack.stackTop, 0);

        stack.push(element2);
        t.strictEqual(stack.current, element2);
        t.strictEqual(stack.currentTagName, treeAdapter.getTagName(element2));
        t.strictEqual(stack.stackTop, 1);

        t.done();
    };

    _test['Pop element'] = function (t) {
        var element = treeAdapter.createElement('#element', 'namespace1', []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element);
        stack.push('#element2');
        stack.pop();
        t.strictEqual(stack.current, element);
        t.strictEqual(stack.currentTagName, treeAdapter.getTagName(element));
        t.strictEqual(stack.stackTop, 0);

        stack.pop();
        t.ok(!stack.current);
        t.ok(!stack.currentTagName);
        t.strictEqual(stack.stackTop, -1);

        t.done();
    };

    _test['Replace element'] = function (t) {
        var element = treeAdapter.createElement('#element', 'namespace', []),
            newElement = treeAdapter.createElement('#newElement', 'newElementNamespace', []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push('#element2');
        stack.push(element);
        stack.replace(element, newElement);
        t.strictEqual(stack.current, newElement);
        t.strictEqual(stack.currentTagName, treeAdapter.getTagName(newElement));
        t.strictEqual(stack.stackTop, 1);

        t.done();
    };

    _test['Insert element after element'] = function (t) {
        var element1 = treeAdapter.createElement('#element1', 'namespace1', []),
            element2 = treeAdapter.createElement('#element2', 'namespace2', []),
            element3 = treeAdapter.createElement('#element3', 'namespace3', []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element1);
        stack.push(element2);
        stack.insertAfter(element1, element3);
        t.strictEqual(stack.stackTop, 2);
        t.strictEqual(stack.items[1], element3);

        stack.insertAfter(element2, element1);
        t.strictEqual(stack.stackTop, 3);
        t.strictEqual(stack.current, element1);
        t.strictEqual(stack.currentTagName, treeAdapter.getTagName(element1));

        t.done();
    };

    _test['Pop elements until popped with given tagName'] = function (t) {
        var element1 = treeAdapter.createElement('#element1', '', []),
            element2 = treeAdapter.createElement('#element2', '', []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.popUntilTagNamePopped(treeAdapter.getTagName(element1));
        t.ok(!stack.current);
        t.strictEqual(stack.stackTop, -1);

        stack.push(element2);
        stack.push(element1);
        stack.push(element2);
        stack.popUntilTagNamePopped(treeAdapter.getTagName(element1));
        t.strictEqual(stack.current, element2);
        t.strictEqual(stack.stackTop, 0);

        t.done();
    };

    _test['Pop elements until given element popped'] = function (t) {
        var element1 = treeAdapter.createElement('#element1', '', []),
            element2 = treeAdapter.createElement('#element2', '', []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.popUntilElementPopped(element1);
        t.ok(!stack.current);
        t.strictEqual(stack.stackTop, -1);

        stack.push(element2);
        stack.push(element1);
        stack.push(element2);
        stack.popUntilElementPopped(element1);
        t.strictEqual(stack.current, element2);
        t.strictEqual(stack.stackTop, 0);

        t.done();
    };

    _test['Pop elements until numbered header popped'] = function (t) {
        var element1 = treeAdapter.createElement($.H3, '', []),
            element2 = treeAdapter.createElement('#element2', '', []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.popUntilNumberedHeaderPopped();
        t.ok(!stack.current);
        t.strictEqual(stack.stackTop, -1);

        stack.push(element2);
        stack.push(element1);
        stack.push(element2);
        stack.popUntilNumberedHeaderPopped();
        t.strictEqual(stack.current, element2);
        t.strictEqual(stack.stackTop, 0);

        t.done();
    };

    _test['Pop all up to <html> element'] = function (t) {
        var htmlElement = treeAdapter.createElement($.HTML, NS.HTML, []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(htmlElement);
        stack.push('#element1');
        stack.push('#element2');

        stack.popAllUpToHtmlElement();
        t.strictEqual(stack.current, htmlElement);

        t.done();
    };

    _test['Clear back to a table context'] = function (t) {
        var htmlElement = treeAdapter.createElement($.HTML, '', []),
            tableElement = treeAdapter.createElement($.TABLE, '', []),
            divElement = treeAdapter.createElement($.DIV, '', []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(htmlElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableContext();
        t.strictEqual(stack.current, htmlElement);
        t.strictEqual(stack.stackTop, 0);

        stack.push(divElement);
        stack.push(tableElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableContext();
        t.strictEqual(stack.current, tableElement);
        t.strictEqual(stack.stackTop, 2);

        t.done();
    };

    _test['Clear back to a table body context'] = function (t) {
        var htmlElement = treeAdapter.createElement($.HTML, '', []),
            theadElement = treeAdapter.createElement($.THEAD, '', []),
            divElement = treeAdapter.createElement($.DIV, '', []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(htmlElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableBodyContext();
        t.strictEqual(stack.current, htmlElement);
        t.strictEqual(stack.stackTop, 0);

        stack.push(divElement);
        stack.push(theadElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableBodyContext();
        t.strictEqual(stack.current, theadElement);
        t.strictEqual(stack.stackTop, 2);

        t.done();
    };

    _test['Clear back to a table row context'] = function (t) {
        var htmlElement = treeAdapter.createElement($.HTML, '', []),
            trElement = treeAdapter.createElement($.TR, '', []),
            divElement = treeAdapter.createElement($.DIV, '', []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(htmlElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableRowContext();
        t.strictEqual(stack.current, htmlElement);
        t.strictEqual(stack.stackTop, 0);

        stack.push(divElement);
        stack.push(trElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableRowContext();
        t.strictEqual(stack.current, trElement);
        t.strictEqual(stack.stackTop, 2);

        t.done();
    };

    _test['Remove element'] = function (t) {
        var element = treeAdapter.createElement('#element', '', []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element);
        stack.push(treeAdapter.createElement('element1', '', []));
        stack.push(treeAdapter.createElement('element2', '', []));

        stack.remove(element);

        t.strictEqual(stack.stackTop, 1);

        for (var i = stack.stackTop; i >= 0; i--)
            t.notStrictEqual(stack.items[i], element);

        t.done();
    };

    _test['Try peek properly nested <body> element'] = function (t) {
        var bodyElement = treeAdapter.createElement($.BODY, '', []),
            stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, '', []));
        stack.push(bodyElement);
        stack.push(treeAdapter.createElement($.DIV, '', []));
        t.strictEqual(stack.tryPeekProperlyNestedBodyElement(), bodyElement);

        stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);
        stack.push(treeAdapter.createElement($.HTML, '', []));
        t.ok(!stack.tryPeekProperlyNestedBodyElement());

        t.done();
    };

    _test['Is root <html> element current'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, '', []));
        t.ok(stack.isRootHtmlElementCurrent());

        stack.push(treeAdapter.createElement($.DIV, '', []));
        t.ok(!stack.isRootHtmlElementCurrent());

        t.done();
    };

    _test['Get common ancestor'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter),
            element = treeAdapter.createElement('#element', '', []),
            ancestor = treeAdapter.createElement('#ancestor', '', []);

        stack.push(treeAdapter.createElement('#someElement', '', []));
        t.ok(!stack.getCommonAncestor(element));

        stack.pop();
        t.ok(!stack.getCommonAncestor(element));

        stack.push(element);
        t.ok(!stack.getCommonAncestor(element));

        stack.push(treeAdapter.createElement('#someElement', '', []));
        stack.push(ancestor);
        stack.push(element);
        t.strictEqual(stack.getCommonAncestor(element), ancestor);

        t.done();
    };

    _test['Contains element'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter),
            element = treeAdapter.createElement('#element', '', []);

        stack.push(treeAdapter.createElement('#someElement', '', []));
        t.ok(!stack.contains(element));

        stack.push(element);
        t.ok(stack.contains(element));

        t.done();
    };

    _test['Has element in scope'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        t.ok(!stack.hasInScope($.P));

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        stack.push(treeAdapter.createElement($.BUTTON, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        t.ok(stack.hasInScope($.P));

        stack.push(treeAdapter.createElement($.TITLE, NS.SVG, []));
        t.ok(!stack.hasInScope($.P));

        t.done();
    };

    _test['Has numbered header in scope'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        t.ok(!stack.hasNumberedHeaderInScope());

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        stack.push(treeAdapter.createElement($.H3, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        t.ok(stack.hasNumberedHeaderInScope());

        stack.push(treeAdapter.createElement($.TITLE, NS.SVG, []));
        t.ok(!stack.hasNumberedHeaderInScope());

        stack.push(treeAdapter.createElement($.H6, NS.HTML, []));
        t.ok(stack.hasNumberedHeaderInScope());

        t.done();
    };

    _test['Has element in list item scope'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        t.ok(!stack.hasInListItemScope($.P));

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.BUTTON, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        t.ok(stack.hasInListItemScope($.P));

        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        t.ok(!stack.hasInListItemScope($.P));

        t.done();
    };

    _test['Has element in button scope'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        t.ok(!stack.hasInButtonScope($.P));

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        t.ok(stack.hasInButtonScope($.P));

        stack.push(treeAdapter.createElement($.BUTTON, NS.HTML, []));
        t.ok(!stack.hasInButtonScope($.P));

        t.done();
    };


    _test['Has element in table scope'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        t.ok(!stack.hasInTableScope($.P));

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        stack.push(treeAdapter.createElement($.TD, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        t.ok(stack.hasInTableScope($.P));

        stack.push(treeAdapter.createElement($.TABLE, NS.HTML, []));
        t.ok(!stack.hasInTableScope($.P));

        t.done();
    };

    _test['Has table body context in table scope'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        t.ok(!stack.hasTableBodyContextInTableScope());

        stack.push(treeAdapter.createElement($.TABLE, NS.HTML, []));
        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        stack.push(treeAdapter.createElement($.TBODY, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        t.ok(stack.hasTableBodyContextInTableScope());

        stack.push(treeAdapter.createElement($.TABLE, NS.HTML, []));
        t.ok(!stack.hasTableBodyContextInTableScope());

        stack.push(treeAdapter.createElement($.TFOOT, NS.HTML, []));
        t.ok(stack.hasTableBodyContextInTableScope());

        t.done();
    };

    _test['Has element in select scope'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        t.ok(!stack.hasInSelectScope($.P));

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        t.ok(stack.hasInSelectScope($.P));

        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        t.ok(!stack.hasInSelectScope($.P));

        t.done();
    };

    _test['Generate implied end tags'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.LI, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        stack.push(treeAdapter.createElement($.LI, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        stack.push(treeAdapter.createElement($.P, NS.HTML, []));

        stack.generateImpliedEndTags();

        t.strictEqual(stack.stackTop, 2);
        t.strictEqual(stack.currentTagName, $.DIV);

        t.done();
    };

    _test['Generate implied end tags with exclusion'] = function (t) {
        var stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.LI, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        stack.push(treeAdapter.createElement($.LI, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        stack.push(treeAdapter.createElement($.P, NS.HTML, []));

        stack.generateImpliedEndTagsWithExclusion($.LI);

        t.strictEqual(stack.stackTop, 3);
        t.strictEqual(stack.currentTagName, $.LI);

        t.done();
    };
});