# Interface: StartTagToken

### Properties

* [attrs](#attrs)
* [selfClosing](#selfclosing)
* [sourceCodeLocation](#sourcecodelocation)
* [tagName](#tagname)

---

## Properties

<a id="attrs"></a>

###  attrs

**● attrs**: *Attribute*[]

List of attributes

___
<a id="tagname"></a>

###  tagName

**● tagName**: *`string`*

Tag name

___
<a id="selfclosing"></a>

###  selfClosing

**● selfClosing**: *`boolean`*

Indicates if the tag is self-closing

___
<a id="sourcecodelocation"></a>

### `<Optional>` sourceCodeLocation

**● sourceCodeLocation**: *[StartTagLocation](../../../parse5/docs/source-code-location/start-tag-location.md)*

Start tag source code location info. Available if location info is enabled via [SAXParserOptions](../sax-parser-options.md)

___
