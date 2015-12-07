# FAQ

## Q: I want to work with my own document tree format. How can I do this?

You can create a custom tree adapter, so that parse5 can work with your own DOM-tree implementation.
Then pass it to the parser or serializer via the `treeAdapter` option:

```js
var parse5 = require('parse5');

var myTreeAdapter = {
   //Adapter methods...
};

var document = parse5.parse('<div></div>', { treeAdapter: myTreeAdapter });

var html = parse5.serialize(document, { treeAdapter: myTreeAdapter });
```
Refer to the [API reference](#TreeAdapter) for the description of methods that should be exposed by the tree adapter, as well as links to their
default implementation.

## Q: How can I use parse5 in the browser?

Compile it with [browserify](http://browserify.org/) and you're set.

## Q: I'm parsing `<img src="foo">` with the `SAXParser` and I expect the `selfClosing` flag to be `true` for the `<img>` tag. But it's not. Is there something wrong with the parser?

No. A self-closing tag is a tag that has a `/` before the closing bracket. E.g: `<br/>`, `<meta/>`.
In the provided example, the tag simply doesn't have an end tag. Self-closing tags and tags without end tags are treated differently by the
parser: in case of a self-closing tag, the parser does not look up for the corresponding closing tag and expects the element not to have any content.
But if a start tag is not self-closing, the parser treats everything that follows it (with a few exceptions) as the element content.
However, if the start tag is in the list of [void elements](https://html.spec.whatwg.org/multipage/syntax.html#void-elements), the parser expects the corresponding
element not to have content and behaves in the same way as if the element was self-closing. So, semantically, if an element is
void, self-closing tags and tags without closing tags are equivalent, but it's not true for other tags.

**TL;DR**: `selfClosing` is a part of lexical information and is set only if the tag has `/` before the closing bracket in the source code.

## Q: I have some weird output from the parser, seems like a bug.

Most likely, it's not. There are a lot of weird edge cases in HTML5 parsing algorithm, e.g.:
```html
<b>1<p>2</b>3</p>
```

will be parsed as

```html
<b>1</b><p><b>2</b>3</p>
```

Just try it in the latest version of your browser before submitting an issue.

