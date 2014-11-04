'use strict';

//Adoption agency algorithm
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tree-construction.html#adoptionAgency)

var HTML = require('../common/html');

//Aliases
var $ = HTML.TAG_NAMES,
    NS = HTML.NAMESPACES;

//Const
var OUTER_LOOP_ITER = 8,
    INNER_LOOP_ITER = 3;

//Steps 6-8 of the algorithm
function adjustFormattingElementEntry(p, token, formattingElementEntry) {
    if (!p.openElements.contains(formattingElementEntry.element)) {
        p.activeFormattingElements.removeEntry(formattingElementEntry);
        formattingElementEntry = null;
    }

    else if (!p.openElements.hasInScope(token.tagName))
        formattingElementEntry = null;

    return formattingElementEntry;
}

//Steps 9 and 10 of the algorithm
function obtainFurthestBlock(p, formattingElementEntry) {
    var furthestBlock = null;

    for (var i = p.openElements.stackTop; i >= 0; i--) {
        var element = p.openElements.items[i];

        if (element === formattingElementEntry.element)
            break;

        if (p._isSpecialElement(element))
            furthestBlock = element;
    }

    if (!furthestBlock) {
        p.openElements.popUntilElementPopped(formattingElementEntry.element);
        p.activeFormattingElements.removeEntry(formattingElementEntry);
    }

    return furthestBlock;
}

//Step 13 of the algorithm
function innerLoop(p, furthestBlock, formattingElement) {
    var element = null,
        lastElement = furthestBlock,
        nextElement = p.openElements.getCommonAncestor(furthestBlock);

    for (var i = 0; i < INNER_LOOP_ITER; i++) {
        element = nextElement;

        //NOTE: store next element for the next loop iteration (it may be deleted from the stack by step 9.5)
        nextElement = p.openElements.getCommonAncestor(element);

        var elementEntry = p.activeFormattingElements.getElementEntry(element);

        if (!elementEntry) {
            p.openElements.remove(element);
            continue;
        }

        if (element === formattingElement)
            break;

        element = recreateElementFromEntry(p, elementEntry);

        if (lastElement === furthestBlock)
            p.activeFormattingElements.bookmark = elementEntry;

        p.treeAdapter.detachNode(lastElement);
        p.treeAdapter.appendChild(element, lastElement);
        lastElement = element;
    }

    return lastElement;
}

//Step 13.7 of the algorithm
function recreateElementFromEntry(p, elementEntry) {
    var ns = p.treeAdapter.getNamespaceURI(elementEntry.element),
        newElement = p.treeAdapter.createElement(elementEntry.token.tagName, ns, elementEntry.token.attrs);

    p.openElements.replace(elementEntry.element, newElement);
    elementEntry.element = newElement;

    return newElement;
}

//Step 14 of the algorithm
function insertLastNodeInCommonAncestor(p, commonAncestor, lastElement) {
    if (p._isElementCausesFosterParenting(commonAncestor))
        p._fosterParentElement(lastElement);

    else {
        var tn = p.treeAdapter.getTagName(commonAncestor),
            ns = p.treeAdapter.getNamespaceURI(commonAncestor);

        if (tn === $.TEMPLATE && ns === NS.HTML)
            commonAncestor = p.treeAdapter.getChildNodes(commonAncestor)[0];

        p.treeAdapter.appendChild(commonAncestor, lastElement);
    }
}

//Steps 15-19 of the algorithm
function replaceFormattingElement(p, furthestBlock, formattingElementEntry) {
    var ns = p.treeAdapter.getNamespaceURI(formattingElementEntry.element),
        token = formattingElementEntry.token,
        newElement = p.treeAdapter.createElement(token.tagName, ns, token.attrs);

    p._adoptNodes(furthestBlock, newElement);
    p.treeAdapter.appendChild(furthestBlock, newElement);

    p.activeFormattingElements.insertElementAfterBookmark(newElement, formattingElementEntry.token);
    p.activeFormattingElements.removeEntry(formattingElementEntry);

    p.openElements.remove(formattingElementEntry.element);
    p.openElements.insertAfter(furthestBlock, newElement);
}

//Algorithm entry point
exports.call = function (p, token) {
    for (var i = 0; i < OUTER_LOOP_ITER; i++) {
        var formattingElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(token.tagName);

        if (!formattingElementEntry)
            return false;

        formattingElementEntry = adjustFormattingElementEntry(p, token, formattingElementEntry);

        if (!formattingElementEntry)
            break;

        var furthestBlock = obtainFurthestBlock(p, formattingElementEntry);

        if (!furthestBlock)
            break;

        p.activeFormattingElements.bookmark = formattingElementEntry;

        var lastElement = innerLoop(p, furthestBlock, formattingElementEntry.element),
            commonAncestor = p.openElements.getCommonAncestor(formattingElementEntry.element);

        p.treeAdapter.detachNode(lastElement);
        insertLastNodeInCommonAncestor(p, commonAncestor, lastElement);
        replaceFormattingElement(p, furthestBlock, formattingElementEntry);
    }

    return true;
};
