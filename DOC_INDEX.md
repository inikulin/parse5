<p align="center">
  <img src="https://raw.github.com/inikulin/parse5/master/media/logo.png" alt="parse5" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/parse5"><img alt="NPM Version" src="https://img.shields.io/npm/v/parse5.svg"></a>
</p>

<p align="center">
<i>HTML parsing/serialization toolset for Node.js. <a href="https://html.spec.whatwg.org/multipage/">WHATWG HTML Living Standard (aka HTML5)</a>-compliant.</i>
</p>

## Table of contents

 * [Install](#install)
 * [Which API should I use?](#which-api-should-i-use-)
 * [TypeScript definitions](#typescript-definitions)
 * [API Reference](globals.html)
 * [FAQ](#faq)
 * [Version history](#version-history)
 * [GitHub repository](https://github.com/inikulin/parse5)

## Install
```
$ npm install parse5
```

## Which API should I use?

### *"I need to parse a HTML string"*
Use [parse5.parse](globals.html#parse) method.

### *"I need to parse a HTML fragment string"* or *"I need to implement an `innerHTML` setter."*
Use [parse5.parseFragment](globals.html#parsefragment) method.

### *"I need to serialize a node to HTML string"*
Use [parse5.serialize](globals.html#serialize) method.

### *"I need to parse HTML streamed from network or from file."* or *"I need to implement `<script>` execution and `document.write`"*
Use [parse5.ParserStream](classes/parserstream.html) class.

### *"I don't need a document tree, but I need a basic information about tags or attributes"* or *"I need to extract a text content from huge amount of documents"* or *"I need to analyze content that going through my proxy server"*.
Use [parse5.SAXParser](classes/saxparser.html) class.

### *"I need to parse plain text file as HTML document like browsers do"*
Use [parse5.PlainTextConversionStream](classes/plaintextconversionstream.html) class.

### *"I need to serialize a node and stream result to file or network"*
Use [parse5.SerializerStream](classes/serializerstream.html) class.

### *"I need a source file location information for the parsed document"*
Use `locationInfo` options: [ParserOptions.locationInfo](interfaces/options.parseroptions.html#locationinfo), [SAXParserOptions.locationInfo](interfaces/options.saxparseroptions.html#locationinfo).

### *"I need to switch output tree format"*
Use `treeAdapter` options: [ParserOptions.treeAdapter](interfaces/options.parseroptions.html#treeadapter) and [SerializerOptions.treeAdapter](interfaces/options.serializeroptions.html#treeadapter)
with one of two [built-in tree formats](globals.html#treeadapters).

### *"I need to implement my own tree format"*
Implement [TreeAdapter](interfaces/ast.treeadapter.html) interface and then use [treeAdapter](#-i-need-to-switch-output-tree-format-) option to pass it to parser or serializer.

## TypeScript definitions
parse5 package includes a TypeScript definition file.
Due to [multiple issues](https://github.com/inikulin/parse5/issues/235) typings are not enabled
by default. To use built-in parse5 typings you need first install [@types/node](https://www.npmjs.com/package/@types/node)
if you don't have it installed yet and add following lines to your `tsconfig.json` file:

```json
// snip...
"compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "parse5": ["./node_modules/parse5/lib/index.d.ts"]
    },
    // snip...
```

Note that since parse5 supports multiple output tree formats you need to manually cast generic node interfaces to the
appropriate tree format to get access to the properties:

```typescript
import * as parse5 from 'parse5';

// Using default tree adapter.
var document1 = parse5.parse('<div></div>') as parse5.AST.Default.Document;

// Using htmlparser2 tree adapter.
var document2 = parse5.parse('<div></div>', {
    treeAdapter: parse5.TreeAdapters.htmlparser2
}) as parse5.AST.HtmlParser2.Document;

```

You can find documentation for interfaces in [API reference](globals.html).


## FAQ

### Q: I want to work with my own document tree format. How can I do this?

You can create a custom tree adapter, so that parse5 can work with your own DOM-tree implementation.
Then pass it to the parser or serializer via the `treeAdapter` option:

```js
const parse5 = require('parse5');

const myTreeAdapter = {
   //Adapter methods...
};

const document = parse5.parse('<div></div>', { treeAdapter: myTreeAdapter });

const html = parse5.serialize(document, { treeAdapter: myTreeAdapter });
```
Refer to the [API reference](#TreeAdapter) for the description of methods that should be exposed by the tree adapter, as well as links to their
default implementation.

### Q: How can I use parse5 in the browser?

Compile it with [browserify](http://browserify.org/) and you're set.

### Q: I'm parsing `<img src="foo">` with the `SAXParser` and I expect the `selfClosing` flag to be `true` for the `<img>` tag. But it's not. Is there something wrong with the parser?

No. A self-closing tag is a tag that has a `/` before the closing bracket. E.g: `<br/>`, `<meta/>`.
In the provided example, the tag simply doesn't have an end tag. Self-closing tags and tags without end tags are treated differently by the
parser: in case of a self-closing tag, the parser does not look up for the corresponding closing tag and expects the element not to have any content.
But if a start tag is not self-closing, the parser treats everything that follows it (with a few exceptions) as the element content.
However, if the start tag is in the list of [void elements](https://html.spec.whatwg.org/multipage/syntax.html#void-elements), the parser expects the corresponding
element not to have content and behaves in the same way as if the element was self-closing. So, semantically, if an element is
void, self-closing tags and tags without closing tags are equivalent, but it's not true for other tags.

**TL;DR**: `selfClosing` is a part of lexical information and is set only if the tag has `/` before the closing bracket in the source code.

### Q: I have some weird output from the parser, seems like a bug.

Most likely, it's not. There are a lot of weird edge cases in HTML5 parsing algorithm, e.g.:
```html
<b>1<p>2</b>3</p>
```

will be parsed as

```html
<b>1</b><p><b>2</b>3</p>
```

Just try it in the latest version of your browser before submitting an issue.

## Version history
### 4.0.0
This is a major release that delivers few minor (but breaking) changes to workaround recently appeared
issues with TypeScript Node.js typings versioning and usage of parse5 in environments that are
distinct from Node.js (see https://github.com/inikulin/parse5/issues/235 for the details).

* Updated (**breaking**): TypeScript were disabled by default. See [TypeScript definitions](#typescript-definitions) section
for the details on how to enable them.
* Updated: API that depends on Node.js specific (namely `ParserStream`, `PlainTextConversionStream`,
`SerializerStream`, `SAXParser`) is now lazily loaded. That enables bundling of the basic functionality
for other platforms (e.g. for browsers via webpack).

### 3.0.3
* Fixed: Loosen the dependency version of `@types/node` (by [@gfx](https://github.com/gfx)).
* Fixed: Incorrect AST generated if empty string fed to `ParserStream` (GH [#195](https://github.com/inikulin/parse5/issues/195)) (by [@stevenvachon](https://github.com/stevenvachon)).

### 3.0.2
* Fixed: `location.startTag` is not available if end tag is missing (GH [#181](https://github.com/inikulin/parse5/issues/181)).

### 3.0.1
* Fixed: `MarkupData.Location.col` description in TypeScript definition file (GH [#170](https://github.com/inikulin/parse5/issues/170)).

### 3.0.0
* Added: parse5 now ships with TypeScript definitions from which [new documentation website](http://inikulin.github.io/parse5/) is generated (GH [#125](https://github.com/inikulin/parse5/issues/125)).
* Added: [PlainTextConversionStream](http://inikulin.github.io/parse5/classes/plaintextconversionstream.html) (GH [#135](https://github.com/inikulin/parse5/issues/135)).
* Updated: [Significantly reduced initial memory consumption](https://github.com/inikulin/parse5/tree/master/scripts/generate_named-entity-data#named-entity-array-mapped-radix-tree-generator) (GH [#52](https://github.com/inikulin/parse5/issues/52)).
* Updated (**breaking**): Added support for limited quirks mode. `document.quirksMode` property was replaced with `document.mode` property which can have
 `'no-quirks'`, `'quirks'` and `'limited-quirks'` values. Tree adapter `setQuirksMode ` and `isQuirksMode` methods were replaced with `setDocumentMode` and `getDocumentMode` methods (GH [#83](https://github.com/inikulin/parse5/issues/83)).
* Updated (**breaking**): AST collections (e.g. attributes dictionary) don't have prototype anymore (GH [#119](https://github.com/inikulin/parse5/issues/119)).
* Updated (**breaking**): Doctype now always serialized as `<!DOCTYPE html>` as per spec (GH [#137](https://github.com/inikulin/parse5/issues/137)).
* Fixed: Incorrect line for `__location.endTag` when the start tag contains newlines (GH [#166](https://github.com/inikulin/parse5/issues/166)) (by [@webdesus](https://github.com/webdesus)).

### 2.2.3
 * Fixed: Fixed incorrect LocationInfo.endOffset for non-implicitly closed elements (refix for GH [#109](https://github.com/inikulin/parse5/issues/109)) (by [@wooorm](https://github.com/wooorm)).

### 2.2.2
 * Fixed: Incorrect location info for text in SAXParser (GH [#153](https://github.com/inikulin/parse5/issues/153)).
 * Fixed: Incorrect `LocationInfo.endOffset` for implicitly closed `<p>` element (GH [#109](https://github.com/inikulin/parse5/issues/109)).
 * Fixed: Infinite input data buffering in streaming parsers. Now parsers try to not buffer more than 64K of input data.
 However, there are still some edge cases left that will lead to significant memory consumption, but they are quite exotic
 and extremely rare in the wild (GH [#102](https://github.com/inikulin/parse5/issues/102), GH [#130](https://github.com/inikulin/parse5/issues/130));


### 2.2.1
 * Fixed: SAXParser HTML integration point handling for adjustable SVG tags.
 * Fixed: SAXParser now adjust SVG tag names for end tags.
 * Fixed: Location info line calculation on tokenizer character unconsumption (by [@ChadKillingsworth](https://github.com/ChadKillingsworth)).

### 2.2.0
* SAXParser (by [@RReverser](https://github.com/RReverser))
 * Fixed: Handling of `\n` in `<pre>`, `<textarea>` and `<listing>`.
 * Fixed: Tag names and attribute names adjustment in foreign content (GH [#99](https://github.com/inikulin/parse5/issues/99)).
 * Fixed: Handling of `<image>`.

* Latest spec changes
 * Updated: `<isindex>` now don't have special handling (GH [#122](https://github.com/inikulin/parse5/issues/122)).
 * Updated: Adoption agency algorithm now preserves lexical order of text nodes (GH [#129](https://github.com/inikulin/parse5/issues/129)).
 * Updated: `<menuitem>` now behaves like `<option>`.

* Fixed: Element nesting corrections now take namespaces into consideration.

### 2.1.5
 * Fixed: ParserStream accidentally hangs up on scripts (GH [#101](https://github.com/inikulin/parse5/issues/101)).

### 2.1.4
 * Fixed: Keep ParserStream sync for the inline scripts (GH [#98](https://github.com/inikulin/parse5/issues/98) follow up).

### 2.1.3
 * Fixed: Synchronously calling resume() leads to crash (GH [#98](https://github.com/inikulin/parse5/issues/98)).

### 2.1.2
 * Fixed: SAX parser silently exits on big files (GH [#97](https://github.com/inikulin/parse5/issues/97)).

### 2.1.1
 * Fixed: location info not attached for empty attributes (GH [#96](https://github.com/inikulin/parse5/issues/96))
 (by [@yyx990803](https://github.com/yyx990803)).

### 2.1.0
 * Added: location info for attributes (GH [#43](https://github.com/inikulin/parse5/issues/43)) (by [@sakagg](https://github.com/sakagg)
  and [@yyx990803](https://github.com/yyx990803)).
 * Fixed: `parseFragment` with `locationInfo` regression when parsing `<template>`(GH [#90](https://github.com/inikulin/parse5/issues/90))
  (by [@yyx990803](https://github.com/yyx990803)).

### 2.0.2
 * Fixed: yet another case of incorrect `parseFragment` arguments fallback (GH [#84](https://github.com/inikulin/parse5/issues/84)).

### 2.0.1
 * Fixed: `parseFragment` arguments processing (GH [#82](https://github.com/inikulin/parse5/issues/82)).

### 2.0.0
 * Added: [ParserStream](https://github.com/inikulin/parse5/wiki/Documentation#parse5+ParserStream) with the scripting support. (GH [#26](https://github.com/inikulin/parse5/issues/26)).
 * Added: [SerializerStream](https://github.com/inikulin/parse5/wiki/Documentation#parse5+SerializerStream). (GH [#26](https://github.com/inikulin/parse5/issues/26)).
 * Added: Line/column location info. (GH [#67](https://github.com/inikulin/parse5/issues/67)).
 * Update (**breaking**): Location info properties `start` and `end` were renamed to `startOffset` and `endOffset` respectively.
 * Update (**breaking**): `SimpleApiParser` was renamed to [SAXParser](https://github.com/inikulin/parse5/wiki/Documentation#parse5+SAXParser).
 * Update (**breaking**): [SAXParser](https://github.com/inikulin/parse5/wiki/Documentation#parse5+SAXParser) is the [transform stream](https://nodejs.org/api/stream.html#stream_class_stream_transform)
   now. (GH [#26](https://github.com/inikulin/parse5/issues/26)).
 * Update (**breaking**): [SAXParser](https://github.com/inikulin/parse5/wiki/Documentation#parse5+SAXParser) handler subscription is done via events now.
 * Added: [SAXParser.stop()](https://github.com/inikulin/parse5/wiki/Documentation#parse5+SAXParser+stop). (GH [#47](https://github.com/inikulin/parse5/issues/47)).
 * Add (**breaking**): [parse5.parse()](https://github.com/inikulin/parse5/wiki/Documentation#parse5+parse) and [parse5.parseFragment()](https://github.com/inikulin/parse5/wiki/Documentation#parse5+parseFragment)
   methods as replacement for the `Parser` class.
 * Add (**breaking**): [parse5.serialize()](https://github.com/inikulin/parse5/wiki/Documentation#parse5+serialized) method as replacement for the `Serializer` class.
 * Updated: parsing algorithm was updated with the latest [HTML spec](https://html.spec.whatwg.org/) changes.
 * Removed (**breaking**): `decodeHtmlEntities` and `encodeHtmlEntities` options. (GH [#75](https://github.com/inikulin/parse5/issues/75)).
 * Add (**breaking**): [TreeAdapter.setTemplateContent()](https://github.com/inikulin/parse5/wiki/Documentation#TreeAdapter.setTemplateContent) and [TreeAdapter.getTemplateContent()](https://github.com/inikulin/parse5/wiki/Documentation#TreeAdapter.getTemplateContent) methods. (GH [#78](https://github.com/inikulin/parse5/issues/78)).
 * Update (**breaking**): `default` tree adapter now stores `<template>` content in `template.content` property instead of `template.childNodes[0]`.

### 1.5.1
 * Fixed: Qualified tag name emission in Serializer (GH [#79](https://github.com/inikulin/parse5/issues/79)).

### 1.5.0
 * Added: Location info for the element start and end tags (by [@sakagg](https://github.com/sakagg)).

### 1.4.2
 * Fixed: htmlparser2 tree adapter `DocumentType.data` property rendering (GH [#45](https://github.com/inikulin/parse5/issues/45)).

### 1.4.1
 * Fixed: Location info handling for the implicitly generated `<html>` and `<body>` elements (GH [#44](https://github.com/inikulin/parse5/issues/44)).

### 1.4.0
 * Added: Parser [decodeHtmlEntities](https://github.com/inikulin/parse5#optionsdecodehtmlentities) option.
 * Added: SimpleApiParser [decodeHtmlEntities](https://github.com/inikulin/parse5#optionsdecodehtmlentities-1) option.
 * Added: Parser [locationInfo](https://github.com/inikulin/parse5#optionslocationinfo) option.
 * Added: SimpleApiParser [locationInfo](https://github.com/inikulin/parse5#optionslocationinfo-1) option.

### 1.3.2
 * Fixed: `<form>` processing in `<template>` (GH [#40](https://github.com/inikulin/parse5/issues/40)).

### 1.3.1
 * Fixed: text node in `<template>` serialization problem with custom tree adapter (GH [#38](https://github.com/inikulin/parse5/issues/38)).

### 1.3.0
 * Added: Serializer `encodeHtmlEntities` option.

### 1.2.0
 * Added: `<template>` support
 * `parseFragment` now uses `<template>` as default `contextElement`. This leads to the more "forgiving" parsing manner.
 * `TreeSerializer` was renamed to `Serializer`. However, serializer is accessible as `parse5.TreeSerializer` for backward compatibility .

### 1.1.6
 * Fixed: apply latest changes to the `htmlparser2` tree format (DOM Level1 node emulation).

### 1.1.5
 * Added: [jsdom](https://github.com/tmpvar/jsdom)-specific parser with scripting support. Undocumented for `jsdom` internal use only.

### 1.1.4
 * Added: logo
 * Fixed: use fake `document` element for fragment parsing (required by [jsdom](https://github.com/tmpvar/jsdom)).

### 1.1.3
 * Development files (e.g. `.travis.yml`, `.editorconfig`) are removed from NPM package.

### 1.1.2
 * Fixed: crash on Linux due to upper-case leading character in module name used in `require()`.

### 1.1.1
 * Added: [SimpleApiParser](https://github.com/inikulin/parse5/#class-simpleapiparser).
 * Fixed: new line serialization in `<pre>`.
 * Fixed: `SYSTEM`-only `DOCTYPE` serialization.
 * Fixed: quotes serialization in `DOCTYPE` IDs.

### 1.0.0
 * First stable release, switch to semantic versioning.

### 0.8.3
 * Fixed: siblings calculation bug in `appendChild` in `htmlparser2` tree adapter.

### 0.8.1
 * Added: [TreeSerializer](https://github.com/inikulin/parse5/#class-serializer).
 * Added: [htmlparser2 tree adapter](https://github.com/inikulin/parse5/#-treeadaptershtmlparser2).

### 0.6.1
 * Fixed: incorrect `<menuitem>` handling in `<body>`.

### 0.6.0
 * Initial release.
