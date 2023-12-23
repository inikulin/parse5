import { TAG_ID as $, NS, NUMBERED_HEADERS } from '../common/html.js';
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
const SCOPING_ELEMENTS_HTML = new Set([
    $.APPLET,
    $.CAPTION,
    $.HTML,
    $.MARQUEE,
    $.OBJECT,
    $.TABLE,
    $.TD,
    $.TEMPLATE,
    $.TH,
]);
const SCOPING_ELEMENTS_HTML_LIST = new Set([...SCOPING_ELEMENTS_HTML, $.OL, $.UL]);
const SCOPING_ELEMENTS_HTML_BUTTON = new Set([...SCOPING_ELEMENTS_HTML, $.BUTTON]);
const SCOPING_ELEMENTS_MATHML = new Set([$.ANNOTATION_XML, $.MI, $.MN, $.MO, $.MS, $.MTEXT]);
const SCOPING_ELEMENTS_SVG = new Set([$.DESC, $.FOREIGN_OBJECT, $.TITLE]);

const TABLE_ROW_CONTEXT = new Set([$.TR, $.TEMPLATE, $.HTML]);
const TABLE_BODY_CONTEXT = new Set([$.TBODY, $.TFOOT, $.THEAD, $.TEMPLATE, $.HTML]);
const TABLE_CONTEXT = new Set([$.TABLE, $.TEMPLATE, $.HTML]);
const TABLE_CELLS = new Set([$.TD, $.TH]);

export interface StackHandler<T extends TreeAdapterTypeMap> {
    onItemPush: (node: T['parentNode'], tid: number, isTop: boolean) => void;
    onItemPop: (node: T['parentNode'], isTop: boolean) => void;
}

//Stack of open elements
export class OpenElementStack<T extends TreeAdapterTypeMap> {
    items: T['parentNode'][] = [];
    tagIDs: $[] = [];
    current: T['parentNode'];
    stackTop = -1;
    tmplCount = 0;

    currentTagId = $.UNKNOWN;

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

    //Index of element
    private _indexOf(element: T['element']): number {
        return this.items.lastIndexOf(element, this.stackTop);
    }

    //Update current element
    private _isInTemplate(): boolean {
        return this.currentTagId === $.TEMPLATE && this.treeAdapter.getNamespaceURI(this.current) === NS.HTML;
    }

    private _updateCurrentElement(): void {
        this.current = this.items[this.stackTop];
        this.currentTagId = this.tagIDs[this.stackTop];
    }

    //Mutations
    push(element: T['element'], tagID: $): void {
        this.stackTop++;

        this.items[this.stackTop] = element;
        this.current = element;
        this.tagIDs[this.stackTop] = tagID;
        this.currentTagId = tagID;

        if (this._isInTemplate()) {
            this.tmplCount++;
        }

        this.handler.onItemPush(element, tagID, true);
    }

    pop(): void {
        const popped = this.current;
        if (this.tmplCount > 0 && this._isInTemplate()) {
            this.tmplCount--;
        }

        this.stackTop--;
        this._updateCurrentElement();

        this.handler.onItemPop(popped, true);
    }

    replace(oldElement: T['element'], newElement: T['element']): void {
        const idx = this._indexOf(oldElement);

        this.items[idx] = newElement;

        if (idx === this.stackTop) {
            this.current = newElement;
        }
    }

    insertAfter(referenceElement: T['element'], newElement: T['element'], newElementID: $): void {
        const insertionIdx = this._indexOf(referenceElement) + 1;

        this.items.splice(insertionIdx, 0, newElement);
        this.tagIDs.splice(insertionIdx, 0, newElementID);
        this.stackTop++;

        if (insertionIdx === this.stackTop) {
            this._updateCurrentElement();
        }

        this.handler.onItemPush(this.current, this.currentTagId, insertionIdx === this.stackTop);
    }

    popUntilTagNamePopped(tagName: $): void {
        let targetIdx = this.stackTop + 1;

        do {
            targetIdx = this.tagIDs.lastIndexOf(tagName, targetIdx - 1);
        } while (targetIdx > 0 && this.treeAdapter.getNamespaceURI(this.items[targetIdx]) !== NS.HTML);

        this.shortenToLength(targetIdx < 0 ? 0 : targetIdx);
    }

    shortenToLength(idx: number): void {
        while (this.stackTop >= idx) {
            const popped = this.current;

            if (this.tmplCount > 0 && this._isInTemplate()) {
                this.tmplCount -= 1;
            }

            this.stackTop--;
            this._updateCurrentElement();

            this.handler.onItemPop(popped, this.stackTop < idx);
        }
    }

    popUntilElementPopped(element: T['element']): void {
        const idx = this._indexOf(element);
        this.shortenToLength(idx < 0 ? 0 : idx);
    }

    private popUntilPopped(tagNames: Set<$>, targetNS: NS): void {
        const idx = this._indexOfTagNames(tagNames, targetNS);
        this.shortenToLength(idx < 0 ? 0 : idx);
    }

    popUntilNumberedHeaderPopped(): void {
        this.popUntilPopped(NUMBERED_HEADERS, NS.HTML);
    }

    popUntilTableCellPopped(): void {
        this.popUntilPopped(TABLE_CELLS, NS.HTML);
    }

    popAllUpToHtmlElement(): void {
        //NOTE: here we assume that the root <html> element is always first in the open element stack, so
        //we perform this fast stack clean up.
        this.tmplCount = 0;
        this.shortenToLength(1);
    }

    private _indexOfTagNames(tagNames: Set<$>, namespace: NS): number {
        for (let i = this.stackTop; i >= 0; i--) {
            if (tagNames.has(this.tagIDs[i]) && this.treeAdapter.getNamespaceURI(this.items[i]) === namespace) {
                return i;
            }
        }
        return -1;
    }

    private clearBackTo(tagNames: Set<$>, targetNS: NS): void {
        const idx = this._indexOfTagNames(tagNames, targetNS);
        this.shortenToLength(idx + 1);
    }

    clearBackToTableContext(): void {
        this.clearBackTo(TABLE_CONTEXT, NS.HTML);
    }

    clearBackToTableBodyContext(): void {
        this.clearBackTo(TABLE_BODY_CONTEXT, NS.HTML);
    }

    clearBackToTableRowContext(): void {
        this.clearBackTo(TABLE_ROW_CONTEXT, NS.HTML);
    }

    remove(element: T['element']): void {
        const idx = this._indexOf(element);

        if (idx >= 0) {
            if (idx === this.stackTop) {
                this.pop();
            } else {
                this.items.splice(idx, 1);
                this.tagIDs.splice(idx, 1);
                this.stackTop--;
                this._updateCurrentElement();
                this.handler.onItemPop(element, false);
            }
        }
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
        const elementIdx = this._indexOf(element) - 1;

        return elementIdx >= 0 ? this.items[elementIdx] : null;
    }

    isRootHtmlElementCurrent(): boolean {
        return this.stackTop === 0 && this.tagIDs[0] === $.HTML;
    }

    //Element in scope
    private hasInDynamicScope(tagName: $, htmlScope: Set<$>): boolean {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];

            switch (this.treeAdapter.getNamespaceURI(this.items[i])) {
                case NS.HTML: {
                    if (tn === tagName) return true;
                    if (htmlScope.has(tn)) return false;
                    break;
                }
                case NS.SVG: {
                    if (SCOPING_ELEMENTS_SVG.has(tn)) return false;
                    break;
                }
                case NS.MATHML: {
                    if (SCOPING_ELEMENTS_MATHML.has(tn)) return false;
                    break;
                }
            }
        }

        return true;
    }

    hasInScope(tagName: $): boolean {
        return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML);
    }

    hasInListItemScope(tagName: $): boolean {
        return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML_LIST);
    }

    hasInButtonScope(tagName: $): boolean {
        return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML_BUTTON);
    }

    hasNumberedHeaderInScope(): boolean {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];

            switch (this.treeAdapter.getNamespaceURI(this.items[i])) {
                case NS.HTML: {
                    if (NUMBERED_HEADERS.has(tn)) return true;
                    if (SCOPING_ELEMENTS_HTML.has(tn)) return false;
                    break;
                }
                case NS.SVG: {
                    if (SCOPING_ELEMENTS_SVG.has(tn)) return false;
                    break;
                }
                case NS.MATHML: {
                    if (SCOPING_ELEMENTS_MATHML.has(tn)) return false;
                    break;
                }
            }
        }

        return true;
    }

    hasInTableScope(tagName: $): boolean {
        for (let i = this.stackTop; i >= 0; i--) {
            if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NS.HTML) {
                continue;
            }

            switch (this.tagIDs[i]) {
                case tagName: {
                    return true;
                }
                case $.TABLE:
                case $.HTML: {
                    return false;
                }
            }
        }

        return true;
    }

    hasTableBodyContextInTableScope(): boolean {
        for (let i = this.stackTop; i >= 0; i--) {
            if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NS.HTML) {
                continue;
            }

            switch (this.tagIDs[i]) {
                case $.TBODY:
                case $.THEAD:
                case $.TFOOT: {
                    return true;
                }
                case $.TABLE:
                case $.HTML: {
                    return false;
                }
            }
        }

        return true;
    }

    hasInSelectScope(tagName: $): boolean {
        for (let i = this.stackTop; i >= 0; i--) {
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
        while (IMPLICIT_END_TAG_REQUIRED.has(this.currentTagId)) {
            this.pop();
        }
    }

    generateImpliedEndTagsThoroughly(): void {
        while (IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId)) {
            this.pop();
        }
    }

    generateImpliedEndTagsWithExclusion(exclusionId: $): void {
        while (this.currentTagId !== exclusionId && IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId)) {
            this.pop();
        }
    }
}
