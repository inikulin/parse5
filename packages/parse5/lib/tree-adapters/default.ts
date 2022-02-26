import { DOCUMENT_MODE, NAMESPACES } from '../common/html.js';
import type { Attribute, Location, ElementLocation } from '../common/token.js';
import type { TreeAdapterTypeMap } from './interface.js';

export enum NodeType {
    Document = '#document',
    DocumentFragment = '#document-fragment',
    Comment = '#comment',
    Text = '#text',
    DocumentType = '#documentType',
}

export interface Document {
    /** The name of the node. */
    nodeName: NodeType.Document;
    /**
     * Document mode.
     *
     * @see {@link DOCUMENT_MODE} */
    mode: DOCUMENT_MODE;
    /** The node's children. */
    childNodes: ChildNode[];
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export interface DocumentFragment {
    /** The name of the node. */
    nodeName: NodeType.DocumentFragment;
    /** The node's children. */
    childNodes: ChildNode[];
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export interface Element {
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
    /** Parent node. */
    parentNode: ParentNode | null;
    /** The node's children. */
    childNodes: ChildNode[];
}

export interface CommentNode {
    /** The name of the node. */
    nodeName: NodeType.Comment;
    /** Parent node. */
    parentNode: ParentNode | null;
    /** Comment text. */
    data: string;
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export interface TextNode {
    nodeName: NodeType.Text;
    /** Parent node. */
    parentNode: ParentNode | null;
    /** Text content. */
    value: string;
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export interface Template extends Element {
    nodeName: 'template';
    tagName: 'template';
    /** The content of a `template` tag. */
    content: DocumentFragment;
}

export interface DocumentType {
    /** The name of the node. */
    nodeName: NodeType.DocumentType;
    /** Parent node. */
    parentNode: ParentNode | null;
    /** Document type name. */
    name: string;
    /** Document type public identifier. */
    publicId: string;
    /** Document type system identifier. */
    systemId: string;
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export type ParentNode = Document | DocumentFragment | Element | Template;
export type ChildNode = Element | Template | CommentNode | TextNode | DocumentType;
export type Node = ParentNode | ChildNode;

export type DefaultTreeAdapterMap = TreeAdapterTypeMap<
    Node,
    ParentNode,
    ChildNode,
    Document,
    DocumentFragment,
    Element,
    CommentNode,
    TextNode,
    Template,
    DocumentType
>;

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
export function appendChild(parentNode: ParentNode, newNode: ChildNode): void {
    parentNode.childNodes.push(newNode);
    newNode.parentNode = parentNode;
}

export function insertBefore(parentNode: ParentNode, newNode: ChildNode, referenceNode: ChildNode): void {
    const insertionIdx = parentNode.childNodes.indexOf(referenceNode);

    parentNode.childNodes.splice(insertionIdx, 0, newNode);
    newNode.parentNode = parentNode;
}

export function setTemplateContent(templateElement: Template, contentElement: DocumentFragment): void {
    templateElement.content = contentElement;
}

export function getTemplateContent(templateElement: Template): DocumentFragment {
    return templateElement.content;
}

export function setDocumentType(document: Document, name: string, publicId: string, systemId: string): void {
    const doctypeNode = document.childNodes.find(
        (node): node is DocumentType => node.nodeName === NodeType.DocumentType
    );

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

export function setDocumentMode(document: Document, mode: DOCUMENT_MODE): void {
    document.mode = mode;
}

export function getDocumentMode(document: Document): DOCUMENT_MODE {
    return document.mode;
}

export function detachNode(node: ChildNode): void {
    if (node.parentNode) {
        const idx = node.parentNode.childNodes.indexOf(node);

        node.parentNode.childNodes.splice(idx, 1);
        node.parentNode = null;
    }
}

export function insertText(parentNode: ParentNode, text: string): void {
    if (parentNode.childNodes.length > 0) {
        const prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];

        if (isTextNode(prevNode)) {
            prevNode.value += text;
            return;
        }
    }

    appendChild(parentNode, createTextNode(text));
}

export function insertTextBefore(parentNode: ParentNode, text: string, referenceNode: ChildNode): void {
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
export function getFirstChild(node: ParentNode): null | ChildNode {
    return node.childNodes[0];
}

export function getChildNodes(node: ParentNode): ChildNode[] {
    return node.childNodes;
}

export function getParentNode(node: ChildNode): null | ParentNode {
    return node.parentNode;
}

export function getAttrList(element: Element): Attribute[] {
    return element.attrs;
}

//Node data
export function getTagName(element: Element): string {
    return element.tagName;
}

export function getNamespaceURI(element: Element): NAMESPACES {
    return element.namespaceURI;
}

export function getTextNodeContent(textNode: TextNode): string {
    return textNode.value;
}

export function getCommentNodeContent(commentNode: CommentNode): string {
    return commentNode.data;
}

export function getDocumentTypeNodeName(doctypeNode: DocumentType): string {
    return doctypeNode.name;
}

export function getDocumentTypeNodePublicId(doctypeNode: DocumentType): string {
    return doctypeNode.publicId;
}

export function getDocumentTypeNodeSystemId(doctypeNode: DocumentType): string {
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
    return node.nodeName === NodeType.DocumentType;
}

export function isElementNode(node: Node): node is Element {
    return Object.prototype.hasOwnProperty.call(node, 'tagName');
}

// Source code location
export function setNodeSourceCodeLocation(node: Node, location: ElementLocation | null): void {
    node.sourceCodeLocation = location;
}

export function getNodeSourceCodeLocation(node: Node): ElementLocation | undefined | null {
    return node.sourceCodeLocation;
}

export function updateNodeSourceCodeLocation(node: Node, endLocation: ElementLocation): void {
    node.sourceCodeLocation = { ...node.sourceCodeLocation, ...endLocation };
}
