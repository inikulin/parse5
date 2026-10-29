import type { TagToken } from '../common/token.js';
import type { TreeAdapterTypeMap } from '../tree-adapters/interface.js';

//Const
const NOAH_ARK_CAPACITY = 3;

export enum EntryType {
    Marker,
    Element,
}

interface MarkerEntry<T extends TreeAdapterTypeMap> {
    type: EntryType.Marker;
    older: Entry<T> | null;
    newer: Entry<T> | null;
    /** The index of the entries before this marker. */
    outerIndex: RegionIndex<T> | null;
}

/** The entries with one tag name after one marker are chained from a head, newest first. */
interface SameTagLink<T extends TreeAdapterTypeMap> {
    olderSameTag: ElementEntry<T> | null;
}

export interface ElementEntry<T extends TreeAdapterTypeMap> extends SameTagLink<T> {
    type: EntryType.Element;
    element: T['element'];
    token: TagToken;
    older: Entry<T> | null;
    newer: Entry<T> | null;
    /** The entry's group of entries with the same tag name and attributes; null until indexed. */
    ark: Ark<T> | null;
    /** The next newer entry with the same tag name, or the chain's head; null until indexed. */
    newerSameTag: SameTagLink<T> | null;
}

export type Entry<T extends TreeAdapterTypeMap> = MarkerEntry<T> | ElementEntry<T>;

/** The entries after one marker with one tag name and attributes, oldest first, and their key in the region's arks. */
interface Ark<T extends TreeAdapterTypeMap> {
    entries: ElementEntry<T>[];
    key: string;
}

/** The entries after one marker by tag name and attributes, and the newest of them by tag name. */
interface RegionIndex<T extends TreeAdapterTypeMap> {
    arks: Map<string, Ark<T>>;
    tagNames: Map<string, SameTagLink<T>>;
}

//List of formatting elements
export class FormattingElementList<T extends TreeAdapterTypeMap> {
    newest: Entry<T> | null = null;
    bookmark: Entry<T> | null = null;
    /** The index of the entries after the last marker; null only while there are at most NOAH_ARK_CAPACITY of them. */
    private index: RegionIndex<T> | null = null;
    /** The entries by element, except possibly those after the last marker while they are not indexed. */
    private elementEntries = new Map<T['element'], ElementEntry<T>>();

    /** Returns the entry's ark, or null if the entries after the last marker are not indexed. */
    private _insertElementEntry(element: T['element'], token: TagToken, older: Entry<T> | null): Ark<T> | null {
        const newer = older === null ? null : older.newer;
        const entry: ElementEntry<T> = {
            type: EntryType.Element,
            element,
            token,
            older,
            newer,
            ark: null,
            olderSameTag: null,
            newerSameTag: null,
        };

        if (newer === null) {
            this.newest = entry;
        } else {
            newer.older = entry;
        }

        if (older !== null) {
            older.newer = entry;
        }

        return this.index === null ? null : this._addToIndex(this.index, entry);
    }

    private _addToIndex(index: RegionIndex<T>, entry: ElementEntry<T>): Ark<T> {
        const { tagName, attrs } = entry.token;
        // Names are unique and the tokenizer replaces NUL, so the sorted pairs identify the attribute set.
        // Sorting costs O(k log k) comparisons for a tag with k attributes.
        const key =
            tagName +
            attrs
                .map(({ name, value }) => `\0${name}\0${value}`)
                .sort()
                .join('');
        let ark = index.arks.get(key);

        if (ark === undefined) {
            ark = { entries: [], key };
            index.arks.set(key, ark);
        }

        ark.entries.push(entry);
        entry.ark = ark;
        this.elementEntries.set(entry.element, entry);

        let head = index.tagNames.get(tagName);

        if (head === undefined) {
            head = { olderSameTag: null };
            index.tagNames.set(tagName, head);
        }

        entry.olderSameTag = head.olderSameTag;
        entry.newerSameTag = head;

        if (head.olderSameTag !== null) {
            head.olderSameTag.newerSameTag = entry;
        }

        head.olderSameTag = entry;

        return ark;
    }

    //Mutations
    insertMarker(): void {
        if (this.index === null) {
            for (let entry = this.newest; entry !== null && entry.type === EntryType.Element; entry = entry.older) {
                this.elementEntries.set(entry.element, entry);
            }
        }

        const marker: MarkerEntry<T> = {
            type: EntryType.Marker,
            older: this.newest,
            newer: null,
            outerIndex: this.index,
        };

        if (this.newest !== null) {
            this.newest.newer = marker;
        }

        this.newest = marker;
        this.index = null;
    }

    pushElement(element: T['element'], token: TagToken): void {
        if (this.index === null) {
            let oldest: Entry<T> | null = null;
            let count = 0;

            for (let entry = this.newest; entry !== null && entry.type === EntryType.Element; entry = entry.older) {
                oldest = entry;
                count++;
            }

            if (count >= NOAH_ARK_CAPACITY) {
                this.index = { arks: new Map(), tagNames: new Map() };

                for (
                    let entry: Entry<T> | null = oldest;
                    entry !== null && entry.type === EntryType.Element;
                    entry = entry.newer
                ) {
                    this._addToIndex(this.index, entry);
                }
            }
        }

        const ark = this._insertElementEntry(element, token, this.newest);

        if (ark !== null && ark.entries.length > NOAH_ARK_CAPACITY) {
            this.removeEntry(ark.entries[0]);
        }
    }

    insertElementAfterBookmark(element: T['element'], token: TagToken): void {
        // Like the formatting element's entry that it replaces, this entry is the newest with its tag name. The bookmark
        // is used once per adoption-agency step and released here, so it does not keep a cleared region reachable.
        const { bookmark } = this;

        this.bookmark = null;
        this._insertElementEntry(element, token, bookmark);
    }

    removeEntry(entry: ElementEntry<T>): void {
        // An `a` start tag removes its entry even when the adoption agency already has, so skip unlinked entries.
        if (entry.newer === null ? this.newest !== entry : entry.newer.older !== entry) {
            return;
        }

        this.elementEntries.delete(entry.element);

        if (entry.newer === null) {
            this.newest = entry.older;
        } else {
            entry.newer.older = entry.older;
        }

        if (entry.older !== null) {
            entry.older.newer = entry.newer;
        }

        if (entry.ark !== null) {
            const { entries, key } = entry.ark;

            entries.splice(entries.indexOf(entry), 1);
            // Entries are removed only after the last marker, so an emptied ark is dropped from the last region's index.
            if (entries.length === 0) this.index?.arks.delete(key);
        }

        if (entry.newerSameTag !== null) {
            entry.newerSameTag.olderSameTag = entry.olderSameTag;

            if (entry.olderSameTag !== null) {
                entry.olderSameTag.newerSameTag = entry.newerSameTag;
            }
        }
    }

    replaceElement(entry: ElementEntry<T>, element: T['element']): void {
        if (this.elementEntries.delete(entry.element)) {
            this.elementEntries.set(element, entry);
        }

        entry.element = element;
    }

    /**
     * Clears the list of formatting elements up to the last marker.
     *
     * @see https://html.spec.whatwg.org/multipage/parsing.html#clear-the-list-of-active-formatting-elements-up-to-the-last-marker
     */
    clearToLastMarker(): void {
        let marker = this.newest;

        for (; marker !== null && marker.type === EntryType.Element; marker = marker.older) {
            this.elementEntries.delete(marker.element);
        }

        this.newest = marker === null ? null : marker.older;
        this.index = marker === null ? null : marker.outerIndex;

        if (this.newest !== null) {
            this.newest.newer = null;
        }
    }

    //Search
    getElementEntryInScopeWithTagName(tagName: string): ElementEntry<T> | null {
        if (this.index !== null) {
            return this.index.tagNames.get(tagName)?.olderSameTag ?? null;
        }

        for (let entry = this.newest; entry !== null && entry.type === EntryType.Element; entry = entry.older) {
            if (entry.token.tagName === tagName) {
                return entry;
            }
        }

        return null;
    }

    getElementEntry(element: T['element']): ElementEntry<T> | undefined {
        if (this.index === null) {
            for (let entry = this.newest; entry !== null && entry.type === EntryType.Element; entry = entry.older) {
                if (entry.element === element) {
                    return entry;
                }
            }
        }

        return this.elementEntries.get(element);
    }
}
