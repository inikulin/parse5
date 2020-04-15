# Interface: EndLocation

### Properties

* [endCol](#endcol)
* [endOffset](#endoffset)
* [endLine](#endline)
* [endTag](#endtag)

---

## Properties

<a id="endcol"></a>

###  endCol

**● endCol**: *`number`*

One-based column index of the last character

___
<a id="endoffset"></a>

###  endOffset

**● endOffset**: *`number`*

Zero-based last character index

___
<a id="endline"></a>

###  endLine

**● endLine**: *`number`*

One-based line index of the last character

___
<a id="endtag"></a>

###  endTag

**● endTag**: *[Location](location.md)|undefined*

Element's end tag location info.
This property is undefined, if the element has no closing tag.