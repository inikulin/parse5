# Version history

## 2.1.3
 * Fixed: Synchronously calling resume() leads to crash (GH [#98](https://github.com/inikulin/parse5/issues/98)).

## 2.1.2
 * Fixed: SAX parser silently exits on big files (GH [#97](https://github.com/inikulin/parse5/issues/97)).

## 2.1.1
 * Fixed: location info not attached for empty attributes (GH [#96](https://github.com/inikulin/parse5/issues/96))
 (by [@yyx990803](https://github.com/yyx990803)).

## 2.1.0
 * Add: location info for attributes (GH [#43](https://github.com/inikulin/parse5/issues/43)) (by [@sakagg](https://github.com/sakagg)
  and [@yyx990803](https://github.com/yyx990803)).
 * Fixed: `parseFragment` with `locationInfo` regression when parsing `<template>`(GH [#90](https://github.com/inikulin/parse5/issues/90))
  (by [@yyx990803](https://github.com/yyx990803)).

## 2.0.2
 * Fixed: yet another case of incorrect `parseFragment` arguments fallback (GH [#84](https://github.com/inikulin/parse5/issues/84)).

## 2.0.1
 * Fixed: `parseFragment` arguments processing (GH [#82](https://github.com/inikulin/parse5/issues/82)).

## 2.0.0
 * Add: [ParserStream](https://github.com/inikulin/parse5/wiki/Documentation#parse5+ParserStream) with the scripting support. (GH [#26](https://github.com/inikulin/parse5/issues/26)).
 * Add: [SerializerStream](https://github.com/inikulin/parse5/wiki/Documentation#parse5+SerializerStream). (GH [#26](https://github.com/inikulin/parse5/issues/26)).
 * Add: Line/column location info. (GH [#67](https://github.com/inikulin/parse5/issues/67)).
 * Update (**breaking**): Location info properties `start` and `end` were renamed to `startOffset` and `endOffset` respectively.
 * Update (**breaking**): `SimpleApiParser` was renamed to [SAXParser](https://github.com/inikulin/parse5/wiki/Documentation#parse5+SAXParser).
 * Update (**breaking**): [SAXParser](https://github.com/inikulin/parse5/wiki/Documentation#parse5+SAXParser) is the [transform stream](https://nodejs.org/api/stream.html#stream_class_stream_transform)
   now. (GH [#26](https://github.com/inikulin/parse5/issues/26)).
 * Update (**breaking**): [SAXParser](https://github.com/inikulin/parse5/wiki/Documentation#parse5+SAXParser) handler subscription is done via events now.
 * Add: [SAXParser.stop()](https://github.com/inikulin/parse5/wiki/Documentation#parse5+SAXParser+stop). (GH [#47](https://github.com/inikulin/parse5/issues/47)).
 * Add (**breaking**): [parse5.parse()](https://github.com/inikulin/parse5/wiki/Documentation#parse5+parse) and [parse5.parseFragment()](https://github.com/inikulin/parse5/wiki/Documentation#parse5+parseFragment)
   methods as replacement for the `Parser` class.
 * Add (**breaking**): [parse5.serialize()](https://github.com/inikulin/parse5/wiki/Documentation#parse5+serialized) method as replacement for the `Serializer` class.
 * Update: parsing algorithm was updated with the latest [HTML spec](https://html.spec.whatwg.org/) changes.
 * Remove (**breaking**): `decodeHtmlEntities` and `encodeHtmlEntities` options. (GH [#75](https://github.com/inikulin/parse5/issues/75)).
 * Add (**breaking**): [TreeAdapter.setTemplateContent()](https://github.com/inikulin/parse5/wiki/Documentation#TreeAdapter.setTemplateContent) and [TreeAdapter.getTemplateContent()](https://github.com/inikulin/parse5/wiki/Documentation#TreeAdapter.getTemplateContent) methods. (GH [#78](https://github.com/inikulin/parse5/issues/78)).
 * Update (**breaking**): `default` tree adapter now stores `<template>` content in `template.content` property instead of `template.childNodes[0]`.

## 1.5.1
 * Fix: Qualified tag name emission in Serializer (GH [#79](https://github.com/inikulin/parse5/issues/79)).

## 1.5.0
 * Add: Location info for the element start and end tags (by [@sakagg](https://github.com/sakagg)).

## 1.4.2
 * Fix: htmlparser2 tree adapter `DocumentType.data` property rendering (GH [#45](https://github.com/inikulin/parse5/issues/45)).

## 1.4.1
 * Fix: Location info handling for the implicitly generated `<html>` and `<body>` elements (GH [#44](https://github.com/inikulin/parse5/issues/44)).

## 1.4.0
 * Add: Parser [decodeHtmlEntities](https://github.com/inikulin/parse5#optionsdecodehtmlentities) option.
 * Add: SimpleApiParser [decodeHtmlEntities](https://github.com/inikulin/parse5#optionsdecodehtmlentities-1) option.
 * Add: Parser [locationInfo](https://github.com/inikulin/parse5#optionslocationinfo) option.
 * Add: SimpleApiParser [locationInfo](https://github.com/inikulin/parse5#optionslocationinfo-1) option.

## 1.3.2
 * Fix: `<form>` processing in `<template>` (GH [#40](https://github.com/inikulin/parse5/issues/40)).

## 1.3.1
 * Fix: text node in `<template>` serialization problem with custom tree adapter (GH [#38](https://github.com/inikulin/parse5/issues/38)).

## 1.3.0
 * Add: Serializer `encodeHtmlEntities` option.

## 1.2.0
 * Add: `<template>` support
 * `parseFragment` now uses `<template>` as default `contextElement`. This leads to the more "forgiving" parsing manner.
 * `TreeSerializer` was renamed to `Serializer`. However, serializer is accessible as `parse5.TreeSerializer` for backward compatibility .

## 1.1.6
 * Fix: apply latest changes to the `htmlparser2` tree format (DOM Level1 node emulation).

## 1.1.5
 * Add: [jsdom](https://github.com/tmpvar/jsdom)-specific parser with scripting support. Undocumented for `jsdom` internal use only.

## 1.1.4
 * Add: logo
 * Fix: use fake `document` element for fragment parsing (required by [jsdom](https://github.com/tmpvar/jsdom)).

## 1.1.3
 * Development files (e.g. `.travis.yml`, `.editorconfig`) are removed from NPM package.

## 1.1.2
 * Fix: crash on Linux due to upper-case leading character in module name used in `require()`.

## 1.1.1
 * Add: [SimpleApiParser](https://github.com/inikulin/parse5/#class-simpleapiparser).
 * Fix: new line serialization in `<pre>`.
 * Fix: `SYSTEM`-only `DOCTYPE` serialization.
 * Fix: quotes serialization in `DOCTYPE` IDs.

## 1.0.0
 * First stable release, switch to semantic versioning.

## 0.8.3
 * Fix: siblings calculation bug in `appendChild` in `htmlparser2` tree adapter.

## 0.8.1
 * Add: [TreeSerializer](https://github.com/inikulin/parse5/#class-serializer).
 * Add: [htmlparser2 tree adapter](https://github.com/inikulin/parse5/#-treeadaptershtmlparser2).

## 0.6.1
 * Fix: incorrect `<menuitem>` handling in `<body>`.

## 0.6.0
 * Initial release.
