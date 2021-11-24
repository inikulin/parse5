import { Tokenizer, TokenizerMode } from '../tokenizer/index.js';
import { OpenElementStack } from './open-element-stack.js';
import { FormattingElementList, ElementEntry, EntryType } from './formatting-element-list.js';
import { LocationInfoParserMixin } from '../extensions/location-info/parser-mixin.js';
import { Mixin } from '../utils/mixin.js';
import * as defaultTreeAdapter from '../tree-adapters/default.js';
import * as doctype from '../common/doctype.js';
import * as foreignContent from '../common/foreign-content.js';
import { ERR, ParserErrorHandler } from '../common/error-codes.js';
import * as unicode from '../common/unicode.js';
import {
    TAG_NAMES as $,
    NAMESPACES as NS,
    ATTRS,
    SPECIAL_ELEMENTS,
    DOCUMENT_MODE,
    isNumberedHeader,
} from '../common/html.js';
import type { TreeAdapter, TreeAdapterTypeMap } from '../tree-adapters/interface.js';
import {
    TokenType,
    getTokenAttr,
    Token,
    CommentToken,
    CharacterToken,
    TagToken,
    DoctypeToken,
    LocationWithAttributes,
} from '../common/token.js';

//Misc constants
const HIDDEN_INPUT_TYPE = 'hidden';

//Adoption agency loops iteration count
const AA_OUTER_LOOP_ITER = 8;
const AA_INNER_LOOP_ITER = 3;

//Insertion modes
enum InsertionMode {
    INITIAL,
    BEFORE_HTML,
    BEFORE_HEAD,
    IN_HEAD,
    IN_HEAD_NO_SCRIPT,
    AFTER_HEAD,
    IN_BODY,
    TEXT,
    IN_TABLE,
    IN_TABLE_TEXT,
    IN_CAPTION,
    IN_COLUMN_GROUP,
    IN_TABLE_BODY,
    IN_ROW,
    IN_CELL,
    IN_SELECT,
    IN_SELECT_IN_TABLE,
    IN_TEMPLATE,
    AFTER_BODY,
    IN_FRAMESET,
    AFTER_FRAMESET,
    AFTER_AFTER_BODY,
    AFTER_AFTER_FRAMESET,
}

//Insertion mode reset map
const INSERTION_MODE_RESET_MAP = new Map<string, InsertionMode>([
    [$.TR, InsertionMode.IN_ROW],
    [$.TBODY, InsertionMode.IN_TABLE_BODY],
    [$.THEAD, InsertionMode.IN_TABLE_BODY],
    [$.TFOOT, InsertionMode.IN_TABLE_BODY],
    [$.CAPTION, InsertionMode.IN_CAPTION],
    [$.COLGROUP, InsertionMode.IN_COLUMN_GROUP],
    [$.TABLE, InsertionMode.IN_TABLE],
    [$.BODY, InsertionMode.IN_BODY],
    [$.FRAMESET, InsertionMode.IN_FRAMESET],
]);

//Template insertion mode switch map
const TEMPLATE_INSERTION_MODE_SWITCH_MAP = new Map<string, InsertionMode>([
    [$.CAPTION, InsertionMode.IN_TABLE],
    [$.COLGROUP, InsertionMode.IN_TABLE],
    [$.TBODY, InsertionMode.IN_TABLE],
    [$.TFOOT, InsertionMode.IN_TABLE],
    [$.THEAD, InsertionMode.IN_TABLE],
    [$.COL, InsertionMode.IN_COLUMN_GROUP],
    [$.TR, InsertionMode.IN_TABLE_BODY],
    [$.TD, InsertionMode.IN_ROW],
    [$.TH, InsertionMode.IN_ROW],
]);

const BASE_LOC = {
    startLine: -1,
    startCol: -1,
    startOffset: -1,
    endLine: -1,
    endCol: -1,
    endOffset: -1,
};

const TABLE_STRUCTURE_TAGS = new Set<string>([$.TABLE, $.TBODY, $.TFOOT, $.THEAD, $.TR]);

export interface ParserOptions<T extends TreeAdapterTypeMap> {
    /**
     * The [scripting flag](https://html.spec.whatwg.org/multipage/parsing.html#scripting-flag). If set
     * to `true`, `noscript` element content will be parsed as text.
     *
     *  @default `true`
     */
    scriptingEnabled?: boolean | undefined;

    /**
     * Enables source code location information. When enabled, each node (except the root node)
     * will have a `sourceCodeLocation` property. If the node is not an empty element, `sourceCodeLocation` will
     * be a {@link ElementLocation} object, otherwise it will be {@link Location}.
     * If the element was implicitly created by the parser (as part of
     * [tree correction](https://html.spec.whatwg.org/multipage/syntax.html#an-introduction-to-error-handling-and-strange-cases-in-the-parser)),
     * its `sourceCodeLocation` property will be `undefined`.
     *
     * @default `false`
     */
    sourceCodeLocationInfo?: boolean | undefined;

    /**
     * Specifies the resulting tree format.
     *
     * @default `treeAdapters.default`
     */
    treeAdapter?: TreeAdapter<T> | undefined;

    /**
     * Callback for parse errors.
     *
     * @default `null`
     */
    onParseError?: ParserErrorHandler | null;
}

//Parser
export class Parser<T extends TreeAdapterTypeMap> {
    options: ParserOptions<T>;
    treeAdapter: TreeAdapter<T>;
    pendingScript: null | T['element'];
    private onParseError: ParserErrorHandler | null;

    constructor(options?: ParserOptions<T>) {
        this.options = {
            scriptingEnabled: true,
            sourceCodeLocationInfo: false,
            onParseError: null,
            treeAdapter: defaultTreeAdapter as TreeAdapter<T>,
            ...options,
        };

        this.treeAdapter = this.options.treeAdapter!;
        this.pendingScript = null;

        this.onParseError = this.options.onParseError ?? null;

        if (this.options.onParseError) {
            this.options.sourceCodeLocationInfo = true;
        }

        if (this.options.sourceCodeLocationInfo) {
            Mixin.install(this, LocationInfoParserMixin as any);
        }
    }

    // API
    parse(html: string) {
        const document = this.treeAdapter.createDocument();

        this._bootstrap(document, null);
        this.tokenizer.write(html, true);
        this._runParsingLoop(null);

        return document;
    }

    parseFragment(html: string, fragmentContext?: T['parentNode'] | null): T['documentFragment'] {
        //NOTE: use <template> element as a fragment context if context element was not provided,
        //so we will parse in "forgiving" manner
        if (!fragmentContext) {
            fragmentContext = this.treeAdapter.createElement($.TEMPLATE, NS.HTML, []);
        }

        //NOTE: create fake element which will be used as 'document' for fragment parsing.
        //This is important for jsdom there 'document' can't be recreated, therefore
        //fragment parsing causes messing of the main `document`.
        const documentMock = this.treeAdapter.createElement('documentmock', NS.HTML, []);

        this._bootstrap(documentMock, fragmentContext);

        if (this.treeAdapter.getTagName(fragmentContext) === $.TEMPLATE) {
            this.tmplInsertionModeStack.unshift(InsertionMode.IN_TEMPLATE);
        }

        this._initTokenizerForFragmentParsing();
        this._insertFakeRootElement();
        this._resetInsertionMode();
        this._findFormInFragmentContext();
        this.tokenizer.write(html, true);
        this._runParsingLoop(null);

        const rootElement = this.treeAdapter.getFirstChild(documentMock) as T['parentNode'];
        const fragment = this.treeAdapter.createDocumentFragment();

        this._adoptNodes(rootElement, fragment);

        return fragment;
    }

    tokenizer!: Tokenizer;
    stopped = false;
    insertionMode = InsertionMode.INITIAL;
    originalInsertionMode = InsertionMode.INITIAL;

    document!: T['document'];
    fragmentContext!: T['element'] | null;

    headElement: null | T['element'] = null;
    formElement: null | T['element'] = null;

    openElements!: OpenElementStack<T>;
    activeFormattingElements!: FormattingElementList<T>;

    /**
     * The template insertion mode stack is maintained from the left.
     * Ie. the topmost element will always have index 0.
     */
    tmplInsertionModeStack: InsertionMode[] = [];

    pendingCharacterTokens: CharacterToken[] = [];
    hasNonWhitespacePendingCharacterToken = false;

    framesetOk = true;
    skipNextNewLine = false;
    fosterParentingEnabled = false;

    //Bootstrap parser
    _bootstrap(document: T['document'], fragmentContext: T['element'] | null) {
        this.tokenizer = new Tokenizer(this.options);

        this.stopped = false;

        this.insertionMode = InsertionMode.INITIAL;
        this.originalInsertionMode = InsertionMode.INITIAL;

        this.document = document;
        this.fragmentContext = fragmentContext;

        this.headElement = null;
        this.formElement = null;

        this.openElements = new OpenElementStack(this.document, this.treeAdapter);
        this.activeFormattingElements = new FormattingElementList(this.treeAdapter);

        this.tmplInsertionModeStack = [];

        this.pendingCharacterTokens = [];
        this.hasNonWhitespacePendingCharacterToken = false;

        this.framesetOk = true;
        this.skipNextNewLine = false;
        this.fosterParentingEnabled = false;
    }

    //Errors
    _err(token: Token, code: ERR, beforeToken?: boolean) {
        if (!this.onParseError) return;

        const loc = token.location ?? BASE_LOC;
        const err = {
            code,
            startLine: loc.startLine,
            startCol: loc.startCol,
            startOffset: loc.startOffset,
            endLine: beforeToken ? loc.startLine : loc.endLine,
            endCol: beforeToken ? loc.startCol : loc.endCol,
            endOffset: beforeToken ? loc.startOffset : loc.endOffset,
        };

        this.onParseError(err);
    }

    //Parsing loop
    _runParsingLoop(scriptHandler: null | ((scriptElement: T['element']) => void)) {
        while (!this.stopped) {
            this._setupTokenizerCDATAMode();

            const token = this.tokenizer.getNextToken();

            if (token.type === TokenType.HIBERNATION) {
                break;
            }

            if (this.skipNextNewLine) {
                this.skipNextNewLine = false;

                if (token.type === TokenType.WHITESPACE_CHARACTER && token.chars[0] === '\n') {
                    if (token.chars.length === 1) {
                        continue;
                    }

                    token.chars = token.chars.substr(1);
                }
            }

            this._processInputToken(token);

            if (scriptHandler && this.pendingScript) {
                break;
            }
        }
    }

    runParsingLoopForCurrentChunk(
        writeCallback: null | (() => void),
        scriptHandler: (scriptElement: T['element']) => void
    ) {
        this._runParsingLoop(scriptHandler);

        if (scriptHandler && this.pendingScript) {
            const script = this.pendingScript;

            this.pendingScript = null;

            scriptHandler(script);

            return;
        }

        if (writeCallback) {
            writeCallback();
        }
    }

    //Text parsing
    _setupTokenizerCDATAMode() {
        const current = this._getAdjustedCurrentElement();

        this.tokenizer.allowCDATA =
            current &&
            current !== this.document &&
            this.treeAdapter.getNamespaceURI(current) !== NS.HTML &&
            !this._isIntegrationPoint(current);
    }

    _switchToTextParsing(currentToken: TagToken, nextTokenizerState: typeof TokenizerMode[keyof typeof TokenizerMode]) {
        this._insertElement(currentToken, NS.HTML);
        this.tokenizer.state = nextTokenizerState;
        this.originalInsertionMode = this.insertionMode;
        this.insertionMode = InsertionMode.TEXT;
    }

    switchToPlaintextParsing() {
        this.insertionMode = InsertionMode.TEXT;
        this.originalInsertionMode = InsertionMode.IN_BODY;
        this.tokenizer.state = TokenizerMode.PLAINTEXT;
    }

    //Fragment parsing
    _getAdjustedCurrentElement() {
        return this.openElements.stackTop === 0 && this.fragmentContext
            ? this.fragmentContext
            : this.openElements.current;
    }

    _findFormInFragmentContext() {
        let node = this.fragmentContext!;

        do {
            if (this.treeAdapter.getTagName(node) === $.FORM) {
                this.formElement = node;
                break;
            }

            node = this.treeAdapter.getParentNode(node)!;
        } while (node);
    }

    _initTokenizerForFragmentParsing() {
        if (this.treeAdapter.getNamespaceURI(this.fragmentContext!) === NS.HTML) {
            const tn = this.treeAdapter.getTagName(this.fragmentContext!);

            switch (tn) {
                case $.TITLE:
                case $.TEXTAREA: {
                    this.tokenizer.state = TokenizerMode.RCDATA;

                    break;
                }
                case $.STYLE:
                case $.XMP:
                case $.IFRAME:
                case $.NOEMBED:
                case $.NOFRAMES:
                case $.NOSCRIPT: {
                    this.tokenizer.state = TokenizerMode.RAWTEXT;

                    break;
                }
                case $.SCRIPT: {
                    this.tokenizer.state = TokenizerMode.SCRIPT_DATA;

                    break;
                }
                case $.PLAINTEXT: {
                    this.tokenizer.state = TokenizerMode.PLAINTEXT;

                    break;
                }
                default:
                // Do nothing
            }
        }
    }

    //Tree mutation
    _setDocumentType(token: DoctypeToken) {
        const name = token.name || '';
        const publicId = token.publicId || '';
        const systemId = token.systemId || '';

        this.treeAdapter.setDocumentType(this.document, name, publicId, systemId);

        if (token.location) {
            const documentChildren = this.treeAdapter.getChildNodes(this.document);
            const docTypeNode = documentChildren.find((node) => this.treeAdapter.isDocumentTypeNode(node));

            if (docTypeNode) {
                this.treeAdapter.setNodeSourceCodeLocation(docTypeNode, token.location);
            }
        }
    }

    _attachElementToTree(element: T['element'], location: LocationWithAttributes | null) {
        const loc = location && {
            ...location,
            startTag: location,
        };

        this.treeAdapter.setNodeSourceCodeLocation(element, loc);

        if (this._shouldFosterParentOnInsertion()) {
            this._fosterParentElement(element);
        } else {
            const parent = this.openElements.currentTmplContent || this.openElements.current;

            this.treeAdapter.appendChild(parent, element);
        }
    }

    _appendElement(token: TagToken, namespaceURI: NS) {
        const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);

        this._attachElementToTree(element, token.location);
    }

    _insertElement(token: TagToken, namespaceURI: NS) {
        const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);

        this._attachElementToTree(element, token.location);
        this.openElements.push(element);
    }

    _insertFakeElement(tagName: string) {
        const element = this.treeAdapter.createElement(tagName, NS.HTML, []);

        this._attachElementToTree(element, null);
        this.openElements.push(element);
    }

    _insertTemplate(token: TagToken) {
        const tmpl = this.treeAdapter.createElement(token.tagName, NS.HTML, token.attrs);
        const content = this.treeAdapter.createDocumentFragment();

        this.treeAdapter.setTemplateContent(tmpl, content);
        this._attachElementToTree(tmpl, token.location);
        this.openElements.push(tmpl);
        this.treeAdapter.setNodeSourceCodeLocation(content, null);
    }

    _insertFakeRootElement() {
        const element = this.treeAdapter.createElement($.HTML, NS.HTML, []);
        this.treeAdapter.setNodeSourceCodeLocation(element, null);

        this.treeAdapter.appendChild(this.openElements.current, element);
        this.openElements.push(element);
    }

    _appendCommentNode(token: CommentToken, parent: T['parentNode']) {
        const commentNode = this.treeAdapter.createCommentNode(token.data);

        this.treeAdapter.appendChild(parent, commentNode);
        this.treeAdapter.setNodeSourceCodeLocation(commentNode, token.location);
    }

    _insertCharacters(token: CharacterToken) {
        let parent;
        let beforeElement;

        if (this._shouldFosterParentOnInsertion()) {
            ({ parent, beforeElement } = this._findFosterParentingLocation());

            if (beforeElement) {
                this.treeAdapter.insertTextBefore(parent, token.chars, beforeElement);
            } else {
                this.treeAdapter.insertText(parent, token.chars);
            }
        } else {
            parent = this.openElements.currentTmplContent || this.openElements.current;

            this.treeAdapter.insertText(parent, token.chars);
        }

        if (!token.location) return;

        const siblings = this.treeAdapter.getChildNodes(parent);
        const textNodeIdx = beforeElement ? siblings.lastIndexOf(beforeElement) : siblings.length;
        const textNode = siblings[textNodeIdx - 1];

        //NOTE: if we have location assigned by another token, then just update end position
        const tnLoc = this.treeAdapter.getNodeSourceCodeLocation(textNode);

        if (tnLoc) {
            const { endLine, endCol, endOffset } = token.location;
            this.treeAdapter.updateNodeSourceCodeLocation(textNode, { endLine, endCol, endOffset });
        } else {
            this.treeAdapter.setNodeSourceCodeLocation(textNode, token.location);
        }
    }

    _adoptNodes(donor: T['parentNode'], recipient: T['parentNode']) {
        for (let child = this.treeAdapter.getFirstChild(donor); child; child = this.treeAdapter.getFirstChild(donor)) {
            this.treeAdapter.detachNode(child);
            this.treeAdapter.appendChild(recipient, child);
        }
    }

    //Token processing
    _shouldProcessTokenInForeignContent(token: Token) {
        const current = this._getAdjustedCurrentElement();

        if (!current || current === this.document) {
            return false;
        }

        const ns = this.treeAdapter.getNamespaceURI(current);

        if (ns === NS.HTML) {
            return false;
        }

        if (
            this.treeAdapter.getTagName(current) === $.ANNOTATION_XML &&
            ns === NS.MATHML &&
            token.type === TokenType.START_TAG &&
            token.tagName === $.SVG
        ) {
            return false;
        }

        const isCharacterToken =
            token.type === TokenType.CHARACTER ||
            token.type === TokenType.NULL_CHARACTER ||
            token.type === TokenType.WHITESPACE_CHARACTER;

        const isMathMLTextStartTag =
            token.type === TokenType.START_TAG && token.tagName !== $.MGLYPH && token.tagName !== $.MALIGNMARK;

        if ((isMathMLTextStartTag || isCharacterToken) && this._isIntegrationPoint(current, NS.MATHML)) {
            return false;
        }

        if ((token.type === TokenType.START_TAG || isCharacterToken) && this._isIntegrationPoint(current, NS.HTML)) {
            return false;
        }

        return token.type !== TokenType.EOF;
    }

    _processToken(token: Token) {
        switch (this.insertionMode) {
            case InsertionMode.INITIAL: {
                modeInitial(this, token);

                break;
            }
            case InsertionMode.BEFORE_HTML: {
                modeBeforeHtml(this, token);

                break;
            }
            case InsertionMode.BEFORE_HEAD: {
                modeBeforeHead(this, token);

                break;
            }
            case InsertionMode.IN_HEAD: {
                modeInHead(this, token);

                break;
            }
            case InsertionMode.IN_HEAD_NO_SCRIPT: {
                modeInHeadNoScript(this, token);

                break;
            }
            case InsertionMode.AFTER_HEAD: {
                modeAfterHead(this, token);

                break;
            }
            case InsertionMode.IN_BODY: {
                modeInBody(this, token);

                break;
            }
            case InsertionMode.TEXT: {
                modeText(this, token);

                break;
            }
            case InsertionMode.IN_TABLE: {
                modeInTable(this, token);

                break;
            }
            case InsertionMode.IN_TABLE_TEXT: {
                modeInTableText(this, token);

                break;
            }
            case InsertionMode.IN_CAPTION: {
                modeInCaption(this, token);

                break;
            }
            case InsertionMode.IN_COLUMN_GROUP: {
                modeInColumnGroup(this, token);

                break;
            }
            case InsertionMode.IN_TABLE_BODY: {
                modeInTableBody(this, token);

                break;
            }
            case InsertionMode.IN_ROW: {
                modeInRow(this, token);

                break;
            }
            case InsertionMode.IN_CELL: {
                modeInCell(this, token);

                break;
            }
            case InsertionMode.IN_SELECT: {
                modeInSelect(this, token);

                break;
            }
            case InsertionMode.IN_SELECT_IN_TABLE: {
                modeInSelectInTable(this, token);

                break;
            }
            case InsertionMode.IN_TEMPLATE: {
                modeInTemplate(this, token);

                break;
            }
            case InsertionMode.AFTER_BODY: {
                modeAfterBody(this, token);

                break;
            }
            case InsertionMode.IN_FRAMESET: {
                modeInFrameset(this, token);

                break;
            }
            case InsertionMode.AFTER_FRAMESET: {
                modeAfterFrameset(this, token);

                break;
            }
            case InsertionMode.AFTER_AFTER_BODY: {
                modeAfterAfterBody(this, token);

                break;
            }
            case InsertionMode.AFTER_AFTER_FRAMESET: {
                modeAfterAfterFrameset(this, token);

                break;
            }
            default:
            // Do nothing
        }
    }

    _processTokenInForeignContent(token: Token) {
        switch (token.type) {
            case TokenType.CHARACTER: {
                characterInForeignContent(this, token);

                break;
            }
            case TokenType.NULL_CHARACTER: {
                nullCharacterInForeignContent(this, token);

                break;
            }
            case TokenType.WHITESPACE_CHARACTER: {
                this._insertCharacters(token);

                break;
            }
            case TokenType.COMMENT: {
                appendComment(this, token);

                break;
            }
            case TokenType.START_TAG: {
                startTagInForeignContent(this, token);

                break;
            }
            case TokenType.END_TAG: {
                endTagInForeignContent(this, token);

                break;
            }
            default:
            // Do nothing
        }
    }

    _processInputToken(token: Token) {
        if (this._shouldProcessTokenInForeignContent(token)) {
            this._processTokenInForeignContent(token);
        } else {
            this._processToken(token);
        }

        if (token.type === TokenType.START_TAG && token.selfClosing && !token.ackSelfClosing) {
            this._err(token, ERR.nonVoidHtmlElementStartTagWithTrailingSolidus);
        }
    }

    //Integration points
    _isIntegrationPoint(element: T['element'], foreignNS?: NS): boolean {
        const tn = this.treeAdapter.getTagName(element);
        const ns = this.treeAdapter.getNamespaceURI(element);
        const attrs = this.treeAdapter.getAttrList(element);

        return foreignContent.isIntegrationPoint(tn, ns, attrs, foreignNS);
    }

    //Active formatting elements reconstruction
    _reconstructActiveFormattingElements() {
        const listLength = this.activeFormattingElements.entries.length;

        if (listLength) {
            const endIndex = this.activeFormattingElements.entries.findIndex(
                (entry) => entry.type === EntryType.Marker || this.openElements.contains(entry.element)
            );

            const unopenIdx = endIndex < 0 ? listLength - 1 : endIndex - 1;

            for (let i = unopenIdx; i >= 0; i--) {
                const entry = this.activeFormattingElements.entries[i] as ElementEntry<T>;
                this._insertElement(entry.token, this.treeAdapter.getNamespaceURI(entry.element));
                entry.element = this.openElements.current;
            }
        }
    }

    //Close elements
    _closeTableCell() {
        this.openElements.generateImpliedEndTags();
        this.openElements.popUntilTableCellPopped();
        this.activeFormattingElements.clearToLastMarker();
        this.insertionMode = InsertionMode.IN_ROW;
    }

    _closePElement() {
        this.openElements.generateImpliedEndTagsWithExclusion($.P);
        this.openElements.popUntilTagNamePopped($.P);
    }

    //Insertion modes
    _resetInsertionMode() {
        for (let i = this.openElements.stackTop, last = false; i >= 0; i--) {
            let element = this.openElements.items[i];

            if (i === 0) {
                last = true;

                if (this.fragmentContext) {
                    element = this.fragmentContext;
                }
            }

            const tn = this.treeAdapter.getTagName(element);
            const newInsertionMode = INSERTION_MODE_RESET_MAP.get(tn);

            if (newInsertionMode !== undefined) {
                this.insertionMode = newInsertionMode;
                break;
            } else if (!last && (tn === $.TD || tn === $.TH)) {
                this.insertionMode = InsertionMode.IN_CELL;
                break;
            } else if (!last && tn === $.HEAD) {
                this.insertionMode = InsertionMode.IN_HEAD;
                break;
            } else if (tn === $.SELECT) {
                this._resetInsertionModeForSelect(i);
                break;
            } else if (tn === $.TEMPLATE) {
                this.insertionMode = this.tmplInsertionModeStack[0]!;
                break;
            } else if (tn === $.HTML) {
                this.insertionMode = this.headElement ? InsertionMode.AFTER_HEAD : InsertionMode.BEFORE_HEAD;
                break;
            } else if (last) {
                this.insertionMode = InsertionMode.IN_BODY;
                break;
            }
        }
    }

    _resetInsertionModeForSelect(selectIdx: number) {
        if (selectIdx > 0) {
            for (let i = selectIdx - 1; i > 0; i--) {
                const ancestor = this.openElements.items[i];
                const tn = this.treeAdapter.getTagName(ancestor);

                if (tn === $.TEMPLATE) {
                    break;
                } else if (tn === $.TABLE) {
                    this.insertionMode = InsertionMode.IN_SELECT_IN_TABLE;
                    return;
                }
            }
        }

        this.insertionMode = InsertionMode.IN_SELECT;
    }

    //Foster parenting
    _isElementCausesFosterParenting(element: T['element']): boolean {
        const tn = this.treeAdapter.getTagName(element);

        return TABLE_STRUCTURE_TAGS.has(tn);
    }

    _shouldFosterParentOnInsertion() {
        return this.fosterParentingEnabled && this._isElementCausesFosterParenting(this.openElements.current);
    }

    _findFosterParentingLocation() {
        let parent: T['parentNode'] | undefined;
        let beforeElement: null | T['element'] = null;

        for (let i = this.openElements.stackTop; i >= 0; i--) {
            const openElement = this.openElements.items[i];
            const tn = this.treeAdapter.getTagName(openElement);
            const ns = this.treeAdapter.getNamespaceURI(openElement);

            if (tn === $.TEMPLATE && ns === NS.HTML) {
                parent = this.treeAdapter.getTemplateContent(openElement);
                break;
            } else if (tn === $.TABLE) {
                const parentNode = this.treeAdapter.getParentNode(openElement);

                if (parentNode) {
                    parent = parentNode;
                    beforeElement = openElement;
                } else {
                    parent = this.openElements.items[i - 1];
                }

                break;
            }
        }

        return { parent: parent ?? this.openElements.items[0], beforeElement };
    }

    _fosterParentElement(element: T['element']) {
        const location = this._findFosterParentingLocation();

        if (location.beforeElement) {
            this.treeAdapter.insertBefore(location.parent, element, location.beforeElement);
        } else {
            this.treeAdapter.appendChild(location.parent, element);
        }
    }

    //Special elements
    _isSpecialElement(element: T['element']): boolean {
        const tn = this.treeAdapter.getTagName(element);
        const ns = this.treeAdapter.getNamespaceURI(element);

        return (SPECIAL_ELEMENTS as any)[ns].has(tn);
    }
}

//Adoption agency algorithm
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tree-construction.html#adoptionAgency)
//------------------------------------------------------------------

//Steps 5-8 of the algorithm
function aaObtainFormattingElementEntry<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    let formattingElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(token.tagName);

    if (formattingElementEntry) {
        if (!p.openElements.contains(formattingElementEntry.element)) {
            p.activeFormattingElements.removeEntry(formattingElementEntry);
            formattingElementEntry = null;
        } else if (!p.openElements.hasInScope(token.tagName)) {
            formattingElementEntry = null;
        }
    } else {
        genericEndTagInBody(p, token);
    }

    return formattingElementEntry;
}

//Steps 9 and 10 of the algorithm
function aaObtainFurthestBlock<T extends TreeAdapterTypeMap>(p: Parser<T>, formattingElementEntry: ElementEntry<T>) {
    let furthestBlock = null;
    let idx = p.openElements.stackTop;

    for (; idx >= 0; idx--) {
        const element = p.openElements.items[idx];

        if (element === formattingElementEntry.element) {
            break;
        }

        if (p._isSpecialElement(element)) {
            furthestBlock = element;
        }
    }

    if (!furthestBlock) {
        p.openElements.shortenToLength(idx < 0 ? 0 : idx);
        p.activeFormattingElements.removeEntry(formattingElementEntry);
    }

    return furthestBlock;
}

//Step 13 of the algorithm
function aaInnerLoop<T extends TreeAdapterTypeMap>(
    p: Parser<T>,
    furthestBlock: T['element'],
    formattingElement: T['element']
) {
    let lastElement = furthestBlock;
    let nextElement = p.openElements.getCommonAncestor(furthestBlock) as T['element'];

    for (let i = 0, element = nextElement; element !== formattingElement; i++, element = nextElement) {
        //NOTE: store next element for the next loop iteration (it may be deleted from the stack by step 9.5)
        nextElement = p.openElements.getCommonAncestor(element) as T['element'];

        const elementEntry = p.activeFormattingElements.getElementEntry(element);
        const counterOverflow = elementEntry && i >= AA_INNER_LOOP_ITER;
        const shouldRemoveFromOpenElements = !elementEntry || counterOverflow;

        if (shouldRemoveFromOpenElements) {
            if (counterOverflow) {
                p.activeFormattingElements.removeEntry(elementEntry);
            }

            p.openElements.remove(element);
        } else {
            element = aaRecreateElementFromEntry(p, elementEntry);

            if (lastElement === furthestBlock) {
                p.activeFormattingElements.bookmark = elementEntry;
            }

            p.treeAdapter.detachNode(lastElement);
            p.treeAdapter.appendChild(element, lastElement);
            lastElement = element;
        }
    }

    return lastElement;
}

//Step 13.7 of the algorithm
function aaRecreateElementFromEntry<T extends TreeAdapterTypeMap>(p: Parser<T>, elementEntry: ElementEntry<T>) {
    const ns = p.treeAdapter.getNamespaceURI(elementEntry.element);
    const newElement = p.treeAdapter.createElement(elementEntry.token.tagName, ns, elementEntry.token.attrs);

    p.openElements.replace(elementEntry.element, newElement);
    elementEntry.element = newElement;

    return newElement;
}

//Step 14 of the algorithm
function aaInsertLastNodeInCommonAncestor<T extends TreeAdapterTypeMap>(
    p: Parser<T>,
    commonAncestor: T['parentNode'],
    lastElement: T['element']
) {
    if (p._isElementCausesFosterParenting(commonAncestor)) {
        p._fosterParentElement(lastElement);
    } else {
        const tn = p.treeAdapter.getTagName(commonAncestor);
        const ns = p.treeAdapter.getNamespaceURI(commonAncestor);

        if (tn === $.TEMPLATE && ns === NS.HTML) {
            commonAncestor = p.treeAdapter.getTemplateContent(commonAncestor);
        }

        p.treeAdapter.appendChild(commonAncestor, lastElement);
    }
}

//Steps 15-19 of the algorithm
function aaReplaceFormattingElement<T extends TreeAdapterTypeMap>(
    p: Parser<T>,
    furthestBlock: T['parentNode'],
    formattingElementEntry: ElementEntry<T>
) {
    const ns = p.treeAdapter.getNamespaceURI(formattingElementEntry.element);
    const { token } = formattingElementEntry;
    const newElement = p.treeAdapter.createElement(token.tagName, ns, token.attrs);

    p._adoptNodes(furthestBlock, newElement);
    p.treeAdapter.appendChild(furthestBlock, newElement);

    p.activeFormattingElements.insertElementAfterBookmark(newElement, formattingElementEntry.token);
    p.activeFormattingElements.removeEntry(formattingElementEntry);

    p.openElements.remove(formattingElementEntry.element);
    p.openElements.insertAfter(furthestBlock, newElement);
}

//Algorithm entry point
function callAdoptionAgency<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    for (let i = 0; i < AA_OUTER_LOOP_ITER; i++) {
        const formattingElementEntry = aaObtainFormattingElementEntry(p, token);

        if (!formattingElementEntry) {
            break;
        }

        const furthestBlock = aaObtainFurthestBlock(p, formattingElementEntry);

        if (!furthestBlock) {
            break;
        }

        p.activeFormattingElements.bookmark = formattingElementEntry;

        const lastElement = aaInnerLoop(p, furthestBlock, formattingElementEntry.element);
        const commonAncestor = p.openElements.getCommonAncestor(formattingElementEntry.element);

        p.treeAdapter.detachNode(lastElement);
        if (commonAncestor) aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement);
        aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry);
    }
}

//Generic token handlers
//------------------------------------------------------------------

function misplacedDoctype<T extends TreeAdapterTypeMap>(p: Parser<T>, token: DoctypeToken) {
    p._err(token, ERR.misplacedDoctype);
}

function appendComment<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CommentToken) {
    p._appendCommentNode(token, p.openElements.currentTmplContent || p.openElements.current);
}

function appendCommentToRootHtmlElement<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CommentToken) {
    p._appendCommentNode(token, p.openElements.items[0]);
}

function appendCommentToDocument<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CommentToken) {
    p._appendCommentNode(token, p.document);
}

function stopParsing<T extends TreeAdapterTypeMap>(p: Parser<T>) {
    p.stopped = true;
}

// The "initial" insertion mode
//------------------------------------------------------------------
function modeInitial<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    if (token.type === TokenType.COMMENT) {
        appendComment(p, token);
    } else if (token.type === TokenType.DOCTYPE) {
        doctypeInInitialMode(p, token);
    } else if (token.type !== TokenType.WHITESPACE_CHARACTER) {
        tokenInInitialMode(p, token);
    }
}

function doctypeInInitialMode<T extends TreeAdapterTypeMap>(p: Parser<T>, token: DoctypeToken) {
    p._setDocumentType(token);

    const mode = token.forceQuirks ? DOCUMENT_MODE.QUIRKS : doctype.getDocumentMode(token);

    if (!doctype.isConforming(token)) {
        p._err(token, ERR.nonConformingDoctype);
    }

    p.treeAdapter.setDocumentMode(p.document, mode);

    p.insertionMode = InsertionMode.BEFORE_HTML;
}

function tokenInInitialMode<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    p._err(token, ERR.missingDoctype, true);
    p.treeAdapter.setDocumentMode(p.document, DOCUMENT_MODE.QUIRKS);
    p.insertionMode = InsertionMode.BEFORE_HTML;
    modeBeforeHtml(p, token);
}

// The "before html" insertion mode
//------------------------------------------------------------------
function modeBeforeHtml<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER:
        case TokenType.EOF: {
            tokenBeforeHtml(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagBeforeHtml(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagBeforeHtml(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagBeforeHtml<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (token.tagName === $.HTML) {
        p._insertElement(token, NS.HTML);
        p.insertionMode = InsertionMode.BEFORE_HEAD;
    } else {
        tokenBeforeHtml(p, token);
    }
}

function endTagBeforeHtml<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.HTML || tn === $.HEAD || tn === $.BODY || tn === $.BR) {
        tokenBeforeHtml(p, token);
    }
}

function tokenBeforeHtml<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    p._insertFakeRootElement();
    p.insertionMode = InsertionMode.BEFORE_HEAD;
    modeBeforeHead(p, token);
}

// The "before head" insertion mode
//------------------------------------------------------------------
function modeBeforeHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER:
        case TokenType.EOF: {
            tokenBeforeHead(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.DOCTYPE: {
            misplacedDoctype(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagBeforeHead(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagBeforeHead(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagBeforeHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.HEAD) {
        p._insertElement(token, NS.HTML);
        p.headElement = p.openElements.current;
        p.insertionMode = InsertionMode.IN_HEAD;
    } else {
        tokenBeforeHead(p, token);
    }
}

function endTagBeforeHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.HEAD || tn === $.BODY || tn === $.HTML || tn === $.BR) {
        tokenBeforeHead(p, token);
    } else {
        p._err(token, ERR.endTagWithoutMatchingOpenElement);
    }
}

function tokenBeforeHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    p._insertFakeElement($.HEAD);
    p.headElement = p.openElements.current;
    p.insertionMode = InsertionMode.IN_HEAD;
    modeInHead(p, token);
}

// The "in head" insertion mode
//------------------------------------------------------------------
function modeInHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER:
        case TokenType.EOF: {
            tokenInHead(p, token);

            break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
            p._insertCharacters(token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.DOCTYPE: {
            misplacedDoctype(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInHead(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInHead(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagInHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn) {
        case $.HTML: {
            startTagInBody(p, token);

            break;
        }
        case $.BASE:
        case $.BASEFONT:
        case $.BGSOUND:
        case $.LINK:
        case $.META: {
            p._appendElement(token, NS.HTML);
            token.ackSelfClosing = true;

            break;
        }
        case $.TITLE: {
            p._switchToTextParsing(token, TokenizerMode.RCDATA);

            break;
        }
        case $.NOSCRIPT: {
            if (p.options.scriptingEnabled) {
                p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
            } else {
                p._insertElement(token, NS.HTML);
                p.insertionMode = InsertionMode.IN_HEAD_NO_SCRIPT;
            }

            break;
        }
        case $.NOFRAMES:
        case $.STYLE: {
            p._switchToTextParsing(token, TokenizerMode.RAWTEXT);

            break;
        }
        case $.SCRIPT: {
            p._switchToTextParsing(token, TokenizerMode.SCRIPT_DATA);

            break;
        }
        case $.TEMPLATE: {
            p._insertTemplate(token);
            p.activeFormattingElements.insertMarker();
            p.framesetOk = false;
            p.insertionMode = InsertionMode.IN_TEMPLATE;
            p.tmplInsertionModeStack.unshift(InsertionMode.IN_TEMPLATE);

            break;
        }
        case $.HEAD: {
            p._err(token, ERR.misplacedStartTagForHeadElement);

            break;
        }
        default: {
            tokenInHead(p, token);
        }
    }
}

function endTagInHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn) {
        case $.HEAD: {
            p.openElements.pop();
            p.insertionMode = InsertionMode.AFTER_HEAD;

            break;
        }
        case $.BODY:
        case $.BR:
        case $.HTML: {
            tokenInHead(p, token);

            break;
        }
        case $.TEMPLATE: {
            if (p.openElements.tmplCount > 0) {
                p.openElements.generateImpliedEndTagsThoroughly();

                if (p.openElements.currentTagName !== $.TEMPLATE) {
                    p._err(token, ERR.closingOfElementWithOpenChildElements);
                }

                p.openElements.popUntilTagNamePopped($.TEMPLATE);
                p.activeFormattingElements.clearToLastMarker();
                p.tmplInsertionModeStack.shift();
                p._resetInsertionMode();
            } else {
                p._err(token, ERR.endTagWithoutMatchingOpenElement);
            }

            break;
        }
        default: {
            p._err(token, ERR.endTagWithoutMatchingOpenElement);
        }
    }
}

function tokenInHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    p.openElements.pop();
    p.insertionMode = InsertionMode.AFTER_HEAD;
    modeAfterHead(p, token);
}

// The "in head no script" insertion mode
//------------------------------------------------------------------
function modeInHeadNoScript<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER:
        case TokenType.EOF: {
            tokenInHeadNoScript(p, token);

            break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
            p._insertCharacters(token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.DOCTYPE: {
            misplacedDoctype(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInHeadNoScript(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInHeadNoScript(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagInHeadNoScript<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn) {
        case $.HTML: {
            startTagInBody(p, token);

            break;
        }
        case $.BASEFONT:
        case $.BGSOUND:
        case $.HEAD:
        case $.LINK:
        case $.META:
        case $.NOFRAMES:
        case $.STYLE: {
            startTagInHead(p, token);

            break;
        }
        case $.NOSCRIPT: {
            p._err(token, ERR.nestedNoscriptInHead);

            break;
        }
        default: {
            tokenInHeadNoScript(p, token);
        }
    }
}

function endTagInHeadNoScript<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.NOSCRIPT) {
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_HEAD;
    } else if (tn === $.BR) {
        tokenInHeadNoScript(p, token);
    } else {
        p._err(token, ERR.endTagWithoutMatchingOpenElement);
    }
}

function tokenInHeadNoScript<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    const errCode = token.type === TokenType.EOF ? ERR.openElementsLeftAfterEof : ERR.disallowedContentInNoscriptInHead;

    p._err(token, errCode);
    p.openElements.pop();
    p.insertionMode = InsertionMode.IN_HEAD;
    modeInHead(p, token);
}

// The "after head" insertion mode
//------------------------------------------------------------------
function modeAfterHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER:
        case TokenType.EOF: {
            tokenAfterHead(p, token);

            break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
            p._insertCharacters(token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.DOCTYPE: {
            misplacedDoctype(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagAfterHead(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagAfterHead(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

const ABANDONED_HEAD_ELEMENT_CHILDS = new Set<string>([
    $.BASE,
    $.BASEFONT,
    $.BGSOUND,
    $.LINK,
    $.META,
    $.NOFRAMES,
    $.SCRIPT,
    $.STYLE,
    $.TEMPLATE,
    $.TITLE,
]);

function startTagAfterHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn) {
        case $.HTML: {
            startTagInBody(p, token);

            break;
        }
        case $.BODY: {
            p._insertElement(token, NS.HTML);
            p.framesetOk = false;
            p.insertionMode = InsertionMode.IN_BODY;

            break;
        }
        case $.FRAMESET: {
            p._insertElement(token, NS.HTML);
            p.insertionMode = InsertionMode.IN_FRAMESET;

            break;
        }
        default:
            if (ABANDONED_HEAD_ELEMENT_CHILDS.has(tn)) {
                p._err(token, ERR.abandonedHeadElementChild);
                p.openElements.push(p.headElement!);
                startTagInHead(p, token);
                p.openElements.remove(p.headElement!);
            } else if (tn === $.HEAD) {
                p._err(token, ERR.misplacedStartTagForHeadElement);
            } else {
                tokenAfterHead(p, token);
            }
    }
}

function endTagAfterHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.BODY || tn === $.HTML || tn === $.BR) {
        tokenAfterHead(p, token);
    } else if (tn === $.TEMPLATE) {
        endTagInHead(p, token);
    } else {
        p._err(token, ERR.endTagWithoutMatchingOpenElement);
    }
}

function tokenAfterHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    p._insertFakeElement($.BODY);
    p.insertionMode = InsertionMode.IN_BODY;
    modeInBody(p, token);
}

// The "in body" insertion mode
//------------------------------------------------------------------
function modeInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER: {
            characterInBody(p, token);

            break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
            whitespaceCharacterInBody(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInBody(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInBody(p, token);

            break;
        }
        case TokenType.EOF: {
            eofInBody(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function whitespaceCharacterInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken) {
    p._reconstructActiveFormattingElements();
    p._insertCharacters(token);
}

function characterInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken) {
    p._reconstructActiveFormattingElements();
    p._insertCharacters(token);
    p.framesetOk = false;
}

function htmlStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.tmplCount === 0) {
        p.treeAdapter.adoptAttributes(p.openElements.items[0], token.attrs);
    }
}

function bodyStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();

    if (bodyElement && p.openElements.tmplCount === 0) {
        p.framesetOk = false;
        p.treeAdapter.adoptAttributes(bodyElement, token.attrs);
    }
}

function framesetStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();

    if (p.framesetOk && bodyElement) {
        p.treeAdapter.detachNode(bodyElement);
        p.openElements.popAllUpToHtmlElement();
        p._insertElement(token, NS.HTML);
        p.insertionMode = InsertionMode.IN_FRAMESET;
    }
}

function addressStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._insertElement(token, NS.HTML);
}

function numberedHeaderStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    const tn = p.openElements.currentTagName!;

    if (isNumberedHeader(tn)) {
        p.openElements.pop();
    }

    p._insertElement(token, NS.HTML);
}

function preStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._insertElement(token, NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of pre blocks are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.framesetOk = false;
}

function formStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const inTemplate = p.openElements.tmplCount > 0;

    if (!p.formElement || inTemplate) {
        if (p.openElements.hasInButtonScope($.P)) {
            p._closePElement();
        }

        p._insertElement(token, NS.HTML);

        if (!inTemplate) {
            p.formElement = p.openElements.current;
        }
    }
}

function listItemStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p.framesetOk = false;

    const tn = token.tagName;

    for (let i = p.openElements.stackTop; i >= 0; i--) {
        const element = p.openElements.items[i];
        const elementTn = p.treeAdapter.getTagName(element);
        let closeTn = null;

        if (tn === $.LI && elementTn === $.LI) {
            closeTn = $.LI;
        } else if ((tn === $.DD || tn === $.DT) && (elementTn === $.DD || elementTn === $.DT)) {
            closeTn = elementTn;
        }

        if (closeTn) {
            p.openElements.generateImpliedEndTagsWithExclusion(closeTn);
            p.openElements.popUntilTagNamePopped(closeTn);
            break;
        }

        if (elementTn !== $.ADDRESS && elementTn !== $.DIV && elementTn !== $.P && p._isSpecialElement(element)) {
            break;
        }
    }

    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._insertElement(token, NS.HTML);
}

function plaintextStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._insertElement(token, NS.HTML);
    p.tokenizer.state = TokenizerMode.PLAINTEXT;
}

function buttonStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.hasInScope($.BUTTON)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped($.BUTTON);
    }

    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.framesetOk = false;
}

function aStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const activeElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName($.A);

    if (activeElementEntry) {
        callAdoptionAgency(p, token);
        p.openElements.remove(activeElementEntry.element);
        p.activeFormattingElements.removeEntry(activeElementEntry);
    }

    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function bStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function nobrStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._reconstructActiveFormattingElements();

    if (p.openElements.hasInScope($.NOBR)) {
        callAdoptionAgency(p, token);
        p._reconstructActiveFormattingElements();
    }

    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function appletStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.insertMarker();
    p.framesetOk = false;
}

function tableStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.treeAdapter.getDocumentMode(p.document) !== DOCUMENT_MODE.QUIRKS && p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._insertElement(token, NS.HTML);
    p.framesetOk = false;
    p.insertionMode = InsertionMode.IN_TABLE;
}

function areaStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._reconstructActiveFormattingElements();
    p._appendElement(token, NS.HTML);
    p.framesetOk = false;
    token.ackSelfClosing = true;
}

function isHiddenInput(token: TagToken) {
    const inputType = getTokenAttr(token, ATTRS.TYPE);

    return inputType != null && inputType.toLowerCase() === HIDDEN_INPUT_TYPE;
}

function inputStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._reconstructActiveFormattingElements();
    p._appendElement(token, NS.HTML);

    if (!isHiddenInput(token)) {
        p.framesetOk = false;
    }

    token.ackSelfClosing = true;
}

function paramStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._appendElement(token, NS.HTML);
    token.ackSelfClosing = true;
}

function hrStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._appendElement(token, NS.HTML);
    p.framesetOk = false;
    token.ackSelfClosing = true;
}

function imageStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    token.tagName = $.IMG;
    areaStartTagInBody(p, token);
}

function textareaStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._insertElement(token, NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of textarea elements are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.tokenizer.state = TokenizerMode.RCDATA;
    p.originalInsertionMode = p.insertionMode;
    p.framesetOk = false;
    p.insertionMode = InsertionMode.TEXT;
}

function xmpStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._reconstructActiveFormattingElements();
    p.framesetOk = false;
    p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
}

function iframeStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p.framesetOk = false;
    p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
}

//NOTE: here we assume that we always act as an user agent with enabled plugins, so we parse
//<noembed> as a rawtext.
function noembedStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
}

function selectStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.framesetOk = false;

    p.insertionMode =
        p.insertionMode === InsertionMode.IN_TABLE ||
        p.insertionMode === InsertionMode.IN_CAPTION ||
        p.insertionMode === InsertionMode.IN_TABLE_BODY ||
        p.insertionMode === InsertionMode.IN_ROW ||
        p.insertionMode === InsertionMode.IN_CELL
            ? InsertionMode.IN_SELECT_IN_TABLE
            : InsertionMode.IN_SELECT;
}

function optgroupStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.currentTagName === $.OPTION) {
        p.openElements.pop();
    }

    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
}

function rbStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.hasInScope($.RUBY)) {
        p.openElements.generateImpliedEndTags();
    }

    p._insertElement(token, NS.HTML);
}

function rtStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.hasInScope($.RUBY)) {
        p.openElements.generateImpliedEndTagsWithExclusion($.RTC);
    }

    p._insertElement(token, NS.HTML);
}

function mathStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._reconstructActiveFormattingElements();

    foreignContent.adjustTokenMathMLAttrs(token);
    foreignContent.adjustTokenXMLAttrs(token);

    if (token.selfClosing) {
        p._appendElement(token, NS.MATHML);
    } else {
        p._insertElement(token, NS.MATHML);
    }

    token.ackSelfClosing = true;
}

function svgStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._reconstructActiveFormattingElements();

    foreignContent.adjustTokenSVGAttrs(token);
    foreignContent.adjustTokenXMLAttrs(token);

    if (token.selfClosing) {
        p._appendElement(token, NS.SVG);
    } else {
        p._insertElement(token, NS.SVG);
    }

    token.ackSelfClosing = true;
}

function genericStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
}

//OPTIMIZATION: Integer comparisons are low-cost, so we can use very fast tag name length filters here.
//It's faster than using dictionary.
function startTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn.length) {
        case 1:
            switch (tn) {
                case $.I:
                case $.S:
                case $.B:
                case $.U: {
                    bStartTagInBody(p, token);

                    break;
                }
                case $.P: {
                    addressStartTagInBody(p, token);

                    break;
                }
                case $.A: {
                    aStartTagInBody(p, token);

                    break;
                }
                default: {
                    genericStartTagInBody(p, token);
                }
            }

            break;

        case 2:
            if (tn === $.DL || tn === $.OL || tn === $.UL) {
                addressStartTagInBody(p, token);
            } else if (isNumberedHeader(tn)) {
                numberedHeaderStartTagInBody(p, token);
            } else
                switch (tn) {
                    case $.LI:
                    case $.DD:
                    case $.DT: {
                        listItemStartTagInBody(p, token);

                        break;
                    }
                    case $.EM:
                    case $.TT: {
                        bStartTagInBody(p, token);

                        break;
                    }
                    case $.BR: {
                        areaStartTagInBody(p, token);

                        break;
                    }
                    case $.HR: {
                        hrStartTagInBody(p, token);

                        break;
                    }
                    case $.RB: {
                        rbStartTagInBody(p, token);

                        break;
                    }
                    case $.RT:
                    case $.RP: {
                        rtStartTagInBody(p, token);

                        break;
                    }
                    default:
                        if (tn !== $.TH && tn !== $.TD && tn !== $.TR) {
                            genericStartTagInBody(p, token);
                        }
                }

            break;

        case 3:
            switch (tn) {
                case $.DIV:
                case $.DIR:
                case $.NAV: {
                    addressStartTagInBody(p, token);

                    break;
                }
                case $.PRE: {
                    preStartTagInBody(p, token);

                    break;
                }
                case $.BIG: {
                    bStartTagInBody(p, token);

                    break;
                }
                case $.IMG:
                case $.WBR: {
                    areaStartTagInBody(p, token);

                    break;
                }
                case $.XMP: {
                    xmpStartTagInBody(p, token);

                    break;
                }
                case $.SVG: {
                    svgStartTagInBody(p, token);

                    break;
                }
                case $.RTC: {
                    rbStartTagInBody(p, token);

                    break;
                }
                default:
                    if (tn !== $.COL) {
                        genericStartTagInBody(p, token);
                    }
            }

            break;

        case 4:
            switch (tn) {
                case $.HTML: {
                    htmlStartTagInBody(p, token);

                    break;
                }
                case $.BASE:
                case $.LINK:
                case $.META: {
                    startTagInHead(p, token);

                    break;
                }
                case $.BODY: {
                    bodyStartTagInBody(p, token);

                    break;
                }
                case $.MAIN:
                case $.MENU: {
                    addressStartTagInBody(p, token);

                    break;
                }
                case $.FORM: {
                    formStartTagInBody(p, token);

                    break;
                }
                case $.CODE:
                case $.FONT: {
                    bStartTagInBody(p, token);

                    break;
                }
                case $.NOBR: {
                    nobrStartTagInBody(p, token);

                    break;
                }
                case $.AREA: {
                    areaStartTagInBody(p, token);

                    break;
                }
                case $.MATH: {
                    mathStartTagInBody(p, token);

                    break;
                }
                default:
                    if (tn !== $.HEAD) {
                        genericStartTagInBody(p, token);
                    }
            }

            break;

        case 5:
            switch (tn) {
                case $.STYLE:
                case $.TITLE: {
                    startTagInHead(p, token);

                    break;
                }
                case $.ASIDE: {
                    addressStartTagInBody(p, token);

                    break;
                }
                case $.SMALL: {
                    bStartTagInBody(p, token);

                    break;
                }
                case $.TABLE: {
                    tableStartTagInBody(p, token);

                    break;
                }
                case $.EMBED: {
                    areaStartTagInBody(p, token);

                    break;
                }
                case $.INPUT: {
                    inputStartTagInBody(p, token);

                    break;
                }
                case $.PARAM:
                case $.TRACK: {
                    paramStartTagInBody(p, token);

                    break;
                }
                case $.IMAGE: {
                    imageStartTagInBody(p, token);

                    break;
                }
                default:
                    if (tn !== $.FRAME && tn !== $.TBODY && tn !== $.TFOOT && tn !== $.THEAD) {
                        genericStartTagInBody(p, token);
                    }
            }

            break;

        case 6:
            switch (tn) {
                case $.SCRIPT: {
                    startTagInHead(p, token);

                    break;
                }
                case $.CENTER:
                case $.FIGURE:
                case $.FOOTER:
                case $.HEADER:
                case $.HGROUP:
                case $.DIALOG: {
                    addressStartTagInBody(p, token);

                    break;
                }
                case $.BUTTON: {
                    buttonStartTagInBody(p, token);

                    break;
                }
                case $.STRIKE:
                case $.STRONG: {
                    bStartTagInBody(p, token);

                    break;
                }
                case $.APPLET:
                case $.OBJECT: {
                    appletStartTagInBody(p, token);

                    break;
                }
                case $.KEYGEN: {
                    areaStartTagInBody(p, token);

                    break;
                }
                case $.SOURCE: {
                    paramStartTagInBody(p, token);

                    break;
                }
                case $.IFRAME: {
                    iframeStartTagInBody(p, token);

                    break;
                }
                case $.SELECT: {
                    selectStartTagInBody(p, token);

                    break;
                }
                case $.OPTION: {
                    optgroupStartTagInBody(p, token);

                    break;
                }
                default: {
                    genericStartTagInBody(p, token);
                }
            }

            break;

        case 7:
            switch (tn) {
                case $.BGSOUND: {
                    startTagInHead(p, token);

                    break;
                }
                case $.DETAILS:
                case $.ADDRESS:
                case $.ARTICLE:
                case $.SECTION:
                case $.SUMMARY: {
                    addressStartTagInBody(p, token);

                    break;
                }
                case $.LISTING: {
                    preStartTagInBody(p, token);

                    break;
                }
                case $.MARQUEE: {
                    appletStartTagInBody(p, token);

                    break;
                }
                case $.NOEMBED: {
                    noembedStartTagInBody(p, token);

                    break;
                }
                default:
                    if (tn !== $.CAPTION) {
                        genericStartTagInBody(p, token);
                    }
            }

            break;

        case 8:
            switch (tn) {
                case $.BASEFONT: {
                    startTagInHead(p, token);

                    break;
                }
                case $.FRAMESET: {
                    framesetStartTagInBody(p, token);

                    break;
                }
                case $.FIELDSET: {
                    addressStartTagInBody(p, token);

                    break;
                }
                case $.TEXTAREA: {
                    textareaStartTagInBody(p, token);

                    break;
                }
                case $.TEMPLATE: {
                    startTagInHead(p, token);

                    break;
                }
                case $.NOSCRIPT: {
                    if (p.options.scriptingEnabled) {
                        noembedStartTagInBody(p, token);
                    } else {
                        genericStartTagInBody(p, token);
                    }

                    break;
                }
                case $.OPTGROUP: {
                    optgroupStartTagInBody(p, token);

                    break;
                }
                default:
                    if (tn !== $.COLGROUP) {
                        genericStartTagInBody(p, token);
                    }
            }

            break;

        case 9:
            if (tn === $.PLAINTEXT) {
                plaintextStartTagInBody(p, token);
            } else {
                genericStartTagInBody(p, token);
            }

            break;

        case 10:
            if (tn === $.BLOCKQUOTE || tn === $.FIGCAPTION) {
                addressStartTagInBody(p, token);
            } else {
                genericStartTagInBody(p, token);
            }

            break;

        default:
            genericStartTagInBody(p, token);
    }
}

function bodyEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>) {
    if (p.openElements.hasInScope($.BODY)) {
        p.insertionMode = InsertionMode.AFTER_BODY;
    }
}

function htmlEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.hasInScope($.BODY)) {
        p.insertionMode = InsertionMode.AFTER_BODY;
        modeAfterBody(p, token);
    }
}

function addressEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
    }
}

function formEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>) {
    const inTemplate = p.openElements.tmplCount > 0;
    const { formElement } = p;

    if (!inTemplate) {
        p.formElement = null;
    }

    if ((formElement || inTemplate) && p.openElements.hasInScope($.FORM)) {
        p.openElements.generateImpliedEndTags();

        if (inTemplate) {
            p.openElements.popUntilTagNamePopped($.FORM);
        } else {
            p.openElements.remove(formElement!);
        }
    }
}

function pEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>) {
    if (!p.openElements.hasInButtonScope($.P)) {
        p._insertFakeElement($.P);
    }

    p._closePElement();
}

function liEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>) {
    if (p.openElements.hasInListItemScope($.LI)) {
        p.openElements.generateImpliedEndTagsWithExclusion($.LI);
        p.openElements.popUntilTagNamePopped($.LI);
    }
}

function ddEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTagsWithExclusion(tn);
        p.openElements.popUntilTagNamePopped(tn);
    }
}

function numberedHeaderEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>) {
    if (p.openElements.hasNumberedHeaderInScope()) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilNumberedHeaderPopped();
    }
}

function appletEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
        p.activeFormattingElements.clearToLastMarker();
    }
}

function brEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>) {
    p._reconstructActiveFormattingElements();
    p._insertFakeElement($.BR);
    p.openElements.pop();
    p.framesetOk = false;
}

function genericEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    for (let i = p.openElements.stackTop; i > 0; i--) {
        const element = p.openElements.items[i];

        if (p.treeAdapter.getTagName(element) === tn) {
            p.openElements.generateImpliedEndTagsWithExclusion(tn);
            if (p.openElements.stackTop >= i) p.openElements.shortenToLength(i);
            break;
        }

        if (p._isSpecialElement(element)) {
            break;
        }
    }
}

//OPTIMIZATION: Integer comparisons are low-cost, so we can use very fast tag name length filters here.
//It's faster than using dictionary.
function endTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn.length) {
        case 1:
            if (tn === $.A || tn === $.B || tn === $.I || tn === $.S || tn === $.U) {
                callAdoptionAgency(p, token);
            } else if (tn === $.P) {
                pEndTagInBody(p);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 2:
            switch (tn) {
                case $.DL:
                case $.UL:
                case $.OL: {
                    addressEndTagInBody(p, token);

                    break;
                }
                case $.LI: {
                    liEndTagInBody(p);

                    break;
                }
                case $.DD:
                case $.DT: {
                    ddEndTagInBody(p, token);

                    break;
                }
                default:
                    if (isNumberedHeader(tn)) {
                        numberedHeaderEndTagInBody(p);
                    } else if (tn === $.BR) {
                        brEndTagInBody(p);
                    } else if (tn === $.EM || tn === $.TT) {
                        callAdoptionAgency(p, token);
                    } else {
                        genericEndTagInBody(p, token);
                    }
            }

            break;

        case 3:
            if (tn === $.BIG) {
                callAdoptionAgency(p, token);
            } else if (tn === $.DIR || tn === $.DIV || tn === $.NAV || tn === $.PRE) {
                addressEndTagInBody(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 4:
            switch (tn) {
                case $.BODY: {
                    bodyEndTagInBody(p);

                    break;
                }
                case $.HTML: {
                    htmlEndTagInBody(p, token);

                    break;
                }
                case $.FORM: {
                    formEndTagInBody(p);

                    break;
                }
                case $.CODE:
                case $.FONT:
                case $.NOBR: {
                    callAdoptionAgency(p, token);

                    break;
                }
                case $.MAIN:
                case $.MENU: {
                    addressEndTagInBody(p, token);

                    break;
                }
                default: {
                    genericEndTagInBody(p, token);
                }
            }

            break;

        case 5:
            if (tn === $.ASIDE) {
                addressEndTagInBody(p, token);
            } else if (tn === $.SMALL) {
                callAdoptionAgency(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 6:
            switch (tn) {
                case $.CENTER:
                case $.FIGURE:
                case $.FOOTER:
                case $.HEADER:
                case $.HGROUP:
                case $.DIALOG: {
                    addressEndTagInBody(p, token);

                    break;
                }
                case $.APPLET:
                case $.OBJECT: {
                    appletEndTagInBody(p, token);

                    break;
                }
                case $.STRIKE:
                case $.STRONG: {
                    callAdoptionAgency(p, token);

                    break;
                }
                default: {
                    genericEndTagInBody(p, token);
                }
            }

            break;

        case 7:
            if (
                tn === $.ADDRESS ||
                tn === $.ARTICLE ||
                tn === $.DETAILS ||
                tn === $.SECTION ||
                tn === $.SUMMARY ||
                tn === $.LISTING
            ) {
                addressEndTagInBody(p, token);
            } else if (tn === $.MARQUEE) {
                appletEndTagInBody(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 8:
            if (tn === $.FIELDSET) {
                addressEndTagInBody(p, token);
            } else if (tn === $.TEMPLATE) {
                endTagInHead(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 10:
            if (tn === $.BLOCKQUOTE || tn === $.FIGCAPTION) {
                addressEndTagInBody(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        default:
            genericEndTagInBody(p, token);
    }
}

function eofInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    if (p.tmplInsertionModeStack.length > 0) {
        eofInTemplate(p, token);
    } else {
        p.stopped = true;
    }
}

// The "text" insertion mode
//------------------------------------------------------------------
function modeText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER:
        case TokenType.WHITESPACE_CHARACTER: {
            p._insertCharacters(token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInText(p, token);

            break;
        }
        case TokenType.EOF: {
            eofInText(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function endTagInText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (token.tagName === $.SCRIPT) {
        p.pendingScript = p.openElements.current;
    }

    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
}

function eofInText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    p._err(token, ERR.eofInElementThatCanContainOnlyText);
    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
    p._processToken(token);
}

// The "in table" insertion mode
//------------------------------------------------------------------
function modeInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER:
        case TokenType.WHITESPACE_CHARACTER: {
            characterInTable(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInTable(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInTable(p, token);

            break;
        }
        case TokenType.EOF: {
            eofInBody(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function characterInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken) {
    const curTn = p.openElements.currentTagName!;

    if (TABLE_STRUCTURE_TAGS.has(curTn)) {
        p.pendingCharacterTokens = [];
        p.hasNonWhitespacePendingCharacterToken = false;
        p.originalInsertionMode = p.insertionMode;
        p.insertionMode = InsertionMode.IN_TABLE_TEXT;
        modeInTableText(p, token);
    } else {
        tokenInTable(p, token);
    }
}

function captionStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p.openElements.clearBackToTableContext();
    p.activeFormattingElements.insertMarker();
    p._insertElement(token, NS.HTML);
    p.insertionMode = InsertionMode.IN_CAPTION;
}

function colgroupStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p.openElements.clearBackToTableContext();
    p._insertElement(token, NS.HTML);
    p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
}

function colStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p.openElements.clearBackToTableContext();
    p._insertFakeElement($.COLGROUP);
    p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
    modeInColumnGroup(p, token);
}

function tbodyStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p.openElements.clearBackToTableContext();
    p._insertElement(token, NS.HTML);
    p.insertionMode = InsertionMode.IN_TABLE_BODY;
}

function tdStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    p.openElements.clearBackToTableContext();
    p._insertFakeElement($.TBODY);
    p.insertionMode = InsertionMode.IN_TABLE_BODY;
    modeInTableBody(p, token);
}

function tableStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (p.openElements.hasInTableScope($.TABLE)) {
        p.openElements.popUntilTagNamePopped($.TABLE);
        p._resetInsertionMode();
        p._processToken(token);
    }
}

function inputStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (isHiddenInput(token)) {
        p._appendElement(token, NS.HTML);
    } else {
        tokenInTable(p, token);
    }

    token.ackSelfClosing = true;
}

function formStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (!p.formElement && p.openElements.tmplCount === 0) {
        p._insertElement(token, NS.HTML);
        p.formElement = p.openElements.current;
        p.openElements.pop();
    }
}

function startTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn.length) {
        case 2:
            if (tn === $.TD || tn === $.TH || tn === $.TR) {
                tdStartTagInTable(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        case 3:
            if (tn === $.COL) {
                colStartTagInTable(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        case 4:
            if (tn === $.FORM) {
                formStartTagInTable(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        case 5:
            switch (tn) {
                case $.TABLE: {
                    tableStartTagInTable(p, token);

                    break;
                }
                case $.STYLE: {
                    startTagInHead(p, token);

                    break;
                }
                case $.TBODY:
                case $.TFOOT:
                case $.THEAD: {
                    tbodyStartTagInTable(p, token);

                    break;
                }
                case $.INPUT: {
                    inputStartTagInTable(p, token);

                    break;
                }
                default: {
                    tokenInTable(p, token);
                }
            }

            break;

        case 6:
            if (tn === $.SCRIPT) {
                startTagInHead(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        case 7:
            if (tn === $.CAPTION) {
                captionStartTagInTable(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        case 8:
            if (tn === $.COLGROUP) {
                colgroupStartTagInTable(p, token);
            } else if (tn === $.TEMPLATE) {
                startTagInHead(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        default:
            tokenInTable(p, token);
    }
}

function endTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.TABLE) {
        if (p.openElements.hasInTableScope($.TABLE)) {
            p.openElements.popUntilTagNamePopped($.TABLE);
            p._resetInsertionMode();
        }
    } else if (tn === $.TEMPLATE) {
        endTagInHead(p, token);
    } else if (
        tn !== $.BODY &&
        tn !== $.CAPTION &&
        tn !== $.COL &&
        tn !== $.COLGROUP &&
        tn !== $.HTML &&
        tn !== $.TBODY &&
        tn !== $.TD &&
        tn !== $.TFOOT &&
        tn !== $.TH &&
        tn !== $.THEAD &&
        tn !== $.TR
    ) {
        tokenInTable(p, token);
    }
}

function tokenInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    const savedFosterParentingState = p.fosterParentingEnabled;

    p.fosterParentingEnabled = true;
    // Process token in `In Body` mode
    modeInBody(p, token);
    p.fosterParentingEnabled = savedFosterParentingState;
}

// The "in table text" insertion mode
//------------------------------------------------------------------
function modeInTableText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    if (token.type === TokenType.CHARACTER) {
        characterInTableText(p, token);
    } else if (token.type === TokenType.WHITESPACE_CHARACTER) {
        whitespaceCharacterInTableText(p, token);
    } else if (token.type !== TokenType.NULL_CHARACTER) {
        tokenInTableText(p, token);
    }
}

function whitespaceCharacterInTableText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken) {
    p.pendingCharacterTokens.push(token);
}

function characterInTableText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken) {
    p.pendingCharacterTokens.push(token);
    p.hasNonWhitespacePendingCharacterToken = true;
}

function tokenInTableText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    let i = 0;

    if (p.hasNonWhitespacePendingCharacterToken) {
        for (; i < p.pendingCharacterTokens.length; i++) {
            tokenInTable(p, p.pendingCharacterTokens[i]);
        }
    } else {
        for (; i < p.pendingCharacterTokens.length; i++) {
            p._insertCharacters(p.pendingCharacterTokens[i]);
        }
    }

    p.insertionMode = p.originalInsertionMode;
    p._processToken(token);
}

// The "in caption" insertion mode
//------------------------------------------------------------------
function modeInCaption<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER: {
            characterInBody(p, token);

            break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
            whitespaceCharacterInBody(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInCaption(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInCaption(p, token);

            break;
        }
        case TokenType.EOF: {
            eofInBody(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

const TABLE_VOID_ELEMENTS = new Set<string>([
    $.CAPTION,
    $.COL,
    $.COLGROUP,
    $.TBODY,
    $.TD,
    $.TFOOT,
    $.TH,
    $.THEAD,
    $.TR,
]);

function startTagInCaption<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (TABLE_VOID_ELEMENTS.has(tn)) {
        if (p.openElements.hasInTableScope($.CAPTION)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped($.CAPTION);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = InsertionMode.IN_TABLE;
            modeInTable(p, token);
        }
    } else {
        startTagInBody(p, token);
    }
}

function endTagInCaption<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.CAPTION || tn === $.TABLE) {
        if (p.openElements.hasInTableScope($.CAPTION)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped($.CAPTION);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = InsertionMode.IN_TABLE;

            if (tn === $.TABLE) {
                modeInTable(p, token);
            }
        }
    } else if (
        tn !== $.BODY &&
        tn !== $.COL &&
        tn !== $.COLGROUP &&
        tn !== $.HTML &&
        tn !== $.TBODY &&
        tn !== $.TD &&
        tn !== $.TFOOT &&
        tn !== $.TH &&
        tn !== $.THEAD &&
        tn !== $.TR
    ) {
        endTagInBody(p, token);
    }
}

// The "in column group" insertion mode
//------------------------------------------------------------------
function modeInColumnGroup<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER: {
            tokenInColumnGroup(p, token);

            break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
            p._insertCharacters(token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInColumnGroup(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInColumnGroup(p, token);

            break;
        }
        case TokenType.EOF: {
            eofInBody(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagInColumnGroup<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn) {
        case $.HTML: {
            startTagInBody(p, token);

            break;
        }
        case $.COL: {
            p._appendElement(token, NS.HTML);
            token.ackSelfClosing = true;

            break;
        }
        case $.TEMPLATE: {
            startTagInHead(p, token);

            break;
        }
        default: {
            tokenInColumnGroup(p, token);
        }
    }
}

function endTagInColumnGroup<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.COLGROUP) {
        if (p.openElements.currentTagName === $.COLGROUP) {
            p.openElements.pop();
            p.insertionMode = InsertionMode.IN_TABLE;
        }
    } else if (tn === $.TEMPLATE) {
        endTagInHead(p, token);
    } else if (tn !== $.COL) {
        tokenInColumnGroup(p, token);
    }
}

function tokenInColumnGroup<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    if (p.openElements.currentTagName === $.COLGROUP) {
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_TABLE;
        modeInTable(p, token);
    }
}

// The "in table body" insertion mode
//------------------------------------------------------------------
function modeInTableBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER:
        case TokenType.WHITESPACE_CHARACTER: {
            characterInTable(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInTableBody(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInTableBody(p, token);

            break;
        }
        case TokenType.EOF: {
            eofInBody(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagInTableBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn) {
        case $.TR: {
            p.openElements.clearBackToTableBodyContext();
            p._insertElement(token, NS.HTML);
            p.insertionMode = InsertionMode.IN_ROW;

            break;
        }
        case $.TH:
        case $.TD: {
            p.openElements.clearBackToTableBodyContext();
            p._insertFakeElement($.TR);
            p.insertionMode = InsertionMode.IN_ROW;
            modeInRow(p, token);

            break;
        }
        case $.CAPTION:
        case $.COL:
        case $.COLGROUP:
        case $.TBODY:
        case $.TFOOT:
        case $.THEAD: {
            if (p.openElements.hasTableBodyContextInTableScope()) {
                p.openElements.clearBackToTableBodyContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE;
                modeInTable(p, token);
            }

            break;
        }
        default: {
            startTagInTable(p, token);
        }
    }
}

function endTagInTableBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.clearBackToTableBodyContext();
            p.openElements.pop();
            p.insertionMode = InsertionMode.IN_TABLE;
        }
    } else if (tn === $.TABLE) {
        if (p.openElements.hasTableBodyContextInTableScope()) {
            p.openElements.clearBackToTableBodyContext();
            p.openElements.pop();
            p.insertionMode = InsertionMode.IN_TABLE;
            modeInTable(p, token);
        }
    } else if (
        tn !== $.BODY &&
        tn !== $.CAPTION &&
        tn !== $.COL &&
        tn !== $.COLGROUP &&
        tn !== $.HTML &&
        tn !== $.TD &&
        tn !== $.TH &&
        tn !== $.TR
    ) {
        endTagInTable(p, token);
    }
}

// The "in row" insertion mode
//------------------------------------------------------------------
function modeInRow<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER:
        case TokenType.WHITESPACE_CHARACTER: {
            characterInTable(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInRow(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInRow(p, token);

            break;
        }
        case TokenType.EOF: {
            eofInBody(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagInRow<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.TH || tn === $.TD) {
        p.openElements.clearBackToTableRowContext();
        p._insertElement(token, NS.HTML);
        p.insertionMode = InsertionMode.IN_CELL;
        p.activeFormattingElements.insertMarker();
    } else if (
        tn === $.CAPTION ||
        tn === $.COL ||
        tn === $.COLGROUP ||
        tn === $.TBODY ||
        tn === $.TFOOT ||
        tn === $.THEAD ||
        tn === $.TR
    ) {
        if (p.openElements.hasInTableScope($.TR)) {
            p.openElements.clearBackToTableRowContext();
            p.openElements.pop();
            p.insertionMode = InsertionMode.IN_TABLE_BODY;
            modeInTableBody(p, token);
        }
    } else {
        startTagInTable(p, token);
    }
}

function endTagInRow<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn) {
        case $.TR: {
            if (p.openElements.hasInTableScope($.TR)) {
                p.openElements.clearBackToTableRowContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
            }

            break;
        }
        case $.TABLE: {
            if (p.openElements.hasInTableScope($.TR)) {
                p.openElements.clearBackToTableRowContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
                modeInTableBody(p, token);
            }

            break;
        }
        case $.TBODY:
        case $.TFOOT:
        case $.THEAD: {
            if (p.openElements.hasInTableScope(tn) || p.openElements.hasInTableScope($.TR)) {
                p.openElements.clearBackToTableRowContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
                modeInTableBody(p, token);
            }

            break;
        }
        default:
            if (
                tn !== $.BODY &&
                tn !== $.CAPTION &&
                tn !== $.COL &&
                tn !== $.COLGROUP &&
                tn !== $.HTML &&
                tn !== $.TD &&
                tn !== $.TH
            ) {
                endTagInTable(p, token);
            }
    }
}

// The "in cell" insertion mode
//------------------------------------------------------------------
function modeInCell<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER: {
            characterInBody(p, token);

            break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
            whitespaceCharacterInBody(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInCell(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInCell(p, token);

            break;
        }
        case TokenType.EOF: {
            eofInBody(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagInCell<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (TABLE_VOID_ELEMENTS.has(tn)) {
        if (p.openElements.hasInTableScope($.TD) || p.openElements.hasInTableScope($.TH)) {
            p._closeTableCell();
            p._processToken(token);
        }
    } else {
        startTagInBody(p, token);
    }
}

function endTagInCell<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.TD || tn === $.TH) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped(tn);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = InsertionMode.IN_ROW;
        }
    } else if (TABLE_STRUCTURE_TAGS.has(tn)) {
        if (p.openElements.hasInTableScope(tn)) {
            p._closeTableCell();
            p._processToken(token);
        }
    } else if (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP && tn !== $.HTML) {
        endTagInBody(p, token);
    }
}

// The "in select" insertion mode
//------------------------------------------------------------------
function modeInSelect<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.WHITESPACE_CHARACTER: {
            p._insertCharacters(token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInSelect(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInSelect(p, token);

            break;
        }
        case TokenType.EOF: {
            eofInBody(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagInSelect<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn) {
        case $.HTML: {
            startTagInBody(p, token);

            break;
        }
        case $.OPTION: {
            if (p.openElements.currentTagName === $.OPTION) {
                p.openElements.pop();
            }

            p._insertElement(token, NS.HTML);

            break;
        }
        case $.OPTGROUP: {
            if (p.openElements.currentTagName === $.OPTION) {
                p.openElements.pop();
            }

            if (p.openElements.currentTagName === $.OPTGROUP) {
                p.openElements.pop();
            }

            p._insertElement(token, NS.HTML);

            break;
        }
        case $.INPUT:
        case $.KEYGEN:
        case $.TEXTAREA:
        case $.SELECT: {
            if (p.openElements.hasInSelectScope($.SELECT)) {
                p.openElements.popUntilTagNamePopped($.SELECT);
                p._resetInsertionMode();

                if (tn !== $.SELECT) {
                    p._processToken(token);
                }
            }

            break;
        }
        case $.SCRIPT:
        case $.TEMPLATE: {
            startTagInHead(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function endTagInSelect<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.OPTGROUP) {
        const prevOpenElement = p.openElements.items[p.openElements.stackTop - 1];
        const prevOpenElementTn = prevOpenElement && p.treeAdapter.getTagName(prevOpenElement);

        if (p.openElements.currentTagName === $.OPTION && prevOpenElementTn === $.OPTGROUP) {
            p.openElements.pop();
        }

        if (p.openElements.currentTagName === $.OPTGROUP) {
            p.openElements.pop();
        }
    } else if (tn === $.OPTION) {
        if (p.openElements.currentTagName === $.OPTION) {
            p.openElements.pop();
        }
    } else if (tn === $.SELECT && p.openElements.hasInSelectScope($.SELECT)) {
        p.openElements.popUntilTagNamePopped($.SELECT);
        p._resetInsertionMode();
    } else if (tn === $.TEMPLATE) {
        endTagInHead(p, token);
    }
}

// The "in select in table" insertion mode
//------------------------------------------------------------------
function modeInSelectInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.WHITESPACE_CHARACTER: {
            p._insertCharacters(token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInSelectInTable(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInSelectInTable(p, token);

            break;
        }
        case TokenType.EOF: {
            eofInBody(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagInSelectInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (
        tn === $.CAPTION ||
        tn === $.TABLE ||
        tn === $.TBODY ||
        tn === $.TFOOT ||
        tn === $.THEAD ||
        tn === $.TR ||
        tn === $.TD ||
        tn === $.TH
    ) {
        p.openElements.popUntilTagNamePopped($.SELECT);
        p._resetInsertionMode();
        p._processToken(token);
    } else {
        startTagInSelect(p, token);
    }
}

function endTagInSelectInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (
        tn === $.CAPTION ||
        tn === $.TABLE ||
        tn === $.TBODY ||
        tn === $.TFOOT ||
        tn === $.THEAD ||
        tn === $.TR ||
        tn === $.TD ||
        tn === $.TH
    ) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.popUntilTagNamePopped($.SELECT);
            p._resetInsertionMode();
            p._processToken(token);
        }
    } else {
        endTagInSelect(p, token);
    }
}

// The "in template" insertion mode
//------------------------------------------------------------------
function modeInTemplate<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER: {
            characterInBody(p, token);

            break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
            whitespaceCharacterInBody(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInTemplate(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInTemplate(p, token);

            break;
        }
        case TokenType.EOF: {
            eofInTemplate(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

const TEMPLATE_START_TAGS = new Set<string>([
    $.BASE,
    $.BASEFONT,
    $.BGSOUND,
    $.LINK,
    $.META,
    $.NOFRAMES,
    $.SCRIPT,
    $.STYLE,
    $.TEMPLATE,
    $.TITLE,
]);

function startTagInTemplate<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (TEMPLATE_START_TAGS.has(tn)) {
        startTagInHead(p, token);
    } else {
        const newInsertionMode = TEMPLATE_INSERTION_MODE_SWITCH_MAP.get(tn) ?? InsertionMode.IN_BODY;

        p.tmplInsertionModeStack[0] = newInsertionMode;
        p.insertionMode = newInsertionMode;
        p._processToken(token);
    }
}

function endTagInTemplate<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (token.tagName === $.TEMPLATE) {
        endTagInHead(p, token);
    }
}

function eofInTemplate<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    if (p.openElements.tmplCount > 0) {
        p.openElements.popUntilTagNamePopped($.TEMPLATE);
        p.activeFormattingElements.clearToLastMarker();
        p.tmplInsertionModeStack.shift();
        p._resetInsertionMode();
        p._processToken(token);
    } else {
        p.stopped = true;
    }
}

// The "after body" insertion mode
//------------------------------------------------------------------
function modeAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER: {
            tokenAfterBody(p, token);

            break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
            whitespaceCharacterInBody(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendCommentToRootHtmlElement(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagAfterBody(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagAfterBody(p, token);

            break;
        }
        case TokenType.EOF: {
            stopParsing(p);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (token.tagName === $.HTML) {
        startTagInBody(p, token);
    } else {
        tokenAfterBody(p, token);
    }
}

function endTagAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (token.tagName === $.HTML) {
        if (!p.fragmentContext) {
            p.insertionMode = InsertionMode.AFTER_AFTER_BODY;
        }
    } else {
        tokenAfterBody(p, token);
    }
}

function tokenAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    p.insertionMode = InsertionMode.IN_BODY;
    modeInBody(p, token);
}

// The "in frameset" insertion mode
//------------------------------------------------------------------
function modeInFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.WHITESPACE_CHARACTER: {
            p._insertCharacters(token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagInFrameset(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagInFrameset(p, token);

            break;
        }
        case TokenType.EOF: {
            stopParsing(p);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagInFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    switch (tn) {
        case $.HTML: {
            startTagInBody(p, token);

            break;
        }
        case $.FRAMESET: {
            p._insertElement(token, NS.HTML);

            break;
        }
        case $.FRAME: {
            p._appendElement(token, NS.HTML);
            token.ackSelfClosing = true;

            break;
        }
        case $.NOFRAMES: {
            startTagInHead(p, token);

            break;
        }
        default:
        // Do nothing
    }
}

function endTagInFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (token.tagName === $.FRAMESET && !p.openElements.isRootHtmlElementCurrent()) {
        p.openElements.pop();

        if (!p.fragmentContext && p.openElements.currentTagName !== $.FRAMESET) {
            p.insertionMode = InsertionMode.AFTER_FRAMESET;
        }
    }
}

// The "after frameset" insertion mode
//------------------------------------------------------------------
function modeAfterFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.WHITESPACE_CHARACTER: {
            p._insertCharacters(token);

            break;
        }
        case TokenType.COMMENT: {
            appendComment(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagAfterFrameset(p, token);

            break;
        }
        case TokenType.END_TAG: {
            endTagAfterFrameset(p, token);

            break;
        }
        case TokenType.EOF: {
            stopParsing(p);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagAfterFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.NOFRAMES) {
        startTagInHead(p, token);
    }
}

function endTagAfterFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (token.tagName === $.HTML) {
        p.insertionMode = InsertionMode.AFTER_AFTER_FRAMESET;
    }
}

// The "after after body" insertion mode
//------------------------------------------------------------------
function modeAfterAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER:
        case TokenType.END_TAG: {
            tokenAfterAfterBody(p, token);

            break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
            whitespaceCharacterInBody(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendCommentToDocument(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagAfterAfterBody(p, token);

            break;
        }
        case TokenType.EOF: {
            stopParsing(p);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagAfterAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (token.tagName === $.HTML) {
        startTagInBody(p, token);
    } else {
        tokenAfterAfterBody(p, token);
    }
}

function tokenAfterAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    p.insertionMode = InsertionMode.IN_BODY;
    modeInBody(p, token);
}

// The "after after frameset" insertion mode
//------------------------------------------------------------------
function modeAfterAfterFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token) {
    switch (token.type) {
        case TokenType.WHITESPACE_CHARACTER: {
            whitespaceCharacterInBody(p, token);

            break;
        }
        case TokenType.COMMENT: {
            appendCommentToDocument(p, token);

            break;
        }
        case TokenType.START_TAG: {
            startTagAfterAfterFrameset(p, token);

            break;
        }
        case TokenType.EOF: {
            stopParsing(p);

            break;
        }
        default:
        // Do nothing
    }
}

function startTagAfterAfterFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.NOFRAMES) {
        startTagInHead(p, token);
    }
}

// The rules for parsing tokens in foreign content
//------------------------------------------------------------------
function nullCharacterInForeignContent<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken) {
    token.chars = unicode.REPLACEMENT_CHARACTER;
    p._insertCharacters(token);
}

function characterInForeignContent<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken) {
    p._insertCharacters(token);
    p.framesetOk = false;
}

function startTagInForeignContent<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    if (foreignContent.causesExit(token) && !p.fragmentContext) {
        while (
            p.treeAdapter.getNamespaceURI(p.openElements.current) !== NS.HTML &&
            !p._isIntegrationPoint(p.openElements.current)
        ) {
            p.openElements.pop();
        }

        p._processToken(token);
    } else {
        const current = p._getAdjustedCurrentElement();
        const currentNs = p.treeAdapter.getNamespaceURI(current);

        if (currentNs === NS.MATHML) {
            foreignContent.adjustTokenMathMLAttrs(token);
        } else if (currentNs === NS.SVG) {
            foreignContent.adjustTokenSVGTagName(token);
            foreignContent.adjustTokenSVGAttrs(token);
        }

        foreignContent.adjustTokenXMLAttrs(token);

        if (token.selfClosing) {
            p._appendElement(token, currentNs);
        } else {
            p._insertElement(token, currentNs);
        }

        token.ackSelfClosing = true;
    }
}

function endTagInForeignContent<T extends TreeAdapterTypeMap>(p: Parser<T>, token: TagToken) {
    for (let i = p.openElements.stackTop; i > 0; i--) {
        const element = p.openElements.items[i];

        if (p.treeAdapter.getNamespaceURI(element) === NS.HTML) {
            p._processToken(token);
            break;
        }

        if (p.treeAdapter.getTagName(element).toLowerCase() === token.tagName) {
            p.openElements.shortenToLength(i);
            break;
        }
    }
}
