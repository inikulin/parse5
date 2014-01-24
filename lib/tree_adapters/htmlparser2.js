//Node construction
exports.createDocument =
exports.createDocumentFragment = function () {
    return {
        type: 'root',
        name: 'root',
        parent: null,
        prev: null,
        next: null,
        children: []
    };
};

exports.createElement = function (tagName, namespaceURI, attrs) {
    var attribs = {};

    //TODO attr namespace
    for (var i = 0; i < attrs.length; i++)
        attribs[attrs[i].name] = attrs[i].value;

    return {
        type: tagName === 'script' || tagName === 'style' ? tagName : 'tag',
        name: tagName,
        namespace: namespaceURI,
        attribs: attribs,
        children: [],
        parent: null,
        prev: null,
        next: null
    };
};

exports.createCommentNode = function (data) {
    return {
        type: 'comment',
        data: data,
        parent: null,
        prev: null,
        next: null
    };
};

var createTextNode = function (value) {
    return {
        type: 'text',
        data: value,
        parent: null,
        prev: null,
        next: null
    }
};


//Tree mutation
exports.setDocumentType = function (document, name, publicId, systemId) {
    var data = '!DOCTYPE';

    if (name)
        data += ' ' + name;

    if (publicId)
        data += ' PUBLIC "' + publicId + '"';

    if (systemId)
        data += ' "' + systemId + '"';

    var doctypeNode = null;

    for (var i = 0; i < document.children.length; i++) {
        if (document.children[i].type === 'directive' && document.children[i].name === '!doctype') {
            doctypeNode = document.children[i];
            break;
        }
    }

    if (doctypeNode)
        doctypeNode.data = data;

    else {
        appendChild(document, {
            type: 'directive',
            name: '!doctype',
            data: data
        });
    }

};

exports.setQuirksMode = function (document) {
    document.quirksMode = true;
};

exports.isQuirksMode = function (document) {
    return document.quirksMode;
};

var appendChild = exports.appendChild = function (parentNode, newNode) {
    var prev = parentNode.children[parentNode.children.length];

    if (prev) {
        prev.next = newNode;
        newNode.prev = prev;
    }

    parentNode.children.push(newNode);
    newNode.parent = parentNode;
};

var insertBefore = exports.insertBefore = function (parentNode, newNode, referenceNode) {
    var insertionIdx = parentNode.children.indexOf(referenceNode),
        prev = referenceNode.prev;

    if (prev) {
        prev.next = newNode;
        newNode.prev = prev;
    }

    referenceNode.prev = newNode;
    newNode.next = referenceNode;

    parentNode.children.splice(insertionIdx, 0, newNode);
    newNode.parent = parentNode;
};

exports.detachNode = function (node) {
    if (node.parent) {
        var idx = node.parent.children.indexOf(node),
            prev = node.prev,
            next = node.next;

        node.prev = null;
        node.next = null;

        if (prev)
            prev.next = next;

        if (next)
            next.prev = prev;

        node.parent.children.splice(idx, 1);
        node.parent = null;
    }
};

exports.insertText = function (parentNode, text) {
    var lastChild = parentNode.children[parentNode.children.length - 1];

    if (lastChild && lastChild.type === 'text')
        lastChild.data += text;
    else
        appendChild(parentNode, createTextNode(text));
};

exports.insertTextBefore = function (parentNode, text, referenceNode) {
    var prevNode = parentNode.children[parentNode.children.indexOf(referenceNode) - 1];

    if (prevNode && prevNode.type === 'text')
        prevNode.data += text;
    else
        insertBefore(parentNode, createTextNode(text), referenceNode);
};

exports.adoptAttributes = function (recipientNode, attrs) {
    for (var j = 0; j < attrs.length; j++)
        recipientNode.attribs[attrs[i].name] = attrs[i].value;
};


//Tree traversing
exports.getFirstChild = function (node) {
    return node.children[0];
};

exports.getParentNode = function (node) {
    return node.parent;
};

exports.getAttrList = function (node) {
    var attrList = [];

    for (var name in node.attribs) {
        if (node.attribs.hasOwnProperty(name))
            attrList.push({name: name, value: node.attribs[name]});
    }

    return attrList;
};


//Node data
exports.getTagName = function (element) {
    return element.name;
};

exports.getNamespaceURI = function (element) {
    return element.namespace;
};


exports.getTextNodeContent = function (textNode) {
    return textNode.data;
};

exports.getCommentNodeContent = function (commentNode) {
    return commentNode.data;
};

exports.getDocumentTypeNodeName = function (doctypeNode) {
    //TODO
};

exports.getDocumentTypeNodePublicId = function (doctypeNode) {
    //TODO
};

exports.getDocumentTypeNodeSystemId = function (doctypeNode) {
    //TODO
};


//Node types
exports.isTextNode = function (node) {
    return node.type === 'text';
};

exports.isCommentNode = function (node) {
    return node.type === 'comment';
};

exports.isDocumentTypeNode = function (node) {
    return node.type === 'directive' && node.name === '!doctype';
};

exports.isElementNode = function (node) {
    return !!node.attribs;
};