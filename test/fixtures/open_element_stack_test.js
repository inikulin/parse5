var HTML = require('../../lib/html'),
    OpenElementStack = require('../../lib/open_element_stack').OpenElementStack,
    defaultTreeAdapter = require('../../lib/default_tree_adapter');

//Aliases
var $ = HTML.TAG_NAMES,
    NS = HTML.NAMESPACES;

exports['Push element'] = function (t) {
    var document = '#document',
        element1 = {tagName: '#element1', namespaceURI: 'namespace1'},
        element2 = {tagName: '#element2', namespaceURI: 'namespace2'},
        stack = new OpenElementStack(document, defaultTreeAdapter);

    t.strictEqual(stack.current, document);
    t.strictEqual(stack.stackTop, -1);

    stack.push(element1);
    t.strictEqual(stack.current, element1);
    t.strictEqual(stack.currentTagName, element1.tagName);
    t.strictEqual(stack.currentNamespaceURI, element1.namespaceURI);
    t.strictEqual(stack.stackTop, 0);

    stack.push(element2);
    t.strictEqual(stack.current, element2);
    t.strictEqual(stack.currentTagName, element2.tagName);
    t.strictEqual(stack.currentNamespaceURI, element2.namespaceURI);
    t.strictEqual(stack.stackTop, 1);

    t.done();
};

exports['Pop element'] = function (t) {
    var element = {tagName: '#element', namespaceURI: 'namespace1'},
        stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push(element);
    stack.push('#element2');
    stack.pop();
    t.strictEqual(stack.current, element);
    t.strictEqual(stack.currentTagName, element.tagName);
    t.strictEqual(stack.currentNamespaceURI, element.namespaceURI);
    t.strictEqual(stack.stackTop, 0);

    stack.pop();
    t.ok(!stack.current);
    t.ok(!stack.currentTagName);
    t.ok(!stack.currentNamespaceURI);
    t.strictEqual(stack.stackTop, -1);

    t.done();
};

exports['Replace element'] = function (t) {
    var element = {tagName: '#element', namespaceURI: 'namespace'},
        newElement = {tagName: '#newElement', namespaceURI: 'newElementNamespace'},
        stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push('#element2');
    stack.push(element);
    stack.replace(element, newElement);
    t.strictEqual(stack.current, newElement);
    t.strictEqual(stack.currentTagName, newElement.tagName);
    t.strictEqual(stack.currentNamespaceURI, newElement.namespaceURI);
    t.strictEqual(stack.stackTop, 1);

    t.done();
};

exports['Insert element after element'] = function (t) {
    var element1 = {tagName: '#element1', namespaceURI: 'namespace1'},
        element2 = {tagName: '#element2', namespaceURI: 'namespace2'},
        element3 = {tagName: '#element3', namespaceURI: 'namespace3'},
        stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push(element1);
    stack.push(element2);
    stack.insertAfter(element1, element3);
    t.strictEqual(stack.stackTop, 2);
    t.strictEqual(stack.items[1], element3);

    stack.insertAfter(element2, element1);
    t.strictEqual(stack.stackTop, 3);
    t.strictEqual(stack.current, element1);
    t.strictEqual(stack.currentTagName, element1.tagName);
    t.strictEqual(stack.currentNamespaceURI, element1.namespaceURI);

    t.done();
};

exports['Pop elements until popped with given tagName'] = function (t) {
    var element1 = {tagName: '#element1'},
        element2 = {tagName: '#element2'},
        stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push(element2);
    stack.push(element2);
    stack.push(element2);
    stack.push(element2);
    stack.popUntilTagNamePopped(element1.tagName);
    t.ok(!stack.current);
    t.strictEqual(stack.stackTop, -1);

    stack.push(element2);
    stack.push(element1);
    stack.push(element2);
    stack.popUntilTagNamePopped(element1.tagName);
    t.strictEqual(stack.current, element2);
    t.strictEqual(stack.stackTop, 0);

    t.done();
};

exports['Pop elements until given element popped'] = function (t) {
    var element1 = '#element1',
        element2 = '#element2',
        stack = new OpenElementStack('#document', defaultTreeAdapter);

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

exports['Pop elements until numbered header popped'] = function (t) {
    var element1 = {tagName: $.H3},
        element2 = {tagName: '#element2'},
        stack = new OpenElementStack('#document', defaultTreeAdapter);

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

exports['Pop all up to <html> element'] = function (t) {
    var htmlElement = '#html',
        stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push(htmlElement);
    stack.push('#element1');
    stack.push('#element2');

    stack.popAllUpToHtmlElement();
    t.strictEqual(stack.current, htmlElement);

    t.done();
};

exports['Clear back to a table context'] = function (t) {
    var htmlElement = {tagName: $.HTML},
        tableElement = {tagName: $.TABLE},
        divElement = {tagName: $.DIV},
        stack = new OpenElementStack({tagName: '#document'}, defaultTreeAdapter);

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

exports['Clear back to a table body context'] = function (t) {
    var htmlElement = {tagName: $.HTML},
        theadElement = {tagName: $.THEAD},
        divElement = {tagName: $.DIV},
        stack = new OpenElementStack({tagName: '#document'}, defaultTreeAdapter);

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

exports['Clear back to a table row context'] = function (t) {
    var htmlElement = {tagName: $.HTML},
        trElement = {tagName: $.TR},
        divElement = {tagName: $.DIV},
        stack = new OpenElementStack({tagName: '#document'}, defaultTreeAdapter);

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

exports['Remove element'] = function (t) {
    var element = '#element',
        stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push(element);
    stack.push('element1');
    stack.push('element2');

    stack.remove(element);

    t.strictEqual(stack.stackTop, 1);

    for (var i = stack.stackTop; i >= 0; i--)
        t.notStrictEqual(stack.items[i], element);

    t.done();
};

exports['Try peek properly nested <body> element'] = function (t) {
    var bodyElement = { tagName: $.BODY },
        stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push('#html');
    stack.push(bodyElement);
    stack.push('#element');
    t.strictEqual(stack.tryPeekProperlyNestedBodyElement(), bodyElement);

    stack = new OpenElementStack('#document', defaultTreeAdapter);
    stack.push('#html');
    t.ok(!stack.tryPeekProperlyNestedBodyElement());

    t.done();
};

exports['Is root <html> element current'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push({tagName: $.HTML});
    t.ok(stack.isRootHtmlElementCurrent());

    stack.push({tagName: $.DIV});
    t.ok(!stack.isRootHtmlElementCurrent());

    t.done();
};

exports['Get common ancestor'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter),
        element = '#element',
        ancestor = "#ancestor";

    stack.push('#someElement');
    t.ok(!stack.getCommonAncestor(element));

    stack.pop();
    t.ok(!stack.getCommonAncestor(element));

    stack.push(element);
    t.ok(!stack.getCommonAncestor(element));

    stack.push('#someElement');
    stack.push(ancestor);
    stack.push(element);
    t.strictEqual(stack.getCommonAncestor(element), ancestor);

    t.done();
};

exports['Contains element'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter),
        element = '#element';

    stack.push('#someElement');
    t.ok(!stack.contains(element));

    stack.push('#element');
    t.ok(stack.contains(element));

    t.done();
};

exports['Has element in scope'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push({tagName: $.HTML, namespaceURI: NS.HTML});
    stack.push({tagName: $.DIV, namespaceURI: NS.HTML});
    t.ok(!stack.hasInScope($.P));

    stack.push({tagName: $.P, namespaceURI: NS.HTML});
    stack.push({tagName: $.UL, namespaceURI: NS.HTML});
    stack.push({tagName: $.BUTTON, namespaceURI: NS.HTML});
    stack.push({tagName: $.OPTION, namespaceURI: NS.HTML});
    t.ok(stack.hasInScope($.P));

    stack.push({tagName: $.TITLE, namespaceURI: NS.SVG});
    t.ok(!stack.hasInScope($.P));

    t.done();
};

exports['Has numbered header in scope'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push({tagName: $.HTML, namespaceURI: NS.HTML});
    stack.push({tagName: $.DIV, namespaceURI: NS.HTML});
    t.ok(!stack.hasNumberedHeaderInScope());

    stack.push({tagName: $.P, namespaceURI: NS.HTML});
    stack.push({tagName: $.UL, namespaceURI: NS.HTML});
    stack.push({tagName: $.H3, namespaceURI: NS.HTML});
    stack.push({tagName: $.OPTION, namespaceURI: NS.HTML});
    t.ok(stack.hasNumberedHeaderInScope());

    stack.push({tagName: $.TITLE, namespaceURI: NS.SVG});
    t.ok(!stack.hasNumberedHeaderInScope());

    stack.push({tagName: $.H6, namespaceURI: NS.HTML});
    t.ok(stack.hasNumberedHeaderInScope());

    t.done();
};

exports['Has element in list item scope'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push({tagName: $.HTML, namespaceURI: NS.HTML});
    stack.push({tagName: $.DIV, namespaceURI: NS.HTML});
    t.ok(!stack.hasInListItemScope($.P));

    stack.push({tagName: $.P, namespaceURI: NS.HTML});
    stack.push({tagName: $.BUTTON, namespaceURI: NS.HTML});
    stack.push({tagName: $.OPTION, namespaceURI: NS.HTML});
    t.ok(stack.hasInListItemScope($.P));

    stack.push({tagName: $.UL, namespaceURI: NS.HTML});
    t.ok(!stack.hasInListItemScope($.P));

    t.done();
};

exports['Has element in button scope'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push({tagName: $.HTML, namespaceURI: NS.HTML});
    stack.push({tagName: $.DIV, namespaceURI: NS.HTML});
    t.ok(!stack.hasInButtonScope($.P));

    stack.push({tagName: $.P, namespaceURI: NS.HTML});
    stack.push({tagName: $.UL, namespaceURI: NS.HTML});
    stack.push({tagName: $.OPTION, namespaceURI: NS.HTML});
    t.ok(stack.hasInButtonScope($.P));

    stack.push({tagName: $.BUTTON, namespaceURI: NS.HTML});
    t.ok(!stack.hasInButtonScope($.P));

    t.done();
};


exports['Has element in table scope'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push({tagName: $.HTML, namespaceURI: NS.HTML});
    stack.push({tagName: $.DIV, namespaceURI: NS.HTML});
    t.ok(!stack.hasInTableScope($.P));

    stack.push({tagName: $.P, namespaceURI: NS.HTML});
    stack.push({tagName: $.UL, namespaceURI: NS.HTML});
    stack.push({tagName: $.TD, namespaceURI: NS.HTML});
    stack.push({tagName: $.OPTION, namespaceURI: NS.HTML});
    t.ok(stack.hasInTableScope($.P));

    stack.push({tagName: $.TABLE, namespaceURI: NS.HTML});
    t.ok(!stack.hasInTableScope($.P));

    t.done();
};

exports['Has table body context in table scope'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push({tagName: $.HTML, namespaceURI: NS.HTML});
    stack.push({tagName: $.DIV, namespaceURI: NS.HTML});
    t.ok(!stack.hasTableBodyContextInTableScope());

    stack.push({tagName: $.TABLE, namespaceURI: NS.HTML});
    stack.push({tagName: $.UL, namespaceURI: NS.HTML});
    stack.push({tagName: $.TBODY, namespaceURI: NS.HTML});
    stack.push({tagName: $.OPTION, namespaceURI: NS.HTML});
    t.ok(stack.hasTableBodyContextInTableScope());

    stack.push({tagName: $.TABLE, namespaceURI: NS.HTML});
    t.ok(!stack.hasTableBodyContextInTableScope());

    stack.push({tagName: $.TFOOT, namespaceURI: NS.HTML});
    t.ok(stack.hasTableBodyContextInTableScope());

    t.done();
};

exports['Has element in select scope'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push({tagName: $.HTML, namespaceURI: NS.HTML});
    stack.push({tagName: $.DIV, namespaceURI: NS.HTML});
    t.ok(!stack.hasInSelectScope($.P));

    stack.push({tagName: $.P, namespaceURI: NS.HTML});
    stack.push({tagName: $.OPTION, namespaceURI: NS.HTML});
    t.ok(stack.hasInSelectScope($.P));

    stack.push({tagName: $.DIV, namespaceURI: NS.HTML});
    t.ok(!stack.hasInSelectScope($.P));

    t.done();
};

exports['Generate implied end tags'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push({tagName: $.HTML, namespaceURI: NS.HTML});
    stack.push({tagName: $.LI, namespaceURI: NS.HTML});
    stack.push({tagName: $.DIV, namespaceURI: NS.HTML});
    stack.push({tagName: $.LI, namespaceURI: NS.HTML});
    stack.push({tagName: $.OPTION, namespaceURI: NS.HTML});
    stack.push({tagName: $.P, namespaceURI: NS.HTML});

    stack.generateImpliedEndTags();

    t.strictEqual(stack.stackTop, 2);
    t.strictEqual(stack.currentTagName, $.DIV);

    t.done();
};

exports['Generate implied end tags with exclusion'] = function (t) {
    var stack = new OpenElementStack('#document', defaultTreeAdapter);

    stack.push({tagName: $.HTML, namespaceURI: NS.HTML});
    stack.push({tagName: $.LI, namespaceURI: NS.HTML});
    stack.push({tagName: $.DIV, namespaceURI: NS.HTML});
    stack.push({tagName: $.LI, namespaceURI: NS.HTML});
    stack.push({tagName: $.OPTION, namespaceURI: NS.HTML});
    stack.push({tagName: $.P, namespaceURI: NS.HTML});

    stack.generateImpliedEndTagsWithExclusion($.LI);

    t.strictEqual(stack.stackTop, 3);
    t.strictEqual(stack.currentTagName, $.LI);

    t.done();
};

