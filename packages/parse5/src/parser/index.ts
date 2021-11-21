import {
    Tokenizer,
    Token,
    State,
    DocTypeToken,
    StartTagToken,
    EOFToken,
    EndTagToken,
    CommentToken,
    CharacterToken,
    MODE as tokenizerMode,
    CHARACTER_TOKEN,
    NULL_CHARACTER_TOKEN,
    WHITESPACE_CHARACTER_TOKEN,
    COMMENT_TOKEN,
    DOCTYPE_TOKEN,
    START_TAG_TOKEN,
    END_TAG_TOKEN,
    EOF_TOKEN,
    HIBERNATION_TOKEN,
} from '../tokenizer/index.js';
import { OpenElementStack } from './open-element-stack.js';
import {
    FormattingElementList,
    FormattingElementEntry,
    MARKER_ENTRY as FORMATTING_MARKER_ENTRY,
    ELEMENT_ENTRY as FORMATTING_ELEMENT_ENTRY,
} from './formatting-element-list.js';
import { LocationInfoParserMixin } from '../extensions/location-info/parser-mixin.js';
import { ErrorReportingParserMixin } from '../extensions/error-reporting/parser-mixin.js';
import { install as installMixin } from '../utils/Mixin.js';
import { defaultTreeAdapter, DefaultAdapterMap } from '../tree-adapters/default.js';
import { TreeAdapter, TreeAdapterTypeMap } from '../treeAdapter.js';
import * as doctype from '../common/doctype.js';
import * as foreignContent from '../common/foreign-content.js';
import { ERR } from '../common/error-codes.js';
import * as unicode from '../common/unicode.js';
import * as HTML from '../common/html.js';

export interface ParserOptions<T extends TreeAdapterTypeMap> {
    treeAdapter: TreeAdapter<T>;
    sourceCodeLocationInfo: boolean;
    onParseError?: (err: unknown) => void;
    scriptingEnabled: boolean;
}

//Aliases
const $ = HTML.TAG_NAMES;
const NS = HTML.NAMESPACES;
const ATTRS = HTML.ATTRS;

const DEFAULT_OPTIONS: ParserOptions<DefaultAdapterMap> = {
    scriptingEnabled: true,
    sourceCodeLocationInfo: false,
    treeAdapter: defaultTreeAdapter,
};

//Misc constants
const HIDDEN_INPUT_TYPE = 'hidden';

//Adoption agency loops iteration count
const AA_OUTER_LOOP_ITER = 8;
const AA_INNER_LOOP_ITER = 3;

//Insertion modes
const INSERTION_MODES = {
    INITIAL_MODE: 'INITIAL_MODE',
    BEFORE_HTML_MODE: 'BEFORE_HTML_MODE',
    BEFORE_HEAD_MODE: 'BEFORE_HEAD_MODE',
    IN_HEAD_MODE: 'IN_HEAD_MODE',
    IN_HEAD_NO_SCRIPT_MODE: 'IN_HEAD_NO_SCRIPT_MODE',
    AFTER_HEAD_MODE: 'AFTER_HEAD_MODE',
    IN_BODY_MODE: 'IN_BODY_MODE',
    TEXT_MODE: 'TEXT_MODE',
    IN_TABLE_MODE: 'IN_TABLE_MODE',
    IN_TABLE_TEXT_MODE: 'IN_TABLE_TEXT_MODE',
    IN_CAPTION_MODE: 'IN_CAPTION_MODE',
    IN_COLUMN_GROUP_MODE: 'IN_COLUMN_GROUP_MODE',
    IN_TABLE_BODY_MODE: 'IN_TABLE_BODY_MODE',
    IN_ROW_MODE: 'IN_ROW_MODE',
    IN_CELL_MODE: 'IN_CELL_MODE',
    IN_SELECT_MODE: 'IN_SELECT_MODE',
    IN_SELECT_IN_TABLE_MODE: 'IN_SELECT_IN_TABLE_MODE',
    IN_TEMPLATE_MODE: 'IN_TEMPLATE_MODE',
    AFTER_BODY_MODE: 'AFTER_BODY_MODE',
    IN_FRAMESET_MODE: 'IN_FRAMESET_MODE',
    AFTER_FRAMESET_MODE: 'AFTER_FRAMESET_MODE',
    AFTER_AFTER_BODY_MODE: 'AFTER_AFTER_BODY_MODE',
    AFTER_AFTER_FRAMESET_MODE: 'AFTER_AFTER_FRAMESET_MODE',
} as const;

type InsertionMode = keyof typeof INSERTION_MODES;

//Insertion mode reset map
const INSERTION_MODE_RESET_MAP: Record<string, InsertionMode> = {
    [$.TR]: INSERTION_MODES.IN_ROW_MODE,
    [$.TBODY]: INSERTION_MODES.IN_TABLE_BODY_MODE,
    [$.THEAD]: INSERTION_MODES.IN_TABLE_BODY_MODE,
    [$.TFOOT]: INSERTION_MODES.IN_TABLE_BODY_MODE,
    [$.CAPTION]: INSERTION_MODES.IN_CAPTION_MODE,
    [$.COLGROUP]: INSERTION_MODES.IN_COLUMN_GROUP_MODE,
    [$.TABLE]: INSERTION_MODES.IN_TABLE_MODE,
    [$.BODY]: INSERTION_MODES.IN_BODY_MODE,
    [$.FRAMESET]: INSERTION_MODES.IN_FRAMESET_MODE,
};

//Template insertion mode switch map
const TEMPLATE_INSERTION_MODE_SWITCH_MAP: Record<string, InsertionMode> = {
    [$.CAPTION]: INSERTION_MODES.IN_TABLE_MODE,
    [$.COLGROUP]: INSERTION_MODES.IN_TABLE_MODE,
    [$.TBODY]: INSERTION_MODES.IN_TABLE_MODE,
    [$.TFOOT]: INSERTION_MODES.IN_TABLE_MODE,
    [$.THEAD]: INSERTION_MODES.IN_TABLE_MODE,
    [$.COL]: INSERTION_MODES.IN_COLUMN_GROUP_MODE,
    [$.TR]: INSERTION_MODES.IN_TABLE_BODY_MODE,
    [$.TD]: INSERTION_MODES.IN_ROW_MODE,
    [$.TH]: INSERTION_MODES.IN_ROW_MODE,
};

//Token handlers map for insertion modes
// TODO (43081j): remove this `any[]` type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOKEN_HANDLERS: Record<InsertionMode, Record<Token['type'], ((...args: any[]) => void) | null>> = {
    [INSERTION_MODES.INITIAL_MODE]: {
        [CHARACTER_TOKEN]: tokenInInitialMode,
        [NULL_CHARACTER_TOKEN]: tokenInInitialMode,
        [WHITESPACE_CHARACTER_TOKEN]: ignoreToken,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: doctypeInInitialMode,
        [START_TAG_TOKEN]: tokenInInitialMode,
        [END_TAG_TOKEN]: tokenInInitialMode,
        [EOF_TOKEN]: tokenInInitialMode,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.BEFORE_HTML_MODE]: {
        [CHARACTER_TOKEN]: tokenBeforeHtml,
        [NULL_CHARACTER_TOKEN]: tokenBeforeHtml,
        [WHITESPACE_CHARACTER_TOKEN]: ignoreToken,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagBeforeHtml,
        [END_TAG_TOKEN]: endTagBeforeHtml,
        [EOF_TOKEN]: tokenBeforeHtml,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.BEFORE_HEAD_MODE]: {
        [CHARACTER_TOKEN]: tokenBeforeHead,
        [NULL_CHARACTER_TOKEN]: tokenBeforeHead,
        [WHITESPACE_CHARACTER_TOKEN]: ignoreToken,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: misplacedDoctype,
        [START_TAG_TOKEN]: startTagBeforeHead,
        [END_TAG_TOKEN]: endTagBeforeHead,
        [EOF_TOKEN]: tokenBeforeHead,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_HEAD_MODE]: {
        [CHARACTER_TOKEN]: tokenInHead,
        [NULL_CHARACTER_TOKEN]: tokenInHead,
        [WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: misplacedDoctype,
        [START_TAG_TOKEN]: startTagInHead,
        [END_TAG_TOKEN]: endTagInHead,
        [EOF_TOKEN]: tokenInHead,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_HEAD_NO_SCRIPT_MODE]: {
        [CHARACTER_TOKEN]: tokenInHeadNoScript,
        [NULL_CHARACTER_TOKEN]: tokenInHeadNoScript,
        [WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: misplacedDoctype,
        [START_TAG_TOKEN]: startTagInHeadNoScript,
        [END_TAG_TOKEN]: endTagInHeadNoScript,
        [EOF_TOKEN]: tokenInHeadNoScript,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.AFTER_HEAD_MODE]: {
        [CHARACTER_TOKEN]: tokenAfterHead,
        [NULL_CHARACTER_TOKEN]: tokenAfterHead,
        [WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: misplacedDoctype,
        [START_TAG_TOKEN]: startTagAfterHead,
        [END_TAG_TOKEN]: endTagAfterHead,
        [EOF_TOKEN]: tokenAfterHead,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_BODY_MODE]: {
        [CHARACTER_TOKEN]: characterInBody,
        [NULL_CHARACTER_TOKEN]: ignoreToken,
        [WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagInBody,
        [END_TAG_TOKEN]: endTagInBody,
        [EOF_TOKEN]: eofInBody,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.TEXT_MODE]: {
        [CHARACTER_TOKEN]: insertCharacters,
        [NULL_CHARACTER_TOKEN]: insertCharacters,
        [WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [COMMENT_TOKEN]: ignoreToken,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: ignoreToken,
        [END_TAG_TOKEN]: endTagInText,
        [EOF_TOKEN]: eofInText,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_TABLE_MODE]: {
        [CHARACTER_TOKEN]: characterInTable,
        [NULL_CHARACTER_TOKEN]: characterInTable,
        [WHITESPACE_CHARACTER_TOKEN]: characterInTable,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagInTable,
        [END_TAG_TOKEN]: endTagInTable,
        [EOF_TOKEN]: eofInBody,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_TABLE_TEXT_MODE]: {
        [CHARACTER_TOKEN]: characterInTableText,
        [NULL_CHARACTER_TOKEN]: ignoreToken,
        [WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInTableText,
        [COMMENT_TOKEN]: tokenInTableText,
        [DOCTYPE_TOKEN]: tokenInTableText,
        [START_TAG_TOKEN]: tokenInTableText,
        [END_TAG_TOKEN]: tokenInTableText,
        [EOF_TOKEN]: tokenInTableText,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_CAPTION_MODE]: {
        [CHARACTER_TOKEN]: characterInBody,
        [NULL_CHARACTER_TOKEN]: ignoreToken,
        [WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagInCaption,
        [END_TAG_TOKEN]: endTagInCaption,
        [EOF_TOKEN]: eofInBody,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_COLUMN_GROUP_MODE]: {
        [CHARACTER_TOKEN]: tokenInColumnGroup,
        [NULL_CHARACTER_TOKEN]: tokenInColumnGroup,
        [WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagInColumnGroup,
        [END_TAG_TOKEN]: endTagInColumnGroup,
        [EOF_TOKEN]: eofInBody,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_TABLE_BODY_MODE]: {
        [CHARACTER_TOKEN]: characterInTable,
        [NULL_CHARACTER_TOKEN]: characterInTable,
        [WHITESPACE_CHARACTER_TOKEN]: characterInTable,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagInTableBody,
        [END_TAG_TOKEN]: endTagInTableBody,
        [EOF_TOKEN]: eofInBody,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_ROW_MODE]: {
        [CHARACTER_TOKEN]: characterInTable,
        [NULL_CHARACTER_TOKEN]: characterInTable,
        [WHITESPACE_CHARACTER_TOKEN]: characterInTable,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagInRow,
        [END_TAG_TOKEN]: endTagInRow,
        [EOF_TOKEN]: eofInBody,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_CELL_MODE]: {
        [CHARACTER_TOKEN]: characterInBody,
        [NULL_CHARACTER_TOKEN]: ignoreToken,
        [WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagInCell,
        [END_TAG_TOKEN]: endTagInCell,
        [EOF_TOKEN]: eofInBody,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_SELECT_MODE]: {
        [CHARACTER_TOKEN]: insertCharacters,
        [NULL_CHARACTER_TOKEN]: ignoreToken,
        [WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagInSelect,
        [END_TAG_TOKEN]: endTagInSelect,
        [EOF_TOKEN]: eofInBody,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_SELECT_IN_TABLE_MODE]: {
        [CHARACTER_TOKEN]: insertCharacters,
        [NULL_CHARACTER_TOKEN]: ignoreToken,
        [WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagInSelectInTable,
        [END_TAG_TOKEN]: endTagInSelectInTable,
        [EOF_TOKEN]: eofInBody,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_TEMPLATE_MODE]: {
        [CHARACTER_TOKEN]: characterInBody,
        [NULL_CHARACTER_TOKEN]: ignoreToken,
        [WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagInTemplate,
        [END_TAG_TOKEN]: endTagInTemplate,
        [EOF_TOKEN]: eofInTemplate,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.AFTER_BODY_MODE]: {
        [CHARACTER_TOKEN]: tokenAfterBody,
        [NULL_CHARACTER_TOKEN]: tokenAfterBody,
        [WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [COMMENT_TOKEN]: appendCommentToRootHtmlElement,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagAfterBody,
        [END_TAG_TOKEN]: endTagAfterBody,
        [EOF_TOKEN]: stopParsing,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.IN_FRAMESET_MODE]: {
        [CHARACTER_TOKEN]: ignoreToken,
        [NULL_CHARACTER_TOKEN]: ignoreToken,
        [WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagInFrameset,
        [END_TAG_TOKEN]: endTagInFrameset,
        [EOF_TOKEN]: stopParsing,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.AFTER_FRAMESET_MODE]: {
        [CHARACTER_TOKEN]: ignoreToken,
        [NULL_CHARACTER_TOKEN]: ignoreToken,
        [WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [COMMENT_TOKEN]: appendComment,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagAfterFrameset,
        [END_TAG_TOKEN]: endTagAfterFrameset,
        [EOF_TOKEN]: stopParsing,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.AFTER_AFTER_BODY_MODE]: {
        [CHARACTER_TOKEN]: tokenAfterAfterBody,
        [NULL_CHARACTER_TOKEN]: tokenAfterAfterBody,
        [WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [COMMENT_TOKEN]: appendCommentToDocument,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagAfterAfterBody,
        [END_TAG_TOKEN]: tokenAfterAfterBody,
        [EOF_TOKEN]: stopParsing,
        [HIBERNATION_TOKEN]: null,
    },
    [INSERTION_MODES.AFTER_AFTER_FRAMESET_MODE]: {
        [CHARACTER_TOKEN]: ignoreToken,
        [NULL_CHARACTER_TOKEN]: ignoreToken,
        [WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [COMMENT_TOKEN]: appendCommentToDocument,
        [DOCTYPE_TOKEN]: ignoreToken,
        [START_TAG_TOKEN]: startTagAfterAfterFrameset,
        [END_TAG_TOKEN]: ignoreToken,
        [EOF_TOKEN]: stopParsing,
        [HIBERNATION_TOKEN]: null,
    },
};

//Parser
export class Parser<T extends TreeAdapterTypeMap> {
    public options: ParserOptions<T>;
    public treeAdapter: TreeAdapter<T>;
    public pendingScript: T['node'] | null;
    public openElements?: OpenElementStack<T>;
    public fragmentContext?: T['element'];
    public framesetOk: boolean = true;
    public insertionMode: InsertionMode | null = null;
    public stopped: boolean = false;
    public activeFormattingElements?: FormattingElementList<T>;
    public tokenizer?: Tokenizer;
    public originalInsertionMode: InsertionMode | null = null;
    public document?: T['document'];
    public headElement: T['element'] | null = null;
    public formElement: T['element'] | null = null;
    public tmplInsertionModeStack: InsertionMode[] = [];
    public tmplInsertionModeStackTop: number = -1;
    public currentTmplInsertionMode: InsertionMode | null = null;
    public pendingCharacterTokens: CharacterToken[] = [];
    public hasNonWhitespacePendingCharacterToken: boolean = false;
    public skipNextNewLine: boolean = false;
    public fosterParentingEnabled: boolean = false;

    public constructor(options?: Partial<ParserOptions<T>>) {
        this.options = {
            ...(DEFAULT_OPTIONS as ParserOptions<T>),
            ...(options ?? {}),
        };

        this.treeAdapter = this.options.treeAdapter;
        this.pendingScript = null;

        if (this.options.sourceCodeLocationInfo) {
            installMixin(this as Parser<T>, LocationInfoParserMixin);
        }

        if (this.options.onParseError) {
            installMixin(this as Parser<T>, ErrorReportingParserMixin, { onParseError: this.options.onParseError });
        }
    }

    // API
    public parse(html: string): T['document'] {
        const document = this.treeAdapter.createDocument();

        this.bootstrap(document, null);

        if (!this.tokenizer) {
            throw new Error('Tokenizer was not instantiated');
        }

        this.tokenizer.write(html, true);
        this.runParsingLoop();

        return document;
    }

    public parseFragment(html: string, fragmentContext?: T['element']): T['documentFragment'] {
        //NOTE: use <template> element as a fragment context if context element was not provided,
        //so we will parse in "forgiving" manner
        if (!fragmentContext) {
            fragmentContext = this.treeAdapter.createElement($.TEMPLATE, NS.HTML, []);
        }

        //NOTE: create fake element which will be used as 'document' for fragment parsing.
        //This is important for jsdom there 'document' can't be recreated, therefore
        //fragment parsing causes messing of the main `document`.
        const documentMock = this.treeAdapter.createElement('documentmock', NS.HTML, []);

        this.bootstrap(documentMock, fragmentContext);

        if (!this.tokenizer) {
            throw new Error('Tokenizer was not instantiated');
        }

        if (this.treeAdapter.getTagName(fragmentContext) === $.TEMPLATE) {
            this.pushTmplInsertionMode(INSERTION_MODES.IN_TEMPLATE_MODE);
        }

        this._initTokenizerForFragmentParsing();
        this.insertFakeRootElement();
        this.resetInsertionMode();
        this._findFormInFragmentContext();
        this.tokenizer.write(html, true);
        this.runParsingLoop();

        const rootElement = this.treeAdapter.getFirstChild(documentMock);
        const fragment = this.treeAdapter.createDocumentFragment();

        this.adoptNodes(rootElement, fragment);

        return fragment;
    }

    //Bootstrap parser
    public bootstrap(document: T['document'], fragmentContext?: T['element']): void {
        this.tokenizer = new Tokenizer();

        this.stopped = false;

        this.insertionMode = INSERTION_MODES.INITIAL_MODE;
        this.originalInsertionMode = null;

        this.document = document;
        this.fragmentContext = fragmentContext;

        this.headElement = null;
        this.formElement = null;

        this.openElements = new OpenElementStack(this.document, this.treeAdapter);
        this.activeFormattingElements = new FormattingElementList(this.treeAdapter);

        this.tmplInsertionModeStack = [];
        this.tmplInsertionModeStackTop = -1;
        this.currentTmplInsertionMode = null;

        this.pendingCharacterTokens = [];
        this.hasNonWhitespacePendingCharacterToken = false;

        this.framesetOk = true;
        this.skipNextNewLine = false;
        this.fosterParentingEnabled = false;
    }

    //Errors
    public err(_err: unknown, _options?: unknown): void {
        return;
    }

    //Parsing loop
    public runParsingLoop(scriptHandler?: (node: T['node']) => void): void {
        if (!this.tokenizer) {
            return;
        }

        while (!this.stopped) {
            this._setupTokenizerCDATAMode();

            const token = this.tokenizer.getNextToken();

            if (token === undefined) {
                continue;
            }

            if (token.type === HIBERNATION_TOKEN) {
                break;
            }

            if (this.skipNextNewLine) {
                this.skipNextNewLine = false;

                if (token.type === WHITESPACE_CHARACTER_TOKEN && token.chars[0] === '\n') {
                    if (token.chars.length === 1) {
                        continue;
                    }

                    token.chars = token.chars.substr(1);
                }
            }

            this.processInputToken(token);

            if (scriptHandler && this.pendingScript) {
                break;
            }
        }
    }

    public runParsingLoopForCurrentChunk(writeCallback: () => void, scriptHandler?: (node: T['node']) => void): void {
        this.runParsingLoop(scriptHandler);

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
    protected _setupTokenizerCDATAMode(): void {
        if (!this.tokenizer) {
            return;
        }
        const current = this.getAdjustedCurrentElement();

        this.tokenizer.allowCDATA =
            current &&
            current !== this.document &&
            this.treeAdapter.getNamespaceURI(current) !== NS.HTML &&
            !this.isIntegrationPoint(current);
    }

    public switchToTextParsing(currentToken: StartTagToken, nextTokenizerState: State): void {
        if (!this.tokenizer) {
            return;
        }
        this.insertElement(currentToken, NS.HTML);
        this.tokenizer.state = nextTokenizerState;
        this.originalInsertionMode = this.insertionMode;
        this.insertionMode = INSERTION_MODES.TEXT_MODE;
    }

    public switchToPlaintextParsing(): void {
        if (!this.tokenizer) {
            return;
        }
        this.insertionMode = INSERTION_MODES.TEXT_MODE;
        this.originalInsertionMode = INSERTION_MODES.IN_BODY_MODE;
        this.tokenizer.state = tokenizerMode.PLAINTEXT;
    }

    //Fragment parsing
    public getAdjustedCurrentElement(): T['element'] {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        return this.openElements.stackTop === 0 && this.fragmentContext
            ? this.fragmentContext
            : this.openElements.current;
    }

    protected _findFormInFragmentContext(): void {
        let node = this.fragmentContext;

        do {
            if (this.treeAdapter.getTagName(node) === $.FORM) {
                this.formElement = node;
                break;
            }

            node = this.treeAdapter.getParentNode(node);
        } while (node);
    }

    protected _initTokenizerForFragmentParsing(): void {
        if (!this.tokenizer) {
            return;
        }
        if (this.treeAdapter.getNamespaceURI(this.fragmentContext) === NS.HTML) {
            const tn = this.treeAdapter.getTagName(this.fragmentContext);

            if (tn === $.TITLE || tn === $.TEXTAREA) {
                this.tokenizer.state = tokenizerMode.RCDATA;
            } else if (
                tn === $.STYLE ||
                tn === $.XMP ||
                tn === $.IFRAME ||
                tn === $.NOEMBED ||
                tn === $.NOFRAMES ||
                tn === $.NOSCRIPT
            ) {
                this.tokenizer.state = tokenizerMode.RAWTEXT;
            } else if (tn === $.SCRIPT) {
                this.tokenizer.state = tokenizerMode.SCRIPT_DATA;
            } else if (tn === $.PLAINTEXT) {
                this.tokenizer.state = tokenizerMode.PLAINTEXT;
            }
        }
    }

    //Tree mutation
    public setDocumentType(token: DocTypeToken): void {
        const name = token.name || '';
        const publicId = token.publicId || '';
        const systemId = token.systemId || '';

        this.treeAdapter.setDocumentType(this.document, name, publicId, systemId);
    }

    public attachElementToTree(element: T['element']): void {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        if (this._shouldFosterParentOnInsertion()) {
            this.fosterParentElement(element);
        } else {
            const parent = this.openElements.currentTmplContent || this.openElements.current;

            this.treeAdapter.appendChild(parent, element);
        }
    }

    public appendElement(token: StartTagToken, namespaceURI: string): void {
        const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);

        this.attachElementToTree(element);
    }

    public insertElement(token: StartTagToken, namespaceURI: string): void {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);

        this.attachElementToTree(element);
        this.openElements.push(element);
    }

    public insertFakeElement(tagName: string): void {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        const element = this.treeAdapter.createElement(tagName, NS.HTML, []);

        this.attachElementToTree(element);
        this.openElements.push(element);
    }

    public insertTemplate(token: StartTagToken, _ns?: string): void {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        const tmpl = this.treeAdapter.createElement(token.tagName, NS.HTML, token.attrs);
        const content = this.treeAdapter.createDocumentFragment();

        this.treeAdapter.setTemplateContent(tmpl, content);
        this.attachElementToTree(tmpl);
        this.openElements.push(tmpl);
    }

    public insertFakeRootElement(): void {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        const element = this.treeAdapter.createElement($.HTML, NS.HTML, []);

        this.treeAdapter.appendChild(this.openElements.current, element);
        this.openElements.push(element);
    }

    public appendCommentNode(token: CommentToken, parent: T['parentNode']): void {
        const commentNode = this.treeAdapter.createCommentNode(token.data);

        this.treeAdapter.appendChild(parent, commentNode);
    }

    public insertCharacters(token: CharacterToken): void {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        if (this._shouldFosterParentOnInsertion()) {
            this._fosterParentText(token.chars);
        } else {
            const parent = this.openElements.currentTmplContent || this.openElements.current;

            this.treeAdapter.insertText(parent, token.chars);
        }
    }

    public adoptNodes(donor: T['parentNode'], recipient: T['parentNode']): void {
        for (let child = this.treeAdapter.getFirstChild(donor); child; child = this.treeAdapter.getFirstChild(donor)) {
            this.treeAdapter.detachNode(child);
            this.treeAdapter.appendChild(recipient, child);
        }
    }

    //Token processing
    protected _shouldProcessTokenInForeignContent(token: Token): boolean {
        const current = this.getAdjustedCurrentElement();

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
            token.type === START_TAG_TOKEN &&
            token.tagName === $.SVG
        ) {
            return false;
        }

        const isCharacterToken =
            token.type === CHARACTER_TOKEN ||
            token.type === NULL_CHARACTER_TOKEN ||
            token.type === WHITESPACE_CHARACTER_TOKEN;

        const isMathMLTextStartTag =
            token.type === START_TAG_TOKEN && token.tagName !== $.MGLYPH && token.tagName !== $.MALIGNMARK;

        if ((isMathMLTextStartTag || isCharacterToken) && this.isIntegrationPoint(current, NS.MATHML)) {
            return false;
        }

        if ((token.type === START_TAG_TOKEN || isCharacterToken) && this.isIntegrationPoint(current, NS.HTML)) {
            return false;
        }

        return token.type !== EOF_TOKEN;
    }

    public processToken(token: Token): void {
        if (this.insertionMode === null) {
            return;
        }
        TOKEN_HANDLERS[this.insertionMode][token.type]?.(this, token);
    }

    public processTokenInBodyMode(token: Token): void {
        TOKEN_HANDLERS[INSERTION_MODES.IN_BODY_MODE][token.type]?.(this, token);
    }

    public processTokenInForeignContent(token: Token): void {
        if (token.type === CHARACTER_TOKEN) {
            characterInForeignContent(this, token);
        } else if (token.type === NULL_CHARACTER_TOKEN) {
            nullCharacterInForeignContent(this, token);
        } else if (token.type === WHITESPACE_CHARACTER_TOKEN) {
            insertCharacters(this, token);
        } else if (token.type === COMMENT_TOKEN) {
            appendComment(this, token);
        } else if (token.type === START_TAG_TOKEN) {
            startTagInForeignContent(this, token);
        } else if (token.type === END_TAG_TOKEN) {
            endTagInForeignContent(this, token);
        }
    }

    public processInputToken(token: Token): void {
        if (this._shouldProcessTokenInForeignContent(token)) {
            this.processTokenInForeignContent(token);
        } else {
            this.processToken(token);
        }

        if (token.type === START_TAG_TOKEN && token.selfClosing && !token.ackSelfClosing) {
            this.err(ERR.nonVoidHtmlElementStartTagWithTrailingSolidus);
        }
    }

    //Integration points
    public isIntegrationPoint(element: T['element'], foreignNS?: string): boolean {
        const tn = this.treeAdapter.getTagName(element);
        const ns = this.treeAdapter.getNamespaceURI(element);
        const attrs = this.treeAdapter.getAttrList(element);

        return foreignContent.isIntegrationPoint(tn, ns, attrs, foreignNS);
    }

    //Active formatting elements reconstruction
    public reconstructActiveFormattingElements(): void {
        if (!this.activeFormattingElements) {
            throw new Error('Active formatting elements was not initialised');
        }
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        const listLength = this.activeFormattingElements.length;

        if (listLength) {
            let unopenIdx = listLength;
            let entry = null;

            do {
                unopenIdx--;
                entry = this.activeFormattingElements.entries[unopenIdx];

                if (!entry) {
                    continue;
                }

                if (entry.type === FORMATTING_MARKER_ENTRY || this.openElements.contains(entry.element)) {
                    unopenIdx++;
                    break;
                }
            } while (unopenIdx > 0);

            for (let i = unopenIdx; i < listLength; i++) {
                entry = this.activeFormattingElements.entries[i];

                if (entry?.type === FORMATTING_ELEMENT_ENTRY) {
                    if (entry.token.type === START_TAG_TOKEN) {
                        this.insertElement(entry.token, this.treeAdapter.getNamespaceURI(entry.element));
                    }
                    entry.element = this.openElements.current;
                }
            }
        }
    }

    //Close elements
    public closeTableCell(): void {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        if (!this.activeFormattingElements) {
            throw new Error('Active formatting elements was not initialised');
        }
        this.openElements.generateImpliedEndTags();
        this.openElements.popUntilTableCellPopped();
        this.activeFormattingElements.clearToLastMarker();
        this.insertionMode = INSERTION_MODES.IN_ROW_MODE;
    }

    public closePElement(): void {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        this.openElements.generateImpliedEndTagsWithExclusion($.P);
        this.openElements.popUntilTagNamePopped($.P);
    }

    //Insertion modes
    public resetInsertionMode(): void {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        for (let i = this.openElements.stackTop, last = false; i >= 0; i--) {
            let element = this.openElements.items[i];

            if (i === 0) {
                last = true;

                if (this.fragmentContext) {
                    element = this.fragmentContext;
                }
            }

            const tn = this.treeAdapter.getTagName(element);
            const newInsertionMode = INSERTION_MODE_RESET_MAP[tn];

            if (newInsertionMode) {
                this.insertionMode = newInsertionMode;
                break;
            } else if (!last && (tn === $.TD || tn === $.TH)) {
                this.insertionMode = INSERTION_MODES.IN_CELL_MODE;
                break;
            } else if (!last && tn === $.HEAD) {
                this.insertionMode = INSERTION_MODES.IN_HEAD_MODE;
                break;
            } else if (tn === $.SELECT) {
                this._resetInsertionModeForSelect(i);
                break;
            } else if (tn === $.TEMPLATE) {
                this.insertionMode = this.currentTmplInsertionMode;
                break;
            } else if (tn === $.HTML) {
                this.insertionMode = this.headElement
                    ? INSERTION_MODES.AFTER_HEAD_MODE
                    : INSERTION_MODES.BEFORE_HEAD_MODE;
                break;
            } else if (last) {
                this.insertionMode = INSERTION_MODES.IN_BODY_MODE;
                break;
            }
        }
    }

    protected _resetInsertionModeForSelect(selectIdx: number): void {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        if (selectIdx > 0) {
            for (let i = selectIdx - 1; i > 0; i--) {
                const ancestor = this.openElements.items[i];
                const tn = this.treeAdapter.getTagName(ancestor);

                if (tn === $.TEMPLATE) {
                    break;
                } else if (tn === $.TABLE) {
                    this.insertionMode = INSERTION_MODES.IN_SELECT_IN_TABLE_MODE;
                    return;
                }
            }
        }

        this.insertionMode = INSERTION_MODES.IN_SELECT_MODE;
    }

    public pushTmplInsertionMode(mode: InsertionMode): void {
        this.tmplInsertionModeStack.push(mode);
        this.tmplInsertionModeStackTop++;
        this.currentTmplInsertionMode = mode;
    }

    public popTmplInsertionMode(): void {
        this.tmplInsertionModeStack.pop();
        this.tmplInsertionModeStackTop--;
        this.currentTmplInsertionMode = this.tmplInsertionModeStack[this.tmplInsertionModeStackTop] ?? null;
    }

    //Foster parenting
    public isElementCausesFosterParenting(element: T['element']): boolean {
        const tn = this.treeAdapter.getTagName(element);

        return tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD || tn === $.TR;
    }

    protected _shouldFosterParentOnInsertion(): boolean {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        return this.fosterParentingEnabled && this.isElementCausesFosterParenting(this.openElements.current);
    }

    public findFosterParentingLocation(): { parent: null | T['element']; beforeElement: null | T['element'] } {
        if (!this.openElements) {
            throw new Error('Open elements stack was not initialised');
        }
        const location: { parent: null | T['element']; beforeElement: null | T['element'] } = {
            parent: null,
            beforeElement: null,
        };

        for (let i = this.openElements.stackTop; i >= 0; i--) {
            const openElement = this.openElements.items[i];
            const tn = this.treeAdapter.getTagName(openElement);
            const ns = this.treeAdapter.getNamespaceURI(openElement);

            if (tn === $.TEMPLATE && ns === NS.HTML) {
                location.parent = this.treeAdapter.getTemplateContent(openElement);
                break;
            } else if (tn === $.TABLE) {
                location.parent = this.treeAdapter.getParentNode(openElement);

                if (location.parent) {
                    location.beforeElement = openElement;
                } else {
                    location.parent = this.openElements.items[i - 1];
                }

                break;
            }
        }

        if (!location.parent) {
            location.parent = this.openElements.items[0];
        }

        return location;
    }

    public fosterParentElement(element: T['element']): void {
        const location = this.findFosterParentingLocation();

        if (location.beforeElement) {
            this.treeAdapter.insertBefore(location.parent, element, location.beforeElement);
        } else {
            this.treeAdapter.appendChild(location.parent, element);
        }
    }

    protected _fosterParentText(chars: string): void {
        const location = this.findFosterParentingLocation();

        if (location.beforeElement) {
            this.treeAdapter.insertTextBefore(location.parent, chars, location.beforeElement);
        } else {
            this.treeAdapter.insertText(location.parent, chars);
        }
    }

    //Special elements
    public isSpecialElement(element: T['element']): boolean {
        const tn = this.treeAdapter.getTagName(element);
        const ns = this.treeAdapter.getNamespaceURI(element);

        return HTML.SPECIAL_ELEMENTS[ns]?.[tn] ?? false;
    }
}

//Adoption agency algorithm
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tree-construction.html#adoptionAgency)
//------------------------------------------------------------------

//Steps 5-8 of the algorithm
function aaObtainFormattingElementEntry<T extends TreeAdapterTypeMap>(
    p: Parser<T>,
    token: StartTagToken | EndTagToken
): FormattingElementEntry<T> | null {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    let formattingElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(token.tagName);

    if (formattingElementEntry) {
        if (!p.openElements.contains(formattingElementEntry.element)) {
            p.activeFormattingElements.removeEntry(formattingElementEntry);
            formattingElementEntry = null;
        } else if (!p.openElements.hasInScope(token.tagName)) {
            formattingElementEntry = null;
        }
    } else if (token.type === END_TAG_TOKEN) {
        genericEndTagInBody(p, token);
    }

    return formattingElementEntry;
}

//Steps 9 and 10 of the algorithm
function aaObtainFurthestBlock<T extends TreeAdapterTypeMap>(
    p: Parser<T>,
    formattingElementEntry: FormattingElementEntry<T>
): T['element'] | null {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }

    let furthestBlock = null;

    for (let i = p.openElements.stackTop; i >= 0; i--) {
        const element = p.openElements.items[i];

        if (!element) {
            continue;
        }

        if (element === formattingElementEntry.element) {
            break;
        }

        if (p.isSpecialElement(element)) {
            furthestBlock = element;
        }
    }

    if (!furthestBlock) {
        p.openElements.popUntilElementPopped(formattingElementEntry.element);
        p.activeFormattingElements.removeEntry(formattingElementEntry);
    }

    return furthestBlock;
}

//Step 13 of the algorithm
function aaInnerLoop<T extends TreeAdapterTypeMap>(
    p: Parser<T>,
    furthestBlock: T['element'],
    formattingElement: T['element']
): T['element'] {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    let lastElement = furthestBlock;
    let nextElement = p.openElements.getCommonAncestor(furthestBlock);

    for (let i = 0, element = nextElement; element !== formattingElement; i++, element = nextElement) {
        //NOTE: store next element for the next loop iteration (it may be deleted from the stack by step 9.5)
        nextElement = p.openElements.getCommonAncestor(element);

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
function aaRecreateElementFromEntry<T extends TreeAdapterTypeMap>(
    p: Parser<T>,
    elementEntry: FormattingElementEntry<T>
): T['element'] {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const ns = p.treeAdapter.getNamespaceURI(elementEntry.element);
    const newElement = p.treeAdapter.createElement(elementEntry.token.tagName, ns, elementEntry.token.attrs);

    p.openElements.replace(elementEntry.element, newElement);
    elementEntry.element = newElement;

    return newElement;
}

//Step 14 of the algorithm
function aaInsertLastNodeInCommonAncestor<T extends TreeAdapterTypeMap>(
    p: Parser<T>,
    commonAncestor: T['element'],
    lastElement: T['element']
): void {
    if (p.isElementCausesFosterParenting(commonAncestor)) {
        p.fosterParentElement(lastElement);
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
    furthestBlock: T['element'],
    formattingElementEntry: FormattingElementEntry<T>
): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const ns = p.treeAdapter.getNamespaceURI(formattingElementEntry.element);
    const token = formattingElementEntry.token;
    const newElement = p.treeAdapter.createElement(token.tagName, ns, token.attrs);

    p.adoptNodes(furthestBlock, newElement);
    p.treeAdapter.appendChild(furthestBlock, newElement);

    p.activeFormattingElements.insertElementAfterBookmark(newElement, formattingElementEntry.token);
    p.activeFormattingElements.removeEntry(formattingElementEntry);

    p.openElements.remove(formattingElementEntry.element);
    p.openElements.insertAfter(furthestBlock, newElement);
}

//Algorithm entry point
function callAdoptionAgency<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken | EndTagToken): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    let formattingElementEntry;

    for (let i = 0; i < AA_OUTER_LOOP_ITER; i++) {
        formattingElementEntry = aaObtainFormattingElementEntry(p, token);

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
        aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement);
        aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry);
    }
}

//Generic token handlers
//------------------------------------------------------------------
function ignoreToken(): void {
    //NOTE: do nothing =)
}

function misplacedDoctype<T extends TreeAdapterTypeMap>(p: Parser<T>): void {
    p.err(ERR.misplacedDoctype);
}

function appendComment<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CommentToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    p.appendCommentNode(token, p.openElements.currentTmplContent || p.openElements.current);
}

function appendCommentToRootHtmlElement<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CommentToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    p.appendCommentNode(token, p.openElements.items[0]);
}

function appendCommentToDocument<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CommentToken): void {
    p.appendCommentNode(token, p.document);
}

function insertCharacters<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken): void {
    p.insertCharacters(token);
}

function stopParsing<T extends TreeAdapterTypeMap>(p: Parser<T>): void {
    p.stopped = true;
}

// The "initial" insertion mode
//------------------------------------------------------------------
function doctypeInInitialMode<T extends TreeAdapterTypeMap>(p: Parser<T>, token: DocTypeToken): void {
    p.setDocumentType(token);

    const mode = token.forceQuirks ? HTML.DOCUMENT_MODE.QUIRKS : doctype.getDocumentMode(token);

    if (!doctype.isConforming(token)) {
        p.err(ERR.nonConformingDoctype);
    }

    p.treeAdapter.setDocumentMode(p.document, mode);

    p.insertionMode = INSERTION_MODES.BEFORE_HTML_MODE;
}

function tokenInInitialMode<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token): void {
    p.err(ERR.missingDoctype, { beforeToken: true });
    p.treeAdapter.setDocumentMode(p.document, HTML.DOCUMENT_MODE.QUIRKS);
    p.insertionMode = INSERTION_MODES.BEFORE_HTML_MODE;
    p.processToken(token);
}

// The "before html" insertion mode
//------------------------------------------------------------------
function startTagBeforeHtml<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (token.tagName === $.HTML) {
        p.insertElement(token, NS.HTML);
        p.insertionMode = INSERTION_MODES.BEFORE_HEAD_MODE;
    } else {
        tokenBeforeHtml(p, token);
    }
}

function endTagBeforeHtml<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    const tn = token.tagName;

    if (tn === $.HTML || tn === $.HEAD || tn === $.BODY || tn === $.BR) {
        tokenBeforeHtml(p, token);
    }
}

function tokenBeforeHtml<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token): void {
    p.insertFakeRootElement();
    p.insertionMode = INSERTION_MODES.BEFORE_HEAD_MODE;
    p.processToken(token);
}

// The "before head" insertion mode
//------------------------------------------------------------------
function startTagBeforeHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.HEAD) {
        p.insertElement(token, NS.HTML);
        p.headElement = p.openElements.current;
        p.insertionMode = INSERTION_MODES.IN_HEAD_MODE;
    } else {
        tokenBeforeHead(p, token);
    }
}

function endTagBeforeHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    const tn = token.tagName;

    if (tn === $.HEAD || tn === $.BODY || tn === $.HTML || tn === $.BR) {
        tokenBeforeHead(p, token);
    } else {
        p.err(ERR.endTagWithoutMatchingOpenElement);
    }
}

function tokenBeforeHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    p.insertFakeElement($.HEAD);
    p.headElement = p.openElements.current;
    p.insertionMode = INSERTION_MODES.IN_HEAD_MODE;
    p.processToken(token);
}

// The "in head" insertion mode
//------------------------------------------------------------------
function startTagInHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.BASE || tn === $.BASEFONT || tn === $.BGSOUND || tn === $.LINK || tn === $.META) {
        p.appendElement(token, NS.HTML);
        token.ackSelfClosing = true;
    } else if (tn === $.TITLE) {
        p.switchToTextParsing(token, tokenizerMode.RCDATA);
    } else if (tn === $.NOSCRIPT) {
        if (p.options.scriptingEnabled) {
            p.switchToTextParsing(token, tokenizerMode.RAWTEXT);
        } else {
            p.insertElement(token, NS.HTML);
            p.insertionMode = INSERTION_MODES.IN_HEAD_NO_SCRIPT_MODE;
        }
    } else if (tn === $.NOFRAMES || tn === $.STYLE) {
        p.switchToTextParsing(token, tokenizerMode.RAWTEXT);
    } else if (tn === $.SCRIPT) {
        p.switchToTextParsing(token, tokenizerMode.SCRIPT_DATA);
    } else if (tn === $.TEMPLATE) {
        p.insertTemplate(token, NS.HTML);
        p.activeFormattingElements.insertMarker();
        p.framesetOk = false;
        p.insertionMode = INSERTION_MODES.IN_TEMPLATE_MODE;
        p.pushTmplInsertionMode(INSERTION_MODES.IN_TEMPLATE_MODE);
    } else if (tn === $.HEAD) {
        p.err(ERR.misplacedStartTagForHeadElement);
    } else {
        tokenInHead(p, token);
    }
}

function endTagInHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.HEAD) {
        p.openElements.pop();
        p.insertionMode = INSERTION_MODES.AFTER_HEAD_MODE;
    } else if (tn === $.BODY || tn === $.BR || tn === $.HTML) {
        tokenInHead(p, token);
    } else if (tn === $.TEMPLATE) {
        if (p.openElements.tmplCount > 0) {
            p.openElements.generateImpliedEndTagsThoroughly();

            if (p.openElements.currentTagName !== $.TEMPLATE) {
                p.err(ERR.closingOfElementWithOpenChildElements);
            }

            p.openElements.popUntilTagNamePopped($.TEMPLATE);
            p.activeFormattingElements.clearToLastMarker();
            p.popTmplInsertionMode();
            p.resetInsertionMode();
        } else {
            p.err(ERR.endTagWithoutMatchingOpenElement);
        }
    } else {
        p.err(ERR.endTagWithoutMatchingOpenElement);
    }
}

function tokenInHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    p.openElements.pop();
    p.insertionMode = INSERTION_MODES.AFTER_HEAD_MODE;
    p.processToken(token);
}

// The "in head no script" insertion mode
//------------------------------------------------------------------
function startTagInHeadNoScript<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (
        tn === $.BASEFONT ||
        tn === $.BGSOUND ||
        tn === $.HEAD ||
        tn === $.LINK ||
        tn === $.META ||
        tn === $.NOFRAMES ||
        tn === $.STYLE
    ) {
        startTagInHead(p, token);
    } else if (tn === $.NOSCRIPT) {
        p.err(ERR.nestedNoscriptInHead);
    } else {
        tokenInHeadNoScript(p, token);
    }
}

function endTagInHeadNoScript<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.NOSCRIPT) {
        p.openElements.pop();
        p.insertionMode = INSERTION_MODES.IN_HEAD_MODE;
    } else if (tn === $.BR) {
        tokenInHeadNoScript(p, token);
    } else {
        p.err(ERR.endTagWithoutMatchingOpenElement);
    }
}

function tokenInHeadNoScript<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const errCode = token.type === EOF_TOKEN ? ERR.openElementsLeftAfterEof : ERR.disallowedContentInNoscriptInHead;

    p.err(errCode);
    p.openElements.pop();
    p.insertionMode = INSERTION_MODES.IN_HEAD_MODE;
    p.processToken(token);
}

// The "after head" insertion mode
//------------------------------------------------------------------
function startTagAfterHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.BODY) {
        p.insertElement(token, NS.HTML);
        p.framesetOk = false;
        p.insertionMode = INSERTION_MODES.IN_BODY_MODE;
    } else if (tn === $.FRAMESET) {
        p.insertElement(token, NS.HTML);
        p.insertionMode = INSERTION_MODES.IN_FRAMESET_MODE;
    } else if (
        tn === $.BASE ||
        tn === $.BASEFONT ||
        tn === $.BGSOUND ||
        tn === $.LINK ||
        tn === $.META ||
        tn === $.NOFRAMES ||
        tn === $.SCRIPT ||
        tn === $.STYLE ||
        tn === $.TEMPLATE ||
        tn === $.TITLE
    ) {
        p.err(ERR.abandonedHeadElementChild);
        p.openElements.push(p.headElement);
        startTagInHead(p, token);
        p.openElements.remove(p.headElement);
    } else if (tn === $.HEAD) {
        p.err(ERR.misplacedStartTagForHeadElement);
    } else {
        tokenAfterHead(p, token);
    }
}

function endTagAfterHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    const tn = token.tagName;

    if (tn === $.BODY || tn === $.HTML || tn === $.BR) {
        tokenAfterHead(p, token);
    } else if (tn === $.TEMPLATE) {
        endTagInHead(p, token);
    } else {
        p.err(ERR.endTagWithoutMatchingOpenElement);
    }
}

function tokenAfterHead<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token): void {
    p.insertFakeElement($.BODY);
    p.insertionMode = INSERTION_MODES.IN_BODY_MODE;
    p.processToken(token);
}

// The "in body" insertion mode
//------------------------------------------------------------------
function whitespaceCharacterInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken): void {
    p.reconstructActiveFormattingElements();
    p.insertCharacters(token);
}

function characterInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken): void {
    p.reconstructActiveFormattingElements();
    p.insertCharacters(token);
    p.framesetOk = false;
}

function htmlStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.tmplCount === 0) {
        p.treeAdapter.adoptAttributes(p.openElements.items[0], token.attrs);
    }
}

function bodyStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();

    if (bodyElement && p.openElements.tmplCount === 0) {
        p.framesetOk = false;
        p.treeAdapter.adoptAttributes(bodyElement, token.attrs);
    }
}

function framesetStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();

    if (p.framesetOk && bodyElement) {
        p.treeAdapter.detachNode(bodyElement);
        p.openElements.popAllUpToHtmlElement();
        p.insertElement(token, NS.HTML);
        p.insertionMode = INSERTION_MODES.IN_FRAMESET_MODE;
    }
}

function addressStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInButtonScope($.P)) {
        p.closePElement();
    }

    p.insertElement(token, NS.HTML);
}

function numberedHeaderStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInButtonScope($.P)) {
        p.closePElement();
    }

    const tn = p.openElements.currentTagName;

    if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6) {
        p.openElements.pop();
    }

    p.insertElement(token, NS.HTML);
}

function preStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInButtonScope($.P)) {
        p.closePElement();
    }

    p.insertElement(token, NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of pre blocks are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.framesetOk = false;
}

function formStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const inTemplate = p.openElements.tmplCount > 0;

    if (!p.formElement || inTemplate) {
        if (p.openElements.hasInButtonScope($.P)) {
            p.closePElement();
        }

        p.insertElement(token, NS.HTML);

        if (!inTemplate) {
            p.formElement = p.openElements.current;
        }
    }
}

function listItemStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
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

        if (elementTn !== $.ADDRESS && elementTn !== $.DIV && elementTn !== $.P && p.isSpecialElement(element)) {
            break;
        }
    }

    if (p.openElements.hasInButtonScope($.P)) {
        p.closePElement();
    }

    p.insertElement(token, NS.HTML);
}

function plaintextStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (!p.tokenizer) {
        throw new Error('Tokenizer was not initialised');
    }
    if (p.openElements.hasInButtonScope($.P)) {
        p.closePElement();
    }

    p.insertElement(token, NS.HTML);
    p.tokenizer.state = tokenizerMode.PLAINTEXT;
}

function buttonStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInScope($.BUTTON)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped($.BUTTON);
    }

    p.reconstructActiveFormattingElements();
    p.insertElement(token, NS.HTML);
    p.framesetOk = false;
}

function aStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    const activeElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName($.A);

    if (activeElementEntry) {
        callAdoptionAgency(p, token);
        p.openElements.remove(activeElementEntry.element);
        p.activeFormattingElements.removeEntry(activeElementEntry);
    }

    p.reconstructActiveFormattingElements();
    p.insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function bStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    p.reconstructActiveFormattingElements();
    p.insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function nobrStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    p.reconstructActiveFormattingElements();

    if (p.openElements.hasInScope($.NOBR)) {
        callAdoptionAgency(p, token);
        p.reconstructActiveFormattingElements();
    }

    p.insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function appletStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    p.reconstructActiveFormattingElements();
    p.insertElement(token, NS.HTML);
    p.activeFormattingElements.insertMarker();
    p.framesetOk = false;
}

function tableStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (
        p.treeAdapter.getDocumentMode(p.document) !== HTML.DOCUMENT_MODE.QUIRKS &&
        p.openElements.hasInButtonScope($.P)
    ) {
        p.closePElement();
    }

    p.insertElement(token, NS.HTML);
    p.framesetOk = false;
    p.insertionMode = INSERTION_MODES.IN_TABLE_MODE;
}

function areaStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    p.reconstructActiveFormattingElements();
    p.appendElement(token, NS.HTML);
    p.framesetOk = false;
    token.ackSelfClosing = true;
}

function inputStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    p.reconstructActiveFormattingElements();
    p.appendElement(token, NS.HTML);

    const inputType = Tokenizer.getTokenAttr(token, ATTRS.TYPE);

    if (!inputType || inputType.toLowerCase() !== HIDDEN_INPUT_TYPE) {
        p.framesetOk = false;
    }

    token.ackSelfClosing = true;
}

function paramStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    p.appendElement(token, NS.HTML);
    token.ackSelfClosing = true;
}

function hrStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken) {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInButtonScope($.P)) {
        p.closePElement();
    }

    p.appendElement(token, NS.HTML);
    p.framesetOk = false;
    token.ackSelfClosing = true;
}

function imageStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    token.tagName = $.IMG;
    areaStartTagInBody(p, token);
}

function textareaStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.tokenizer) {
        return;
    }

    p.insertElement(token, NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of textarea elements are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.tokenizer.state = tokenizerMode.RCDATA;
    p.originalInsertionMode = p.insertionMode;
    p.framesetOk = false;
    p.insertionMode = INSERTION_MODES.TEXT_MODE;
}

function xmpStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInButtonScope($.P)) {
        p.closePElement();
    }

    p.reconstructActiveFormattingElements();
    p.framesetOk = false;
    p.switchToTextParsing(token, tokenizerMode.RAWTEXT);
}

function iframeStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    p.framesetOk = false;
    p.switchToTextParsing(token, tokenizerMode.RAWTEXT);
}

//NOTE: here we assume that we always act as an user agent with enabled plugins, so we parse
//<noembed> as a rawtext.
function noembedStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    p.switchToTextParsing(token, tokenizerMode.RAWTEXT);
}

function selectStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    p.reconstructActiveFormattingElements();
    p.insertElement(token, NS.HTML);
    p.framesetOk = false;

    if (
        p.insertionMode === INSERTION_MODES.IN_TABLE_MODE ||
        p.insertionMode === INSERTION_MODES.IN_CAPTION_MODE ||
        p.insertionMode === INSERTION_MODES.IN_TABLE_BODY_MODE ||
        p.insertionMode === INSERTION_MODES.IN_ROW_MODE ||
        p.insertionMode === INSERTION_MODES.IN_CELL_MODE
    ) {
        p.insertionMode = INSERTION_MODES.IN_SELECT_IN_TABLE_MODE;
    } else {
        p.insertionMode = INSERTION_MODES.IN_SELECT_MODE;
    }
}

function optgroupStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.currentTagName === $.OPTION) {
        p.openElements.pop();
    }

    p.reconstructActiveFormattingElements();
    p.insertElement(token, NS.HTML);
}

function rbStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInScope($.RUBY)) {
        p.openElements.generateImpliedEndTags();
    }

    p.insertElement(token, NS.HTML);
}

function rtStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInScope($.RUBY)) {
        p.openElements.generateImpliedEndTagsWithExclusion($.RTC);
    }

    p.insertElement(token, NS.HTML);
}

function mathStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    p.reconstructActiveFormattingElements();

    foreignContent.adjustTokenMathMLAttrs(token);
    foreignContent.adjustTokenXMLAttrs(token);

    if (token.selfClosing) {
        p.appendElement(token, NS.MATHML);
    } else {
        p.insertElement(token, NS.MATHML);
    }

    token.ackSelfClosing = true;
}

function svgStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    p.reconstructActiveFormattingElements();

    foreignContent.adjustTokenSVGAttrs(token);
    foreignContent.adjustTokenXMLAttrs(token);

    if (token.selfClosing) {
        p.appendElement(token, NS.SVG);
    } else {
        p.insertElement(token, NS.SVG);
    }

    token.ackSelfClosing = true;
}

function genericStartTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    p.reconstructActiveFormattingElements();
    p.insertElement(token, NS.HTML);
}

//OPTIMIZATION: Integer comparisons are low-cost, so we can use very fast tag name length filters here.
//It's faster than using dictionary.
function startTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    const tn = token.tagName;

    switch (tn.length) {
        case 1:
            if (tn === $.I || tn === $.S || tn === $.B || tn === $.U) {
                bStartTagInBody(p, token);
            } else if (tn === $.P) {
                addressStartTagInBody(p, token);
            } else if (tn === $.A) {
                aStartTagInBody(p, token);
            } else {
                genericStartTagInBody(p, token);
            }

            break;

        case 2:
            if (tn === $.DL || tn === $.OL || tn === $.UL) {
                addressStartTagInBody(p, token);
            } else if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6) {
                numberedHeaderStartTagInBody(p, token);
            } else if (tn === $.LI || tn === $.DD || tn === $.DT) {
                listItemStartTagInBody(p, token);
            } else if (tn === $.EM || tn === $.TT) {
                bStartTagInBody(p, token);
            } else if (tn === $.BR) {
                areaStartTagInBody(p, token);
            } else if (tn === $.HR) {
                hrStartTagInBody(p, token);
            } else if (tn === $.RB) {
                rbStartTagInBody(p, token);
            } else if (tn === $.RT || tn === $.RP) {
                rtStartTagInBody(p, token);
            } else if (tn !== $.TH && tn !== $.TD && tn !== $.TR) {
                genericStartTagInBody(p, token);
            }

            break;

        case 3:
            if (tn === $.DIV || tn === $.DIR || tn === $.NAV) {
                addressStartTagInBody(p, token);
            } else if (tn === $.PRE) {
                preStartTagInBody(p, token);
            } else if (tn === $.BIG) {
                bStartTagInBody(p, token);
            } else if (tn === $.IMG || tn === $.WBR) {
                areaStartTagInBody(p, token);
            } else if (tn === $.XMP) {
                xmpStartTagInBody(p, token);
            } else if (tn === $.SVG) {
                svgStartTagInBody(p, token);
            } else if (tn === $.RTC) {
                rbStartTagInBody(p, token);
            } else if (tn !== $.COL) {
                genericStartTagInBody(p, token);
            }

            break;

        case 4:
            if (tn === $.HTML) {
                htmlStartTagInBody(p, token);
            } else if (tn === $.BASE || tn === $.LINK || tn === $.META) {
                startTagInHead(p, token);
            } else if (tn === $.BODY) {
                bodyStartTagInBody(p, token);
            } else if (tn === $.MAIN || tn === $.MENU) {
                addressStartTagInBody(p, token);
            } else if (tn === $.FORM) {
                formStartTagInBody(p, token);
            } else if (tn === $.CODE || tn === $.FONT) {
                bStartTagInBody(p, token);
            } else if (tn === $.NOBR) {
                nobrStartTagInBody(p, token);
            } else if (tn === $.AREA) {
                areaStartTagInBody(p, token);
            } else if (tn === $.MATH) {
                mathStartTagInBody(p, token);
            } else if (tn !== $.HEAD) {
                genericStartTagInBody(p, token);
            }

            break;

        case 5:
            if (tn === $.STYLE || tn === $.TITLE) {
                startTagInHead(p, token);
            } else if (tn === $.ASIDE) {
                addressStartTagInBody(p, token);
            } else if (tn === $.SMALL) {
                bStartTagInBody(p, token);
            } else if (tn === $.TABLE) {
                tableStartTagInBody(p, token);
            } else if (tn === $.EMBED) {
                areaStartTagInBody(p, token);
            } else if (tn === $.INPUT) {
                inputStartTagInBody(p, token);
            } else if (tn === $.PARAM || tn === $.TRACK) {
                paramStartTagInBody(p, token);
            } else if (tn === $.IMAGE) {
                imageStartTagInBody(p, token);
            } else if (tn !== $.FRAME && tn !== $.TBODY && tn !== $.TFOOT && tn !== $.THEAD) {
                genericStartTagInBody(p, token);
            }

            break;

        case 6:
            if (tn === $.SCRIPT) {
                startTagInHead(p, token);
            } else if (
                tn === $.CENTER ||
                tn === $.FIGURE ||
                tn === $.FOOTER ||
                tn === $.HEADER ||
                tn === $.HGROUP ||
                tn === $.DIALOG
            ) {
                addressStartTagInBody(p, token);
            } else if (tn === $.BUTTON) {
                buttonStartTagInBody(p, token);
            } else if (tn === $.STRIKE || tn === $.STRONG) {
                bStartTagInBody(p, token);
            } else if (tn === $.APPLET || tn === $.OBJECT) {
                appletStartTagInBody(p, token);
            } else if (tn === $.KEYGEN) {
                areaStartTagInBody(p, token);
            } else if (tn === $.SOURCE) {
                paramStartTagInBody(p, token);
            } else if (tn === $.IFRAME) {
                iframeStartTagInBody(p, token);
            } else if (tn === $.SELECT) {
                selectStartTagInBody(p, token);
            } else if (tn === $.OPTION) {
                optgroupStartTagInBody(p, token);
            } else {
                genericStartTagInBody(p, token);
            }

            break;

        case 7:
            if (tn === $.BGSOUND) {
                startTagInHead(p, token);
            } else if (
                tn === $.DETAILS ||
                tn === $.ADDRESS ||
                tn === $.ARTICLE ||
                tn === $.SECTION ||
                tn === $.SUMMARY
            ) {
                addressStartTagInBody(p, token);
            } else if (tn === $.LISTING) {
                preStartTagInBody(p, token);
            } else if (tn === $.MARQUEE) {
                appletStartTagInBody(p, token);
            } else if (tn === $.NOEMBED) {
                noembedStartTagInBody(p, token);
            } else if (tn !== $.CAPTION) {
                genericStartTagInBody(p, token);
            }

            break;

        case 8:
            if (tn === $.BASEFONT) {
                startTagInHead(p, token);
            } else if (tn === $.FRAMESET) {
                framesetStartTagInBody(p, token);
            } else if (tn === $.FIELDSET) {
                addressStartTagInBody(p, token);
            } else if (tn === $.TEXTAREA) {
                textareaStartTagInBody(p, token);
            } else if (tn === $.TEMPLATE) {
                startTagInHead(p, token);
            } else if (tn === $.NOSCRIPT) {
                if (p.options.scriptingEnabled) {
                    noembedStartTagInBody(p, token);
                } else {
                    genericStartTagInBody(p, token);
                }
            } else if (tn === $.OPTGROUP) {
                optgroupStartTagInBody(p, token);
            } else if (tn !== $.COLGROUP) {
                genericStartTagInBody(p, token);
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

function bodyEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, _token: Token): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInScope($.BODY)) {
        p.insertionMode = INSERTION_MODES.AFTER_BODY_MODE;
    }
}

function htmlEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInScope($.BODY)) {
        p.insertionMode = INSERTION_MODES.AFTER_BODY_MODE;
        p.processToken(token);
    }
}

function addressEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
    }
}

function formEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, _token: Token): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const inTemplate = p.openElements.tmplCount > 0;
    const formElement = p.formElement;

    if (!inTemplate) {
        p.formElement = null;
    }

    if ((formElement || inTemplate) && p.openElements.hasInScope($.FORM)) {
        p.openElements.generateImpliedEndTags();

        if (inTemplate) {
            p.openElements.popUntilTagNamePopped($.FORM);
        } else {
            p.openElements.remove(formElement);
        }
    }
}

function pEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, _token: Token): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (!p.openElements.hasInButtonScope($.P)) {
        p.insertFakeElement($.P);
    }

    p.closePElement();
}

function liEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, _token: Token): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInListItemScope($.LI)) {
        p.openElements.generateImpliedEndTagsWithExclusion($.LI);
        p.openElements.popUntilTagNamePopped($.LI);
    }
}

function ddEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTagsWithExclusion(tn);
        p.openElements.popUntilTagNamePopped(tn);
    }
}

function numberedHeaderEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, _token: Token): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasNumberedHeaderInScope()) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilNumberedHeaderPopped();
    }
}

function appletEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
        p.activeFormattingElements.clearToLastMarker();
    }
}

function brEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, _token: Token): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    p.reconstructActiveFormattingElements();
    p.insertFakeElement($.BR);
    p.openElements.pop();
    p.framesetOk = false;
}

function genericEndTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    for (let i = p.openElements.stackTop; i > 0; i--) {
        const element = p.openElements.items[i];

        if (p.treeAdapter.getTagName(element) === tn) {
            p.openElements.generateImpliedEndTagsWithExclusion(tn);
            p.openElements.popUntilElementPopped(element);
            break;
        }

        if (p.isSpecialElement(element)) {
            break;
        }
    }
}

//OPTIMIZATION: Integer comparisons are low-cost, so we can use very fast tag name length filters here.
//It's faster than using dictionary.
function endTagInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    const tn = token.tagName;

    switch (tn.length) {
        case 1:
            if (tn === $.A || tn === $.B || tn === $.I || tn === $.S || tn === $.U) {
                callAdoptionAgency(p, token);
            } else if (tn === $.P) {
                pEndTagInBody(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 2:
            if (tn === $.DL || tn === $.UL || tn === $.OL) {
                addressEndTagInBody(p, token);
            } else if (tn === $.LI) {
                liEndTagInBody(p, token);
            } else if (tn === $.DD || tn === $.DT) {
                ddEndTagInBody(p, token);
            } else if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6) {
                numberedHeaderEndTagInBody(p, token);
            } else if (tn === $.BR) {
                brEndTagInBody(p, token);
            } else if (tn === $.EM || tn === $.TT) {
                callAdoptionAgency(p, token);
            } else {
                genericEndTagInBody(p, token);
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
            if (tn === $.BODY) {
                bodyEndTagInBody(p, token);
            } else if (tn === $.HTML) {
                htmlEndTagInBody(p, token);
            } else if (tn === $.FORM) {
                formEndTagInBody(p, token);
            } else if (tn === $.CODE || tn === $.FONT || tn === $.NOBR) {
                callAdoptionAgency(p, token);
            } else if (tn === $.MAIN || tn === $.MENU) {
                addressEndTagInBody(p, token);
            } else {
                genericEndTagInBody(p, token);
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
            if (
                tn === $.CENTER ||
                tn === $.FIGURE ||
                tn === $.FOOTER ||
                tn === $.HEADER ||
                tn === $.HGROUP ||
                tn === $.DIALOG
            ) {
                addressEndTagInBody(p, token);
            } else if (tn === $.APPLET || tn === $.OBJECT) {
                appletEndTagInBody(p, token);
            } else if (tn === $.STRIKE || tn === $.STRONG) {
                callAdoptionAgency(p, token);
            } else {
                genericEndTagInBody(p, token);
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

function eofInBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EOFToken): void {
    if (p.tmplInsertionModeStackTop > -1) {
        eofInTemplate(p, token);
    } else {
        p.stopped = true;
    }
}

// The "text" insertion mode
//------------------------------------------------------------------
function endTagInText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (token.tagName === $.SCRIPT) {
        p.pendingScript = p.openElements.current;
    }

    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
}

function eofInText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EOFToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    p.err(ERR.eofInElementThatCanContainOnlyText);
    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
    p.processToken(token);
}

// The "in table" insertion mode
//------------------------------------------------------------------
function characterInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const curTn = p.openElements.currentTagName;

    if (curTn === $.TABLE || curTn === $.TBODY || curTn === $.TFOOT || curTn === $.THEAD || curTn === $.TR) {
        p.pendingCharacterTokens = [];
        p.hasNonWhitespacePendingCharacterToken = false;
        p.originalInsertionMode = p.insertionMode;
        p.insertionMode = INSERTION_MODES.IN_TABLE_TEXT_MODE;
        p.processToken(token);
    } else {
        tokenInTable(p, token);
    }
}

function captionStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    p.openElements.clearBackToTableContext();
    p.activeFormattingElements.insertMarker();
    p.insertElement(token, NS.HTML);
    p.insertionMode = INSERTION_MODES.IN_CAPTION_MODE;
}

function colgroupStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    p.openElements.clearBackToTableContext();
    p.insertElement(token, NS.HTML);
    p.insertionMode = INSERTION_MODES.IN_COLUMN_GROUP_MODE;
}

function colStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    p.openElements.clearBackToTableContext();
    p.insertFakeElement($.COLGROUP);
    p.insertionMode = INSERTION_MODES.IN_COLUMN_GROUP_MODE;
    p.processToken(token);
}

function tbodyStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    p.openElements.clearBackToTableContext();
    p.insertElement(token, NS.HTML);
    p.insertionMode = INSERTION_MODES.IN_TABLE_BODY_MODE;
}

function tdStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    p.openElements.clearBackToTableContext();
    p.insertFakeElement($.TBODY);
    p.insertionMode = INSERTION_MODES.IN_TABLE_BODY_MODE;
    p.processToken(token);
}

function tableStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.hasInTableScope($.TABLE)) {
        p.openElements.popUntilTagNamePopped($.TABLE);
        p.resetInsertionMode();
        p.processToken(token);
    }
}

function inputStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    const inputType = Tokenizer.getTokenAttr(token, ATTRS.TYPE);

    if (inputType && inputType.toLowerCase() === HIDDEN_INPUT_TYPE) {
        p.appendElement(token, NS.HTML);
    } else {
        tokenInTable(p, token);
    }

    token.ackSelfClosing = true;
}

function formStartTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (!p.formElement && p.openElements.tmplCount === 0) {
        p.insertElement(token, NS.HTML);
        p.formElement = p.openElements.current;
        p.openElements.pop();
    }
}

function startTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
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
            if (tn === $.TABLE) {
                tableStartTagInTable(p, token);
            } else if (tn === $.STYLE) {
                startTagInHead(p, token);
            } else if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
                tbodyStartTagInTable(p, token);
            } else if (tn === $.INPUT) {
                inputStartTagInTable(p, token);
            } else {
                tokenInTable(p, token);
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

function endTagInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.TABLE) {
        if (p.openElements.hasInTableScope($.TABLE)) {
            p.openElements.popUntilTagNamePopped($.TABLE);
            p.resetInsertionMode();
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
    p.processTokenInBodyMode(token);
    p.fosterParentingEnabled = savedFosterParentingState;
}

// The "in table text" insertion mode
//------------------------------------------------------------------
function whitespaceCharacterInTableText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken): void {
    p.pendingCharacterTokens.push(token);
}

function characterInTableText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken): void {
    p.pendingCharacterTokens.push(token);
    p.hasNonWhitespacePendingCharacterToken = true;
}

function tokenInTableText<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token): void {
    if (p.hasNonWhitespacePendingCharacterToken) {
        for (const pendingToken of p.pendingCharacterTokens) {
            tokenInTable(p, pendingToken);
        }
    } else {
        for (const pendingToken of p.pendingCharacterTokens) {
            p.insertCharacters(pendingToken);
        }
    }

    p.insertionMode = p.originalInsertionMode;
    p.processToken(token);
}

// The "in caption" insertion mode
//------------------------------------------------------------------
function startTagInCaption<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (
        tn === $.CAPTION ||
        tn === $.COL ||
        tn === $.COLGROUP ||
        tn === $.TBODY ||
        tn === $.TD ||
        tn === $.TFOOT ||
        tn === $.TH ||
        tn === $.THEAD ||
        tn === $.TR
    ) {
        if (p.openElements.hasInTableScope($.CAPTION)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped($.CAPTION);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = INSERTION_MODES.IN_TABLE_MODE;
            p.processToken(token);
        }
    } else {
        startTagInBody(p, token);
    }
}

function endTagInCaption<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.CAPTION || tn === $.TABLE) {
        if (p.openElements.hasInTableScope($.CAPTION)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped($.CAPTION);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = INSERTION_MODES.IN_TABLE_MODE;

            if (tn === $.TABLE) {
                p.processToken(token);
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
function startTagInColumnGroup<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.COL) {
        p.appendElement(token, NS.HTML);
        token.ackSelfClosing = true;
    } else if (tn === $.TEMPLATE) {
        startTagInHead(p, token);
    } else {
        tokenInColumnGroup(p, token);
    }
}

function endTagInColumnGroup<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.COLGROUP) {
        if (p.openElements.currentTagName === $.COLGROUP) {
            p.openElements.pop();
            p.insertionMode = INSERTION_MODES.IN_TABLE_MODE;
        }
    } else if (tn === $.TEMPLATE) {
        endTagInHead(p, token);
    } else if (tn !== $.COL) {
        tokenInColumnGroup(p, token);
    }
}

function tokenInColumnGroup<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.currentTagName === $.COLGROUP) {
        p.openElements.pop();
        p.insertionMode = INSERTION_MODES.IN_TABLE_MODE;
        p.processToken(token);
    }
}

// The "in table body" insertion mode
//------------------------------------------------------------------
function startTagInTableBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.TR) {
        p.openElements.clearBackToTableBodyContext();
        p.insertElement(token, NS.HTML);
        p.insertionMode = INSERTION_MODES.IN_ROW_MODE;
    } else if (tn === $.TH || tn === $.TD) {
        p.openElements.clearBackToTableBodyContext();
        p.insertFakeElement($.TR);
        p.insertionMode = INSERTION_MODES.IN_ROW_MODE;
        p.processToken(token);
    } else if (
        tn === $.CAPTION ||
        tn === $.COL ||
        tn === $.COLGROUP ||
        tn === $.TBODY ||
        tn === $.TFOOT ||
        tn === $.THEAD
    ) {
        if (p.openElements.hasTableBodyContextInTableScope()) {
            p.openElements.clearBackToTableBodyContext();
            p.openElements.pop();
            p.insertionMode = INSERTION_MODES.IN_TABLE_MODE;
            p.processToken(token);
        }
    } else {
        startTagInTable(p, token);
    }
}

function endTagInTableBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.clearBackToTableBodyContext();
            p.openElements.pop();
            p.insertionMode = INSERTION_MODES.IN_TABLE_MODE;
        }
    } else if (tn === $.TABLE) {
        if (p.openElements.hasTableBodyContextInTableScope()) {
            p.openElements.clearBackToTableBodyContext();
            p.openElements.pop();
            p.insertionMode = INSERTION_MODES.IN_TABLE_MODE;
            p.processToken(token);
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
function startTagInRow<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.TH || tn === $.TD) {
        p.openElements.clearBackToTableRowContext();
        p.insertElement(token, NS.HTML);
        p.insertionMode = INSERTION_MODES.IN_CELL_MODE;
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
            p.insertionMode = INSERTION_MODES.IN_TABLE_BODY_MODE;
            p.processToken(token);
        }
    } else {
        startTagInTable(p, token);
    }
}

function endTagInRow<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.TR) {
        if (p.openElements.hasInTableScope($.TR)) {
            p.openElements.clearBackToTableRowContext();
            p.openElements.pop();
            p.insertionMode = INSERTION_MODES.IN_TABLE_BODY_MODE;
        }
    } else if (tn === $.TABLE) {
        if (p.openElements.hasInTableScope($.TR)) {
            p.openElements.clearBackToTableRowContext();
            p.openElements.pop();
            p.insertionMode = INSERTION_MODES.IN_TABLE_BODY_MODE;
            p.processToken(token);
        }
    } else if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
        if (p.openElements.hasInTableScope(tn) || p.openElements.hasInTableScope($.TR)) {
            p.openElements.clearBackToTableRowContext();
            p.openElements.pop();
            p.insertionMode = INSERTION_MODES.IN_TABLE_BODY_MODE;
            p.processToken(token);
        }
    } else if (
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

// The "in cell" insertion mode
//------------------------------------------------------------------
function startTagInCell<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (
        tn === $.CAPTION ||
        tn === $.COL ||
        tn === $.COLGROUP ||
        tn === $.TBODY ||
        tn === $.TD ||
        tn === $.TFOOT ||
        tn === $.TH ||
        tn === $.THEAD ||
        tn === $.TR
    ) {
        if (p.openElements.hasInTableScope($.TD) || p.openElements.hasInTableScope($.TH)) {
            p.closeTableCell();
            p.processToken(token);
        }
    } else {
        startTagInBody(p, token);
    }
}

function endTagInCell<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.TD || tn === $.TH) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped(tn);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = INSERTION_MODES.IN_ROW_MODE;
        }
    } else if (tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD || tn === $.TR) {
        if (p.openElements.hasInTableScope(tn)) {
            p.closeTableCell();
            p.processToken(token);
        }
    } else if (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP && tn !== $.HTML) {
        endTagInBody(p, token);
    }
}

// The "in select" insertion mode
//------------------------------------------------------------------
function startTagInSelect<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.OPTION) {
        if (p.openElements.currentTagName === $.OPTION) {
            p.openElements.pop();
        }

        p.insertElement(token, NS.HTML);
    } else if (tn === $.OPTGROUP) {
        if (p.openElements.currentTagName === $.OPTION) {
            p.openElements.pop();
        }

        if (p.openElements.currentTagName === $.OPTGROUP) {
            p.openElements.pop();
        }

        p.insertElement(token, NS.HTML);
    } else if (tn === $.INPUT || tn === $.KEYGEN || tn === $.TEXTAREA || tn === $.SELECT) {
        if (p.openElements.hasInSelectScope($.SELECT)) {
            p.openElements.popUntilTagNamePopped($.SELECT);
            p.resetInsertionMode();

            if (tn !== $.SELECT) {
                p.processToken(token);
            }
        }
    } else if (tn === $.SCRIPT || tn === $.TEMPLATE) {
        startTagInHead(p, token);
    }
}

function endTagInSelect<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
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
        p.resetInsertionMode();
    } else if (tn === $.TEMPLATE) {
        endTagInHead(p, token);
    }
}

//12.2.5.4.17 The "in select in table" insertion mode
//------------------------------------------------------------------
function startTagInSelectInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
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
        p.resetInsertionMode();
        p.processToken(token);
    } else {
        startTagInSelect(p, token);
    }
}

function endTagInSelectInTable<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
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
            p.resetInsertionMode();
            p.processToken(token);
        }
    } else {
        endTagInSelect(p, token);
    }
}

// The "in template" insertion mode
//------------------------------------------------------------------
function startTagInTemplate<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    const tn = token.tagName;

    if (
        tn === $.BASE ||
        tn === $.BASEFONT ||
        tn === $.BGSOUND ||
        tn === $.LINK ||
        tn === $.META ||
        tn === $.NOFRAMES ||
        tn === $.SCRIPT ||
        tn === $.STYLE ||
        tn === $.TEMPLATE ||
        tn === $.TITLE
    ) {
        startTagInHead(p, token);
    } else {
        const newInsertionMode = TEMPLATE_INSERTION_MODE_SWITCH_MAP[tn] || INSERTION_MODES.IN_BODY_MODE;

        p.popTmplInsertionMode();
        p.pushTmplInsertionMode(newInsertionMode);
        p.insertionMode = newInsertionMode;
        p.processToken(token);
    }
}

function endTagInTemplate<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (token.tagName === $.TEMPLATE) {
        endTagInHead(p, token);
    }
}

function eofInTemplate<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EOFToken): void {
    if (!p.activeFormattingElements) {
        throw new Error('Active formatting elements was not initialised');
    }
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (p.openElements.tmplCount > 0) {
        p.openElements.popUntilTagNamePopped($.TEMPLATE);
        p.activeFormattingElements.clearToLastMarker();
        p.popTmplInsertionMode();
        p.resetInsertionMode();
        p.processToken(token);
    } else {
        p.stopped = true;
    }
}

// The "after body" insertion mode
//------------------------------------------------------------------
function startTagAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (token.tagName === $.HTML) {
        startTagInBody(p, token);
    } else {
        tokenAfterBody(p, token);
    }
}

function endTagAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (token.tagName === $.HTML) {
        if (!p.fragmentContext) {
            p.insertionMode = INSERTION_MODES.AFTER_AFTER_BODY_MODE;
        }
    } else {
        tokenAfterBody(p, token);
    }
}

function tokenAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token): void {
    p.insertionMode = INSERTION_MODES.IN_BODY_MODE;
    p.processToken(token);
}

// The "in frameset" insertion mode
//------------------------------------------------------------------
function startTagInFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.FRAMESET) {
        p.insertElement(token, NS.HTML);
    } else if (tn === $.FRAME) {
        p.appendElement(token, NS.HTML);
        token.ackSelfClosing = true;
    } else if (tn === $.NOFRAMES) {
        startTagInHead(p, token);
    }
}

function endTagInFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (token.tagName === $.FRAMESET && !p.openElements.isRootHtmlElementCurrent()) {
        p.openElements.pop();

        if (!p.fragmentContext && p.openElements.currentTagName !== $.FRAMESET) {
            p.insertionMode = INSERTION_MODES.AFTER_FRAMESET_MODE;
        }
    }
}

// The "after frameset" insertion mode
//------------------------------------------------------------------
function startTagAfterFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.NOFRAMES) {
        startTagInHead(p, token);
    }
}

function endTagAfterFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (token.tagName === $.HTML) {
        p.insertionMode = INSERTION_MODES.AFTER_AFTER_FRAMESET_MODE;
    }
}

// The "after after body" insertion mode
//------------------------------------------------------------------
function startTagAfterAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (token.tagName === $.HTML) {
        startTagInBody(p, token);
    } else {
        tokenAfterAfterBody(p, token);
    }
}

function tokenAfterAfterBody<T extends TreeAdapterTypeMap>(p: Parser<T>, token: Token): void {
    p.insertionMode = INSERTION_MODES.IN_BODY_MODE;
    p.processToken(token);
}

// The "after after frameset" insertion mode
//------------------------------------------------------------------
function startTagAfterAfterFrameset<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.NOFRAMES) {
        startTagInHead(p, token);
    }
}

// The rules for parsing tokens in foreign content
//------------------------------------------------------------------
function nullCharacterInForeignContent<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken): void {
    token.chars = unicode.REPLACEMENT_CHARACTER;
    p.insertCharacters(token);
}

function characterInForeignContent<T extends TreeAdapterTypeMap>(p: Parser<T>, token: CharacterToken): void {
    p.insertCharacters(token);
    p.framesetOk = false;
}

function startTagInForeignContent<T extends TreeAdapterTypeMap>(p: Parser<T>, token: StartTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    if (foreignContent.causesExit(token) && !p.fragmentContext) {
        while (
            p.treeAdapter.getNamespaceURI(p.openElements.current) !== NS.HTML &&
            !p.isIntegrationPoint(p.openElements.current)
        ) {
            p.openElements.pop();
        }

        p.processToken(token);
    } else {
        const current = p.getAdjustedCurrentElement();
        const currentNs = p.treeAdapter.getNamespaceURI(current);

        if (currentNs === NS.MATHML) {
            foreignContent.adjustTokenMathMLAttrs(token);
        } else if (currentNs === NS.SVG) {
            foreignContent.adjustTokenSVGTagName(token);
            foreignContent.adjustTokenSVGAttrs(token);
        }

        foreignContent.adjustTokenXMLAttrs(token);

        if (token.selfClosing) {
            p.appendElement(token, currentNs);
        } else {
            p.insertElement(token, currentNs);
        }

        token.ackSelfClosing = true;
    }
}

function endTagInForeignContent<T extends TreeAdapterTypeMap>(p: Parser<T>, token: EndTagToken): void {
    if (!p.openElements) {
        throw new Error('Open elements stack was not initialised');
    }
    for (let i = p.openElements.stackTop; i > 0; i--) {
        const element = p.openElements.items[i];

        if (p.treeAdapter.getNamespaceURI(element) === NS.HTML) {
            p.processToken(token);
            break;
        }

        if (p.treeAdapter.getTagName(element).toLowerCase() === token.tagName) {
            p.openElements.popUntilElementPopped(element);
            break;
        }
    }
}
