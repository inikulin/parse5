<p align="center">
  <img src="https://raw.github.com/inikulin/parse5/master/logo.png" alt="parse5" />
</p>

[![Build Status](https://api.travis-ci.org/inikulin/parse5.svg)](https://travis-ci.org/inikulin/parse5)
[![npm](https://img.shields.io/npm/v/parse5.svg)](https://www.npmjs.com/package/parse5)

*WHATWG HTML5 specification-compliant, fast and ready for production HTML parsing/serialization toolset for Node and io.js.*

I needed fast and ready for production HTML parser, which will parse HTML as a modern browser's parser.
Existing solutions were either too slow or their output was too inaccurate. So, this is how parse5 was born.


## Install
```
$ npm install parse5
```

## Included tools
*   [Parser](#class-parser) - HTML to DOM-tree parser.
*   [SimpleApiParser](#class-simpleapiparser) - [SAX](http://en.wikipedia.org/wiki/Simple_API_for_XML)-style parser for HTML.
*   [Serializer](#class-serializer) - DOM-tree to HTML code serializer.


## Example
```js
var parse5 = require('parse5');

// Feed it with an HTML document
var document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>')

/ /Now let's parse HTML-snippet
var fragment = parse5.parseFragment('<title>Parse5 is &#102;&#117;&#99;&#107;ing awesome!</title><h1>42</h1>');

// Now let's serialize them back into HTML
var html = parse5.serialize(document);
var fragmentHtml = parse5.serialize(fragment);
```


## Testing
Test data is adopted from [html5lib project](https://github.com/html5lib). Parser is covered by more than 10000 test cases.
To run tests:
```
$ gulp test
```


## Custom tree adapter
You can create a custom tree adapter so parse5 can work with your own DOM-tree implementation.
Just pass your adapter implementation to the parser's constructor as an argument:

```js
var Parser = require('parse5').Parser;

var myTreeAdapter = {
   //Adapter methods...
};

//Instantiate parser
var parser = new Parser(myTreeAdapter);
```

Sample implementation can be found [here](https://github.com/inikulin/parse5/blob/master/lib/tree_adapters/default.js).
The custom tree adapter should implement all methods exposed via `exports` in the sample implementation.

## Questions or suggestions?
If you have any questions, please feel free to create an issue [here on github](https://github.com/inikulin/parse5/issues).


## Author
[Ivan Nikulin](https://github.com/inikulin) (ifaaan@gmail.com)
