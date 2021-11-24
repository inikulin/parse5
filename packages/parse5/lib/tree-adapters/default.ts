import { DOCUMENT_MODE, NAMESPACES } from '../common/html.js';
import type { Attribute, Location } from '../common/token.js';
import type { TreeAdapterTypeMap, ElementLocation } from './interface.js';

export enum NodeType {
    Document = '#document',
    DocumentFragment = '#document-fragment',
    Comment = '#comment',
    Text = '#text',
    DocumentType = '#documentType',
}

export interface Node {
    /** The name of the node. */
    nodeName: NodeType | string;
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export interface NodeWithChildren extends Node {
    childNodes: Node[];
}

export interface NodeWithParent extends Node {
    /** Parent node. */
    parentNode: NodeWithChildren | null;
}

export interface Document extends NodeWithChildren {
    nodeName: NodeType.Document;
    /**
     * Document mode.
     *
     * @see {@link DOCUMENT_MODE} */
    mode: DOCUMENT_MODE;
}

export interface DocumentFragment extends NodeWithChildren {
    nodeName: NodeType.DocumentFragment;
}

export interface Element extends NodeWithChildren, NodeWithParent {
    /** Element tag name. Same as {@link tagName}. */
    nodeName: string;
    /** Element tag name. Same as {@link nodeName}. */
    tagName: string;
    /** List of element attributes. */
    attrs: Attribute[];
    /** Element namespace. */
    namespaceURI: NAMESPACES;
    /** Element source code location info, with attributes. Available if location info is enabled. */
    sourceCodeLocation?: ElementLocation | null;
}

export interface CommentNode extends NodeWithParent {
    nodeName: NodeType.Comment;
    /** Comment text. */
    data: string;
}

export interface TextNode extends NodeWithParent {
    nodeName: NodeType.Text;
    /** Text content. */
    value: string;
}

export interface Template extends Element {
    nodeName: 'template';
    tagName: 'template';
    content: DocumentFragment;
}

export interface DocumentType extends NodeWithParent {
    nodeName: NodeType.DocumentType;
    /** Document type name. */
    name: string;
    /** Document type public identifier. */
    publicId: string;
    /** Document type system identifier. */
    systemId: string;
}

//Node construction
export function createDocument(): Document {
    return {
        nodeName: NodeType.Document,
        mode: DOCUMENT_MODE.NO_QUIRKS,
        childNodes: [],
    };
}

export function createDocumentFragment(): DocumentFragment {
    return {
        nodeName: NodeType.DocumentFragment,
        childNodes: [],
    };
}

export function createElement(tagName: string, namespaceURI: NAMESPACES, attrs: Attribute[]): Element {
    return {
        nodeName: tagName,
        tagName,
        attrs,
        namespaceURI,
        childNodes: [],
        parentNode: null,
    };
}

export function createCommentNode(data: string): CommentNode {
    return {
        nodeName: NodeType.Comment,
        data,
        parentNode: null,
    };
}

const createTextNode = function (value: string): TextNode {
    return {
        nodeName: NodeType.Text,
        value,
        parentNode: null,
    };
};

//Tree mutation
export function appendChild(parentNode: NodeWithChildren, newNode: NodeWithParent) {
    parentNode.childNodes.push(newNode);
    newNode.parentNode = parentNode;
}

export function insertBefore(parentNode: NodeWithChildren, newNode: NodeWithParent, referenceNode: Node) {
    const insertionIdx = parentNode.childNodes.indexOf(referenceNode);

    parentNode.childNodes.splice(insertionIdx, 0, newNode);
    newNode.parentNode = parentNode;
}

export function setTemplateContent(templateElement: Template, contentElement: DocumentFragment) {
    templateElement.content = contentElement;
}

export function getTemplateContent(templateElement: Template): DocumentFragment {
    return templateElement.content;
}

export function setDocumentType(document: Document, name: string, publicId: string, systemId: string) {
    const doctypeNode = document.childNodes.find((node) => node.nodeName === '#documentType') as DocumentType;

    if (doctypeNode) {
        doctypeNode.name = name;
        doctypeNode.publicId = publicId;
        doctypeNode.systemId = systemId;
    } else {
        const node: DocumentType = {
            nodeName: NodeType.DocumentType,
            name,
            publicId,
            systemId,
            parentNode: null,
        };
        appendChild(document, node);
    }
}

export function setDocumentMode(document: Document, mode: DOCUMENT_MODE) {
    document.mode = mode;
}

export function getDocumentMode(document: Document): DOCUMENT_MODE {
    return document.mode;
}

export function detachNode(node: NodeWithParent) {
    if (node.parentNode) {
        const idx = node.parentNode.childNodes.indexOf(node);

        node.parentNode.childNodes.splice(idx, 1);
        node.parentNode = null;
    }
}

export function insertText(parentNode: NodeWithChildren, text: string) {
    if (parentNode.childNodes.length) {
        const prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];

        if (isTextNode(prevNode)) {
            prevNode.value += text;
            return;
        }
    }

    appendChild(parentNode, createTextNode(text));
}

export function insertTextBefore(parentNode: NodeWithChildren, text: string, referenceNode: Node) {
    const prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];

    if (prevNode && isTextNode(prevNode)) {
        prevNode.value += text;
    } else {
        insertBefore(parentNode, createTextNode(text), referenceNode);
    }
}

export function adoptAttributes(recipient: Element, attrs: Attribute[]): void {
    const recipientAttrsMap = new Set(recipient.attrs.map((attr) => attr.name));

    for (let j = 0; j < attrs.length; j++) {
        if (!recipientAttrsMap.has(attrs[j].name)) {
            recipient.attrs.push(attrs[j]);
        }
    }
}

//Tree traversing
export function getFirstChild(node: NodeWithChildren): null | Node {
    return node.childNodes[0];
}

export function getChildNodes(node: NodeWithChildren): Node[] {
    return node.childNodes;
}

export function getParentNode(node: NodeWithParent): null | NodeWithChildren {
    return node.parentNode;
}

export function getAttrList(element: Element): Attribute[] {
    return element.attrs;
}

//Node data
export function getTagName(element: Element) {
    return element.tagName;
}

export function getNamespaceURI(element: Element) {
    return element.namespaceURI;
}

export function getTextNodeContent(textNode: TextNode) {
    return textNode.value;
}

export function getCommentNodeContent(commentNode: CommentNode) {
    return commentNode.data;
}

export function getDocumentTypeNodeName(doctypeNode: DocumentType) {
    return doctypeNode.name;
}

export function getDocumentTypeNodePublicId(doctypeNode: DocumentType) {
    return doctypeNode.publicId;
}

export function getDocumentTypeNodeSystemId(doctypeNode: DocumentType) {
    return doctypeNode.systemId;
}

//Node types
export function isTextNode(node: Node): node is TextNode {
    return node.nodeName === '#text';
}

export function isCommentNode(node: Node): node is CommentNode {
    return node.nodeName === '#comment';
}

export function isDocumentTypeNode(node: Node): node is DocumentType {
    return node.nodeName === '#documentType';
}

export function isElementNode(node: Node): node is Element {
    return Object.prototype.hasOwnProperty.call(node, 'tagName');
}

// Source code location
export function setNodeSourceCodeLocation(node: Node, location: ElementLocation | null) {
    node.sourceCodeLocation = location;
}

export function getNodeSourceCodeLocation(node: Node): ElementLocation | undefined | null {
    return node.sourceCodeLocation;
}

export function updateNodeSourceCodeLocation(node: Node, endLocation: ElementLocation) {
    node.sourceCodeLocation = { ...node.sourceCodeLocation, ...endLocation };
}

export type DefaultTreeAdapterMap = TreeAdapterTypeMap<
    Node,
    NodeWithChildren,
    NodeWithParent,
    Document,
    DocumentFragment,
    Element,
    CommentNode,
    TextNode,
    Template,
    DocumentType
>;
