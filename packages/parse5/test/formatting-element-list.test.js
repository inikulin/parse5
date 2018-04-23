'use strict';

const assert = require('assert');
const HTML = require('../lib/common/html');
const FormattingElementList = require('../lib/parser/formatting-element-list');
const { generateTestsForEachTreeAdapter } = require('../../../test/utils/common');

//Aliases
const $ = HTML.TAG_NAMES;
const NS = HTML.NAMESPACES;

generateTestsForEachTreeAdapter(module.exports, (_test, treeAdapter) => {
    _test['Insert marker'] = function() {
        const list = new FormattingElementList(treeAdapter);

        list.insertMarker();
        assert.strictEqual(list.length, 1);
        assert.strictEqual(list.entries[0].type, FormattingElementList.MARKER_ENTRY);

        list.insertMarker();
        assert.strictEqual(list.length, 2);
        assert.strictEqual(list.entries[1].type, FormattingElementList.MARKER_ENTRY);
    };

    _test['Push element'] = function() {
        const list = new FormattingElementList(treeAdapter);
        const element1Token = 'token1';
        const element2Token = 'token2';
        const element1 = treeAdapter.createElement($.DIV, NS.HTML, []);
        const element2 = treeAdapter.createElement($.P, NS.HTML, []);

        list.pushElement(element1, element1Token);
        assert.strictEqual(list.length, 1);
        assert.strictEqual(list.entries[0].type, FormattingElementList.ELEMENT_ENTRY);
        assert.strictEqual(list.entries[0].element, element1);
        assert.strictEqual(list.entries[0].token, element1Token);

        list.pushElement(element2, element2Token);
        assert.strictEqual(list.length, 2);
        assert.strictEqual(list.entries[1].type, FormattingElementList.ELEMENT_ENTRY);
        assert.strictEqual(list.entries[1].element, element2);
        assert.strictEqual(list.entries[1].token, element2Token);
    };

    _test['Insert element after bookmark'] = function() {
        const list = new FormattingElementList(treeAdapter);
        const token = 'token1';
        const element1 = treeAdapter.createElement($.DIV, NS.HTML, []);
        const element2 = treeAdapter.createElement($.P, NS.HTML, []);
        const element3 = treeAdapter.createElement($.SPAN, NS.HTML, []);
        const element4 = treeAdapter.createElement($.TITLE, NS.HTML, []);

        list.pushElement(element1, token);
        list.bookmark = list.entries[0];

        list.pushElement(element2, token);
        list.pushElement(element3, token);

        list.insertElementAfterBookmark(element4, token);

        assert.strictEqual(list.length, 4);
        assert.strictEqual(list.entries[1].element, element4);
    };

    _test['Push element - Noah Ark condition'] = function() {
        const list = new FormattingElementList(treeAdapter);
        const token1 = 'token1';
        const token2 = 'token2';
        const token3 = 'token3';
        const token4 = 'token4';
        const token5 = 'token5';
        const token6 = 'token6';

        const element1 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'val2' }
        ]);

        const element2 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'someOtherValue' }
        ]);

        list.pushElement(element1, token1);
        list.pushElement(element1, token2);
        list.pushElement(element2, token3);
        list.pushElement(element1, token4);

        assert.strictEqual(list.length, 4);
        assert.strictEqual(list.entries[0].token, token1);
        assert.strictEqual(list.entries[1].token, token2);
        assert.strictEqual(list.entries[2].token, token3);
        assert.strictEqual(list.entries[3].token, token4);

        list.pushElement(element1, token5);

        assert.strictEqual(list.length, 4);
        assert.strictEqual(list.entries[0].token, token2);
        assert.strictEqual(list.entries[1].token, token3);
        assert.strictEqual(list.entries[2].token, token4);
        assert.strictEqual(list.entries[3].token, token5);

        list.insertMarker();
        list.pushElement(element1, token6);

        assert.strictEqual(list.length, 6);
        assert.strictEqual(list.entries[0].token, token2);
        assert.strictEqual(list.entries[1].token, token3);
        assert.strictEqual(list.entries[2].token, token4);
        assert.strictEqual(list.entries[3].token, token5);
        assert.strictEqual(list.entries[4].type, FormattingElementList.MARKER_ENTRY);
        assert.strictEqual(list.entries[5].token, token6);
    };

    _test['Clear to the last marker'] = function() {
        const list = new FormattingElementList(treeAdapter);
        const token = 'token';

        const element1 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'val2' }
        ]);

        const element2 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'someOtherValue' }
        ]);

        list.pushElement(element1, token);
        list.pushElement(element2, token);
        list.insertMarker();
        list.pushElement(element1, token);
        list.pushElement(element1, token);
        list.pushElement(element2, token);

        list.clearToLastMarker();

        assert.strictEqual(list.length, 2);
    };

    _test['Remove entry'] = function() {
        const list = new FormattingElementList(treeAdapter);
        const token = 'token';

        const element1 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'val2' }
        ]);

        const element2 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'someOtherValue' }
        ]);

        list.pushElement(element1, token);
        list.pushElement(element2, token);
        list.pushElement(element2, token);

        list.removeEntry(list.entries[0]);

        assert.strictEqual(list.length, 2);

        for (let i = list.length - 1; i >= 0; i--) {
            assert.notStrictEqual(list.entries[i].element, element1);
        }
    };

    _test['Get entry in scope with given tag name'] = function() {
        const list = new FormattingElementList(treeAdapter);
        const token = 'token';
        const element = treeAdapter.createElement($.DIV, NS.HTML, []);

        assert.ok(!list.getElementEntryInScopeWithTagName($.DIV));

        list.pushElement(element, token);
        list.pushElement(element, token);
        assert.strictEqual(list.getElementEntryInScopeWithTagName($.DIV), list.entries[1]);

        list.insertMarker();
        assert.ok(!list.getElementEntryInScopeWithTagName($.DIV));

        list.pushElement(element, token);
        assert.strictEqual(list.getElementEntryInScopeWithTagName($.DIV), list.entries[3]);
    };

    _test['Get element entry'] = function() {
        const list = new FormattingElementList(treeAdapter);
        const token = 'token';
        const element1 = treeAdapter.createElement($.DIV, NS.HTML, []);
        const element2 = treeAdapter.createElement($.A, NS.HTML, []);

        list.pushElement(element2, token);
        list.pushElement(element1, token);
        list.pushElement(element2, token);
        list.insertMarker();

        const entry = list.getElementEntry(element1);

        assert.strictEqual(entry.type, FormattingElementList.ELEMENT_ENTRY);
        assert.strictEqual(entry.token, token);
        assert.strictEqual(entry.element, element1);
    };
});
