import { DOCUMENT_MODE, type NS } from '../common/html.js';
import type { Attribute, Location, ElementLocation } from '../common/token.js';
import type { TreeAdapter, TreeAdapterTypeMap } from './interface.js';

export interface Document {
    /** The name of the node. */
    nodeName: '#document';
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
    nodeName: '#document-fragment';
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
    namespaceURI: NS;
    /** Element source code location info, with attributes. Available if location info is enabled. */
    sourceCodeLocation?: ElementLocation | null;
    /** Parent node. */
    parentNode: ParentNode | null;
    /** The node's children. */
    childNodes: ChildNode[];
}

export interface CommentNode {
    /** The name of the node. */
    nodeName: '#comment';
    /** Parent node. */
    parentNode: ParentNode | null;
    /** Comment text. */
    data: string;
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export interface TextNode {
    nodeName: '#text';
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
    nodeName: '#documentType';
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

/** The position of each name in the attribute lists `adoptAttributes` merged into, kept for the next merge into that list. */
const attrListIndexes = new WeakMap<Attribute[], Map<string, number>>();

export const defaultTreeAdapter: TreeAdapter<DefaultTreeAdapterMap> = {
    //Node construction
    createDocument(): Document {
        return {
            nodeName: '#document',
            mode: DOCUMENT_MODE.NO_QUIRKS,
            childNodes: [],
        };
    },

    createDocumentFragment(): DocumentFragment {
        return {
            nodeName: '#document-fragment',
            childNodes: [],
        };
    },

    createElement(tagName: string, namespaceURI: NS, attrs: Attribute[]): Element {
        return {
            nodeName: tagName,
            tagName,
            attrs,
            namespaceURI,
            childNodes: [],
            parentNode: null,
        };
    },

    createCommentNode(data: string): CommentNode {
        return {
            nodeName: '#comment',
            data,
            parentNode: null,
        };
    },

    createTextNode(value: string): TextNode {
        return {
            nodeName: '#text',
            value,
            parentNode: null,
        };
    },

    //Tree mutation
    appendChild(parentNode: ParentNode, newNode: ChildNode): void {
        parentNode.childNodes.push(newNode);
        newNode.parentNode = parentNode;
    },

    insertBefore(parentNode: ParentNode, newNode: ChildNode, referenceNode: ChildNode): void {
        const { childNodes } = parentNode;
        // The reference is usually the last child (fostered content precedes the table), so check that first.
        const insertionIdx =
            childNodes[childNodes.length - 1] === referenceNode
                ? childNodes.length - 1
                : childNodes.indexOf(referenceNode);

        childNodes.splice(insertionIdx, 0, newNode);
        newNode.parentNode = parentNode;
    },

    setTemplateContent(templateElement: Template, contentElement: DocumentFragment): void {
        templateElement.content = contentElement;
    },

    getTemplateContent(templateElement: Template): DocumentFragment {
        return templateElement.content;
    },

    setDocumentType(document: Document, name: string, publicId: string, systemId: string): void {
        const doctypeNode = document.childNodes.find((node): node is DocumentType => node.nodeName === '#documentType');

        if (doctypeNode) {
            doctypeNode.name = name;
            doctypeNode.publicId = publicId;
            doctypeNode.systemId = systemId;
        } else {
            const node: DocumentType = {
                nodeName: '#documentType',
                name,
                publicId,
                systemId,
                parentNode: null,
            };
            defaultTreeAdapter.appendChild(document, node);
        }
    },

    setDocumentMode(document: Document, mode: DOCUMENT_MODE): void {
        document.mode = mode;
    },

    getDocumentMode(document: Document): DOCUMENT_MODE {
        return document.mode;
    },

    detachNode(node: ChildNode): void {
        if (node.parentNode) {
            const { childNodes } = node.parentNode;
            // The parser detaches from the end when it moves children, so check the last child first.
            const idx = childNodes[childNodes.length - 1] === node ? childNodes.length - 1 : childNodes.indexOf(node);

            childNodes.splice(idx, 1);
            node.parentNode = null;
        }
    },

    insertText(parentNode: ParentNode, text: string): void {
        if (parentNode.childNodes.length > 0) {
            const prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];

            if (defaultTreeAdapter.isTextNode(prevNode)) {
                prevNode.value += text;
                return;
            }
        }

        defaultTreeAdapter.appendChild(parentNode, defaultTreeAdapter.createTextNode(text));
    },

    insertTextBefore(parentNode: ParentNode, text: string, referenceNode: ChildNode): void {
        const { childNodes } = parentNode;
        const referenceIdx =
            childNodes[childNodes.length - 1] === referenceNode
                ? childNodes.length - 1
                : childNodes.indexOf(referenceNode);
        const prevNode = childNodes[referenceIdx - 1];

        if (prevNode && defaultTreeAdapter.isTextNode(prevNode)) {
            prevNode.value += text;
        } else {
            defaultTreeAdapter.insertBefore(parentNode, defaultTreeAdapter.createTextNode(text), referenceNode);
        }
    },

    /**
     * Keeps the recipient's names between merges as a map from name to position. The map is rebuilt when the list changed
     * length or has a repeated name, or when a merged name it holds no longer names the entry at that position. A name that
     * other code gives an existing entry between two merges is missed otherwise, and merging it appends it a second time.
     */
    adoptAttributes(recipient: Element, attrs: Attribute[]): void {
        // Merging a list into itself adds nothing: every name is already present.
        if (attrs.length === 0 || attrs === recipient.attrs) return;

        const cached = attrListIndexes.get(recipient.attrs);
        const isIndexed =
            cached?.size === recipient.attrs.length &&
            attrs.every(({ name }) => {
                const index = cached.get(name);
                return index === undefined || recipient.attrs[index]?.name === name;
            });
        const recipientAttrsMap = isIndexed ? cached : new Map<string, number>();

        if (!isIndexed) {
            for (let i = 0; i < recipient.attrs.length; i++) {
                const attr = recipient.attrs[i];
                // A sparse list is indexed again on every merge, as its size never matches its length.
                if (attr !== undefined) recipientAttrsMap.set(attr.name, i);
            }
            attrListIndexes.set(recipient.attrs, recipientAttrsMap);
        }

        const adoptedFrom = recipient.attrs.length;

        for (let j = 0; j < attrs.length; j++) {
            if (!recipientAttrsMap.has(attrs[j].name)) {
                recipient.attrs.push(attrs[j]);
            }
        }

        for (let j = adoptedFrom; j < recipient.attrs.length; j++) {
            recipientAttrsMap.set(recipient.attrs[j].name, j);
        }

        // A list with a repeated name is indexed again on the next merge.
        if (recipientAttrsMap.size !== recipient.attrs.length) {
            attrListIndexes.delete(recipient.attrs);
        }
    },

    //Tree traversing
    getFirstChild(node: ParentNode): null | ChildNode {
        return node.childNodes[0];
    },

    getChildNodes(node: ParentNode): ChildNode[] {
        return node.childNodes;
    },

    getParentNode(node: ChildNode): null | ParentNode {
        return node.parentNode;
    },

    getAttrList(element: Element): Attribute[] {
        return element.attrs;
    },

    //Node data
    getTagName(element: Element): string {
        return element.tagName;
    },

    getNamespaceURI(element: Element): NS {
        return element.namespaceURI;
    },

    getTextNodeContent(textNode: TextNode): string {
        return textNode.value;
    },

    getCommentNodeContent(commentNode: CommentNode): string {
        return commentNode.data;
    },

    getDocumentTypeNodeName(doctypeNode: DocumentType): string {
        return doctypeNode.name;
    },

    getDocumentTypeNodePublicId(doctypeNode: DocumentType): string {
        return doctypeNode.publicId;
    },

    getDocumentTypeNodeSystemId(doctypeNode: DocumentType): string {
        return doctypeNode.systemId;
    },

    //Node types
    isTextNode(node: Node): node is TextNode {
        return node.nodeName === '#text';
    },

    isCommentNode(node: Node): node is CommentNode {
        return node.nodeName === '#comment';
    },

    isDocumentTypeNode(node: Node): node is DocumentType {
        return node.nodeName === '#documentType';
    },

    isElementNode(node: Node): node is Element {
        return Object.prototype.hasOwnProperty.call(node, 'tagName');
    },

    // Source code location
    setNodeSourceCodeLocation(node: Node, location: ElementLocation | null): void {
        node.sourceCodeLocation = location;
    },

    getNodeSourceCodeLocation(node: Node): ElementLocation | undefined | null {
        return node.sourceCodeLocation;
    },

    updateNodeSourceCodeLocation(node: Node, endLocation: ElementLocation): void {
        node.sourceCodeLocation = { ...node.sourceCodeLocation, ...endLocation };
    },
};
