# FAQ

## Q: I want to work with my own document tree format. How can I achieve this?

You can create a custom tree adapter so parse5 can work with your own DOM-tree implementation.
Then just pass it to the parser or serializer via option:

```js
var parse5 = require('parse5');

var myTreeAdapter = {
   //Adapter methods...
};

var document = parse5.parse('<div></div>', { treeAdapter: myTreeAdapter });

var html = parse5.serialize(document, { treeAdapter: myTreeAdapter });
```
You can find description of the methods which should be exposed by tree adapter and links to their
default implementation in the [API reference](#TreeAdapter).

## Q: How can I use parse5 in the browser?

Just compile it with [browserify](http://browserify.org/) and you're set.

## Q: I'm parsing `<img src="foo">` with the `SAXParser` and I expect `selfClosing` flag to be `true` for the `<img>` tag. But it's not. Is there something wrong with parser?

No. Self-closing tag is the tag that has `/` before the closing bracket. E.g: `<br/>`, `<meta/>`.
In the provided example tag just doesn't have end tag. Self-closing tags and tags without end tags are differently treated by the
parser: in case of self-closing tag parser will not lookup for the appropriate closing tag and expects element to not have any content.
But if start tag is not self-closing parser will treat everything after it (with the few exceptions) as the element content.
However, if the start tag is in the list of [void elements](https://html.spec.whatwg.org/multipage/syntax.html#void-elements) parser expects corresponding
element to not have content and behaves the same way as the if element is self-closing. So, semantically if element is the
void element self-closing tags and tags without closing tags are equivalent, but it's not true for all other tags.

**TL;DR**: `selfClosing` is the part of the lexical information and will be set only if the tag in source code has `/` before the closing bracket.

## Q: I have some weird output from the parser, seems like it's a bug.

More likely, it's not. There are a lot of weird edge cases in HTML5 parsing algorithm, e.g.:
```html
<b>1<p>2</b>3</p>
```

will be parsed as

```html
<b>1</b><p><b>2</b>3</p>
```

Just try it in the latest version of your browser before submitting the issue.


