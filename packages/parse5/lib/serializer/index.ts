import * as defaultTreeAdapter from '../tree-adapters/default.js';
import * as doctype from '../common/doctype.js';
import * as HTML from '../common/html.js';
import type { TreeAdapter, TreeAdapterTypeMap } from './../tree-adapters/interface';

//Aliases
const $ = HTML.TAG_NAMES;
const NS = HTML.NAMESPACES;

//Escaping regexes
const AMP_REGEX = /&/g;
const NBSP_REGEX = /\u00A0/g;
const DOUBLE_QUOTE_REGEX = /"/g;
const LT_REGEX = /</g;
const GT_REGEX = />/g;

// Sets
const VOID_ELEMENTS = new Set<string>([
    $.AREA,
    $.BASE,
    $.BASEFONT,
    $.BGSOUND,
    $.BR,
    $.COL,
    $.EMBED,
    $.FRAME,
    $.HR,
    $.IMG,
    $.INPUT,
    $.KEYGEN,
    $.LINK,
    $.META,
    $.PARAM,
    $.SOURCE,
    $.TRACK,
    $.WBR,
]);
const UNESCAPED_TEXT = new Set<string>([
    $.STYLE,
    $.SCRIPT,
    $.XMP,
    $.IFRAME,
    $.NOEMBED,
    $.NOFRAMES,
    $.PLAINTEXT,
    $.NOSCRIPT,
]);

export interface SerializerOptions<T extends TreeAdapterTypeMap> {
    treeAdapter?: TreeAdapter<T>;
}

//Serializer
export class Serializer<T extends TreeAdapterTypeMap> {
    html = '';
    treeAdapter: TreeAdapter;

    constructor(
        private startNode: T['parentNode'],
        { treeAdapter = defaultTreeAdapter as TreeAdapter<T> }: SerializerOptions<T>
    ) {
        this.treeAdapter = treeAdapter;
    }

    //API
    serialize() {
        this._serializeChildNodes(this.startNode);

        return this.html;
    }

    //Internals
    _serializeChildNodes(parentNode: T['parentNode']) {
        const childNodes = this.treeAdapter.getChildNodes(parentNode);

        if (childNodes) {
            for (const currentNode of childNodes) {
                if (this.treeAdapter.isElementNode(currentNode)) {
                    this._serializeElement(currentNode);
                } else if (this.treeAdapter.isTextNode(currentNode)) {
                    this._serializeTextNode(currentNode);
                } else if (this.treeAdapter.isCommentNode(currentNode)) {
                    this._serializeCommentNode(currentNode);
                } else if (this.treeAdapter.isDocumentTypeNode(currentNode)) {
                    this._serializeDocumentTypeNode(currentNode);
                }
            }
        }
    }

    _serializeElement(node: T['element']) {
        const tn = this.treeAdapter.getTagName(node);
        const ns = this.treeAdapter.getNamespaceURI(node);

        this.html += `<${tn}`;
        this._serializeAttributes(node);
        this.html += '>';

        if (!VOID_ELEMENTS.has(tn)) {
            const childNodesHolder =
                tn === $.TEMPLATE && ns === NS.HTML ? this.treeAdapter.getTemplateContent(node) : node;

            this._serializeChildNodes(childNodesHolder);
            this.html += `</${tn}>`;
        }
    }

    _serializeAttributes(node: T['element']) {
        for (const attr of this.treeAdapter.getAttrList(node)) {
            const value = escapeString(attr.value, true);

            this.html += ' ';

            if (!attr.namespace) {
                this.html += attr.name;
            } else switch (attr.namespace) {
 case NS.XML: {
                this.html += `xml:${attr.name}`;
            
 break;
 }
 case NS.XMLNS: {
                if (attr.name !== 'xmlns') {
                    this.html += 'xmlns:';
                }

                this.html += attr.name;
            
 break;
 }
 case NS.XLINK: {
                this.html += `xlink:${attr.name}`;
            
 break;
 }
 default: {
                this.html += `${attr.prefix}:${attr.name}`;
            }
 }

            this.html += `="${value}"`;
        }
    }

    _serializeTextNode(node: T['textNode']) {
        const content = this.treeAdapter.getTextNodeContent(node);
        const parent = this.treeAdapter.getParentNode(node);

        this.html += parent &&
            this.treeAdapter.isElementNode(parent) &&
            UNESCAPED_TEXT.has(this.treeAdapter.getTagName(parent)) ? content : escapeString(content, false);
    }

    _serializeCommentNode(node: T['commentNode']) {
        this.html += `<!--${this.treeAdapter.getCommentNodeContent(node)}-->`;
    }

    _serializeDocumentTypeNode(node: T['documentType']) {
        const name = this.treeAdapter.getDocumentTypeNodeName(node);

        this.html += `<${doctype.serializeContent(name, null, null)}>`;
    }
}

// NOTE: used in tests and by rewriting stream
export function escapeString(str: string, attrMode: boolean) {
    str = str.replace(AMP_REGEX, '&amp;').replace(NBSP_REGEX, '&nbsp;');

    return attrMode
        ? str.replace(DOUBLE_QUOTE_REGEX, '&quot;')
        : str.replace(LT_REGEX, '&lt;').replace(GT_REGEX, '&gt;');
}
