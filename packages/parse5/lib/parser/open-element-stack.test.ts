import * as assert from 'node:assert';
import { TAG_NAMES as $, NAMESPACES as NS } from '../common/html.js';
import { OpenElementStack } from './open-element-stack.js';
import { generateTestsForEachTreeAdapter } from '@parse5/test-utils/utils/common.js';

generateTestsForEachTreeAdapter('open-element-stack', (treeAdapter) => {
    function createElement(tagName: string, namespaceURI = NS.HTML) {
        return treeAdapter.createElement(tagName, namespaceURI, []);
    }

    test('Push element', () => {
        const document = treeAdapter.createDocument();
        const element1 = createElement('#element1', NS.XLINK);
        const element2 = createElement('#element2', NS.SVG);
        const stack = new OpenElementStack(document, treeAdapter);

        assert.strictEqual(stack.current, document);
        assert.strictEqual(stack.stackTop, -1);

        stack.push(element1);
        assert.strictEqual(stack.current, element1);
        assert.strictEqual(stack.currentTagName, treeAdapter.getTagName(element1));
        assert.strictEqual(stack.stackTop, 0);

        stack.push(element2);
        assert.strictEqual(stack.current, element2);
        assert.strictEqual(stack.currentTagName, treeAdapter.getTagName(element2));
        assert.strictEqual(stack.stackTop, 1);
    });

    test('Pop element', () => {
        const element = createElement('#element', NS.XLINK);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element);
        stack.push('#element2');
        stack.pop();
        assert.strictEqual(stack.current, element);
        assert.strictEqual(stack.currentTagName, treeAdapter.getTagName(element));
        assert.strictEqual(stack.stackTop, 0);

        stack.pop();
        assert.ok(!stack.current);
        assert.ok(!stack.currentTagName);
        assert.strictEqual(stack.stackTop, -1);
    });

    test('Replace element', () => {
        const element = createElement('#element', NS.MATHML);
        const newElement = createElement('#newElement', NS.SVG);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push('#element2');
        stack.push(element);
        stack.replace(element, newElement);
        assert.strictEqual(stack.current, newElement);
        assert.strictEqual(stack.currentTagName, treeAdapter.getTagName(newElement));
        assert.strictEqual(stack.stackTop, 1);
    });

    test('Insert element after element', () => {
        const element1 = createElement('#element1', NS.XLINK);
        const element2 = createElement('#element2', NS.SVG);
        const element3 = createElement('#element3', NS.XML);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element1);
        stack.push(element2);
        stack.insertAfter(element1, element3);
        assert.strictEqual(stack.stackTop, 2);
        assert.strictEqual(stack.items[1], element3);

        stack.insertAfter(element2, element1);
        assert.strictEqual(stack.stackTop, 3);
        assert.strictEqual(stack.current, element1);
        assert.strictEqual(stack.currentTagName, treeAdapter.getTagName(element1));
    });

    test('Pop elements until popped with given tagName', () => {
        const element1 = treeAdapter.createElement('#element1', NS.HTML, []);
        const element2 = treeAdapter.createElement('#element2', NS.HTML, []);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.popUntilTagNamePopped(treeAdapter.getTagName(element1));
        assert.ok(!stack.current);
        assert.strictEqual(stack.stackTop, -1);

        stack.push(element2);
        stack.push(element1);
        stack.push(element2);
        stack.popUntilTagNamePopped(treeAdapter.getTagName(element1));
        assert.strictEqual(stack.current, element2);
        assert.strictEqual(stack.stackTop, 0);
    });

    test('Pop elements until given element popped', () => {
        const element1 = createElement('#element1');
        const element2 = createElement('#element2');
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.popUntilElementPopped(element1);
        assert.ok(!stack.current);
        assert.strictEqual(stack.stackTop, -1);

        stack.push(element2);
        stack.push(element1);
        stack.push(element2);
        stack.popUntilElementPopped(element1);
        assert.strictEqual(stack.current, element2);
        assert.strictEqual(stack.stackTop, 0);
    });

    test('Pop elements until numbered header popped', () => {
        const element1 = treeAdapter.createElement($.H3, NS.HTML, []);
        const element2 = createElement('#element2');
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.push(element2);
        stack.popUntilNumberedHeaderPopped();
        assert.ok(!stack.current);
        assert.strictEqual(stack.stackTop, -1);

        stack.push(element2);
        stack.push(element1);
        stack.push(element2);
        stack.popUntilNumberedHeaderPopped();
        assert.strictEqual(stack.current, element2);
        assert.strictEqual(stack.stackTop, 0);
    });

    test('Pop all up to <html> element', () => {
        const htmlElement = treeAdapter.createElement($.HTML, NS.HTML, []);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(htmlElement);
        stack.push('#element1');
        stack.push('#element2');

        stack.popAllUpToHtmlElement();
        assert.strictEqual(stack.current, htmlElement);
    });

    test('Clear back to a table context', () => {
        const htmlElement = treeAdapter.createElement($.HTML, NS.HTML, []);
        const tableElement = treeAdapter.createElement($.TABLE, NS.HTML, []);
        const divElement = treeAdapter.createElement($.DIV, NS.HTML, []);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(htmlElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableContext();
        assert.strictEqual(stack.current, htmlElement);
        assert.strictEqual(stack.stackTop, 0);

        stack.push(divElement);
        stack.push(tableElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableContext();
        assert.strictEqual(stack.current, tableElement);
        assert.strictEqual(stack.stackTop, 2);
    });

    test('Clear back to a table body context', () => {
        const htmlElement = treeAdapter.createElement($.HTML, NS.HTML, []);
        const theadElement = treeAdapter.createElement($.THEAD, NS.HTML, []);
        const divElement = treeAdapter.createElement($.DIV, NS.HTML, []);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(htmlElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableBodyContext();
        assert.strictEqual(stack.current, htmlElement);
        assert.strictEqual(stack.stackTop, 0);

        stack.push(divElement);
        stack.push(theadElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableBodyContext();
        assert.strictEqual(stack.current, theadElement);
        assert.strictEqual(stack.stackTop, 2);
    });

    test('Clear back to a table row context', () => {
        const htmlElement = treeAdapter.createElement($.HTML, NS.HTML, []);
        const trElement = treeAdapter.createElement($.TR, NS.HTML, []);
        const divElement = treeAdapter.createElement($.DIV, NS.HTML, []);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(htmlElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableRowContext();
        assert.strictEqual(stack.current, htmlElement);
        assert.strictEqual(stack.stackTop, 0);

        stack.push(divElement);
        stack.push(trElement);
        stack.push(divElement);
        stack.push(divElement);
        stack.clearBackToTableRowContext();
        assert.strictEqual(stack.current, trElement);
        assert.strictEqual(stack.stackTop, 2);
    });

    test('Remove element', () => {
        const element = createElement('#element');
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(element);
        stack.push(createElement('element1'));
        stack.push(createElement('element2'));

        stack.remove(element);

        assert.strictEqual(stack.stackTop, 1);

        for (let i = stack.stackTop; i >= 0; i--) {
            assert.notStrictEqual(stack.items[i], element);
        }
    });

    test('Try peek properly nested <body> element', () => {
        const bodyElement = createElement($.BODY, NS.HTML);
        let stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(createElement($.HTML));
        stack.push(bodyElement);
        stack.push(createElement($.DIV));
        assert.strictEqual(stack.tryPeekProperlyNestedBodyElement(), bodyElement);

        stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);
        stack.push(createElement($.HTML));
        assert.ok(!stack.tryPeekProperlyNestedBodyElement());
    });

    test('Is root <html> element current', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(createElement($.HTML));
        assert.ok(stack.isRootHtmlElementCurrent());

        stack.push(createElement($.DIV));
        assert.ok(!stack.isRootHtmlElementCurrent());
    });

    test('Get common ancestor', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);
        const element = createElement('#element');
        const ancestor = createElement('#ancestor');

        stack.push(createElement('#someElement'));
        assert.ok(!stack.getCommonAncestor(element));

        stack.pop();
        assert.ok(!stack.getCommonAncestor(element));

        stack.push(element);
        assert.ok(!stack.getCommonAncestor(element));

        stack.push(createElement('#someElement'));
        stack.push(ancestor);
        stack.push(element);
        assert.strictEqual(stack.getCommonAncestor(element), ancestor);
    });

    test('Contains element', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);
        const element = createElement('#element');

        stack.push(createElement('#someElement'));
        assert.ok(!stack.contains(element));

        stack.push(element);
        assert.ok(stack.contains(element));
    });

    test('Has element in scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        assert.ok(!stack.hasInScope($.P));

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        stack.push(treeAdapter.createElement($.BUTTON, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        assert.ok(stack.hasInScope($.P));

        stack.push(treeAdapter.createElement($.TITLE, NS.SVG, []));
        assert.ok(!stack.hasInScope($.P));
    });

    test('Has numbered header in scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        assert.ok(!stack.hasNumberedHeaderInScope());

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        stack.push(treeAdapter.createElement($.H3, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        assert.ok(stack.hasNumberedHeaderInScope());

        stack.push(treeAdapter.createElement($.TITLE, NS.SVG, []));
        assert.ok(!stack.hasNumberedHeaderInScope());

        stack.push(treeAdapter.createElement($.H6, NS.HTML, []));
        assert.ok(stack.hasNumberedHeaderInScope());
    });

    test('Has element in list item scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        assert.ok(!stack.hasInListItemScope($.P));

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.BUTTON, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        assert.ok(stack.hasInListItemScope($.P));

        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        assert.ok(!stack.hasInListItemScope($.P));
    });

    test('Has element in button scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        assert.ok(!stack.hasInButtonScope($.P));

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        assert.ok(stack.hasInButtonScope($.P));

        stack.push(treeAdapter.createElement($.BUTTON, NS.HTML, []));
        assert.ok(!stack.hasInButtonScope($.P));
    });

    test('Has element in table scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        assert.ok(!stack.hasInTableScope($.P));

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        stack.push(treeAdapter.createElement($.TD, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        assert.ok(stack.hasInTableScope($.P));

        stack.push(treeAdapter.createElement($.TABLE, NS.HTML, []));
        assert.ok(!stack.hasInTableScope($.P));
    });

    test('Has table body context in table scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        assert.ok(!stack.hasTableBodyContextInTableScope());

        stack.push(treeAdapter.createElement($.TABLE, NS.HTML, []));
        stack.push(treeAdapter.createElement($.UL, NS.HTML, []));
        stack.push(treeAdapter.createElement($.TBODY, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        assert.ok(stack.hasTableBodyContextInTableScope());

        stack.push(treeAdapter.createElement($.TABLE, NS.HTML, []));
        assert.ok(!stack.hasTableBodyContextInTableScope());

        stack.push(treeAdapter.createElement($.TFOOT, NS.HTML, []));
        assert.ok(stack.hasTableBodyContextInTableScope());
    });

    test('Has element in select scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        assert.ok(!stack.hasInSelectScope($.P));

        stack.push(treeAdapter.createElement($.P, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        assert.ok(stack.hasInSelectScope($.P));

        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        assert.ok(!stack.hasInSelectScope($.P));
    });

    test('Generate implied end tags', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.LI, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        stack.push(treeAdapter.createElement($.LI, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        stack.push(treeAdapter.createElement($.P, NS.HTML, []));

        stack.generateImpliedEndTags();

        assert.strictEqual(stack.stackTop, 2);
        assert.strictEqual(stack.currentTagName, $.DIV);
    });

    test('Generate implied end tags with exclusion', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.LI, NS.HTML, []));
        stack.push(treeAdapter.createElement($.DIV, NS.HTML, []));
        stack.push(treeAdapter.createElement($.LI, NS.HTML, []));
        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        stack.push(treeAdapter.createElement($.P, NS.HTML, []));

        stack.generateImpliedEndTagsWithExclusion($.LI);

        assert.strictEqual(stack.stackTop, 3);
        assert.strictEqual(stack.currentTagName, $.LI);
    });

    test('Template count', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter);

        stack.push(treeAdapter.createElement($.HTML, NS.HTML, []));
        stack.push(treeAdapter.createElement($.TEMPLATE, NS.MATHML, []));
        assert.strictEqual(stack.tmplCount, 0);

        stack.push(treeAdapter.createElement($.TEMPLATE, NS.HTML, []));
        stack.push(treeAdapter.createElement($.LI, NS.HTML, []));
        assert.strictEqual(stack.tmplCount, 1);

        stack.push(treeAdapter.createElement($.OPTION, NS.HTML, []));
        stack.push(treeAdapter.createElement($.TEMPLATE, NS.HTML, []));
        assert.strictEqual(stack.tmplCount, 2);

        stack.pop();
        assert.strictEqual(stack.tmplCount, 1);

        stack.pop();
        stack.pop();
        stack.pop();
        assert.strictEqual(stack.tmplCount, 0);
    });
});
