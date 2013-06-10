//Const
var NOAH_ARK_CAPACITY = 3;

//List of formatting elements
var FormattingElementList = exports.FormattingElementList = function (treeAdapter) {
    this.list = [];
    this.length = 0;
    this.treeAdapter = treeAdapter;
};

//Entry types
FormattingElementList.MARKER_ENTRY = 'MARKER_ENTRY';
FormattingElementList.ELEMENT_ENTRY = 'ELEMENT_ENTRY';

//Noah Ark's condition
//OPTIMIZATION: at first we try to find possible candidates for exclusion using
//lightweight heuristics without thorough attributes check.
FormattingElementList.prototype._getNoahArkConditionCandidates = function (newElement) {
    var candidates = [];

    if (this.length >= NOAH_ARK_CAPACITY) {
        var neAttrsLength = this.treeAdapter.getElementAttrsList(newElement).length,
            neTagName = this.treeAdapter.getElementTagName(newElement),
            neNamespaceURI = this.treeAdapter.getElementNamespaceURI(newElement);

        for (var i = this.length - 1; i >= 0; i--) {
            var entry = this.list[i];

            if (entry.type === FormattingElementList.MARKER_ENTRY)
                break;

            var element = entry.element,
                elementAttrs = this.treeAdapter.getElementAttrsList(element);

            if (this.treeAdapter.getElementTagName(element) === neTagName &&
                this.treeAdapter.getElementNamespaceURI(element) === neNamespaceURI &&
                elementAttrs.length === neAttrsLength) {
                candidates.push({idx: i, attrs: elementAttrs});
            }
        }
    }

    return candidates.length < NOAH_ARK_CAPACITY ? [] : candidates;
};

FormattingElementList.prototype._ensureNoahArkCondition = function (newElement) {
    var candidates = this._getNoahArkConditionCandidates(newElement),
        cLength = candidates.length;

    if (cLength) {
        var neAttrs = this.treeAdapter.getElementAttrsList(newElement),
            neAttrsLength = neAttrs.length,
            neAttrsMap = {};

        //NOTE: build attrs map for the new element so we can perform fast lookups
        for (var i = 0; i < neAttrsLength; i++) {
            var neAttr = neAttrs[i];

            neAttrsMap[neAttr.name] = neAttr.value;
        }

        for (var i = 0; i < neAttrsLength; i++) {
            for (var j = 0; j < cLength; j++) {
                var cAttr = candidates[j].attrs[i];

                if (neAttrsMap[cAttr.name] !== cAttr.value) {
                    candidates.splice(j, 1);
                    cLength--;
                }

                if (candidates.length < NOAH_ARK_CAPACITY)
                    return;
            }
        }

        //NOTE: remove bottommost candidates until Noah's Ark condition will not be met
        for (var i = cLength - 1; i >= NOAH_ARK_CAPACITY - 1; i--) {
            this.list.splice(candidates[i].idx, 1);
            this.length--;
        }
    }
};

//Mutations
FormattingElementList.prototype.insertMarker = function () {
    this.list.push({type: FormattingElementList.MARKER_ENTRY});
    this.length++;
};

FormattingElementList.prototype.push = function (element, token) {
    this._ensureNoahArkCondition(element);

    this.list.push({
        type: FormattingElementList.ELEMENT_ENTRY,
        element: element,
        token: token
    });

    this.length++;
};

FormattingElementList.prototype.remove = function (element) {
    for (var i = this.length - 1; i >= 0; i--) {
        var entry = this.list[i];

        if (entry.type === FormattingElementList.ELEMENT_ENTRY && entry.element === element) {
            this.list.splice(i, 1);
            this.length--;
            break;
        }
    }
};

FormattingElementList.prototype.clearToLastMarker = function () {
    while (this.length) {
        var entry = this.list.pop();

        this.length--;

        if (entry.type === FormattingElementList.MARKER_ENTRY)
            break;
    }
};

//Search
FormattingElementList.prototype.getElementInScopeWithTagName = function (tagName) {
    for (var i = this.length - 1; i >= 0; i--) {
        var entry = this.list[i];

        if (entry.type === FormattingElementList.MARKER_ENTRY)
            return null;

        if (this.treeAdapter.getElementTagName(entry.element) === tagName)
            return entry.element;
    }

    return null;
};

FormattingElementList.prototype.getElementBookmark = function (element) {
    for (var i = 0, idx = -1; i < this.length; i++) {
        var entry = this.list[i];

        if (entry.type === FormattingElementList.ELEMENT_ENTRY) {
            idx++;

            if (entry.element === element)
                return idx;
        }
    }

    return -1;
};

FormattingElementList.prototype.getElementEntry = function (element) {
    for (var i = this.length - 1; i >= 0; i--) {
        var entry = this.list[i];

        if (entry.type === FormattingElementList.ELEMENT_ENTRY && entry.element == element)
            return entry;
    }

    return null;
};
