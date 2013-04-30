var MARKER_ENTRY = 'MARKER_ENTRY',
    ELEMENT_ENTRY = 'ELEMENT_ENTRY',
    NOAH_ARK_CAPACITY = 3;

var FormattingElementList = exports.FormattingElementList = function () {
    this.list = [];
    this.length = 0;
};

FormattingElementList.prototype.insertMarker = function () {
    this.list.push({type: MARKER_ENTRY});
    this.length++;
};

FormattingElementList.prototype.push = function (element) {
    this._ensureNoahArkCondition(element);
    this.list.push(element);
    this.length++;
};

//OPTIMIZATION: at first we try to find possible candidates for exclusion using
//lightweight heuristics without thorough attributes check.
FormattingElementList.prototype._getNoahArkConditionCandidates = function (newElement) {
    var candidates = [];

    if (this.length >= NOAH_ARK_CAPACITY) {
        var neAttrsLength = newElement.attrs.length;

        for (var i = this.length - 1; i >= 0; i--) {
            var entry = this.list[i];

            if (entry.type === MARKER_ENTRY)
                break;

            var element = entry.element;

            if (element.tagName === newElement.tagName && element.namespaceURI === newElement.namespaceURI &&
                element.attrs.length === neAttrsLength) {
                candidates.push({idx: i, attrs: element.attrs});
            }
        }
    }

    return candidates.length < NOAH_ARK_CAPACITY ? [] : candidates;
};

FormattingElementList.prototype._ensureNoahArkCondition = function (newElement) {
    var candidates = this._getNoahArkConditionCandidates(newElement),
        cLength = candidates.length;

    if (cLength) {
        var neAttrsLength = newElement.attrs.length,
            neAttrsMap = {},
            i = 0,
            j = 0;

        //NOTE: build attrs map for new element so we can perform fast lookups
        for (; i < neAttrsLength; i++) {
            var neAttr = newElement.attrs[i];

            neAttrsMap[neAttr.name] = neAttr.value;
        }

        for (i = 0; i < neAttrsLength; i++) {
            for (j = 0; j < cLength; j++) {
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
        for (i = 0; cLength >= NOAH_ARK_CAPACITY; i++, cLength--) {
            this.list.splice(candidates[i].idx, 1);
            this.length--;
        }
    }
};