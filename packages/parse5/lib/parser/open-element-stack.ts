import { TAG_NAMES as $, NAMESPACES as NS, isNumberedHeader } from '../common/html.js';
import type { TreeAdapter, TreeAdapterTypeMap } from './../tree-adapters/interface';

//Element utils
const IMPLICIT_END_TAG_REQUIRED = new Set<string>([
    $.DD,
    $.DT,
    $.LI,
    $.OPTGROUP,
    $.OPTION,
    $.P,
    $.RB,
    $.RP,
    $.RT,
    $.RTC,
]);
const IMPLICIT_END_TAG_REQUIRED_THOROUGHLY = new Set<string>([
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
const SCOPING_ELEMENT_NS = new Map<string, NS>([
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

function isTemplate(tagName: string, namespace: NS): boolean {
    return tagName === $.TEMPLATE && namespace === NS.HTML;
}

const NAMED_HEADERS = [$.H1, $.H2, $.H3, $.H4, $.H5, $.H6];
const TABLE_ROW_CONTEXT = [$.TR, $.TEMPLATE, $.HTML];
const TABLE_BODY_CONTEXT = [$.TBODY, $.TFOOT, $.THEAD, $.TEMPLATE, $.HTML];
const TABLE_CONTEXT = [$.TABLE, $.TEMPLATE, $.HTML];
const TABLE_CELLS = [$.TD, $.TH];

//Stack of open elements
export class OpenElementStack<T extends TreeAdapterTypeMap> {
    items: T['parentNode'][] = [];
    current: T['parentNode'];
    currentTagName: string | null = null;
    currentTmplContent: T['documentFragment'] | null = null;
    stackTop = -1;
    tmplCount = 0;

    public onItemPop: null | ((node: T['parentNode']) => void) = null;

    constructor(document: T['document'], private treeAdapter: TreeAdapter<T>) {
        this.current = document;
    }

    //Index of element
    _indexOf(element: T['element']) {
        return this.items.lastIndexOf(element, this.stackTop);
    }

    //Update current element
    _isInTemplate() {
        return this.current && isTemplate(this.currentTagName!, this.treeAdapter.getNamespaceURI(this.current));
    }

    _updateCurrentElement() {
        this.current = this.items[this.stackTop];
        this.currentTagName = this.current && this.treeAdapter.getTagName(this.current);

        this.currentTmplContent = this._isInTemplate() ? this.treeAdapter.getTemplateContent(this.current) : null;
    }

    //Mutations
    push(element: T['element']) {
        this.items[++this.stackTop] = element;
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

    insertAfter(referenceElement: T['element'], newElement: T['element']) {
        const insertionIdx = this._indexOf(referenceElement) + 1;

        this.items.splice(insertionIdx, 0, newElement);
        this.stackTop++;

        if (insertionIdx === this.stackTop) {
            this._updateCurrentElement();
        }
    }

    popUntilTagNamePopped(tagName: string) {
        let targetIdx = this.stackTop;

        for (; targetIdx > 0; targetIdx--) {
            if (
                this.treeAdapter.getTagName(this.items[targetIdx]) === tagName &&
                this.treeAdapter.getNamespaceURI(this.items[targetIdx]) === NS.HTML
            ) {
                break;
            }
        }

        this.shortenToLength(targetIdx);
    }

    shortenToLength(idx: number) {
        for (let i = this.stackTop; (this.onItemPop || this.tmplCount > 0) && i >= idx; i--) {
            this.onItemPop?.(this.items[i]);

            if (
                this.tmplCount > 0 &&
                isTemplate(this.treeAdapter.getTagName(this.items[i]), this.treeAdapter.getNamespaceURI(this.items[i]))
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

    protected popUntilPopped(tagNames: string[], targetNS: NS) {
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

    private _indexOfTagNames(tagNames: string[], namespace: NS) {
        for (let i = this.stackTop; i >= 0; i--) {
            if (
                tagNames.includes(this.treeAdapter.getTagName(this.items[i])) &&
                this.treeAdapter.getNamespaceURI(this.items[i]) === namespace
            ) {
                return i;
            }
        }
        return -1;
    }

    private clearBackTo(tagNames: string[], targetNS: NS) {
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
                this.stackTop--;
                this._updateCurrentElement();
            }
        }
    }

    //Search
    tryPeekProperlyNestedBodyElement() {
        //Properly nested <body> element (should be second element in stack).
        const element = this.items[1];

        return element && this.treeAdapter.getTagName(element) === $.BODY ? element : null;
    }

    contains(element: T['element']) {
        return this._indexOf(element) > -1;
    }

    getCommonAncestor(element: T['element']) {
        const elementIdx = this._indexOf(element) - 1;

        return elementIdx >= 0 ? this.items[elementIdx] : null;
    }

    isRootHtmlElementCurrent() {
        return this.stackTop === 0 && this.currentTagName === $.HTML;
    }

    //Element in scope
    hasInScope(tagName: string) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
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
            const tn = this.treeAdapter.getTagName(this.items[i]);
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

    hasInListItemScope(tagName: string) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
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

    hasInButtonScope(tagName: string) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
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

    hasInTableScope(tagName: string) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
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
            const tn = this.treeAdapter.getTagName(this.items[i]);
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

    hasInSelectScope(tagName: string) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
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
        while (this.currentTagName !== null && IMPLICIT_END_TAG_REQUIRED.has(this.currentTagName)) {
            this.pop();
        }
    }

    generateImpliedEndTagsThoroughly() {
        while (this.currentTagName !== null && IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagName)) {
            this.pop();
        }
    }

    generateImpliedEndTagsWithExclusion(exclusionTagName: string) {
        while (
            this.currentTagName !== null &&
            this.currentTagName !== exclusionTagName &&
            IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagName)
        ) {
            this.pop();
        }
    }
}
