var html = require('../../lib/html'),
    FormattingElementList = require('../../lib/formatting_element_list').FormattingElementList;

//Aliases
var $ = html.TAG_NAMES,
    NAMESPACES = html.NAMESPACES;

exports['Insert marker'] = function (t) {
    var list = new FormattingElementList();

    list.insertMarker();
    t.strictEqual(list.length, 1);
    t.strictEqual(list.list[0].type, FormattingElementList.MARKER_ENTRY);

    list.insertMarker();
    t.strictEqual(list.length, 2);
    t.strictEqual(list.list[1].type, FormattingElementList.MARKER_ENTRY);

    t.done();
};

exports['Push element'] = function (t) {
    var list = new FormattingElementList(),
        element1Token = 'token1',
        element2Token = 'token2',
        element1 = {
            tagName: $.DIV,
            namespaceURI: NAMESPACES.HTML,
            attrs: []
        },
        element2 = {
            tagName: $.P,
            namespaceURI: NAMESPACES.HTML,
            attrs: []
        };

    list.push(element1, element1Token);
    t.strictEqual(list.length, 1);
    t.strictEqual(list.list[0].type, FormattingElementList.ELEMENT_ENTRY);
    t.strictEqual(list.list[0].element, element1);
    t.strictEqual(list.list[0].token, element1Token);

    list.push(element2, element2Token);
    t.strictEqual(list.length, 2);
    t.strictEqual(list.list[1].type, FormattingElementList.ELEMENT_ENTRY);
    t.strictEqual(list.list[1].element, element2);
    t.strictEqual(list.list[1].token, element2Token);

    t.done();
};

exports['Push element - Noah Ark condition'] = function (t) {
    var list = new FormattingElementList(),
        token1 = 'token1',
        token2 = 'token2',
        token3 = 'token3',
        token4 = 'token4',
        token5 = 'token5',
        token6 = 'token6',
        element1 = {
            tagName: $.DIV,
            namespaceURI: NAMESPACES.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'val2'}
            ]
        },
        element2 = {
            tagName: $.DIV,
            namespaceURI: NAMESPACES.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'someOtherValue'}
            ]
        };

    list.push(element1, token1);
    list.push(element1, token2);
    list.push(element2, token3);
    list.push(element1, token4);

    t.strictEqual(list.length, 4);
    t.strictEqual(list.list[0].token, token1);
    t.strictEqual(list.list[1].token, token2);
    t.strictEqual(list.list[2].token, token3);
    t.strictEqual(list.list[3].token, token4);

    list.push(element1, token5);

    t.strictEqual(list.length, 4);
    t.strictEqual(list.list[0].token, token2);
    t.strictEqual(list.list[1].token, token3);
    t.strictEqual(list.list[2].token, token4);
    t.strictEqual(list.list[3].token, token5);

    list.insertMarker();
    list.push(element1, token6);

    t.strictEqual(list.length, 6);
    t.strictEqual(list.list[0].token, token2);
    t.strictEqual(list.list[1].token, token3);
    t.strictEqual(list.list[2].token, token4);
    t.strictEqual(list.list[3].token, token5);
    t.strictEqual(list.list[4].type, FormattingElementList.MARKER_ENTRY);
    t.strictEqual(list.list[5].token, token6);

    t.done();
};

exports['Clear to the last marker'] = function (t) {
    var list = new FormattingElementList(),
        token = 'token',
        element1 = {
            tagName: $.DIV,
            namespaceURI: NAMESPACES.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'val2'}
            ]
        },
        element2 = {
            tagName: $.DIV,
            namespaceURI: NAMESPACES.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'someOtherValue'}
            ]
        };

    list.push(element1, token);
    list.push(element2, token);
    list.insertMarker();
    list.push(element1, token);
    list.push(element1, token);
    list.push(element2, token);

    list.clearToLastMarker();

    t.strictEqual(list.length, 2);

    t.done();
};

exports['Remove element'] = function (t) {
    var list = new FormattingElementList(),
        token = 'token',
        element1 = {
            tagName: $.DIV,
            namespaceURI: NAMESPACES.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'val2'}
            ]
        },
        element2 = {
            tagName: $.DIV,
            namespaceURI: NAMESPACES.HTML,
            attrs: [
                {name: 'attr1', value: 'val1'},
                {name: 'attr2', value: 'someOtherValue'}
            ]
        };

    list.push(element1, token);
    list.push(element2, token);
    list.push(element2, token);

    list.remove(element1);

    t.strictEqual(list.length, 2);

    for (var i = list.length - 1; i >= 0; i--)
        t.notStrictEqual(list.list[i].element, element1);

    t.done();
};

exports['Get element in scope with given tag name'] = function (t) {
    var list = new FormattingElementList(),
        token = 'token',
        element = {
            tagName: $.DIV,
            namespaceURI: NAMESPACES.HTML,
            attrs: []
        };

    t.ok(!list.getElementInScopeWithTagName($.DIV));

    list.push(element, token);
    list.push(element, token);
    t.strictEqual(list.getElementInScopeWithTagName($.DIV), element);

    list.insertMarker();
    t.ok(!list.getElementInScopeWithTagName($.DIV));

    list.push(element, token);
    t.strictEqual(list.getElementInScopeWithTagName($.DIV), element);

    t.done();
};