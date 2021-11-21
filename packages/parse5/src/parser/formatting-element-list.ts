import { TreeAdapter, TreeAdapterTypeMap } from '../treeAdapter.js';
import { StartTagToken, EndTagToken } from '../tokenizer/index.js';

const NOAH_ARK_CAPACITY = 3;

export const MARKER_ENTRY = 'MARKER_ENTRY';
export const ELEMENT_ENTRY = 'ELEMENT_ENTRY';

export interface FormattingElementEntry<T extends TreeAdapterTypeMap> {
    type: 'ELEMENT_ENTRY';
    token: StartTagToken | EndTagToken;
    element: T['element'];
}
export interface FormattingMarkerEntry {
    type: 'MARKER_ENTRY';
}

export type FormattingEntry<T extends TreeAdapterTypeMap> = FormattingElementEntry<T> | FormattingMarkerEntry;

interface NoahCandidate<T extends TreeAdapterTypeMap> {
    idx: number;
    attrs: Array<T['attribute']>;
}

//List of formatting elements
export class FormattingElementList<T extends TreeAdapterTypeMap> {
    public get length(): number {
        return this.entries.length;
    }
    public entries: FormattingEntry<T>[];
    public treeAdapter: TreeAdapter<T>;
    public bookmark: FormattingEntry<T> | null;

    public constructor(treeAdapter: TreeAdapter<T>) {
        this.entries = [];
        this.treeAdapter = treeAdapter;
        this.bookmark = null;
    }

    //Noah Ark's condition
    //OPTIMIZATION: at first we try to find possible candidates for exclusion using
    //lightweight heuristics without thorough attributes check.
    protected _getNoahArkConditionCandidates(newElement: T['element']): NoahCandidate<T>[] {
        const candidates = [];

        if (this.length >= NOAH_ARK_CAPACITY) {
            const neAttrsLength = this.treeAdapter.getAttrList(newElement).length;
            const neTagName = this.treeAdapter.getTagName(newElement);
            const neNamespaceURI = this.treeAdapter.getNamespaceURI(newElement);

            for (let i = this.length - 1; i >= 0; i--) {
                const entry = this.entries[i];

                if (!entry) {
                    continue;
                }

                if (entry.type === MARKER_ENTRY) {
                    break;
                }

                const element = entry.element;
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

        return candidates.length < NOAH_ARK_CAPACITY ? [] : candidates;
    }

    protected _ensureNoahArkCondition(newElement: T['element']): void {
        const candidates = this._getNoahArkConditionCandidates(newElement);
        let cLength = candidates.length;

        if (cLength) {
            const neAttrs = this.treeAdapter.getAttrList(newElement);
            const neAttrsLength = neAttrs.length;
            const neAttrsMap = Object.create(null);

            //NOTE: build attrs map for the new element so we can perform fast lookups
            for (const neAttr of neAttrs) {
                neAttrsMap[neAttr.name] = neAttr.value;
            }

            for (let i = 0; i < neAttrsLength; i++) {
                for (const candidate of candidates) {
                    const cAttr = candidate.attrs[i];

                    if (cAttr && neAttrsMap[cAttr.name] !== cAttr.value) {
                        candidates.splice(candidates.indexOf(candidate), 1);
                        cLength--;
                    }

                    if (candidates.length < NOAH_ARK_CAPACITY) {
                        return;
                    }
                }
            }

            //NOTE: remove bottommost candidates until Noah's Ark condition will not be met
            for (let i = cLength - 1; i >= NOAH_ARK_CAPACITY - 1; i--) {
                const candidate = candidates[i];
                if (candidate) {
                    this.entries.splice(candidate.idx, 1);
                }
            }
        }
    }

    //Mutations
    public insertMarker(): void {
        this.entries.push({ type: MARKER_ENTRY });
    }

    public pushElement(element: T['element'], token: StartTagToken | EndTagToken): void {
        this._ensureNoahArkCondition(element);

        this.entries.push({
            type: ELEMENT_ENTRY,
            element: element,
            token: token,
        });
    }

    public insertElementAfterBookmark(element: T['element'], token: StartTagToken | EndTagToken): void {
        let bookmarkIdx = this.length - 1;

        for (; bookmarkIdx >= 0; bookmarkIdx--) {
            if (this.entries[bookmarkIdx] === this.bookmark) {
                break;
            }
        }

        this.entries.splice(bookmarkIdx + 1, 0, {
            type: ELEMENT_ENTRY,
            element: element,
            token: token,
        });
    }

    public removeEntry(entry: unknown): void {
        for (let i = this.length - 1; i >= 0; i--) {
            if (this.entries[i] === entry) {
                this.entries.splice(i, 1);
                break;
            }
        }
    }

    public clearToLastMarker(): void {
        while (this.length) {
            const entry = this.entries.pop();

            if (entry?.type === MARKER_ENTRY) {
                break;
            }
        }
    }

    //Search
    public getElementEntryInScopeWithTagName(tagName: string): FormattingElementEntry<T> | null {
        for (let i = this.length - 1; i >= 0; i--) {
            const entry = this.entries[i];

            if (!entry) {
                continue;
            }

            if (entry.type === MARKER_ENTRY) {
                return null;
            }

            if (this.treeAdapter.getTagName(entry.element) === tagName) {
                return entry;
            }
        }

        return null;
    }

    public getElementEntry(element: T['element']): FormattingElementEntry<T> | null {
        for (let i = this.length - 1; i >= 0; i--) {
            const entry = this.entries[i];

            if (entry && entry.type === ELEMENT_ENTRY && entry.element === element) {
                return entry;
            }
        }

        return null;
    }
}
