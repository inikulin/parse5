import { it, assert, expect } from 'vitest';
import { TAG_NAMES as $, NS, getTagID } from '../common/html.js';
import { type Attribute, type TagToken, TokenType } from '../common/token.js';
import { type DefaultTreeAdapterMap } from '../tree-adapters/default.js';
import { type TreeAdapterTypeMap } from '../tree-adapters/interface.js';
import { FormattingElementList, EntryType, type ElementEntry, type Entry } from './formatting-element-list.js';
import { Parser } from './index.js';
import { generateTestsForEachTreeAdapter } from 'parse5-test-utils/utils/common.js';

function createToken(name: $, attrs: Attribute[] = []): TagToken {
    return {
        type: TokenType.START_TAG,
        tagName: name,
        tagID: getTagID(name),
        ackSelfClosing: false,
        selfClosing: false,
        attrs,
        location: null,
    };
}

/** The entries, oldest first. */
function entriesOf<T extends TreeAdapterTypeMap>(list: FormattingElementList<T>): Entry<T>[] {
    const entries = [];

    for (let entry = list.newest; entry !== null; entry = entry.older) {
        entries.unshift(entry);
    }

    return entries;
}

/** The position of each entry's token in `tokens`, -1 for a marker. */
function tokenIndices<T extends TreeAdapterTypeMap>(list: FormattingElementList<T>, tokens: TagToken[]): number[] {
    return entriesOf(list).map((entry) => (entry.type === EntryType.Element ? tokens.indexOf(entry.token) : -1));
}

/** The position in `tokens` of the newest `b` entry's token after the last marker, -1 for none. */
function newestB<T extends TreeAdapterTypeMap>(list: FormattingElementList<T>, tokens: TagToken[]): number {
    const entry = list.getElementEntryInScopeWithTagName($.B);

    return entry === null ? -1 : tokens.indexOf(entry.token);
}

generateTestsForEachTreeAdapter('FormattingElementList', (treeAdapter) => {
    it('Releases the bookmark once an entry was inserted after it', () => {
        const list = new FormattingElementList<DefaultTreeAdapterMap>();
        const element = treeAdapter.createElement($.B, NS.HTML, []);
        const token = createToken($.B);

        list.insertMarker();
        list.pushElement(element, token);
        list.bookmark = list.newest;
        list.insertElementAfterBookmark(treeAdapter.createElement($.B, NS.HTML, []), token);
        assert.strictEqual(list.bookmark, null);
        list.clearToLastMarker();
        assert.strictEqual(list.newest, null);
    });

    it('Insert marker', () => {
        const list = new FormattingElementList();

        list.insertMarker();
        assert.strictEqual(entriesOf(list).length, 1);
        assert.strictEqual(entriesOf(list)[0].type, EntryType.Marker);

        list.insertMarker();
        assert.strictEqual(entriesOf(list).length, 2);
        assert.strictEqual(entriesOf(list)[0].type, EntryType.Marker);
    });

    it('Push element', () => {
        const list = new FormattingElementList();
        const element1Token = createToken($.DIV);
        const element2Token = createToken($.P);
        const element1 = treeAdapter.createElement($.DIV, NS.HTML, []);
        const element2 = treeAdapter.createElement($.P, NS.HTML, []);

        list.pushElement(element1, element1Token);
        assert.strictEqual(entriesOf(list).length, 1);
        assert.strictEqual(entriesOf(list)[0].type, EntryType.Element as const);
        assert.strictEqual((entriesOf(list)[0] as ElementEntry<DefaultTreeAdapterMap>).element, element1);
        assert.strictEqual((entriesOf(list)[0] as ElementEntry<DefaultTreeAdapterMap>).token, element1Token);

        list.pushElement(element2, element2Token);
        assert.strictEqual(entriesOf(list).length, 2);
        assert.strictEqual(entriesOf(list)[1].type, EntryType.Element);
        assert.strictEqual((entriesOf(list)[1] as ElementEntry<DefaultTreeAdapterMap>).element, element2);
        assert.strictEqual((entriesOf(list)[1] as ElementEntry<DefaultTreeAdapterMap>).token, element2Token);
    });

    it('Insert element after bookmark', () => {
        const list = new FormattingElementList();
        const element1 = treeAdapter.createElement($.DIV, NS.HTML, []);
        const element2 = treeAdapter.createElement($.P, NS.HTML, []);
        const element3 = treeAdapter.createElement($.SPAN, NS.HTML, []);
        const element4 = treeAdapter.createElement($.TITLE, NS.HTML, []);

        list.pushElement(element1, createToken($.DIV));
        list.bookmark = entriesOf(list)[0];

        list.pushElement(element2, createToken($.P));
        list.pushElement(element3, createToken($.SPAN));

        list.insertElementAfterBookmark(element4, createToken($.TITLE));

        assert.strictEqual(entriesOf(list).length, 4);
        expect(entriesOf(list)[1]).toHaveProperty('element', element4);
    });

    it('Push element - Noah Ark condition', () => {
        const list = new FormattingElementList();
        const attrs1 = [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'val2' },
        ];
        const attrs2 = [
            { name: 'attr1', value: 'val1' },
            { name: 'attr2', value: 'someOtherValue' },
        ];
        const tokens = [attrs1, attrs1, attrs2, [attrs1[1], attrs1[0]], attrs1, attrs1].map((attrs) =>
            createToken($.DIV, attrs),
        );
        const push = (i: number): void =>
            list.pushElement(treeAdapter.createElement($.DIV, NS.HTML, tokens[i].attrs), tokens[i]);

        push(0);
        push(1);
        push(2);
        push(3);
        expect(tokenIndices(list, tokens)).toStrictEqual([0, 1, 2, 3]);

        push(4);
        expect(tokenIndices(list, tokens)).toStrictEqual([1, 2, 3, 4]);

        list.insertMarker();
        push(5);
        expect(tokenIndices(list, tokens)).toStrictEqual([1, 2, 3, 4, -1, 5]);

        list.clearToLastMarker();
        push(5);
        expect(tokenIndices(list, tokens)).toStrictEqual([2, 3, 4, 5]);
    });

    it('Noah Ark condition and tag name lookup keep each marker apart', () => {
        const list = new FormattingElementList();
        const tokens = Array.from({ length: 12 }, () => createToken($.B));
        const push = (i: number): void => list.pushElement(treeAdapter.createElement($.B, NS.HTML, []), tokens[i]);

        for (let i = 0; i < 4; i++) push(i);
        list.insertMarker();
        expect(newestB(list, tokens)).toBe(-1);

        for (let i = 4; i < 8; i++) push(i);
        list.insertMarker();
        push(8);
        expect(tokenIndices(list, tokens)).toStrictEqual([1, 2, 3, -1, 5, 6, 7, -1, 8]);

        list.clearToLastMarker();
        push(9);
        expect(tokenIndices(list, tokens)).toStrictEqual([1, 2, 3, -1, 6, 7, 9]);
        expect(newestB(list, tokens)).toBe(9);

        list.clearToLastMarker();
        expect(newestB(list, tokens)).toBe(3);
        push(10);
        expect(tokenIndices(list, tokens)).toStrictEqual([2, 3, 10]);
    });

    it('Noah Ark condition and tag name lookup count the adoption agency replacement as the newest entry', () => {
        const list = new FormattingElementList();
        const tokens = [$.B, $.B, $.B, $.I, $.U, $.B, $.B, $.B, $.B].map((tagName) => createToken(tagName));
        const push = (i: number): void =>
            list.pushElement(treeAdapter.createElement(tokens[i].tagName, NS.HTML, []), tokens[i]);

        for (let i = 0; i < 5; i++) push(i);
        const formattingElementEntry = entriesOf(list)[2] as ElementEntry<TreeAdapterTypeMap>;
        list.bookmark = entriesOf(list)[3];
        list.insertElementAfterBookmark(treeAdapter.createElement($.B, NS.HTML, []), tokens[5]);
        list.removeEntry(formattingElementEntry);
        expect(tokenIndices(list, tokens)).toStrictEqual([0, 1, 3, 5, 4]);
        expect(newestB(list, tokens)).toBe(5);

        push(6);
        push(7);
        expect(tokenIndices(list, tokens)).toStrictEqual([3, 5, 4, 6, 7]);

        push(8);
        expect(tokenIndices(list, tokens)).toStrictEqual([3, 4, 6, 7, 8]);

        list.removeEntry(entriesOf(list)[3] as ElementEntry<TreeAdapterTypeMap>);
        list.removeEntry(entriesOf(list)[3] as ElementEntry<TreeAdapterTypeMap>);
        expect(newestB(list, tokens)).toBe(6);
    });

    it('Clear to the last marker', () => {
        const list = new FormattingElementList();
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

        assert.strictEqual(entriesOf(list).length, 2);

        list.clearToLastMarker();

        assert.strictEqual(entriesOf(list).length, 0);
    });

    it('Remove entry', () => {
        const list = new FormattingElementList();
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

        list.removeEntry(entriesOf(list)[0] as ElementEntry<TreeAdapterTypeMap>);

        assert.strictEqual(entriesOf(list).length, 2);

        for (const entry of entriesOf(list)) {
            expect(entry).not.toHaveProperty('element', element1);
        }
    });

    it('Get entry in scope with given tag name', () => {
        const list = new FormattingElementList();
        const token = createToken($.DIV);
        const element = treeAdapter.createElement($.DIV, NS.HTML, []);

        assert.ok(!list.getElementEntryInScopeWithTagName($.DIV));

        list.pushElement(element, token);
        list.pushElement(element, token);
        assert.strictEqual(list.getElementEntryInScopeWithTagName($.DIV), entriesOf(list)[1]);

        list.insertMarker();
        assert.ok(!list.getElementEntryInScopeWithTagName($.DIV));

        list.pushElement(element, token);
        assert.strictEqual(list.getElementEntryInScopeWithTagName($.DIV), entriesOf(list)[3]);
    });

    it('Get element entry', () => {
        const list = new FormattingElementList();
        const token = createToken($.DIV);
        const element1 = treeAdapter.createElement($.DIV, NS.HTML, []);
        const element2 = treeAdapter.createElement($.A, NS.HTML, []);

        list.pushElement(element2, token);
        list.pushElement(element1, token);
        list.pushElement(element2, token);
        list.insertMarker();

        const entry = list.getElementEntry(element1)!;

        assert.ok(entry);
        assert.strictEqual(entry.type, EntryType.Element);
        assert.strictEqual(entry.token, token);
        assert.strictEqual((entry as ElementEntry<DefaultTreeAdapterMap>).element, element1);
    });

    it('Get element entry after replacement, removal and clearing', () => {
        const list = new FormattingElementList();
        const tagNames = [$.I, $.B, $.U, $.B, $.S, $.EM];
        const elements = tagNames.map((tagName) => treeAdapter.createElement(tagName, NS.HTML, []));

        for (let i = 0; i < 3; i++) list.pushElement(elements[i], createToken(tagNames[i]));
        const [first, entry, last] = entriesOf(list) as ElementEntry<TreeAdapterTypeMap>[];
        list.insertMarker();
        list.replaceElement(entry, elements[3]);
        expect(list.getElementEntry(elements[1])).toBeUndefined();
        expect(list.getElementEntry(elements[3])).toBe(entry);
        list.clearToLastMarker();

        // Removing an entry again, after its neighbours changed, leaves the list as it is.
        list.removeEntry(entry);
        list.removeEntry(last);
        list.removeEntry(entry);
        expect(list.getElementEntry(elements[3])).toBeUndefined();
        list.pushElement(elements[4], createToken($.S));
        expect(entriesOf(list)).toStrictEqual([first, list.getElementEntry(elements[4])]);

        list.insertMarker();
        list.pushElement(elements[5], createToken($.EM));
        list.insertMarker();
        list.clearToLastMarker();
        list.clearToLastMarker();
        expect(list.getElementEntry(elements[5])).toBeUndefined();
        expect(entriesOf(list)).toStrictEqual([first, list.getElementEntry(elements[4])]);
    });
});

const n = 512;
const seq = (length: number, tag: (i: number) => string): string => Array.from({ length }, (_, i) => tag(i)).join('');
it.each([
    ['distinct attributes', seq(n, (i) => `<b a=${i}>`)],
    ['pushes after a cleared marker', seq(n, (i) => `<b a=${i}>`) + '<object></object><i>'.repeat(n)],
    [
        'evictions of buried entries',
        seq(n / 8, (i) => `<b a=${i}>`.repeat(3)) + seq(n / 2, (i) => `<i a=${i}>`) + seq(n / 8, (i) => `<b a=${i}>`),
    ],
    ['end tags behind a long list', seq(n, (i) => `<i a=${i}>`) + seq(n, (i) => `<b a=${i}>`) + '</i>'.repeat(n)],
])('bounds formatting-list entry reads: %s', (_name, input) => {
    const parser = new Parser();
    const list = parser.activeFormattingElements;
    const pushElement = list.pushElement.bind(list);
    let reads = 0;
    let isCounting = true;
    // Each pushed entry counts the reads of its properties, except while the test looks it up.
    list.pushElement = (element, token): void => {
        pushElement(element, token);
        isCounting = false;
        const entry = list.getElementEntry(element)!;
        isCounting = true;

        for (const [key, value] of Object.entries(entry)) {
            let current: unknown = value;
            Object.defineProperty(entry, key, {
                get(): unknown {
                    if (isCounting) reads++;
                    return current;
                },
                set(next: unknown): void {
                    current = next;
                },
            });
        }
    };
    parser.tokenizer.write(input, true);
    expect(reads).toBeLessThan(40 * n);
});

it('drops an attribute group from the index with its last entry', () => {
    const parser = new Parser();

    parser.tokenizer.write(`<b><b><b>${seq(100, (i) => `<b a=${i}></b>`)}`, false);
    // The three `b`s without attributes are the only group left.
    expect(parser.activeFormattingElements['index']?.arks.size).toBe(1);
});
