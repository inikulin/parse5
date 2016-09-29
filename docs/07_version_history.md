# Version history

## 2.2.2
 * Fixed: Incorrect location info for text in SAXParser (GH [#153](https://github.com/inikulin/parse5/issues/153)).
 * Fixed: Incorrect `LocationInfo.endOffset` for implicitly closed `<p>` element (GH [#109](https://github.com/inikulin/parse5/issues/109)).
 * Fixed: Infinite input data buffering in streaming parsers. Now parsers try to not buffer more than 64K of input data.
 However, there are still some edge cases left that will lead to significant memory consumption, but they are quite exotic
 and extremely rare in the wild (GH [#102](https://github.com/inikulin/parse5/issues/102), GH [#130](https://github.com/inikulin/parse5/issues/130));


## 2.2.1
 * Fixed: SAXParser HTML integration point handling for adjustable SVG tags.
 * Fixed: SAXParser now adjust SVG tag names for end tags.
 * Fixed: Location info line calculation on tokenizer character unconsumption (by [@ChadKillingsworth](https://github.com/ChadKillingsworth)).

## 2.2.0
* SAXParser (by [@RReverser](https://github.com/RReverser))
 * Fixed: Handling of `\n` in `<pre>`, `<textarea>` and `<listing>`.
 * Fixed: Tag names and attribute names adjustment in foreign content (GH [#99](https://github.com/inikulin/parse5/issues/99)).
 * Fixed: Handling of `<image>`.

* Latest spec changes
 * Updated: `<isindex>` now don't have special handling (GH [#122](https://github.com/inikulin/parse5/issues/122)).
 * Updated: Adoption agency algorithm now preserves lexical order of text nodes (GH [#129](https://github.com/inikulin/parse5/issues/129)).
 * Updated: `<menuitem>` now behaves like `<option>`.

* Fixed: Element nesting corrections now take namespaces into consideration.

## 2.1.5
 * Fixed: ParserStream accidentally hangs up on scripts (GH [#101](https://github.com/inikulin/parse5/issues/101)).

## 2.1.4
 * Fixed: Keep ParserStream sync for the inline scripts (GH [#98](https://github.com/inikulin/parse5/issues/98) follow up).

## 2.1.3
 * Fixed: Synchronously calling resume() leads to crash (GH [#98](https://github.com/inikulin/parse5/issues/98)).

## 2.1.2
 * Fixed: SAX parser silently exits on big files (GH [#97](https://github.com/inikulin/parse5/issues/97)).

## 2.1.1
 * Fixed: location info not attached for empty attributes (GH [#96](https://github.com/inikulin/parse5/issues/96))
 (by [@yyx990803](https://github.com/yyx990803)).

## 2.1.0
 * Added: location info for attributes (GH [#43](https://github.com/inikulin/parse5/issues/43)) (by [@sakagg](https://github.com/sakagg)
  and [@yyx990803](https://github.com/yyx990803)).
 * Fixed: `parseFragment` with `locationInfo` regression when parsing `<template>`(GH [#90](https://github.com/inikulin/parse5/issues/90))
  (by [@yyx990803](https://github.com/yyx990803)).

## 2.0.2
 * Fixed: yet another case of incorrect `parseFragment` arguments fallback (GH [#84](https://github.com/inikulin/parse5/issues/84)).

## 2.0.1
 * Fixed: `parseFragment` arguments processing (GH [#82](https://github.com/inikulin/parse5/issues/82)).

## 2.0.0
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

## 1.5.1
 * Fixed: Qualified tag name emission in Serializer (GH [#79](https://github.com/inikulin/parse5/issues/79)).

## 1.5.0
 * Added: Location info for the element start and end tags (by [@sakagg](https://github.com/sakagg)).

## 1.4.2
 * Fixed: htmlparser2 tree adapter `DocumentType.data` property rendering (GH [#45](https://github.com/inikulin/parse5/issues/45)).

## 1.4.1
 * Fixed: Location info handling for the implicitly generated `<html>` and `<body>` elements (GH [#44](https://github.com/inikulin/parse5/issues/44)).

## 1.4.0
 * Added: Parser [decodeHtmlEntities](https://github.com/inikulin/parse5#optionsdecodehtmlentities) option.
 * Added: SimpleApiParser [decodeHtmlEntities](https://github.com/inikulin/parse5#optionsdecodehtmlentities-1) option.
 * Added: Parser [locationInfo](https://github.com/inikulin/parse5#optionslocationinfo) option.
 * Added: SimpleApiParser [locationInfo](https://github.com/inikulin/parse5#optionslocationinfo-1) option.

## 1.3.2
 * Fixed: `<form>` processing in `<template>` (GH [#40](https://github.com/inikulin/parse5/issues/40)).

## 1.3.1
 * Fixed: text node in `<template>` serialization problem with custom tree adapter (GH [#38](https://github.com/inikulin/parse5/issues/38)).

## 1.3.0
 * Added: Serializer `encodeHtmlEntities` option.

## 1.2.0
 * Added: `<template>` support
 * `parseFragment` now uses `<template>` as default `contextElement`. This leads to the more "forgiving" parsing manner.
 * `TreeSerializer` was renamed to `Serializer`. However, serializer is accessible as `parse5.TreeSerializer` for backward compatibility .

## 1.1.6
 * Fixed: apply latest changes to the `htmlparser2` tree format (DOM Level1 node emulation).

## 1.1.5
 * Added: [jsdom](https://github.com/tmpvar/jsdom)-specific parser with scripting support. Undocumented for `jsdom` internal use only.

## 1.1.4
 * Added: logo
 * Fixed: use fake `document` element for fragment parsing (required by [jsdom](https://github.com/tmpvar/jsdom)).

## 1.1.3
 * Development files (e.g. `.travis.yml`, `.editorconfig`) are removed from NPM package.

## 1.1.2
 * Fixed: crash on Linux due to upper-case leading character in module name used in `require()`.

## 1.1.1
 * Added: [SimpleApiParser](https://github.com/inikulin/parse5/#class-simpleapiparser).
 * Fixed: new line serialization in `<pre>`.
 * Fixed: `SYSTEM`-only `DOCTYPE` serialization.
 * Fixed: quotes serialization in `DOCTYPE` IDs.

## 1.0.0
 * First stable release, switch to semantic versioning.

## 0.8.3
 * Fixed: siblings calculation bug in `appendChild` in `htmlparser2` tree adapter.

## 0.8.1
 * Added: [TreeSerializer](https://github.com/inikulin/parse5/#class-serializer).
 * Added: [htmlparser2 tree adapter](https://github.com/inikulin/parse5/#-treeadaptershtmlparser2).

## 0.6.1
 * Fixed: incorrect `<menuitem>` handling in `<body>`.

## 0.6.0
 * Initial release.
