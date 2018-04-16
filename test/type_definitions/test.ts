/// <reference path="../../lib/index.d.ts" />
/// <reference types="node" />
import * as parse5 from '../../lib';
import { createReadStream, createWriteStream } from 'fs';


// Type assertions
//-----------------------------------------------------------------------------------
function assertASTDocument(document: parse5.AST.Document): void { }
function assertASTDocumentFragment(document: parse5.AST.DocumentFragment): void { }
function assertASTElement(element: parse5.AST.Element): void { }
function assertASTTextNode(textNode: parse5.AST.TextNode): void { }
function assertASTCommentNode(commentNode: parse5.AST.CommentNode): void { }
function assertDocumentMode(mode: parse5.AST.DocumentMode): void { }
function assertASTParentNode(node: parse5.AST.ParentNode): void { }
function assertASTNode(node: parse5.AST.Node): void { }
function assertTreeAdapter(adapter: parse5.AST.TreeAdapter): void { }
function assertDefaultASTParentNode(node: parse5.AST.Default.ParentNode): void { }
function assertDefaultASTAttribute(attr: parse5.AST.Default.Attribute): void { }
function assertHtmlParser2ASTParentNode(node: parse5.AST.HtmlParser2.ParentNode): void { }
function assertHtmlParser2ASTNode(node: parse5.AST.HtmlParser2.Node): void { }
function assertString(str: string): void { }
function assertNumber(num: number): void { }
function assertBoolean(bool: boolean): void { }
function assertLocation(loc: parse5.MarkupData.Location): void { }
function assertElementLocation(loc: parse5.MarkupData.ElementLocation): void { }


// Shorthands
//-----------------------------------------------------------------------------------
// parse
var document = parse5.parse('<html>');

assertASTDocument(document);

parse5.parse('<html>', {});
parse5.parse('<html>', { locationInfo: true });
parse5.parse('<html>', { treeAdapter: parse5.treeAdapters.default });
parse5.parse('<html>', { locationInfo: true, treeAdapter: parse5.treeAdapters.default });
parse5.parse('<html>', { locationInfo: true, treeAdapter: parse5.treeAdapters.htmlparser2 });


// parseFragment
var fragment = parse5.parseFragment('<div>');

assertASTDocumentFragment(fragment);

parse5.parseFragment('<div>', {});
parse5.parseFragment('<div>', { locationInfo: true });
parse5.parseFragment('<div>', { treeAdapter: parse5.treeAdapters.default });
parse5.parseFragment('<div>', { locationInfo: true, treeAdapter: parse5.treeAdapters.default });
parse5.parseFragment('<div>', { locationInfo: true, treeAdapter: parse5.treeAdapters.htmlparser2 });


var element = (parse5.parseFragment('<div>') as parse5.AST.Default.DocumentFragment).childNodes[0] as parse5.AST.Element;

parse5.parseFragment(element, '<div>');
parse5.parseFragment(element, '<div>', {});
parse5.parseFragment(element, '<div>', { locationInfo: true });
parse5.parseFragment(element, '<div>', { treeAdapter: parse5.treeAdapters.default });
parse5.parseFragment(element, '<div>', { locationInfo: true, treeAdapter: parse5.treeAdapters.default });
parse5.parseFragment(element, '<div>', { locationInfo: true, treeAdapter: parse5.treeAdapters.htmlparser2 });


// serialize
var html = parse5.serialize(element);

assertString(html);

parse5.serialize(element, { treeAdapter: parse5.treeAdapters.default });
parse5.serialize(element, { treeAdapter: parse5.treeAdapters.htmlparser2 });


// ParserStream
//-----------------------------------------------------------------------------------
var parser = new parse5.ParserStream();

parser = new parse5.ParserStream({ locationInfo: true });
parser = new parse5.ParserStream({ treeAdapter: parse5.treeAdapters.default });
parser = new parse5.ParserStream({ scriptingEnabled: false });
parser = new parse5.ParserStream({ locationInfo: true, treeAdapter: parse5.treeAdapters.default });
parser = new parse5.ParserStream({ locationInfo: true, treeAdapter: parse5.treeAdapters.htmlparser2 });

assertASTDocument(parser.document);

parser
    .on('script', (element: parse5.AST.Element, documentWrite: (html: String) => void, resume: Function) => { })
    .on('finish', () => { });

createReadStream('file').pipe(parser);


// PlainTextConversionStream
//-----------------------------------------------------------------------------------
var converter = new parse5.PlainTextConversionStream();

converter = new parse5.PlainTextConversionStream({ locationInfo: true });
converter = new parse5.PlainTextConversionStream({ treeAdapter: parse5.treeAdapters.default });
converter = new parse5.PlainTextConversionStream({ locationInfo: true, treeAdapter: parse5.treeAdapters.default });
converter = new parse5.PlainTextConversionStream({ locationInfo: true, treeAdapter: parse5.treeAdapters.htmlparser2 });

assertASTDocument(converter.document);

converter.on('finish', () => { });

createReadStream('file').pipe(converter);


// SAXParserStream
//-----------------------------------------------------------------------------------
var sax = new parse5.SAXParser();

sax = new parse5.SAXParser({ locationInfo: true });

sax.stop();

sax
    .on('startTag', (name: string, attrs: parse5.AST.Default.Attribute[], selfClosing: boolean, locationInfo?: parse5.MarkupData.StartTagLocation) => { })
    .on('endTag', (name: string, location?: parse5.MarkupData.Location) => { })
    .on('comment', (text: string, location?: parse5.MarkupData.Location) => { })
    .on('text', (text: string, location?: parse5.MarkupData.Location) => { })
    .on('doctype', (name: string, publicId: string, systemId: string, location?: parse5.MarkupData.Location) => { })
    .on('finish', () => { });

createReadStream('file1').pipe(sax).pipe(createWriteStream('file2'));


// SerializerStream
//-----------------------------------------------------------------------------------
var serializer = new parse5.SerializerStream(element);

serializer = new parse5.SerializerStream(element, { treeAdapter: parse5.treeAdapters.default });
serializer = new parse5.SerializerStream(element, { treeAdapter: parse5.treeAdapters.htmlparser2 });

serializer.pipe(createWriteStream('file'));


// Location info
//-----------------------------------------------------------------------------------
var loc = (element as parse5.AST.Default.Element).__location;

assertNumber(loc.line);
assertNumber(loc.col);
assertNumber(loc.startOffset);
assertNumber(loc.endOffset);

assertNumber(loc.startTag.line);
assertNumber(loc.startTag.col);
assertNumber(loc.startTag.startOffset);
assertNumber(loc.startTag.endOffset);

assertNumber(loc.startTag.attrs['someAttr'].line);
assertNumber(loc.startTag.attrs['someAttr'].col);
assertNumber(loc.startTag.attrs['someAttr'].startOffset);
assertNumber(loc.startTag.attrs['someAttr'].endOffset);

assertNumber(loc.endTag.line);
assertNumber(loc.endTag.col);
assertNumber(loc.endTag.startOffset);
assertNumber(loc.endTag.endOffset);


// Default AST
//-----------------------------------------------------------------------------------
var defaultDocument = document as parse5.AST.Default.Document;

assertString(defaultDocument.nodeName);
assertString(defaultDocument.mode);

var defaultDoctype = document as parse5.AST.Default.DocumentType;

assertString(defaultDoctype.name);
assertString(defaultDoctype.publicId);
assertString(defaultDoctype.systemId);

var defaultDocumentFragment = fragment as parse5.AST.Default.DocumentFragment;

assertString(defaultDocumentFragment.nodeName);

var defaultElement = defaultDocument.childNodes[0] as parse5.AST.Default.Element;

assertElementLocation(defaultElement.__location);
assertString(defaultElement.namespaceURI);
assertString(defaultElement.nodeName);
assertString(defaultElement.tagName);
assertDefaultASTParentNode(defaultElement.parentNode);

var defaultAttr = defaultElement.attrs[0];

assertString(defaultAttr.name);
assertString(defaultAttr.namespace);
assertString(defaultAttr.prefix);
assertString(defaultAttr.value);

var defaultTextNode = defaultDocumentFragment.childNodes[0] as parse5.AST.Default.TextNode;

assertLocation(defaultTextNode.__location);
assertString(defaultTextNode.nodeName);
assertString(defaultTextNode.value);
assertDefaultASTParentNode(defaultTextNode.parentNode);

var defaultCommentNode = defaultDocumentFragment.childNodes[0] as parse5.AST.Default.CommentNode;

assertLocation(defaultCommentNode.__location);
assertString(defaultCommentNode.nodeName);
assertString(defaultCommentNode.data);
assertDefaultASTParentNode(defaultCommentNode.parentNode);


// htmlparser2 AST
//-----------------------------------------------------------------------------------
var htmlparser2Node = document as parse5.AST.HtmlParser2.Node;

assertHtmlParser2ASTNode(htmlparser2Node.next);
assertHtmlParser2ASTNode(htmlparser2Node.nextSibling);
assertNumber(htmlparser2Node.nodeType);
assertHtmlParser2ASTParentNode(htmlparser2Node.parent);
assertHtmlParser2ASTParentNode(htmlparser2Node.parentNode);
assertHtmlParser2ASTNode(htmlparser2Node.prev);
assertHtmlParser2ASTNode(htmlparser2Node.previousSibling);
assertString(htmlparser2Node.type);

var htmlparser2ParentNode = document as parse5.AST.HtmlParser2.ParentNode;

assertHtmlParser2ASTNode(htmlparser2ParentNode);
assertHtmlParser2ASTNode(htmlparser2ParentNode.childNodes[0]);
assertHtmlParser2ASTNode(htmlparser2ParentNode.children[0]);
assertHtmlParser2ASTNode(htmlparser2ParentNode.firstChild);
assertHtmlParser2ASTNode(htmlparser2ParentNode.lastChild);

var htmlparser2Document = document as parse5.AST.HtmlParser2.Document;

assertHtmlParser2ASTParentNode(htmlparser2Document);
assertString(htmlparser2Document.name);
assertString(htmlparser2Document.type);
assertString(htmlparser2Document['x-mode']);

var htmlparser2Doctype = htmlparser2Document.children[0] as parse5.AST.HtmlParser2.DocumentType;

assertHtmlParser2ASTNode(htmlparser2Doctype);
assertString(htmlparser2Doctype.data);
assertString(htmlparser2Doctype.name);
assertString(htmlparser2Doctype['x-name']);
assertString(htmlparser2Doctype['x-publicId']);
assertString(htmlparser2Doctype['x-systemId']);

var htmlparser2Element = htmlparser2Document.childNodes[0] as parse5.AST.HtmlParser2.Element;

assertHtmlParser2ASTParentNode(htmlparser2Element);
assertString(htmlparser2Element.attribs['someAttr']);
assertString(htmlparser2Element['x-attribsNamespace']['someAttr']);
assertString(htmlparser2Element['x-attribsPrefix']['someAttr']);
assertString(htmlparser2Element.namespace);
assertString(htmlparser2Element.tagName);
assertElementLocation(htmlparser2Element.__location);

var htmlparser2TextNode = htmlparser2Document.firstChild as parse5.AST.HtmlParser2.TextNode;

assertString(htmlparser2TextNode.data);
assertString(htmlparser2TextNode.nodeValue);
assertLocation(htmlparser2TextNode.__location);

var htmlparser2CommentNode = htmlparser2Document.lastChild as parse5.AST.HtmlParser2.CommentNode;

assertString(htmlparser2CommentNode.data);
assertString(htmlparser2CommentNode.nodeValue);
assertLocation(htmlparser2CommentNode.__location);


// TreeAdapter
//-----------------------------------------------------------------------------------
assertTreeAdapter(parse5.treeAdapters.default);
assertTreeAdapter(parse5.treeAdapters.htmlparser2);

var adapter = parse5.treeAdapters.default;

assertASTDocument(adapter.createDocument());
assertASTDocumentFragment(adapter.createDocumentFragment);
assertASTElement(adapter.createElement('div', 'namespace', [{ name: 'someAttr', value: '42' }]));
assertASTCommentNode(adapter.createCommentNode('foo'));

adapter.appendChild(document, element);
adapter.insertBefore(document, element, element);
adapter.setTemplateContent(element, fragment);

assertASTDocumentFragment(adapter.getTemplateContent(element));

adapter.setDocumentType(document, 'name', 'publicId', 'systemId');
adapter.setDocumentMode(document, 'quirks');

assertDocumentMode(adapter.getDocumentMode(document));

adapter.detachNode(element);
adapter.insertText(element, 'text');
adapter.insertTextBefore(document, 'text', element);
adapter.adoptAttributes(element, [{ name: 'someAttr', value: '42' }]);

assertASTNode(adapter.getFirstChild(element));
assertASTNode(adapter.getChildNodes(element)[0]);
assertASTParentNode(adapter.getParentNode(element));
assertDefaultASTAttribute(adapter.getAttrList(element)[0]);
assertString(adapter.getTagName(element));
assertString(adapter.getNamespaceURI(element));
assertString(adapter.getTextNodeContent(defaultTextNode));
assertString(adapter.getCommentNodeContent(defaultCommentNode));
assertString(adapter.getDocumentTypeNodeName(defaultDoctype));
assertString(adapter.getDocumentTypeNodePublicId(defaultDoctype));
assertString(adapter.getDocumentTypeNodeSystemId(defaultDoctype));
assertBoolean(adapter.isTextNode(element));
assertBoolean(adapter.isCommentNode(element));
assertBoolean(adapter.isDocumentTypeNode(element));
assertBoolean(adapter.isElementNode(element));

