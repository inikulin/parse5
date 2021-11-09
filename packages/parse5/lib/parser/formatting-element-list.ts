import type { Attribute, Token } from '../common/token.js';

//Const
const NOAH_ARK_CAPACITY = 3;

enum EntryType {
    Marker = 'MARKER_ENTRY',
    Element = 'ELEMENT_ENTRY',
}

interface MarkerEntry {
    type: EntryType.Marker;
}

interface ElementEntry {
    type: EntryType.Element;
    element: any;
    token: Token;
}

type Entry = MarkerEntry | ElementEntry;

type Element = any;

//List of formatting elements
export class FormattingElementList {
    length = 0;
    entries: Entry[] = [];
    bookmark: Element | null = null;

    constructor(private treeAdapter: any) {}

    //Noah Ark's condition
    //OPTIMIZATION: at first we try to find possible candidates for exclusion using
    //lightweight heuristics without thorough attributes check.
    _getNoahArkConditionCandidates(newElement: any, neAttrs: Attribute[]) {
        const candidates = [];

        if (this.length >= NOAH_ARK_CAPACITY) {
            const neAttrsLength = neAttrs.length;
            const neTagName = this.treeAdapter.getTagName(newElement);
            const neNamespaceURI = this.treeAdapter.getNamespaceURI(newElement);

            for (let i = this.length - 1; i >= 0; i--) {
                const entry = this.entries[i];

                if (entry.type === EntryType.Marker) {
                    break;
                }

                const { element } = entry;
                const elementAttrs = this.treeAdapter.getAttrList(element);

                const isCandidate =
                    this.treeAdapter.getTagName(element) === neTagName &&
                    this.treeAdapter.getNamespaceURI(element) === neNamespaceURI &&
                    elementAttrs.length === neAttrsLength;

                if (isCandidate) {
                    candidates.push({ idx: i, attrs: elementAttrs });
                }
            }
        }

        return candidates;
    }

    _ensureNoahArkCondition(newElement: Element) {
        const neAttrs = this.treeAdapter.getAttrList(newElement);
        const candidates = this._getNoahArkConditionCandidates(newElement, neAttrs);

        if (candidates.length >= NOAH_ARK_CAPACITY) {
            //NOTE: build attrs map for the new element so we can perform fast lookups
            const neAttrsMap = new Map(neAttrs.map((neAttr: Attribute) => [neAttr.name, neAttr.value]));
            const filteredCandidates = candidates.filter((candidate) =>
                // We know that `candidate.attrs.length === neAttrs.length`
                candidate.attrs.every((cAttr: Attribute) => neAttrsMap.get(cAttr.name) === cAttr.value)
            );

            //NOTE: remove bottommost candidates until Noah's Ark condition will not be met
            for (let i = filteredCandidates.length - 1; i >= NOAH_ARK_CAPACITY - 1; i--) {
                this.entries.splice(filteredCandidates[i].idx, 1);
                this.length--;
            }
        }
    }

    //Mutations
    insertMarker() {
        this.entries.push({ type: EntryType.Marker });
        this.length++;
    }

    pushElement(element: Element, token: Token) {
        this._ensureNoahArkCondition(element);

        this.entries.push({
            type: EntryType.Element,
            element,
            token,
        });

        this.length++;
    }

    insertElementAfterBookmark(element: Element, token: Token) {
        const bookmarkIdx = this.entries.lastIndexOf(this.bookmark!);

        this.entries.splice(bookmarkIdx + 1, 0, {
            type: EntryType.Element,
            element,
            token,
        });

        this.length++;
    }

    removeEntry(entry: Entry) {
        const entryIndex = this.entries.lastIndexOf(entry);

        if (entryIndex >= 0) {
            this.entries.splice(entryIndex, 1);
            this.length--;
        }
    }

    clearToLastMarker() {
        while (this.length) {
            const entry = this.entries.pop()!;

            this.length--;

            if (entry.type === EntryType.Marker) {
                break;
            }
        }
    }

    //Search
    getElementEntryInScopeWithTagName(tagName: string) {
        for (let i = this.length - 1; i >= 0; i--) {
            const entry = this.entries[i];

            if (entry.type === EntryType.Marker) {
                return null;
            }

            if (this.treeAdapter.getTagName(entry.element) === tagName) {
                return entry;
            }
        }

        return null;
    }

    getElementEntry(element: Element): ElementEntry | null {
        for (let i = this.length - 1; i >= 0; i--) {
            const entry = this.entries[i];

            if (entry.type === EntryType.Element && entry.element === element) {
                return entry;
            }
        }

        return null;
    }

    //Entry types
    static MARKER_ENTRY = EntryType.Marker as const;
    static ELEMENT_ENTRY = EntryType.Element as const;
}
