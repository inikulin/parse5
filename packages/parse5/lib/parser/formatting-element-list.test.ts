import * as assert from 'node:assert';
import { TAG_NAMES as $, NS, getTagID } from '../common/html.js';
import { type TagToken, TokenType } from '../common/token.js';
import { type DefaultTreeAdapterMap } from '../tree-adapters/default.js';
import { FormattingElementList, EntryType, type ElementEntry } from './formatting-element-list.js';
import { generateTestsForEachTreeAdapter } from 'parse5-test-utils/utils/common.js';

function createToken(name: $): TagToken {
    return {
        type: TokenType.START_TAG,
        tagName: name,
        tagID: getTagID(name),
        ackSelfClosing: false,
        selfClosing: false,
        attrs: [],
        location: null,
    };
}

generateTestsForEachTreeAdapter('FormattingElementList', (treeAdapter) => {
    it('Insert marker', () => {
        const list = new FormattingElementList(treeAdapter);

        list.insertMarker();
        assert.strictEqual(list.entries.length, 1);
        assert.strictEqual(list.entries[0].type, EntryType.Marker);

        list.insertMarker();
        assert.strictEqual(list.entries.length, 2);
        assert.strictEqual(list.entries[0].type, EntryType.Marker);
    });

    it('Push element', () => {
        const list = new FormattingElementList(treeAdapter);
        const element1Token = createToken($.DIV);
        const element2Token = createToken($.P);
        const element1 = treeAdapter.createElement($.DIV, NS.HTML, []);
        const element2 = treeAdapter.createElement($.P, NS.HTML, []);

        list.pushElement(element1, element1Token);
        assert.strictEqual(list.entries.length, 1);
        assert.strictEqual(list.entries[0].type, EntryType.Element as const);
        assert.strictEqual(list.entries[0].element, element1);
        assert.strictEqual(list.entries[0].token, element1Token);

        list.pushElement(element2, element2Token);
        assert.strictEqual(list.entries.length, 2);
        assert.strictEqual(list.entries[0].type, EntryType.Element);
        assert.strictEqual(list.entries[0].element, element2);
        assert.strictEqual(list.entries[0].token, element2Token);
    });

    it('Insert element after bookmark', () => {
        const list = new FormattingElementList(treeAdapter);
        const element1 = treeAdapter.createElement($.DIV, NS.HTML, []);
        const element2 = treeAdapter.createElement($.P, NS.HTML, []);
        const element3 = treeAdapter.createElement($.SPAN, NS.HTML, []);
        const element4 = treeAdapter.createElement($.TITLE, NS.HTML, []);

        list.pushElement(element1, createToken($.DIV));
        list.bookmark = list.entries[0];

        list.pushElement(element2, createToken($.P));
        list.pushElement(element3, createToken($.SPAN));

        list.insertElementAfterBookmark(element4, createToken($.TITLE));

        assert.strictEqual(list.entries.length, 4);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[2], 'element'));
        assert.equal((list.entries[2] as ElementEntry<DefaultTreeAdapterMap>).element, element4);
    });

    it('Push element - Noah Ark condition', () => {
        const list = new FormattingElementList(treeAdapter);
        const token1 = createToken($.DIV);
        const token2 = createToken($.DIV);
        const token3 = createToken($.DIV);
        const token4 = createToken($.DIV);
        const token5 = createToken($.DIV);
        const token6 = createToken($.DIV);

        const element1 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'val2' },
        ]);

        const element2 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'someOtherValue' },
        ]);

        list.pushElement(element1, token1);
        list.pushElement(element1, token2);
        list.pushElement(element2, token3);
        list.pushElement(element1, token4);

        assert.strictEqual(list.entries.length, 4);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[3], 'token'));
        assert.equal((list.entries[3] as ElementEntry<DefaultTreeAdapterMap>).token, token1);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[2], 'token'));
        assert.equal((list.entries[2] as ElementEntry<DefaultTreeAdapterMap>).token, token2);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[1], 'token'));
        assert.equal((list.entries[1] as ElementEntry<DefaultTreeAdapterMap>).token, token3);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[0], 'token'));
        assert.equal((list.entries[0] as ElementEntry<DefaultTreeAdapterMap>).token, token4);

        list.pushElement(element1, token5);

        assert.strictEqual(list.entries.length, 4);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[3], 'token'));
        assert.equal((list.entries[3] as ElementEntry<DefaultTreeAdapterMap>).token, token2);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[2], 'token'));
        assert.equal((list.entries[2] as ElementEntry<DefaultTreeAdapterMap>).token, token3);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[1], 'token'));
        assert.equal((list.entries[1] as ElementEntry<DefaultTreeAdapterMap>).token, token4);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[0], 'token'));
        assert.equal((list.entries[0] as ElementEntry<DefaultTreeAdapterMap>).token, token5);

        list.insertMarker();
        list.pushElement(element1, token6);

        assert.strictEqual(list.entries.length, 6);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[5], 'token'));
        assert.equal((list.entries[5] as ElementEntry<DefaultTreeAdapterMap>).token, token2);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[4], 'token'));
        assert.equal((list.entries[4] as ElementEntry<DefaultTreeAdapterMap>).token, token3);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[3], 'token'));
        assert.equal((list.entries[3] as ElementEntry<DefaultTreeAdapterMap>).token, token4);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[2], 'token'));
        assert.equal((list.entries[2] as ElementEntry<DefaultTreeAdapterMap>).token, token5);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[1], 'type'));
        assert.equal(list.entries[1].type, EntryType.Marker);
        assert.ok(Object.prototype.hasOwnProperty.call(list.entries[0], 'token'));
        assert.equal((list.entries[0] as ElementEntry<DefaultTreeAdapterMap>).token, token6);
    });

    it('Clear to the last marker', () => {
        const list = new FormattingElementList(treeAdapter);
        const token = createToken($.DIV);

        const element1 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'val2' },
        ]);

        const element2 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'someOtherValue' },
        ]);

        list.pushElement(element1, token);
        list.pushElement(element2, token);
        list.insertMarker();
        list.pushElement(element1, token);
        list.pushElement(element1, token);
        list.pushElement(element2, token);

        list.clearToLastMarker();

        assert.strictEqual(list.entries.length, 2);

        list.clearToLastMarker();

        assert.strictEqual(list.entries.length, 0);
    });

    it('Remove entry', () => {
        const list = new FormattingElementList(treeAdapter);
        const token = createToken($.DIV);

        const element1 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'val2' },
        ]);

        const element2 = treeAdapter.createElement($.DIV, NS.HTML, [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'someOtherValue' },
        ]);

        list.pushElement(element1, token);
        list.pushElement(element2, token);
        list.pushElement(element2, token);

        list.removeEntry(list.entries[2]);

        assert.strictEqual(list.entries.length, 2);

        for (let i = 0; i < list.entries.length; i++) {
            assert.notEqual((list.entries[i] as ElementEntry<DefaultTreeAdapterMap>).element, element1);
        }
    });

    it('Get entry in scope with given tag name', () => {
        const list = new FormattingElementList(treeAdapter);
        const token = createToken($.DIV);
        const element = treeAdapter.createElement($.DIV, NS.HTML, []);

        assert.ok(!list.getElementEntryInScopeWithTagName($.DIV));

        list.pushElement(element, token);
        list.pushElement(element, token);
        assert.strictEqual(list.getElementEntryInScopeWithTagName($.DIV), list.entries[0]);

        list.insertMarker();
        assert.ok(!list.getElementEntryInScopeWithTagName($.DIV));

        list.pushElement(element, token);
        assert.strictEqual(list.getElementEntryInScopeWithTagName($.DIV), list.entries[0]);
    });

    it('Get element entry', () => {
        const list = new FormattingElementList(treeAdapter);
        const token = createToken($.DIV);
        const element1 = treeAdapter.createElement($.DIV, NS.HTML, []);
        const element2 = treeAdapter.createElement($.A, NS.HTML, []);

        list.pushElement(element2, token);
        list.pushElement(element1, token);
        list.pushElement(element2, token);
        list.insertMarker();

        const entry = list.getElementEntry(element1);

        assert.ok(entry);
        assert.strictEqual(entry.type, EntryType.Element);
        assert.strictEqual(entry.token, token);
        assert.strictEqual(entry.element, element1);
    });
});
