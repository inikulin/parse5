import type { Attribute, TagToken } from '../common/token.js';
import type { TreeAdapter, TreeAdapterTypeMap } from '../tree-adapters/interface.js';

//Const
const NOAH_ARK_CAPACITY = 3;

export enum EntryType {
    Marker,
    Element,
}

interface MarkerEntry {
    type: EntryType.Marker;
}

export interface ElementEntry<T extends TreeAdapterTypeMap> {
    type: EntryType.Element;
    element: T['element'];
    token: TagToken;
}

export type Entry<T extends TreeAdapterTypeMap> = MarkerEntry | ElementEntry<T>;

const MARKER: MarkerEntry = { type: EntryType.Marker };

//List of formatting elements
export class FormattingElementList<T extends TreeAdapterTypeMap> {
    entries: Entry<T>[] = [];
    bookmark: Entry<T> | null = null;

    constructor(private treeAdapter: TreeAdapter<T>) {}

    //Noah Ark's condition
    //OPTIMIZATION: at first we try to find possible candidates for exclusion using
    //lightweight heuristics without thorough attributes check.
    private _getNoahArkConditionCandidates(
        newElement: T['element'],
        neAttrs: Attribute[]
    ): { idx: number; attrs: Attribute[] }[] {
        const candidates = [];

        const neAttrsLength = neAttrs.length;
        const neTagName = this.treeAdapter.getTagName(newElement);
        const neNamespaceURI = this.treeAdapter.getNamespaceURI(newElement);

        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];

            if (entry.type === EntryType.Marker) {
                break;
            }

            const { element } = entry;

            if (
                this.treeAdapter.getTagName(element) === neTagName &&
                this.treeAdapter.getNamespaceURI(element) === neNamespaceURI
            ) {
                const elementAttrs = this.treeAdapter.getAttrList(element);

                if (elementAttrs.length === neAttrsLength) {
                    candidates.push({ idx: i, attrs: elementAttrs });
                }
            }
        }

        return candidates;
    }

    private _ensureNoahArkCondition(newElement: T['element']): void {
        if (this.entries.length < NOAH_ARK_CAPACITY) return;

        const neAttrs = this.treeAdapter.getAttrList(newElement);
        const candidates = this._getNoahArkConditionCandidates(newElement, neAttrs);

        if (candidates.length < NOAH_ARK_CAPACITY) return;

        //NOTE: build attrs map for the new element, so we can perform fast lookups
        const neAttrsMap = new Map(neAttrs.map((neAttr: Attribute) => [neAttr.name, neAttr.value]));
        let validCandidates = 0;

        //NOTE: remove bottommost candidates, until Noah's Ark condition will not be met
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];

            // We know that `candidate.attrs.length === neAttrs.length`
            if (candidate.attrs.every((cAttr) => neAttrsMap.get(cAttr.name) === cAttr.value)) {
                validCandidates += 1;

                if (validCandidates >= NOAH_ARK_CAPACITY) {
                    this.entries.splice(candidate.idx, 1);
                }
            }
        }
    }

    //Mutations
    insertMarker(): void {
        this.entries.unshift(MARKER);
    }

    pushElement(element: T['element'], token: TagToken): void {
        this._ensureNoahArkCondition(element);

        this.entries.unshift({
            type: EntryType.Element,
            element,
            token,
        });
    }

    insertElementAfterBookmark(element: T['element'], token: TagToken): void {
        const bookmarkIdx = this.entries.indexOf(this.bookmark!);

        this.entries.splice(bookmarkIdx, 0, {
            type: EntryType.Element,
            element,
            token,
        });
    }

    removeEntry(entry: Entry<T>): void {
        const entryIndex = this.entries.indexOf(entry);

        if (entryIndex >= 0) {
            this.entries.splice(entryIndex, 1);
        }
    }

    /**
     * Clears the list of formatting elements up to the last marker.
     *
     * @see https://html.spec.whatwg.org/multipage/parsing.html#clear-the-list-of-active-formatting-elements-up-to-the-last-marker
     */
    clearToLastMarker(): void {
        const markerIdx = this.entries.indexOf(MARKER);

        if (markerIdx >= 0) {
            this.entries.splice(0, markerIdx + 1);
        } else {
            this.entries.length = 0;
        }
    }

    //Search
    getElementEntryInScopeWithTagName(tagName: string): ElementEntry<T> | null {
        const entry = this.entries.find(
            (entry) => entry.type === EntryType.Marker || this.treeAdapter.getTagName(entry.element) === tagName
        );

        return entry && entry.type === EntryType.Element ? entry : null;
    }

    getElementEntry(element: T['element']): ElementEntry<T> | undefined {
        return this.entries.find(
            (entry): entry is ElementEntry<T> => entry.type === EntryType.Element && entry.element === element
        );
    }
}
