# Interface: ElementLocation

### Properties

* [attrs](#attrs)
* [endCol](#endcol)
* [endOffset](#endoffset)
* [endLine](#endline)
* [endTag](#endtag)
* [startCol](#startcol)
* [startOffset](#startoffset)
* [startLine](#startline)
* [startTag](#starttag)

---

## Properties

<a id="attrs"></a>

###  attrs

**● attrs**: *\[attributeName: `string`\]:&nbsp;[Location](location.md)*

Start tag attributes' location info

___
<a id="endcol"></a>

###  endCol

**● endCol**: *`number`*

One-based column index plus 1 of the last character, ie. it points *after* the last character

___
<a id="endoffset"></a>

###  endOffset

**● endOffset**: *`number`*

Zero-based last character index plus 1, ie. it points *after* the last character

___
<a id="endline"></a>

###  endLine

**● endLine**: *`number`*

One-based line index of the last character

___
<a id="endtag"></a>

###  endTag

**● endTag**: *[Location](location.md)*

Element's end tag location info.

___
<a id="startcol"></a>

###  startCol

**● startCol**: *`number`*

One-based column index of the first character

___
<a id="startoffset"></a>

###  startOffset

**● startOffset**: *`number`*

Zero-based first character index

___
<a id="startline"></a>

###  startLine

**● startLine**: *`number`*

One-based line index of the first character

___
<a id="starttag"></a>

###  startTag

**● startTag**: *[StartTagLocation](start-tag-location.md)*

Element's start tag location info.

___

