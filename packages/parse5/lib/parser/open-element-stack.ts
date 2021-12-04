import { TAG_ID as $, NAMESPACES as NS, isNumberedHeader } from '../common/html.js';
import type { TreeAdapter, TreeAdapterTypeMap } from '../tree-adapters/interface';

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
const SCOPING_ELEMENT_NS = new Map<$, NS>([
    [$.APPLET, NS.HTML],
    [$.CAPTION, NS.HTML],
    [$.HTML, NS.HTML],
    [$.MARQUEE, NS.HTML],
    [$.OBJECT, NS.HTML],
    [$.TABLE, NS.HTML],
    [$.TD, NS.HTML],
    [$.TEMPLATE, NS.HTML],
    [$.TH, NS.HTML],
    [$.ANNOTATION_XML, NS.MATHML],
    [$.MI, NS.MATHML],
    [$.MN, NS.MATHML],
    [$.MO, NS.MATHML],
    [$.MS, NS.MATHML],
    [$.MTEXT, NS.MATHML],
    [$.DESC, NS.SVG],
    [$.FOREIGN_OBJECT, NS.SVG],
    [$.TITLE, NS.SVG],
]);

const NAMED_HEADERS = [$.H1, $.H2, $.H3, $.H4, $.H5, $.H6];
const TABLE_ROW_CONTEXT = [$.TR, $.TEMPLATE, $.HTML];
const TABLE_BODY_CONTEXT = [$.TBODY, $.TFOOT, $.THEAD, $.TEMPLATE, $.HTML];
const TABLE_CONTEXT = [$.TABLE, $.TEMPLATE, $.HTML];
const TABLE_CELLS = [$.TD, $.TH];

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

    public onItemPop: null | ((node: T['parentNode']) => void) = null;

    constructor(document: T['document'], private treeAdapter: TreeAdapter<T>) {
        this.current = document;
    }

    //Index of element
    _indexOf(element: T['element']) {
        return this.items.lastIndexOf(element, this.stackTop);
    }

    //Update current element
    private _isInTemplate() {
        return this.currentTagId === $.TEMPLATE && this.treeAdapter.getNamespaceURI(this.current) === NS.HTML;
    }

    private _updateCurrentElement() {
        this.current = this.items[this.stackTop];
        this.currentTagId = this.tagIDs[this.stackTop];
    }

    //Mutations
    push(element: T['element'], tagID: $) {
        this.stackTop++;

        this.items[this.stackTop] = element;
        this.tagIDs[this.stackTop] = tagID;
        this._updateCurrentElement();

        if (this._isInTemplate()) {
            this.tmplCount++;
        }
    }

    pop() {
        this.onItemPop?.(this.current);
        this.stackTop--;

        if (this.tmplCount > 0 && this._isInTemplate()) {
            this.tmplCount--;
        }

        this._updateCurrentElement();
    }

    replace(oldElement: T['element'], newElement: T['element']) {
        const idx = this._indexOf(oldElement);

        this.items[idx] = newElement;

        if (idx === this.stackTop) {
            this._updateCurrentElement();
        }
    }

    insertAfter(referenceElement: T['element'], newElement: T['element'], newElementID: $) {
        const insertionIdx = this._indexOf(referenceElement) + 1;

        this.items.splice(insertionIdx, 0, newElement);
        this.tagIDs.splice(insertionIdx, 0, newElementID);
        this.stackTop++;

        if (insertionIdx === this.stackTop) {
            this._updateCurrentElement();
        }
    }

    popUntilTagNamePopped(tagName: $) {
        let targetIdx = this.stackTop + 1;

        do {
            targetIdx = this.tagIDs.lastIndexOf(tagName, targetIdx - 1);
        } while (targetIdx > 0 && this.treeAdapter.getNamespaceURI(this.items[targetIdx]) !== NS.HTML);

        this.shortenToLength(targetIdx < 0 ? 0 : targetIdx);
    }

    shortenToLength(idx: number) {
        for (let i = this.stackTop; (this.onItemPop || this.tmplCount > 0) && i >= idx; i--) {
            this.onItemPop?.(this.items[i]);

            if (
                this.tmplCount > 0 &&
                this.tagIDs[i] === $.TEMPLATE &&
                this.treeAdapter.getNamespaceURI(this.items[i]) === NS.HTML
            ) {
                this.tmplCount -= 1;
            }
        }

        this.stackTop = idx - 1;
        this._updateCurrentElement();
    }

    popUntilElementPopped(element: T['element']) {
        const idx = this._indexOf(element);
        this.shortenToLength(idx < 0 ? 0 : idx);
    }

    private popUntilPopped(tagNames: $[], targetNS: NS) {
        const idx = this._indexOfTagNames(tagNames, targetNS);
        this.shortenToLength(idx < 0 ? 0 : idx);
    }

    popUntilNumberedHeaderPopped() {
        this.popUntilPopped(NAMED_HEADERS, NS.HTML);
    }

    popUntilTableCellPopped() {
        this.popUntilPopped(TABLE_CELLS, NS.HTML);
    }

    popAllUpToHtmlElement() {
        //NOTE: here we assume that root <html> element is always first in the open element stack, so
        //we perform this fast stack clean up.
        this.tmplCount = 0;
        this.shortenToLength(1);
    }

    private _indexOfTagNames(tagNames: $[], namespace: NS) {
        for (let i = this.stackTop; i >= 0; i--) {
            if (tagNames.includes(this.tagIDs[i]) && this.treeAdapter.getNamespaceURI(this.items[i]) === namespace) {
                return i;
            }
        }
        return -1;
    }

    private clearBackTo(tagNames: $[], targetNS: NS) {
        const idx = this._indexOfTagNames(tagNames, targetNS);
        this.shortenToLength(idx + 1);
    }

    clearBackToTableContext() {
        this.clearBackTo(TABLE_CONTEXT, NS.HTML);
    }

    clearBackToTableBodyContext() {
        this.clearBackTo(TABLE_BODY_CONTEXT, NS.HTML);
    }

    clearBackToTableRowContext() {
        this.clearBackTo(TABLE_ROW_CONTEXT, NS.HTML);
    }

    remove(element: T['element']) {
        const idx = this._indexOf(element);

        if (idx >= 0) {
            if (idx === this.stackTop) {
                this.pop();
            } else {
                this.onItemPop?.(element);
                this.items.splice(idx, 1);
                this.tagIDs.splice(idx, 1);
                this.stackTop--;
                this._updateCurrentElement();
            }
        }
    }

    //Search
    tryPeekProperlyNestedBodyElement() {
        //Properly nested <body> element (should be second element in stack).
        return this.stackTop >= 1 && this.tagIDs[1] === $.BODY ? this.items[1] : null;
    }

    contains(element: T['element']) {
        return this._indexOf(element) > -1;
    }

    getCommonAncestor(element: T['element']) {
        const elementIdx = this._indexOf(element) - 1;

        return elementIdx >= 0 ? this.items[elementIdx] : null;
    }

    isRootHtmlElementCurrent() {
        return this.stackTop === 0 && this.tagIDs[0] === $.HTML;
    }

    //Element in scope
    hasInScope(tagName: $) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (tn === tagName && ns === NS.HTML) {
                return true;
            }

            if (SCOPING_ELEMENT_NS.get(tn) === ns) {
                return false;
            }
        }

        return true;
    }

    hasNumberedHeaderInScope() {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (isNumberedHeader(tn) && ns === NS.HTML) {
                return true;
            }

            if (SCOPING_ELEMENT_NS.get(tn) === ns) {
                return false;
            }
        }

        return true;
    }

    hasInListItemScope(tagName: $) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (tn === tagName && ns === NS.HTML) {
                return true;
            }

            if (((tn === $.UL || tn === $.OL) && ns === NS.HTML) || SCOPING_ELEMENT_NS.get(tn) === ns) {
                return false;
            }
        }

        return true;
    }

    hasInButtonScope(tagName: $) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (tn === tagName && ns === NS.HTML) {
                return true;
            }

            if ((tn === $.BUTTON && ns === NS.HTML) || SCOPING_ELEMENT_NS.get(tn) === ns) {
                return false;
            }
        }

        return true;
    }

    hasInTableScope(tagName: $) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (ns !== NS.HTML) {
                continue;
            }

            if (tn === tagName) {
                return true;
            }

            if (tn === $.TABLE || tn === $.TEMPLATE || tn === $.HTML) {
                return false;
            }
        }

        return true;
    }

    hasTableBodyContextInTableScope() {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (ns !== NS.HTML) {
                continue;
            }

            if (tn === $.TBODY || tn === $.THEAD || tn === $.TFOOT) {
                return true;
            }

            if (tn === $.TABLE || tn === $.HTML) {
                return false;
            }
        }

        return true;
    }

    hasInSelectScope(tagName: $) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (ns !== NS.HTML) {
                continue;
            }

            if (tn === tagName) {
                return true;
            }

            if (tn !== $.OPTION && tn !== $.OPTGROUP) {
                return false;
            }
        }

        return true;
    }

    //Implied end tags
    generateImpliedEndTags() {
        while (IMPLICIT_END_TAG_REQUIRED.has(this.currentTagId)) {
            this.pop();
        }
    }

    generateImpliedEndTagsThoroughly() {
        while (IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId)) {
            this.pop();
        }
    }

    generateImpliedEndTagsWithExclusion(exclusionTagName: string) {
        while (
            this.treeAdapter.getTagName(this.current) !== exclusionTagName &&
            IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId)
        ) {
            this.pop();
        }
    }
}
