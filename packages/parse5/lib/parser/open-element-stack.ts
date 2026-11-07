import { TAG_ID as $, NS, SPECIAL_ELEMENTS, getTagID } from '../common/html.js';
import type { TreeAdapter, TreeAdapterTypeMap } from '../tree-adapters/interface.js';

//Element utils
const IMPLICIT_END_TAG_REQUIRED = new Set([$.DD, $.DT, $.LI, $.OPTGROUP, $.OPTION, $.P, $.RB, $.RP, $.RT, $.RTC]);
const IMPLICIT_END_TAG_REQUIRED_THOROUGHLY = new Set([
    ...IMPLICIT_END_TAG_REQUIRED,
    $.CAPTION,
    $.COLGROUP,
    $.TBODY,
    $.TD,
    $.TFOOT,
    $.TH,
    $.THEAD,
    $.TR,
]);

/** A stack this deep starts to index its elements; a shallower one is cheaper to scan than to index. */
const INDEX_DEPTH = 64;

/*
 * Every open element has a key: an HTML element its tag ID, an SVG or MathML element its tag ID plus the offsets below,
 * and any other element (an unknown tag, or another namespace) a key from `NAME_KEYS` up, assigned per stack by
 * namespace and tag name.
 */
const SVG_KEYS = 256;
const MATHML_KEYS = 512;
const NAME_KEYS = 768;

const NUMBERED_HEADERS = [$.H1, $.H2, $.H3, $.H4, $.H5, $.H6];
const TABLE_BODIES = [$.TBODY, $.TFOOT, $.THEAD];
const TABLE_ROW_CONTEXT = [$.TR, $.TEMPLATE, $.HTML];
const TABLE_BODY_CONTEXT = [...TABLE_BODIES, $.TEMPLATE, $.HTML];
const TABLE_CONTEXT = [$.TABLE, $.TEMPLATE, $.HTML];
const TABLE_CELLS = [$.TD, $.TH];

// Classes of keys: special elements, the special elements that end the search for a list item to close (all but
// HTML `address`, `div` and `p`), and the elements that bound each kind of scope.
const SPECIAL = 1;
const LIST_ITEM_BOUNDARY = 2;
const SCOPE = 4;
const LIST_ITEM_SCOPE = 8;
const BUTTON_SCOPE = 16;
const TABLE_SCOPE = 32;
const KEY_CLASSES = new Uint8Array(NAME_KEYS);
for (const [ns, offset] of [
    [NS.HTML, 0],
    [NS.SVG, SVG_KEYS],
    [NS.MATHML, MATHML_KEYS],
] as const) {
    for (const tn of SPECIAL_ELEMENTS[ns]) {
        KEY_CLASSES[offset + tn] =
            ns === NS.HTML && (tn === $.ADDRESS || tn === $.DIV || tn === $.P) ? SPECIAL : SPECIAL | LIST_ITEM_BOUNDARY;
    }
}
for (const key of [
    $.APPLET,
    $.CAPTION,
    $.HTML,
    $.MARQUEE,
    $.OBJECT,
    $.TABLE,
    $.TD,
    $.TEMPLATE,
    $.TH,
    SVG_KEYS + $.DESC,
    SVG_KEYS + $.FOREIGN_OBJECT,
    SVG_KEYS + $.TITLE,
    MATHML_KEYS + $.ANNOTATION_XML,
    MATHML_KEYS + $.MI,
    MATHML_KEYS + $.MN,
    MATHML_KEYS + $.MO,
    MATHML_KEYS + $.MS,
    MATHML_KEYS + $.MTEXT,
]) {
    KEY_CLASSES[key] |= SCOPE | LIST_ITEM_SCOPE | BUTTON_SCOPE;
}
KEY_CLASSES[$.OL] |= LIST_ITEM_SCOPE;
KEY_CLASSES[$.UL] |= LIST_ITEM_SCOPE;
KEY_CLASSES[$.BUTTON] |= BUTTON_SCOPE;
KEY_CLASSES[$.TABLE] |= TABLE_SCOPE;
KEY_CLASSES[$.HTML] |= TABLE_SCOPE;

// The adoption agency and the reconstruction look up formatting elements by element.
const FORMATTING_TAGS = new Uint8Array(NAME_KEYS);
for (const tn of [$.A, $.B, $.BIG, $.CODE, $.EM, $.FONT, $.I, $.NOBR, $.S, $.SMALL, $.STRIKE, $.STRONG, $.TT, $.U]) {
    FORMATTING_TAGS[tn] = 1;
}

/** The key of an element with a tag ID in HTML, SVG or MathML, or -1 for an element keyed by its name. */
function tagKey(ns: NS, tagID: $): number {
    if (tagID === $.UNKNOWN) return -1;

    switch (ns) {
        case NS.HTML: {
            return tagID;
        }
        case NS.SVG: {
            return SVG_KEYS + tagID;
        }
        case NS.MATHML: {
            return MATHML_KEYS + tagID;
        }
        default: {
            return -1;
        }
    }
}

export interface StackHandler<T extends TreeAdapterTypeMap> {
    onItemPush: (node: T['parentNode'], tid: number, isTop: boolean) => void;
    onItemPop: (node: T['parentNode'], isTop: boolean) => void;
}

/**
 * The stack of open elements. Each element has a slot in `items` and `tagIDs`. Once the stack is `INDEX_DEPTH` deep, it
 * indexes its elements so that the searches the parser repeats per token take constant time: it chains the elements
 * with each key, so that the topmost one is found without a scan, and counts per slot the special elements and scope
 * boundaries at or below it, which tell whether one lies between two slots. Removing an element from the middle then
 * leaves its slot free instead of moving the elements above it; `slotBelow` and `slotAbove` step over free slots, and
 * `depth` counts the open elements.
 */
export class OpenElementStack<T extends TreeAdapterTypeMap> {
    items: T['parentNode'][] = [];
    tagIDs: $[] = [];
    current: T['parentNode'] | undefined;
    /** The slot of the current element. */
    stackTop = -1;
    /** The number of open elements. */
    depth = 0;
    tmplCount = 0;

    currentTagId: number | undefined = $.UNKNOWN;

    private indexed = false;
    /** The slot of the open element below, and above, each open element's slot; -1 for none. */
    private below: number[] = [];
    private above: number[] = [];
    private keys: number[] = [];
    /** The slot of the next lower, and higher, open element with the same key; -1 for none. */
    private keyPrev: number[] = [];
    private keyNext: number[] = [];
    /** The slot of the topmost open element with each key, -1 for none. */
    private keyTops = new Int32Array(0);
    private nameKeys: Map<string, number> | undefined;
    /** Per slot, the open special elements, list item boundaries and scope boundaries at or below it. */
    private specials: number[] = [];
    private listItemBoundaries: number[] = [];
    private scopeBoundaries: number[] = [];
    /** Per slot, the slot of the topmost open HTML element at or below it, or -1. */
    private htmlSlots: number[] = [];
    private formattingSlots = new Map<T['element'], number>();

    get currentTmplContentOrNode(): T['parentNode'] {
        return this._isInTemplate() ? this.treeAdapter.getTemplateContent(this.current) : this.current;
    }

    constructor(
        document: T['document'],
        private treeAdapter: TreeAdapter<T>,
        private handler: StackHandler<T>,
    ) {
        this.current = document;
    }

    /** The slot of an open element, or -1. */
    _indexOf(element: T['element']): number {
        if (this.indexed) {
            const idx = this.formattingSlots.get(element);

            if (idx !== undefined) return idx;
            // A formatting element is in `formattingSlots` while it is open.
            if (FORMATTING_TAGS[getTagID(this.treeAdapter.getTagName(element))]) return -1;
        }

        return this.items.lastIndexOf(element, this.stackTop);
    }

    /** The slot of the open element below the one at `idx`, or -1. */
    slotBelow(idx: number): number {
        return this.indexed ? this.below[idx] : idx - 1;
    }

    /** The slot of the open element above the one at `idx`, or -1. */
    slotAbove(idx: number): number {
        if (this.indexed) return this.above[idx];

        return idx === this.stackTop ? -1 : idx + 1;
    }

    //Update current element
    private _isInTemplate(): boolean {
        return this.currentTagId === $.TEMPLATE && this.treeAdapter.getNamespaceURI(this.current) === NS.HTML;
    }

    private _updateCurrentElement(): void {
        this.current = this.items[this.stackTop];
        this.currentTagId = this.tagIDs[this.stackTop];
    }

    //Index
    private _nameKey(ns: NS, tagName: string, create: boolean): number {
        const name = `${ns} ${tagName}`;
        let key = this.nameKeys?.get(name);

        if (key === undefined && create) {
            this.nameKeys ??= new Map();
            key = NAME_KEYS + this.nameKeys.size;
            this.nameKeys.set(name, key);

            if (key === this.keyTops.length) {
                const keyTops = new Int32Array(2 * key).fill(-1);

                keyTops.set(this.keyTops);
                this.keyTops = keyTops;
            }
        }

        return key ?? -1;
    }

    /** Indexes the open elements once the stack is `INDEX_DEPTH` deep. */
    private _indexAll(): void {
        this.indexed = true;
        this.keyTops = new Int32Array(NAME_KEYS).fill(-1);

        for (let i = 0; i <= this.stackTop; i++) this._index(i, i - 1);
    }

    /** Indexes the element at `slot`, above the open element at `belowIdx`. */
    private _index(slot: number, belowIdx: number): void {
        const element = this.items[slot];
        const tagID = this.tagIDs[slot];
        const ns = this.treeAdapter.getNamespaceURI(element);
        let key = tagKey(ns, tagID);

        if (key === -1) key = this._nameKey(ns, this.treeAdapter.getTagName(element), true);

        const keyPrev = this.keyTops[key];

        this.keys[slot] = key;
        this.keyPrev[slot] = keyPrev;
        this.keyNext[slot] = -1;
        if (keyPrev !== -1) this.keyNext[keyPrev] = slot;
        this.keyTops[key] = slot;
        this.above[slot] = -1;
        this._link(slot, belowIdx, ns === NS.HTML);

        if (FORMATTING_TAGS[tagID]) this.formattingSlots.set(element, slot);
    }

    /** Puts the indexed element at `slot` above the one at `belowIdx`, and counts the elements of each class. */
    private _link(slot: number, belowIdx: number, isHtml: boolean): void {
        const key = this.keys[slot];
        const classes = key < NAME_KEYS ? KEY_CLASSES[key] : 0;

        this.below[slot] = belowIdx;

        if (belowIdx === -1) {
            this.specials[slot] = classes & SPECIAL;
            this.listItemBoundaries[slot] = (classes & LIST_ITEM_BOUNDARY) >> 1;
            this.scopeBoundaries[slot] = (classes & SCOPE) >> 2;
            this.htmlSlots[slot] = isHtml ? slot : -1;
        } else {
            this.above[belowIdx] = slot;
            this.specials[slot] = this.specials[belowIdx] + (classes & SPECIAL);
            this.listItemBoundaries[slot] = this.listItemBoundaries[belowIdx] + ((classes & LIST_ITEM_BOUNDARY) >> 1);
            this.scopeBoundaries[slot] = this.scopeBoundaries[belowIdx] + ((classes & SCOPE) >> 2);
            this.htmlSlots[slot] = isHtml ? slot : this.htmlSlots[belowIdx];
        }
    }

    /** Takes the element at `slot` out of the index, except for the links between slots. */
    private _unindex(slot: number): void {
        const key = this.keys[slot];
        const keyPrev = this.keyPrev[slot];
        const keyNext = this.keyNext[slot];

        if (keyPrev !== -1) this.keyNext[keyPrev] = keyNext;
        if (keyNext === -1) this.keyTops[key] = keyPrev;
        else this.keyPrev[keyNext] = keyPrev;

        if (FORMATTING_TAGS[this.tagIDs[slot]]) this.formattingSlots.delete(this.items[slot]);
    }

    /** Moves the indexed element at `from` down to the free slot `to`, keeping its key chain in order. */
    private _move(from: number, to: number): void {
        const element = this.items[from];
        const key = this.keys[from];
        const keyPrev = this.keyPrev[from];
        const keyNext = this.keyNext[from];

        this.items[to] = element;
        this.tagIDs[to] = this.tagIDs[from];
        this.keys[to] = key;
        this.keyPrev[to] = keyPrev;
        this.keyNext[to] = keyNext;
        if (keyPrev !== -1) this.keyNext[keyPrev] = to;
        if (keyNext === -1) this.keyTops[key] = to;
        else this.keyPrev[keyNext] = to;

        if (FORMATTING_TAGS[this.tagIDs[to]]) this.formattingSlots.set(element, to);
    }

    //Search by tag
    /** The slot of the topmost open HTML element with this tag, or -1. */
    indexOfTopmost(tagID: $): number {
        if (this.indexed) return this.keyTops[tagID];

        for (let i = this.stackTop; i >= 0; i--) {
            if (this.tagIDs[i] === tagID && this.treeAdapter.getNamespaceURI(this.items[i]) === NS.HTML) return i;
        }

        return -1;
    }

    /** The slot of the topmost open HTML element with any of these tags, or -1. */
    indexOfTopmostOf(tagIDs: readonly $[]): number {
        if (this.indexed) {
            let top = -1;

            for (const tagID of tagIDs) {
                if (this.keyTops[tagID] > top) top = this.keyTops[tagID];
            }

            return top;
        }

        for (let i = this.stackTop; i >= 0; i--) {
            if (tagIDs.includes(this.tagIDs[i]) && this.treeAdapter.getNamespaceURI(this.items[i]) === NS.HTML)
                return i;
        }

        return -1;
    }

    /** The slot of the topmost open element in this namespace with this tag name, or -1. */
    indexOfTopmostByName(ns: NS, tagName: string): number {
        if (this.indexed) {
            let key = tagKey(ns, getTagID(tagName));

            if (key === -1) key = this._nameKey(ns, tagName, false);

            return key === -1 ? -1 : this.keyTops[key];
        }

        for (let i = this.stackTop; i >= 0; i--) {
            const element = this.items[i];

            if (this.treeAdapter.getTagName(element) === tagName && this.treeAdapter.getNamespaceURI(element) === ns) {
                return i;
            }
        }

        return -1;
    }

    /** The slot of the topmost open HTML element, or -1. */
    indexOfTopmostHtmlElement(): number {
        if (this.indexed) return this.stackTop === -1 ? -1 : this.htmlSlots[this.stackTop];

        let i = this.stackTop;

        while (i >= 0 && this.treeAdapter.getNamespaceURI(this.items[i]) !== NS.HTML) i--;

        return i;
    }

    /** Whether an element of the classes is open above the slot `idx`, on a stack that is not indexed. */
    private _hasAbove(idx: number, classes: number): boolean {
        for (let i = this.stackTop; i > idx; i--) {
            const key = tagKey(this.treeAdapter.getNamespaceURI(this.items[i]), this.tagIDs[i]);

            if (key !== -1 && KEY_CLASSES[key] & classes) return true;
        }

        return false;
    }

    /** Whether a special element is open above the slot `idx`. */
    hasSpecialElementAbove(idx: number): boolean {
        return this.indexed ? this.specials[this.stackTop] !== this.specials[idx] : this._hasAbove(idx, SPECIAL);
    }

    /** Whether a special element other than HTML `address`, `div` and `p` is open above the slot `idx`. */
    hasListItemBoundaryAbove(idx: number): boolean {
        return this.indexed
            ? this.listItemBoundaries[this.stackTop] !== this.listItemBoundaries[idx]
            : this._hasAbove(idx, LIST_ITEM_BOUNDARY);
    }

    //Mutations
    push(element: T['element'], tagID: $): void {
        const belowIdx = this.stackTop;

        this.stackTop++;
        this.depth++;

        this.items[this.stackTop] = element;
        this.current = element;
        this.tagIDs[this.stackTop] = tagID;
        this.currentTagId = tagID;

        if (this.indexed) this._index(this.stackTop, belowIdx);
        else if (this.depth === INDEX_DEPTH) this._indexAll();

        if (this._isInTemplate()) {
            this.tmplCount++;
        }

        this.handler.onItemPush(element, tagID, true);
    }

    /** Pops the current element without calling the handler. */
    private _popCurrent(): void {
        if (this.tmplCount > 0 && this._isInTemplate()) {
            this.tmplCount--;
        }

        if (this.indexed) {
            this._unindex(this.stackTop);
            this.stackTop = this.below[this.stackTop];
            if (this.stackTop !== -1) this.above[this.stackTop] = -1;
        } else {
            this.stackTop--;
        }

        this.depth--;
        this._updateCurrentElement();
    }

    pop(): void {
        const popped = this.current;

        this._popCurrent();
        this.handler.onItemPop(popped, true);
    }

    replace(oldElement: T['element'], newElement: T['element']): void {
        const idx = this._indexOf(oldElement);

        this.items[idx] = newElement;

        if (this.indexed && FORMATTING_TAGS[this.tagIDs[idx]]) {
            this.formattingSlots.delete(oldElement);
            this.formattingSlots.set(newElement, idx);
        }

        if (idx === this.stackTop) {
            this.current = newElement;
        }
    }

    /**
     * The adoption agency's last stack step: removes the formatting element at `formattingIdx` and opens `element`
     * directly above the furthest block at `furthestBlockIdx`. On an indexed stack, only formatting elements the agency
     * kept are still open between them; the furthest block, with those directly below it, moves down by one slot, and
     * `element` takes the furthest block's slot. No open element above the furthest block moves, and as all these
     * elements are HTML elements and only the furthest block is special, the counts above it stay the same.
     */
    replaceFormattingElement(formattingIdx: number, furthestBlockIdx: number, element: T['element'], tagID: $): void {
        const formattingElement = this.items[formattingIdx];

        if (!this.indexed) {
            this.items.splice(formattingIdx, 1);
            this.tagIDs.splice(formattingIdx, 1);
            this.handler.onItemPop(formattingElement, false);
            this.items.splice(furthestBlockIdx, 0, element);
            this.tagIDs.splice(furthestBlockIdx, 0, tagID);
            if (furthestBlockIdx === this.stackTop) this._updateCurrentElement();
            if (this.current && this.currentTagId !== undefined) {
                this.handler.onItemPush(this.current, this.currentTagId, furthestBlockIdx === this.stackTop);
            }
            return;
        }

        const key = this.keys[formattingIdx];
        const belowIdx = this.below[formattingIdx];
        const aboveIdx = this.above[furthestBlockIdx];
        const kept: number[] = [];

        for (let i = this.above[formattingIdx]; i !== furthestBlockIdx; i = this.above[i]) kept.push(i);

        // The list keeps open formatting elements in stack order, so a kept element with the formatting element's tag
        // would have been the formatting element: the next element with its key is above the furthest block.
        const keyNext = this.keyNext[formattingIdx];

        this._unindex(formattingIdx);
        this.items[formattingIdx] = undefined;
        this.handler.onItemPop(formattingElement, false);

        let free = furthestBlockIdx - 1;

        while (kept.length > 0 && kept[kept.length - 1] === free) {
            kept.pop();
            free--;
        }

        for (let i = free + 1; i <= furthestBlockIdx; i++) this._move(i, i - 1);

        const keyPrev = keyNext === -1 ? this.keyTops[key] : this.keyPrev[keyNext];

        this.items[furthestBlockIdx] = element;
        this.tagIDs[furthestBlockIdx] = tagID;
        this.keys[furthestBlockIdx] = key;
        this.keyPrev[furthestBlockIdx] = keyPrev;
        this.keyNext[furthestBlockIdx] = keyNext;
        if (keyPrev !== -1) this.keyNext[keyPrev] = furthestBlockIdx;
        if (keyNext === -1) this.keyTops[key] = furthestBlockIdx;
        else this.keyPrev[keyNext] = furthestBlockIdx;
        if (FORMATTING_TAGS[tagID]) this.formattingSlots.set(element, furthestBlockIdx);

        let prev = belowIdx;

        for (const i of kept) {
            this._link(i, prev, true);
            prev = i;
        }

        for (let i = free; i < furthestBlockIdx; i++) {
            this._link(i, prev, true);
            prev = i;
        }

        this._link(furthestBlockIdx, prev, true);

        if (aboveIdx === -1) this._updateCurrentElement();

        if (this.current && this.currentTagId !== undefined) {
            this.handler.onItemPush(this.current, this.currentTagId, aboveIdx === -1);
        }
    }

    popUntilTagNamePopped(tagName: $): void {
        this.shortenToLength(Math.max(this.indexOfTopmost(tagName), 0));
    }

    shortenToLength(idx: number): void {
        while (this.stackTop >= idx) {
            const popped = this.current;

            this._popCurrent();
            this.handler.onItemPop(popped, this.stackTop < idx);
        }
    }

    popUntilElementPopped(element: T['element']): void {
        const idx = this._indexOf(element);
        this.shortenToLength(Math.max(idx, 0));
    }

    popUntilNumberedHeaderPopped(): void {
        this.shortenToLength(Math.max(this.indexOfTopmostOf(NUMBERED_HEADERS), 0));
    }

    popUntilTableCellPopped(): void {
        this.shortenToLength(Math.max(this.indexOfTopmostOf(TABLE_CELLS), 0));
    }

    popAllUpToHtmlElement(): void {
        //NOTE: here we assume that the root <html> element is always first in the open element stack, so
        //we perform this fast stack clean up.
        this.tmplCount = 0;
        this.shortenToLength(1);
    }

    clearBackToTableContext(): void {
        this.shortenToLength(this.indexOfTopmostOf(TABLE_CONTEXT) + 1);
    }

    clearBackToTableBodyContext(): void {
        this.shortenToLength(this.indexOfTopmostOf(TABLE_BODY_CONTEXT) + 1);
    }

    clearBackToTableRowContext(): void {
        this.shortenToLength(this.indexOfTopmostOf(TABLE_ROW_CONTEXT) + 1);
    }

    remove(element: T['element']): void {
        const idx = this._indexOf(element);

        if (idx !== -1) this.removeAt(idx);
    }

    /** Removes the open element at the slot `idx`; on an indexed stack, the elements above it keep their slots. */
    removeAt(idx: number): void {
        if (idx === this.stackTop) {
            this.pop();
            return;
        }

        const element = this.items[idx];

        this.depth--;

        if (this.indexed) {
            const classes = this.keys[idx] < NAME_KEYS ? KEY_CLASSES[this.keys[idx]] : 0;
            const belowIdx = this.below[idx];
            const aboveIdx = this.above[idx];

            this._unindex(idx);
            this.items[idx] = undefined;
            this.below[aboveIdx] = belowIdx;
            if (belowIdx !== -1) this.above[belowIdx] = aboveIdx;

            if (classes !== 0) {
                for (let i = aboveIdx; i !== -1; i = this.above[i]) {
                    this.specials[i] -= classes & SPECIAL;
                    this.listItemBoundaries[i] -= (classes & LIST_ITEM_BOUNDARY) >> 1;
                    this.scopeBoundaries[i] -= (classes & SCOPE) >> 2;
                }
            }

            // Foreign elements directly above an HTML element refer to it as the topmost HTML element below them.
            const html = belowIdx === -1 ? -1 : this.htmlSlots[belowIdx];

            for (let i = aboveIdx; i !== -1 && this.htmlSlots[i] === idx; i = this.above[i]) {
                this.htmlSlots[i] = html;
            }
        } else {
            this.items.splice(idx, 1);
            this.tagIDs.splice(idx, 1);
            this.stackTop--;
            this._updateCurrentElement();
        }

        this.handler.onItemPop(element, false);
    }

    //Search
    tryPeekProperlyNestedBodyElement(): T['element'] | null {
        //Properly nested <body> element (should be second element in stack).
        return this.stackTop >= 1 && this.tagIDs[1] === $.BODY ? this.items[1] : null;
    }

    contains(element: T['element']): boolean {
        return this._indexOf(element) > -1;
    }

    getCommonAncestor(element: T['element']): T['element'] | null {
        const idx = this._indexOf(element);
        const belowIdx = idx === -1 ? -1 : this.slotBelow(idx);

        return belowIdx === -1 ? null : this.items[belowIdx];
    }

    isRootHtmlElementCurrent(): boolean {
        return this.stackTop === 0 && this.tagIDs[0] === $.HTML;
    }

    //Element in scope
    /**
     * On an indexed stack: whether no element of the `scope` class is open above the slot `target`. A target that is not
     * open is in scope only on a stack without such an element, as a scan from the top would end there.
     */
    private _isInScope(target: number, scope: number): boolean {
        let boundary = -1;

        switch (scope) {
            case LIST_ITEM_SCOPE: {
                boundary = Math.max(this.keyTops[$.OL], this.keyTops[$.UL]);
                break;
            }
            case BUTTON_SCOPE: {
                boundary = this.keyTops[$.BUTTON];
                break;
            }
            case TABLE_SCOPE: {
                boundary = Math.max(this.keyTops[$.TABLE], this.keyTops[$.HTML]);
                return target === -1 ? boundary === -1 : target >= boundary;
            }
            default:
            // Only the scope boundaries
        }

        return target === -1
            ? boundary === -1 && (this.stackTop === -1 || this.scopeBoundaries[this.stackTop] === 0)
            : target >= boundary && this.scopeBoundaries[this.stackTop] === this.scopeBoundaries[target];
    }

    /**
     * On a stack that is not indexed: whether an HTML element with the tag, or one of the tags, and if passed the element
     * itself, is open above every element of the `scope` class; true if neither is open.
     */
    private _scanScope(tagID: $, tagIDs: readonly $[] | null, scope: number, element?: T['element'] | null): boolean {
        for (let i = this.stackTop; i >= 0; i--) {
            const key = tagKey(this.treeAdapter.getNamespaceURI(this.items[i]), this.tagIDs[i]);

            if (key === -1) continue;
            if ((tagIDs ? tagIDs.includes(key) : key === tagID) && (!element || this.items[i] === element)) return true;
            if (KEY_CLASSES[key] & scope) return false;
        }

        return true;
    }

    /** If `element` is passed, only that element (which has to be a `tagName` element) is looked for. */
    hasInScope(tagName: $, element?: T['element'] | null): boolean {
        if (!this.indexed) return this._scanScope(tagName, null, SCOPE, element);

        return this._isInScope(element ? this._indexOf(element) : this.keyTops[tagName], SCOPE);
    }

    hasInListItemScope(tagName: $): boolean {
        return this.indexed
            ? this._isInScope(this.keyTops[tagName], LIST_ITEM_SCOPE)
            : this._scanScope(tagName, null, LIST_ITEM_SCOPE);
    }

    hasInButtonScope(tagName: $): boolean {
        return this.indexed
            ? this._isInScope(this.keyTops[tagName], BUTTON_SCOPE)
            : this._scanScope(tagName, null, BUTTON_SCOPE);
    }

    hasNumberedHeaderInScope(): boolean {
        return this.indexed
            ? this._isInScope(this.indexOfTopmostOf(NUMBERED_HEADERS), SCOPE)
            : this._scanScope($.UNKNOWN, NUMBERED_HEADERS, SCOPE);
    }

    hasInTableScope(tagName: $): boolean {
        return this.indexed
            ? this._isInScope(this.keyTops[tagName], TABLE_SCOPE)
            : this._scanScope(tagName, null, TABLE_SCOPE);
    }

    hasTableBodyContextInTableScope(): boolean {
        return this.indexed
            ? this._isInScope(this.indexOfTopmostOf(TABLE_BODIES), TABLE_SCOPE)
            : this._scanScope($.UNKNOWN, TABLE_BODIES, TABLE_SCOPE);
    }

    hasInSelectScope(tagName: $): boolean {
        for (let i = this.stackTop; i >= 0; i = this.slotBelow(i)) {
            if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NS.HTML) {
                continue;
            }

            switch (this.tagIDs[i]) {
                case tagName: {
                    return true;
                }
                case $.OPTION:
                case $.OPTGROUP: {
                    break;
                }
                default: {
                    return false;
                }
            }
        }

        return true;
    }

    //Implied end tags
    generateImpliedEndTags(): void {
        while (
            this.currentTagId !== undefined &&
            IMPLICIT_END_TAG_REQUIRED.has(this.currentTagId) &&
            this.treeAdapter.getNamespaceURI(this.current) === NS.HTML
        ) {
            this.pop();
        }
    }

    generateImpliedEndTagsThoroughly(): void {
        while (
            this.currentTagId !== undefined &&
            IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId) &&
            this.treeAdapter.getNamespaceURI(this.current) === NS.HTML
        ) {
            this.pop();
        }
    }

    generateImpliedEndTagsWithExclusion(exclusionId: $): void {
        while (
            this.currentTagId !== undefined &&
            this.currentTagId !== exclusionId &&
            IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId) &&
            this.treeAdapter.getNamespaceURI(this.current) === NS.HTML
        ) {
            this.pop();
        }
    }
}
