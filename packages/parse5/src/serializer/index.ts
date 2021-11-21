import * as doctype from '../common/doctype.js';
import * as HTML from '../common/html.js';
import { TreeAdapter, TreeAdapterTypeMap } from '../treeAdapter.js';
import { defaultTreeAdapter, DefaultAdapterMap } from '../tree-adapters/default.js';

//Aliases
const $ = HTML.TAG_NAMES;
const NS = HTML.NAMESPACES;

export interface SerializerOptions<T extends TreeAdapterTypeMap> {
    treeAdapter: TreeAdapter<T>;
}

//Default serializer options
const DEFAULT_OPTIONS: SerializerOptions<DefaultAdapterMap> = {
    treeAdapter: defaultTreeAdapter,
};

//Escaping regexes
const AMP_REGEX = /&/g;
const NBSP_REGEX = /\u00a0/g;
const DOUBLE_QUOTE_REGEX = /"/g;
const LT_REGEX = /</g;
const GT_REGEX = />/g;

//Serializer
export class Serializer<T extends TreeAdapterTypeMap> {
    public html: string;
    protected _options: SerializerOptions<T>;
    protected _treeAdapter: TreeAdapter<T>;
    protected _startNode: T['node'];

    public constructor(node: T['node'], options?: Partial<SerializerOptions<T>>) {
        this._options = {
            ...(DEFAULT_OPTIONS as SerializerOptions<T>),
            ...(options ?? {}),
        };
        this._treeAdapter = this._options.treeAdapter;

        this.html = '';
        this._startNode = node;
    }

    //API
    public serialize(): string {
        this._serializeChildNodes(this._startNode);

        return this.html;
    }

    //Internals
    protected _serializeChildNodes(parentNode: T['parentNode']): void {
        const childNodes = this._treeAdapter.getChildNodes(parentNode);

        if (childNodes) {
            for (let i = 0, cnLength = childNodes.length; i < cnLength; i++) {
                const currentNode = childNodes[i];

                if (this._treeAdapter.isElementNode(currentNode)) {
                    this._serializeElement(currentNode);
                } else if (this._treeAdapter.isTextNode(currentNode)) {
                    this._serializeTextNode(currentNode);
                } else if (this._treeAdapter.isCommentNode(currentNode)) {
                    this._serializeCommentNode(currentNode);
                } else if (this._treeAdapter.isDocumentTypeNode(currentNode)) {
                    this._serializeDocumentTypeNode(currentNode);
                }
            }
        }
    }

    protected _serializeElement(node: T['element']): void {
        const tn = this._treeAdapter.getTagName(node);
        const ns = this._treeAdapter.getNamespaceURI(node);

        this.html += '<' + tn;
        this._serializeAttributes(node);
        this.html += '>';

        if (
            tn !== $.AREA &&
            tn !== $.BASE &&
            tn !== $.BASEFONT &&
            tn !== $.BGSOUND &&
            tn !== $.BR &&
            tn !== $.COL &&
            tn !== $.EMBED &&
            tn !== $.FRAME &&
            tn !== $.HR &&
            tn !== $.IMG &&
            tn !== $.INPUT &&
            tn !== $.KEYGEN &&
            tn !== $.LINK &&
            tn !== $.META &&
            tn !== $.PARAM &&
            tn !== $.SOURCE &&
            tn !== $.TRACK &&
            tn !== $.WBR
        ) {
            const childNodesHolder =
                tn === $.TEMPLATE && ns === NS.HTML ? this._treeAdapter.getTemplateContent(node) : node;

            this._serializeChildNodes(childNodesHolder);
            this.html += '</' + tn + '>';
        }
    }

    protected _serializeAttributes(node: T['element']): void {
        const attrs = this._treeAdapter.getAttrList(node);

        for (let i = 0, attrsLength = attrs.length; i < attrsLength; i++) {
            const attr = attrs[i];

            if (!attr) {
                continue;
            }

            const value = escapeString(attr.value, true);

            this.html += ' ';

            if (!attr.namespace) {
                this.html += attr.name;
            } else if (attr.namespace === NS.XML) {
                this.html += 'xml:' + attr.name;
            } else if (attr.namespace === NS.XMLNS) {
                if (attr.name !== 'xmlns') {
                    this.html += 'xmlns:';
                }

                this.html += attr.name;
            } else if (attr.namespace === NS.XLINK) {
                this.html += 'xlink:' + attr.name;
            } else {
                this.html += (attr.prefix ?? '') + ':' + attr.name;
            }

            this.html += '="' + value + '"';
        }
    }

    protected _serializeTextNode(node: T['textNode']): void {
        const content = this._treeAdapter.getTextNodeContent(node);
        const parent = this._treeAdapter.getParentNode(node);
        let parentTn: string | undefined;

        if (parent && this._treeAdapter.isElementNode(parent)) {
            parentTn = this._treeAdapter.getTagName(parent);
        }

        if (
            parentTn === $.STYLE ||
            parentTn === $.SCRIPT ||
            parentTn === $.XMP ||
            parentTn === $.IFRAME ||
            parentTn === $.NOEMBED ||
            parentTn === $.NOFRAMES ||
            parentTn === $.PLAINTEXT ||
            parentTn === $.NOSCRIPT
        ) {
            this.html += content;
        } else {
            this.html += escapeString(content, false);
        }
    }

    protected _serializeCommentNode(node: T['commentNode']): void {
        this.html += '<!--' + this._treeAdapter.getCommentNodeContent(node) + '-->';
    }

    protected _serializeDocumentTypeNode(node: T['documentType']): void {
        const name = this._treeAdapter.getDocumentTypeNodeName(node);

        this.html += '<' + doctype.serializeContent(name) + '>';
    }
}

// NOTE: used in tests and by rewriting stream
export function escapeString<T extends TreeAdapterTypeMap>(str: string, attrMode: T['element']) {
    str = str.replace(AMP_REGEX, '&amp;').replace(NBSP_REGEX, '&nbsp;');

    if (attrMode) {
        str = str.replace(DOUBLE_QUOTE_REGEX, '&quot;');
    } else {
        str = str.replace(LT_REGEX, '&lt;').replace(GT_REGEX, '&gt;');
    }

    return str;
}
