import { it, assert } from 'vitest';
import { TAG_ID as $, TAG_NAMES as TN, NS } from '../common/html.js';
import { OpenElementStack } from './open-element-stack.js';
import type { TreeAdapterTypeMap } from '../tree-adapters/interface.js';
import { generateTestsForEachTreeAdapter } from 'parse5-test-utils/utils/common.js';

function ignore(): void {
    /* Ignore */
}

const stackHandler = {
    onItemPop: ignore,
    onItemPush: ignore,
};

generateTestsForEachTreeAdapter('open-element-stack', (treeAdapter) => {
    function createElement(tagName: string, namespaceURI = NS.HTML): TreeAdapterTypeMap['element'] {
        return treeAdapter.createElement(tagName, namespaceURI, []);
    }

    it('checks element identity and scope boundaries', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);
        stack.push(createElement(TN.HTML), $.HTML);
        const outer = createElement(TN.FORM);
        stack.push(outer, $.FORM);
        stack.push(createElement(TN.TABLE), $.TABLE);
        stack.push(createElement(TN.DIV), $.DIV);
        const inner = createElement(TN.FORM);
        stack.push(inner, $.FORM);
        assert.ok(stack.hasInScope($.FORM));
        assert.ok(stack.hasInScope($.FORM, inner));
        assert.ok(!stack.hasInScope($.FORM, outer));
        assert.ok(!stack.hasInScope($.FORM, createElement(TN.FORM)));
        stack.remove(inner);
        assert.ok(!stack.hasInScope($.FORM));
        stack.remove(outer);
        assert.ok(!stack.hasInScope($.FORM, outer));
        assert.ok(!stack.hasInScope($.FORM));
    });

    it('Push element', () => {
        const document = treeAdapter.createDocument();
        const element1 = createElement('#element1', NS.XLINK);
        const element2 = createElement('#element2', NS.SVG);
        const stack = new OpenElementStack(document, treeAdapter, stackHandler);

        assert.strictEqual(stack.current, document);
        assert.strictEqual(stack.stackTop, -1);

        stack.push(element1, $.UNKNOWN);
        assert.strictEqual(stack.current, element1);
        assert.strictEqual(stack.stackTop, 0);

        stack.push(element2, $.UNKNOWN);
        assert.strictEqual(stack.current, element2);
        assert.strictEqual(stack.stackTop, 1);
    });

    it('Pop element', () => {
        const element = createElement('#element', NS.XLINK);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(element, $.UNKNOWN);
        stack.push(createElement('#element2', NS.XML), $.UNKNOWN);
        stack.pop();
        assert.strictEqual(stack.current, element);
        assert.strictEqual(stack.stackTop, 0);

        stack.pop();
        assert.ok(!stack.current);
        assert.ok(!stack.currentTagId);
        assert.strictEqual(stack.stackTop, -1);
    });

    it('Replace element', () => {
        const element = createElement('#element', NS.MATHML);
        const newElement = createElement('#newElement', NS.SVG);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(createElement('#element2', NS.XML), $.UNKNOWN);
        stack.push(element, $.UNKNOWN);
        stack.replace(element, newElement);
        assert.strictEqual(stack.current, newElement);
        assert.strictEqual(stack.stackTop, 1);
    });

    // A stack 64 elements deep indexes its elements; the stack edits and searches below behave alike on both.
    function openStack(depth: number): OpenElementStack<TreeAdapterTypeMap> {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(createElement(TN.HTML), $.HTML);
        for (let i = 0; i < depth; i++) stack.push(createElement('x-y'), $.UNKNOWN);

        return stack;
    }

    function openElements(stack: OpenElementStack<TreeAdapterTypeMap>): unknown[] {
        const elements = [];

        for (let i = stack.stackTop; i !== -1; i = stack.slotBelow(i)) elements.unshift(stack.items[i]);

        return elements;
    }

    it.each([0, 64])('Replaces a formatting element above the furthest block (%i elements below)', (depth) => {
        const stack = openStack(depth);
        const formatting = createElement(TN.B);
        const kept = createElement(TN.I);
        const removed = createElement(TN.SPAN);
        const furthestBlock = createElement(TN.DIV);
        const replacement = createElement(TN.B);
        const above = createElement(TN.P);
        const upper = createElement(TN.B);

        stack.push(formatting, $.B);
        stack.push(kept, $.I);
        stack.push(removed, $.SPAN);
        stack.push(furthestBlock, $.DIV);
        stack.push(above, $.P);
        stack.push(upper, $.B);
        stack.removeAt(stack._indexOf(removed));
        stack.replaceFormattingElement(stack._indexOf(formatting), stack._indexOf(furthestBlock), replacement, $.B);

        assert.deepStrictEqual(openElements(stack).slice(-5), [kept, furthestBlock, replacement, above, upper]);
        assert.strictEqual(stack.depth, depth + 6);
        assert.strictEqual(stack.getCommonAncestor(replacement), furthestBlock);
        assert.strictEqual(stack.items[stack.indexOfTopmost($.B)], upper);
        assert.strictEqual(stack.items[stack.indexOfTopmost($.DIV)], furthestBlock);
        assert.ok(!stack.contains(formatting));
        assert.ok(stack.hasSpecialElementAbove(stack._indexOf(replacement)));
        assert.ok(stack.hasInScope($.B, replacement));

        stack.pop();
        assert.strictEqual(stack.items[stack.indexOfTopmost($.B)], replacement);

        stack.pop();
        stack.pop();
        assert.strictEqual(stack.current, furthestBlock);
        assert.ok(!stack.hasSpecialElementAbove(stack.stackTop));
        assert.strictEqual(stack.indexOfTopmost($.B), -1);
    });

    it.each([0, 64])('Replaces a formatting element above the current element (%i elements below)', (depth) => {
        const stack = openStack(depth);
        const formatting = createElement(TN.B);
        const kept = createElement(TN.I);
        const furthestBlock = createElement(TN.DIV);
        const replacement = createElement(TN.B);

        stack.push(formatting, $.B);
        stack.push(kept, $.I);
        stack.push(furthestBlock, $.DIV);
        stack.replaceFormattingElement(stack._indexOf(formatting), stack.stackTop, replacement, $.B);

        assert.strictEqual(stack.current, replacement);
        assert.strictEqual(stack.currentTagId, $.B);
        assert.strictEqual(stack.getCommonAncestor(replacement), furthestBlock);
        assert.strictEqual(stack.getCommonAncestor(furthestBlock), kept);
        assert.strictEqual(stack.items[stack._indexOf(kept)], kept);
    });

    it('Pop elements until popped with given tagName', () => {
        const element1 = createElement(TN.ASIDE);
        const element2 = createElement(TN.MAIN);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(element2, $.MAIN);
        stack.push(element2, $.MAIN);
        stack.push(element2, $.MAIN);
        stack.push(element2, $.MAIN);
        stack.popUntilTagNamePopped($.ASIDE);
        assert.ok(!stack.current);
        assert.strictEqual(stack.stackTop, -1);

        stack.push(element2, $.MAIN);
        stack.push(element1, $.ASIDE);
        stack.push(element2, $.MAIN);
        stack.popUntilTagNamePopped($.ASIDE);
        assert.strictEqual(stack.current, element2);
        assert.strictEqual(stack.stackTop, 0);
    });

    it('Pop elements until given element popped', () => {
        const element1 = createElement('#element1');
        const element2 = createElement('#element2');
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(element2, $.UNKNOWN);
        stack.push(element2, $.UNKNOWN);
        stack.push(element2, $.UNKNOWN);
        stack.push(element2, $.UNKNOWN);
        stack.popUntilElementPopped(element1);
        assert.ok(!stack.current);
        assert.strictEqual(stack.stackTop, -1);

        stack.push(element2, $.UNKNOWN);
        stack.push(element1, $.UNKNOWN);
        stack.push(element2, $.UNKNOWN);
        stack.popUntilElementPopped(element1);
        assert.strictEqual(stack.current, element2);
        assert.strictEqual(stack.stackTop, 0);
    });

    it('Pop elements until numbered header popped', () => {
        const element1 = createElement(TN.H3);
        const element2 = createElement(TN.DIV);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(element2, $.DIV);
        stack.push(element2, $.DIV);
        stack.push(element2, $.DIV);
        stack.push(element2, $.DIV);
        stack.popUntilNumberedHeaderPopped();
        assert.ok(!stack.current);
        assert.strictEqual(stack.stackTop, -1);

        stack.push(element2, $.DIV);
        stack.push(element1, $.H3);
        stack.push(element2, $.DIV);
        stack.popUntilNumberedHeaderPopped();
        assert.strictEqual(stack.current, element2);
        assert.strictEqual(stack.stackTop, 0);
    });

    it('Pop all up to <html> element', () => {
        const htmlElement = createElement(TN.HTML);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(htmlElement, $.HTML);
        stack.push('#element1', $.UNKNOWN);
        stack.push('#element2', $.UNKNOWN);

        stack.popAllUpToHtmlElement();
        assert.strictEqual(stack.current, htmlElement);
    });

    it('Clear back to a table context', () => {
        const htmlElement = createElement(TN.HTML);
        const tableElement = createElement(TN.TABLE);
        const divElement = createElement(TN.DIV);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(htmlElement, $.HTML);
        stack.push(divElement, $.DIV);
        stack.push(divElement, $.DIV);
        stack.push(divElement, $.DIV);
        stack.clearBackToTableContext();
        assert.strictEqual(stack.current, htmlElement);
        assert.strictEqual(stack.stackTop, 0);

        stack.push(divElement, $.DIV);
        stack.push(tableElement, $.TABLE);
        stack.push(divElement, $.DIV);
        stack.push(divElement, $.DIV);
        stack.clearBackToTableContext();
        assert.strictEqual(stack.current, tableElement);
        assert.strictEqual(stack.stackTop, 2);
    });

    it('Clear back to a table body context', () => {
        const htmlElement = createElement(TN.HTML);
        const theadElement = createElement(TN.THEAD);
        const divElement = createElement(TN.DIV);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(htmlElement, $.HTML);
        stack.push(divElement, $.DIV);
        stack.push(divElement, $.DIV);
        stack.push(divElement, $.DIV);
        stack.clearBackToTableBodyContext();
        assert.strictEqual(stack.current, htmlElement);
        assert.strictEqual(stack.stackTop, 0);

        stack.push(divElement, $.DIV);
        stack.push(theadElement, $.THEAD);
        stack.push(divElement, $.DIV);
        stack.push(divElement, $.DIV);
        stack.clearBackToTableBodyContext();
        assert.strictEqual(stack.current, theadElement);
        assert.strictEqual(stack.stackTop, 2);
    });

    it('Clear back to a table row context', () => {
        const htmlElement = createElement(TN.HTML);
        const trElement = createElement(TN.TR);
        const divElement = createElement(TN.DIV);
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(htmlElement, $.HTML);
        stack.push(divElement, $.DIV);
        stack.push(divElement, $.DIV);
        stack.push(divElement, $.DIV);
        stack.clearBackToTableRowContext();
        assert.strictEqual(stack.current, htmlElement);
        assert.strictEqual(stack.stackTop, 0);

        stack.push(divElement, $.DIV);
        stack.push(trElement, $.TR);
        stack.push(divElement, $.DIV);
        stack.push(divElement, $.DIV);
        stack.clearBackToTableRowContext();
        assert.strictEqual(stack.current, trElement);
        assert.strictEqual(stack.stackTop, 2);
    });

    it('Remove element', () => {
        const element = createElement('#element');
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(element, $.UNKNOWN);
        stack.push(createElement('element1'), $.UNKNOWN);
        stack.push(createElement('element2'), $.UNKNOWN);

        stack.remove(element);

        assert.strictEqual(stack.depth, 2);

        for (let i = stack.stackTop; i >= 0; i--) {
            assert.notStrictEqual(stack.items[i], element);
        }
    });

    it.each([0, 64])('Answers searches across removals from the middle (%i elements below)', (depth) => {
        const stack = openStack(depth);
        const li = createElement(TN.LI);
        const table = createElement(TN.TABLE);
        const div = createElement(TN.DIV);
        const svg = createElement(TN.SVG, NS.SVG);
        const g = createElement('g', NS.SVG);

        stack.push(li, $.LI);
        stack.push(table, $.TABLE);
        stack.push(div, $.DIV);
        stack.push(svg, $.SVG);
        stack.push(g, $.UNKNOWN);
        const liIdx = stack._indexOf(li);
        assert.ok(stack.hasListItemBoundaryAbove(liIdx));
        assert.ok(!stack.hasInListItemScope($.LI));
        assert.strictEqual(stack.items[stack.indexOfTopmostHtmlElement()], div);

        stack.remove(table);
        assert.ok(!stack.hasListItemBoundaryAbove(stack._indexOf(li)));
        assert.ok(stack.hasSpecialElementAbove(stack._indexOf(li)));
        assert.ok(stack.hasInListItemScope($.LI));

        stack.remove(div);
        assert.ok(!stack.hasSpecialElementAbove(stack._indexOf(li)));
        assert.strictEqual(stack.items[stack.indexOfTopmostHtmlElement()], li);
        assert.strictEqual(stack.items[stack.indexOfTopmostByName(NS.SVG, 'g')], g);
        assert.strictEqual(stack.getCommonAncestor(svg), li);
    });

    it('Try peek properly nested <body> element', () => {
        const bodyElement = createElement(TN.BODY);
        let stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(bodyElement, $.BODY);
        stack.push(createElement(TN.DIV), $.DIV);
        assert.strictEqual(stack.tryPeekProperlyNestedBodyElement(), bodyElement);

        stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);
        stack.push(createElement(TN.HTML), $.HTML);
        assert.ok(!stack.tryPeekProperlyNestedBodyElement());
    });

    it('Is root <html> element current', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(createElement(TN.HTML), $.HTML);
        assert.ok(stack.isRootHtmlElementCurrent());

        stack.push(createElement(TN.DIV), $.DIV);
        assert.ok(!stack.isRootHtmlElementCurrent());
    });

    it('Get common ancestor', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);
        const element = createElement('#element');
        const ancestor = createElement('#ancestor');

        stack.push(createElement('#someElement'), $.UNKNOWN);
        assert.ok(!stack.getCommonAncestor(element));

        stack.pop();
        assert.ok(!stack.getCommonAncestor(element));

        stack.push(element, $.UNKNOWN);
        assert.ok(!stack.getCommonAncestor(element));

        stack.push(createElement('#someElement'), $.UNKNOWN);
        stack.push(ancestor, $.UNKNOWN);
        stack.push(element, $.UNKNOWN);
        assert.strictEqual(stack.getCommonAncestor(element), ancestor);
    });

    it('Contains element', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);
        const element = createElement('#element');

        stack.push(createElement('#someElement'), $.UNKNOWN);
        assert.ok(!stack.contains(element));

        stack.push(element, $.UNKNOWN);
        assert.ok(stack.contains(element));
    });

    it('Has element in scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(createElement(TN.DIV), $.DIV);
        assert.ok(!stack.hasInScope($.P));

        stack.push(createElement(TN.P), $.P);
        stack.push(createElement(TN.UL), $.UL);
        stack.push(createElement(TN.BUTTON), $.BUTTON);
        stack.push(createElement(TN.OPTION), $.OPTION);
        assert.ok(stack.hasInScope($.P));

        stack.push(createElement(TN.TITLE, NS.SVG), $.TITLE);
        assert.ok(!stack.hasInScope($.P));
    });

    it('Has numbered header in scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        assert.ok(stack.hasNumberedHeaderInScope());

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(createElement(TN.DIV), $.DIV);
        assert.ok(!stack.hasNumberedHeaderInScope());

        stack.push(createElement(TN.P), $.P);
        stack.push(createElement(TN.UL), $.UL);
        stack.push(createElement(TN.H3), $.H3);
        stack.push(createElement(TN.OPTION), $.OPTION);
        assert.ok(stack.hasNumberedHeaderInScope());

        stack.push(createElement(TN.TITLE, NS.SVG), $.TITLE);
        assert.ok(!stack.hasNumberedHeaderInScope());

        stack.push(createElement(TN.H6), $.H6);
        assert.ok(stack.hasNumberedHeaderInScope());
    });

    it('Has element in list item scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        assert.ok(stack.hasInListItemScope($.P));

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(createElement(TN.DIV), $.DIV);
        assert.ok(!stack.hasInListItemScope($.P));

        stack.push(createElement(TN.P), $.P);
        stack.push(createElement(TN.BUTTON), $.BUTTON);
        stack.push(createElement(TN.OPTION), $.OPTION);
        assert.ok(stack.hasInListItemScope($.P));

        stack.push(createElement(TN.UL), $.UL);
        assert.ok(!stack.hasInListItemScope($.P));
    });

    it('Has element in button scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        assert.ok(stack.hasInButtonScope($.P));

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(createElement(TN.DIV), $.DIV);
        assert.ok(!stack.hasInButtonScope($.P));

        stack.push(createElement(TN.P), $.P);
        stack.push(createElement(TN.UL), $.UL);
        stack.push(createElement(TN.OPTION), $.OPTION);
        assert.ok(stack.hasInButtonScope($.P));

        stack.push(createElement(TN.BUTTON), $.BUTTON);
        assert.ok(!stack.hasInButtonScope($.P));
    });

    it('Has element in table scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(createElement(TN.DIV), $.DIV);
        assert.ok(!stack.hasInTableScope($.P));

        stack.push(createElement(TN.P), $.P);
        stack.push(createElement(TN.UL), $.UL);
        stack.push(createElement(TN.TD), $.TD);
        stack.push(createElement(TN.OPTION), $.OPTION);
        assert.ok(stack.hasInTableScope($.P));

        stack.push(createElement(TN.TABLE), $.TABLE);
        assert.ok(!stack.hasInTableScope($.P));
    });

    it('Has table body context in table scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(createElement(TN.DIV), $.DIV);
        assert.ok(!stack.hasTableBodyContextInTableScope());

        stack.push(createElement(TN.TABLE), $.TABLE);
        stack.push(createElement(TN.UL), $.UL);
        stack.push(createElement(TN.TBODY), $.TBODY);
        stack.push(createElement(TN.OPTION), $.OPTION);
        assert.ok(stack.hasTableBodyContextInTableScope());

        stack.push(createElement(TN.TABLE), $.TABLE);
        assert.ok(!stack.hasTableBodyContextInTableScope());

        stack.push(createElement(TN.TFOOT), $.TFOOT);
        assert.ok(stack.hasTableBodyContextInTableScope());
    });

    it('Has element in select scope', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        assert.ok(stack.hasInSelectScope($.P));

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(createElement(TN.DIV), $.DIV);
        assert.ok(!stack.hasInSelectScope($.P));

        stack.push(createElement(TN.P), $.P);
        stack.push(createElement(TN.OPTION), $.OPTION);
        assert.ok(stack.hasInSelectScope($.P));

        stack.push(createElement(TN.DIV), $.DIV);
        assert.ok(!stack.hasInSelectScope($.P));
    });

    it('Generate implied end tags', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(createElement(TN.LI), $.LI);
        stack.push(createElement(TN.DIV), $.DIV);
        stack.push(createElement(TN.LI), $.LI);
        stack.push(createElement(TN.OPTION), $.OPTION);
        stack.push(createElement(TN.P), $.P);

        stack.generateImpliedEndTags();

        assert.strictEqual(stack.stackTop, 2);
        assert.strictEqual(stack.currentTagId, $.DIV);
    });

    it('Generate implied end tags with exclusion', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(createElement(TN.LI), $.LI);
        stack.push(createElement(TN.DIV), $.DIV);
        stack.push(createElement(TN.LI), $.LI);
        stack.push(createElement(TN.OPTION), $.OPTION);
        stack.push(createElement(TN.P), $.P);

        stack.generateImpliedEndTagsWithExclusion($.LI);

        assert.strictEqual(stack.stackTop, 3);
        assert.strictEqual(stack.currentTagId, $.LI);
    });

    it('Generate implied end tags - foreign elements', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(createElement(TN.OPTION, NS.SVG), $.OPTION);

        stack.generateImpliedEndTags();
        stack.generateImpliedEndTagsThoroughly();
        stack.generateImpliedEndTagsWithExclusion($.P);

        assert.strictEqual(stack.stackTop, 1);
        assert.strictEqual(stack.currentTagId, $.OPTION);
    });

    it('Template count', () => {
        const stack = new OpenElementStack(treeAdapter.createDocument(), treeAdapter, stackHandler);

        stack.push(createElement(TN.HTML), $.HTML);
        stack.push(createElement(TN.TEMPLATE, NS.MATHML), $.TEMPLATE);
        assert.strictEqual(stack.tmplCount, 0);

        stack.push(createElement(TN.TEMPLATE), $.TEMPLATE);
        stack.push(createElement(TN.LI), $.LI);
        assert.strictEqual(stack.tmplCount, 1);

        stack.push(createElement(TN.OPTION), $.OPTION);
        stack.push(createElement(TN.TEMPLATE), $.TEMPLATE);
        assert.strictEqual(stack.tmplCount, 2);

        stack.pop();
        assert.strictEqual(stack.tmplCount, 1);

        stack.pop();
        stack.pop();
        stack.pop();
        assert.strictEqual(stack.tmplCount, 0);
    });
});
