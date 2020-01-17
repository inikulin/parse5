'use strict';

const { DOCUMENT_MODE } = require('../common/html');

const defaultTreeAdapter = {
    //Tree mutation
    appendChild: (parentNode, newNode) => {
        parentNode.childNodes.push(newNode);
        newNode.parentNode = parentNode;
    },

    insertBefore: (parentNode, newNode, referenceNode) => {
        const insertionIdx = parentNode.childNodes.indexOf(referenceNode);

        parentNode.childNodes.splice(insertionIdx, 0, newNode);
        newNode.parentNode = parentNode;
    },
    //Node construction
    createTextNode: (value) => {
        return {
            nodeName: '#text',
            value: value,
            parentNode: null
        };
    },
    createDocument() {
        return {
            nodeName: '#document',
            mode: DOCUMENT_MODE.NO_QUIRKS,
            childNodes: []
        };
    },

    createDocumentFragment() {
        return {
            nodeName: '#document-fragment',
            childNodes: []
        };
    },

    createElement(tagName, namespaceURI, attrs) {
        return {
            nodeName: tagName,
            tagName: tagName,
            attrs: attrs,
            namespaceURI: namespaceURI,
            childNodes: [],
            parentNode: null
        };
    },

    createCommentNode(data) {
        return {
            nodeName: '#comment',
            data: data,
            parentNode: null
        };
    },


    setTemplateContent: (templateElement, contentElement) => {
        templateElement.content = contentElement;
    },

    getTemplateContent: templateElement => templateElement.content,

    setDocumentType(document, name, publicId, systemId) {
        let doctypeNode = null;

        for (let i = 0; i < document.childNodes.length; i++) {
            if (document.childNodes[i].nodeName === '#documentType') {
                doctypeNode = document.childNodes[i];
                break;
            }
        }

        if (doctypeNode) {
            doctypeNode.name = name;
            doctypeNode.publicId = publicId;
            doctypeNode.systemId = systemId;
        } else {
            defaultTreeAdapter.appendChild(document, {
                nodeName: '#documentType',
                name: name,
                publicId: publicId,
                systemId: systemId
            });
        }
    },

    setDocumentMode(document, mode) {
        document.mode = mode;
    },
    getDocumentMode: (document) => document.mode,
    detachNode(node) {
        if (node.parentNode) {
            const idx = node.parentNode.childNodes.indexOf(node);

            node.parentNode.childNodes.splice(idx, 1);
            node.parentNode = null;
        }
    },
    insertText(parentNode, text) {
        if (parentNode.childNodes.length) {
            const prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];
    
            if (prevNode.nodeName === '#text') {
                prevNode.value += text;
                return;
            }
        }
    
        defaultTreeAdapter.appendChild(parentNode, defaultTreeAdapter.createTextNode(text));
    },

    //Tree traversing
    getFirstChild: (node) => node.childNodes[0],
    getChildNodes: (node) => node.childNodes,
    getParentNode: (node) => node.parentNode,
    getAttrList: (element) => element.attrs,
    //Node data
    insertTextBefore: (parentNode, text, referenceNode) => {
        const prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];

        if (prevNode && prevNode.nodeName === '#text') {
            prevNode.value += text;
        } else {
                defaultTreeAdapter.insertBefore(parentNode, defaultTreeAdapter.createTextNode(text), referenceNode)
        }
    },
    adoptAttributes(recipient, attrs) {
        const recipientAttrsMap = [];

        for (let i = 0; i < recipient.attrs.length; i++) {
            recipientAttrsMap.push(recipient.attrs[i].name);
        }
            
        for (let j = 0; j < attrs.length; j++) {
            if (recipientAttrsMap.indexOf(attrs[j].name) === -1) {
                recipient.attrs.push(attrs[j]);
            }
        }
    },
    getTagName: (element) => element.tagName,
    getNamespaceURI: (element) => element.namespaceURI,
    getTextNodeContent: (textNode) => textNode.value,
    getCommentNodeContent: (commentNode) => commentNode.data,
    getDocumentTypeNodeName: (doctypeNode) => doctypeNode.name,
    getDocumentTypeNodePublicId: (doctypeNode) => doctypeNode.publicId,
    getDocumentTypeNodeSystemId: (doctypeNode) => doctypeNode.systemId,
    //Node types
    isTextNode: (node) => node.nodeName === '#text',
    isCommentNode: (node) => node.nodeName === '#comment',
    isDocumentTypeNode: (node) => node.nodeName === '#documentType',
    isElementNode: (node) => !!node.tagName,

    // Source code location
    setNodeSourceCodeLocation: (node, location) =>ourceCodeLocation = location,
    getNodeSourceCodeLocation: (node) => node.sourceCodeLocation,
}
module.exports = defaultTreeAdapter;