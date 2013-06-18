var html = require('../../lib/html'),
    FormattingElementList = require('../../lib/formatting_element_list').FormattingElementList,
    defaultTreeAdapter = require('../../lib/default_tree_adapter');

//Aliases
var $ = html.TAG_NAMES,
    NS = html.NAMESPACES;

exports['Insert marker'] = function (t) {
    var list = new FormattingElementList(defaultTreeAdapter);

    list.insertMarker();
    t.strictEqual(list.length, 1);
    t.strictEqual(list.entries[0].type, FormattingElementList.MARKER_ENTRY);

    list.insertMarker();
    t.strictEqual(list.length, 2);
    t.strictEqual(list.entries[1].type, FormattingElementList.MARKER_ENTRY);

    t.done();
};

exports['Push element'] = function (t) {
    var list = new FormattingElementList(defaultTreeAdapter),
        element1Token = 'token1',
        element2Token = 'token2',
        element1 = {
            tagName: $.DIV,
            namespaceURI: NS.HTML,
            attrs: []
        },
        element2 = {
            tagName: $.P,
            namespaceURI: NS.HTML,
            attrs: []
        };

    list.pushElement(element1, element1Token);
    t.strictEqual(list.length, 1);
    t.strictEqual(list.entries[0].type, FormattingElementList.ELEMENT_ENTRY);
    t.strictEqual(list.entries[0].element, element1);
    t.strictEqual(list.entries[0].token, element1Token);

    list.pushElement(element2, element2Token);
    t.strictEqual(list.length, 2);
    t.strictEqual(list.entries[1].type, FormattingElementList.ELEMENT_ENTRY);
    t.strictEqual(list.entries[1].element, element2);
    t.strictEqual(list.entries[1].token, element2Token);

    t.done();
};

exports['Insert element after bookmark'] = function (t) {
    var list = new FormattingElementList(defaultTreeAdapter),
        token = 'token1',
        element1 = {
            tagName: $.DIV,
            namespaceURI: NS.HTML,
            attrs: []
        },
        element2 = {
            tagName: $.P,
            namespaceURI: NS.HTML,
            attrs: []
        },
        element3 = {
            tagName: $.SPAN,
            namespaceURI: NS.HTML,
            attrs: []
        },
        element4 = {
            tagName: $.TITLE,
            namespaceURI: NS.HTML,
            attrs: []
        };

    list.pushElement(element1, token);
    list.bookmark = list.entries[0];

    list.pushElement(element2, token);
    list.pushElement(element3, token);

    list.insertElementAfterBookmark(element4, token);

    t.strictEqual(list.length, 4);
    t.strictEqual(list.entries[1].element, element4);

    t.done();
};

exports['Push element - Noah Ark condition'] = function (t) {
    var list = new FormattingElementList(defaultTreeAdapter),
        token1 = 'token1',
        token2 = 'token2',
        token3 = 'token3',
        token4 = 'token4',
        token5 = 'token5',
        token6 = 'token6',
        element1 = {
            tagName: $.DIV,
            namespaceURI: NS.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'val2'}
            ]
        },
        element2 = {
            tagName: $.DIV,
            namespaceURI: NS.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'someOtherValue'}
            ]
        };

    list.pushElement(element1, token1);
    list.pushElement(element1, token2);
    list.pushElement(element2, token3);
    list.pushElement(element1, token4);

    t.strictEqual(list.length, 4);
    t.strictEqual(list.entries[0].token, token1);
    t.strictEqual(list.entries[1].token, token2);
    t.strictEqual(list.entries[2].token, token3);
    t.strictEqual(list.entries[3].token, token4);

    list.pushElement(element1, token5);

    t.strictEqual(list.length, 4);
    t.strictEqual(list.entries[0].token, token2);
    t.strictEqual(list.entries[1].token, token3);
    t.strictEqual(list.entries[2].token, token4);
    t.strictEqual(list.entries[3].token, token5);

    list.insertMarker();
    list.pushElement(element1, token6);

    t.strictEqual(list.length, 6);
    t.strictEqual(list.entries[0].token, token2);
    t.strictEqual(list.entries[1].token, token3);
    t.strictEqual(list.entries[2].token, token4);
    t.strictEqual(list.entries[3].token, token5);
    t.strictEqual(list.entries[4].type, FormattingElementList.MARKER_ENTRY);
    t.strictEqual(list.entries[5].token, token6);

    t.done();
};

exports['Clear to the last marker'] = function (t) {
    var list = new FormattingElementList(defaultTreeAdapter),
        token = 'token',
        element1 = {
            tagName: $.DIV,
            namespaceURI: NS.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'val2'}
            ]
        },
        element2 = {
            tagName: $.DIV,
            namespaceURI: NS.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'someOtherValue'}
            ]
        };

    list.pushElement(element1, token);
    list.pushElement(element2, token);
    list.insertMarker();
    list.pushElement(element1, token);
    list.pushElement(element1, token);
    list.pushElement(element2, token);

    list.clearToLastMarker();

    t.strictEqual(list.length, 2);

    t.done();
};

exports['Remove entry'] = function (t) {
    var list = new FormattingElementList(defaultTreeAdapter),
        token = 'token',
        element1 = {
            tagName: $.DIV,
            namespaceURI: NS.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'val2'}
            ]
        },
        element2 = {
            tagName: $.DIV,
            namespaceURI: NS.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'someOtherValue'}
            ]
        };

    list.pushElement(element1, token);
    list.pushElement(element2, token);
    list.pushElement(element2, token);

    list.removeEntry(list.entries[0]);

    t.strictEqual(list.length, 2);

    for (var i = list.length - 1; i >= 0; i--)
        t.notStrictEqual(list.entries[i].element, element1);

    t.done();
};

exports['Get entry in scope with given tag name'] = function (t) {
    var list = new FormattingElementList(defaultTreeAdapter),
        token = 'token',
        element = {
            tagName: $.DIV,
            namespaceURI: NS.HTML,
            attrs: []
        };

    t.ok(!list.getElementEntryInScopeWithTagName($.DIV));

    list.pushElement(element, token);
    list.pushElement(element, token);
    t.strictEqual(list.getElementEntryInScopeWithTagName($.DIV), list.entries[1]);

    list.insertMarker();
    t.ok(!list.getElementEntryInScopeWithTagName($.DIV));

    list.pushElement(element, token);
    t.strictEqual(list.getElementEntryInScopeWithTagName($.DIV), list.entries[3]);

    t.done();
};

exports['Get element entry'] = function (t) {
    var list = new FormattingElementList(defaultTreeAdapter),
        token = 'token',
        element1 = {
            tagName: $.DIV,
            namespaceURI: NS.HTML,
            attrs: []
        },
        element2 = {
            tagName: $.A,
            namespaceURI: NS.HTML,
            attrs: []
        };


    list.pushElement(element2, token);
    list.pushElement(element1, token);
    list.pushElement(element2, token);
    list.insertMarker();

    var entry = list.getElementEntry(element1);
    t.strictEqual(entry.type, FormattingElementList.ELEMENT_ENTRY);
    t.strictEqual(entry.token, token);
    t.strictEqual(entry.element, element1);

    t.done();
};