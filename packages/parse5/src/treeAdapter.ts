import { Location, EndLocation } from './location.js';
import { DocumentMode } from './common/html.js';

export interface TreeAdapterTypeMap {
    attribute: {
        name: string;
        value: string;
        namespace?: string;
        prefix?: string;
    };
    commentNode: unknown;
    document: unknown;
    documentFragment: unknown;
    documentType: unknown;
    element: unknown;
    node: unknown;
    parentNode: unknown;
    textNode: unknown;
}

export interface TreeAdapter<T extends TreeAdapterTypeMap> {
    /**
     * Copies attributes to the given element. Only attributes that are not yet present in the element are copied.
     *
     * @param recipient - Element to copy attributes into.
     * @param attrs - Attributes to copy.
     */
    adoptAttributes(recipient: T['element'], attrs: Array<T['attribute']>): void;

    /**
     * Appends a child node to the given parent node.
     *
     * @param parentNode - Parent node.
     * @param newNode -  Child node.
     */
    appendChild(parentNode: T['parentNode'], newNode: T['node']): void;

    /**
     * Creates a comment node.
     *
     * @param data - Comment text.
     */
    createCommentNode(data: string): T['commentNode'];

    /**
     * Creates a document node.
     */
    createDocument(): T['document'];

    /**
     * Creates a document fragment node.
     */
    createDocumentFragment(): T['documentFragment'];

    /**
     * Creates an element node.
     *
     * @param tagName - Tag name of the element.
     * @param namespaceURI - Namespace of the element.
     * @param attrs - Attribute name-value pair array. Foreign attributes may contain `namespace` and `prefix` fields as well.
     */
    createElement(tagName: string, namespaceURI: string, attrs: Array<T['attribute']>): T['element'];

    /**
     * Removes a node from its parent.
     *
     * @param node - Node to remove.
     */
    detachNode(node: T['node']): void;

    /**
     * Returns the given element's attributes in an array, in the form of name-value pairs.
     * Foreign attributes may contain `namespace` and `prefix` fields as well.
     *
     * @param element - Element.
     */
    getAttrList(element: T['element']): Array<T['attribute']>;

    /**
     * Returns the given node's children in an array.
     *
     * @param node - Node.
     */
    getChildNodes(node: T['parentNode']): Array<T['node']>;

    /**
     * Returns the given comment node's content.
     *
     * @param commentNode - Comment node.
     */
    getCommentNodeContent(commentNode: T['commentNode']): string;

    /**
     * Returns [document mode](https://dom.spec.whatwg.org/#concept-document-limited-quirks).
     *
     * @param document - Document node.
     */
    getDocumentMode(document: T['document']): DocumentMode;

    /**
     * Returns the given document type node's name.
     *
     * @param doctypeNode - Document type node.
     */
    getDocumentTypeNodeName(doctypeNode: T['documentType']): string;

    /**
     * Returns the given document type node's public identifier.
     *
     * @param doctypeNode - Document type node.
     */
    getDocumentTypeNodePublicId(doctypeNode: T['documentType']): string;

    /**
     * Returns the given document type node's system identifier.
     *
     * @param doctypeNode - Document type node.
     */
    getDocumentTypeNodeSystemId(doctypeNode: T['documentType']): string;

    /**
     * Returns the first child of the given node.
     *
     * @param node - Node.
     */
    getFirstChild(node: T['parentNode']): T['node'] | undefined;

    /**
     * Returns the given element's namespace.
     *
     * @param element - Element.
     */
    getNamespaceURI(element: T['element']): string;

    /**
     * Returns the given node's source code location information.
     *
     * @param node - Node.
     */
    getNodeSourceCodeLocation(node: T['node']): Location | undefined | null;

    /**
     * Returns the given node's parent.
     *
     * @param node - Node.
     */
    getParentNode(node: T['node']): T['parentNode'] | null;

    /**
     * Returns the given element's tag name.
     *
     * @param element - Element.
     */
    getTagName(element: T['element']): string;

    /**
     * Returns the given text node's content.
     *
     * @param textNode - Text node.
     */
    getTextNodeContent(textNode: T['textNode']): string;

    /**
     * Returns the `<template>` element content element.
     *
     * @param templateElement - `<template>` element.
     */
    getTemplateContent(templateElement: T['element']): T['documentFragment'];

    /**
     * Inserts a child node to the given parent node before the given reference node.
     *
     * @param parentNode - Parent node.
     * @param newNode -  Child node.
     * @param referenceNode -  Reference node.
     */
    insertBefore(parentNode: T['parentNode'], newNode: T['node'], referenceNode: T['node']): void;

    /**
     * Inserts text into a node. If the last child of the node is a text node, the provided text will be appended to the
     * text node content. Otherwise, inserts a new text node with the given text.
     *
     * @param parentNode - Node to insert text into.
     * @param text - Text to insert.
     */
    insertText(parentNode: T['parentNode'], text: string): void;

    /**
     * Inserts text into a sibling node that goes before the reference node. If this sibling node is the text node,
     * the provided text will be appended to the text node content. Otherwise, inserts a new sibling text node with
     * the given text before the reference node.
     *
     * @param parentNode - Node to insert text into.
     * @param text - Text to insert.
     * @param referenceNode - Node to insert text before.
     */
    insertTextBefore(parentNode: T['parentNode'], text: string, referenceNode: T['node']): void;

    /**
     * Determines if the given node is a comment node.
     *
     * @param node - Node.
     */
    isCommentNode(node: T['node']): node is T['commentNode'];

    /**
     * Determines if the given node is a document type node.
     *
     * @param node - Node.
     */
    isDocumentTypeNode(node: T['node']): node is T['documentType'];

    /**
     * Determines if the given node is an element.
     *
     * @param node - Node.
     */
    isElementNode(node: T['node']): node is T['element'];

    /**
     * Determines if the given node is a text node.
     *
     * @param node - Node.
     */
    isTextNode(node: T['node']): node is T['textNode'];

    /**
     * Sets the [document mode](https://dom.spec.whatwg.org/#concept-document-limited-quirks).
     *
     * @param document - Document node.
     * @param mode - Document mode.
     */
    setDocumentMode(document: T['document'], mode: DocumentMode): void;

    /**
     * Sets the document type. If the `document` already contains a document type node, the `name`, `publicId` and `systemId`
     * properties of this node will be updated with the provided values. Otherwise, creates a new document type node
     * with the given properties and inserts it into the `document`.
     *
     * @param document - Document node.
     * @param name -  Document type name.
     * @param publicId - Document type public identifier.
     * @param systemId - Document type system identifier.
     */
    setDocumentType(document: T['document'], name: string, publicId: string, systemId: string): void;

    /**
     * Attaches source code location information to the node.
     *
     * @param node - Node.
     */
    setNodeSourceCodeLocation(node: T['node'], location: Location | null | undefined): void;

    /**
     * Sets the `<template>` element content element.
     *
     * @param templateElement - `<template>` element.
     * @param contentElement -  Content element.
     */
    setTemplateContent(templateElement: T['element'], contentElement: T['documentFragment']): void;

    updateNodeSourceCodeLocation(node: T['element'], endLocation: EndLocation & { endTag?: Location }): void;
    updateNodeSourceCodeLocation(node: T['node'], endLocation: EndLocation): void;
}
