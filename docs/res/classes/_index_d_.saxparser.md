[](../README.md) > ["index.d"](../modules/_index_d_.md) > [SAXParser](../classes/_index_d_.saxparser.md)

# Class: SAXParser

Streaming [SAX](https://en.wikipedia.org/wiki/Simple_API_for_XML)-style HTML parser. A [transform stream](https://nodejs.org/api/stream.html#stream_class_stream_transform) (which means you can pipe _through_ it, see example).

**NOTE:** This API is available only for Node.js.
*__example__*:     
    const parse5 = require('parse5');
    const http = require('http');
    const fs = require('fs');
    
    const file = fs.createWriteStream('/home/google.com.html');
    const parser = new parse5.SAXParser();
    
    parser.on('text', text => {
       // Handle page text content
       ...
    });
    
    http.get('http://google.com', res => {
       // SAXParser is the Transform stream, which means you can pipe
       // through it. So, you can analyze page content and, e.g., save it
       // to the file at the same time:
       res.pipe(parser).pipe(file);
    });

## Hierarchy

 `Transform`

**↳ SAXParser**

## Implements

* `ReadableStream`
* `Writable`

## Index

### Constructors

* [constructor](_index_d_.saxparser.md#constructor)

### Properties

* [readable](_index_d_.saxparser.md#readable)
* [readableHighWaterMark](_index_d_.saxparser.md#readablehighwatermark)
* [writable](_index_d_.saxparser.md#writable)
* [writableHighWaterMark](_index_d_.saxparser.md#writablehighwatermark)
* [defaultMaxListeners](_index_d_.saxparser.md#defaultmaxlisteners)

### Methods

* [_destroy](_index_d_.saxparser.md#_destroy)
* [_final](_index_d_.saxparser.md#_final)
* [_read](_index_d_.saxparser.md#_read)
* [_transform](_index_d_.saxparser.md#_transform)
* [_write](_index_d_.saxparser.md#_write)
* [_writev](_index_d_.saxparser.md#_writev)
* [addListener](_index_d_.saxparser.md#addlistener)
* [cork](_index_d_.saxparser.md#cork)
* [destroy](_index_d_.saxparser.md#destroy)
* [emit](_index_d_.saxparser.md#emit)
* [end](_index_d_.saxparser.md#end)
* [eventNames](_index_d_.saxparser.md#eventnames)
* [getMaxListeners](_index_d_.saxparser.md#getmaxlisteners)
* [isPaused](_index_d_.saxparser.md#ispaused)
* [listenerCount](_index_d_.saxparser.md#listenercount)
* [listeners](_index_d_.saxparser.md#listeners)
* [on](_index_d_.saxparser.md#on)
* [once](_index_d_.saxparser.md#once)
* [pause](_index_d_.saxparser.md#pause)
* [pipe](_index_d_.saxparser.md#pipe)
* [prependListener](_index_d_.saxparser.md#prependlistener)
* [prependOnceListener](_index_d_.saxparser.md#prependoncelistener)
* [push](_index_d_.saxparser.md#push)
* [read](_index_d_.saxparser.md#read)
* [removeAllListeners](_index_d_.saxparser.md#removealllisteners)
* [removeListener](_index_d_.saxparser.md#removelistener)
* [resume](_index_d_.saxparser.md#resume)
* [setDefaultEncoding](_index_d_.saxparser.md#setdefaultencoding)
* [setEncoding](_index_d_.saxparser.md#setencoding)
* [setMaxListeners](_index_d_.saxparser.md#setmaxlisteners)
* [stop](_index_d_.saxparser.md#stop)
* [uncork](_index_d_.saxparser.md#uncork)
* [unpipe](_index_d_.saxparser.md#unpipe)
* [unshift](_index_d_.saxparser.md#unshift)
* [wrap](_index_d_.saxparser.md#wrap)
* [write](_index_d_.saxparser.md#write)
* [listenerCount](_index_d_.saxparser.md#listenercount-1)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new SAXParser**(options?: *[SAXParserOptions](../interfaces/_index_d_.options.saxparseroptions.md)*): [SAXParser](_index_d_.saxparser.md)

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| `Optional` options | [SAXParserOptions](../interfaces/_index_d_.options.saxparseroptions.md) |  Parsing options. |

**Returns:** [SAXParser](_index_d_.saxparser.md)

___

## Properties

<a id="readable"></a>

###  readable

**● readable**: *`boolean`*

___
<a id="readablehighwatermark"></a>

###  readableHighWaterMark

**● readableHighWaterMark**: *`number`*

___
<a id="writable"></a>

###  writable

**● writable**: *`boolean`*

___
<a id="writablehighwatermark"></a>

###  writableHighWaterMark

**● writableHighWaterMark**: *`number`*

___
<a id="defaultmaxlisteners"></a>

### `<Static>` defaultMaxListeners

**● defaultMaxListeners**: *`number`*

___

## Methods

<a id="_destroy"></a>

###  _destroy

▸ **_destroy**(err: *`Error`*, callback: *`Function`*): `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| err | `Error` | 
| callback | `Function` | 

**Returns:** `void`

___
<a id="_final"></a>

###  _final

▸ **_final**(callback: *`Function`*): `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| callback | `Function` | 

**Returns:** `void`

___
<a id="_read"></a>

###  _read

▸ **_read**(size: *`number`*): `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| size | `number` | 

**Returns:** `void`

___
<a id="_transform"></a>

###  _transform

▸ **_transform**(chunk: *`any`*, encoding: *`string`*, callback: *`Function`*): `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` | 
| encoding | `string` | 
| callback | `Function` | 

**Returns:** `void`

___
<a id="_write"></a>

###  _write

▸ **_write**(chunk: *`any`*, encoding: *`string`*, callback: *`function`*): `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` | 
| encoding | `string` | 
| callback | `function` | 

**Returns:** `void`

___
<a id="_writev"></a>

### `<Optional>` _writev

▸ **_writev**(chunks: *`Array`<`object`>*, callback: *`function`*): `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunks | `Array`<`object`> | 
| callback | `function` | 

**Returns:** `void`

___
<a id="addlistener"></a>

###  addListener

▸ **addListener**(event: *`string`*, listener: *`function`*): `this`

▸ **addListener**(event: *`string`*, listener: *`function`*): `this`

▸ **addListener**(event: *"close"*, listener: *`function`*): `this`

▸ **addListener**(event: *"data"*, listener: *`function`*): `this`

▸ **addListener**(event: *"end"*, listener: *`function`*): `this`

▸ **addListener**(event: *"readable"*, listener: *`function`*): `this`

▸ **addListener**(event: *"error"*, listener: *`function`*): `this`

Event emitter The defined events on documents including:

1.  close
2.  data
3.  end
4.  readable
5.  error

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `string` | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `string` | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "close" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "data" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "end" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "readable" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| listener | `function` | 

**Returns:** `this`

___
<a id="cork"></a>

###  cork

▸ **cork**(): `void`

**Returns:** `void`

___
<a id="destroy"></a>

###  destroy

▸ **destroy**(error?: *`Error`*): `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` error | `Error` | 

**Returns:** `void`

___
<a id="emit"></a>

###  emit

▸ **emit**(event: *`string` |`symbol`*, ...args: *`any`[]*): `boolean`

▸ **emit**(event: *"close"*): `boolean`

▸ **emit**(event: *"data"*, chunk: *`Buffer` |`string`*): `boolean`

▸ **emit**(event: *"end"*): `boolean`

▸ **emit**(event: *"readable"*): `boolean`

▸ **emit**(event: *"error"*, err: *`Error`*): `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `string` |
`symbol`
 | 
| `Rest` args | `any`[] | 

**Returns:** `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "close" | 

**Returns:** `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "data" | 
| chunk | `Buffer` |
`string`
 | 

**Returns:** `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "end" | 

**Returns:** `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "readable" | 

**Returns:** `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| err | `Error` | 

**Returns:** `boolean`

___
<a id="end"></a>

###  end

▸ **end**(cb?: *`Function`*): `void`

▸ **end**(chunk: *`any`*, cb?: *`Function`*): `void`

▸ **end**(chunk: *`any`*, encoding?: *`string`*, cb?: *`Function`*): `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` cb | `Function` | 

**Returns:** `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` | 
| `Optional` cb | `Function` | 

**Returns:** `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` | 
| `Optional` encoding | `string` | 
| `Optional` cb | `Function` | 

**Returns:** `void`

___
<a id="eventnames"></a>

###  eventNames

▸ **eventNames**(): `Array`<`string` |`symbol`>

**Returns:** `Array`<`string` |`symbol`>

___
<a id="getmaxlisteners"></a>

###  getMaxListeners

▸ **getMaxListeners**(): `number`

**Returns:** `number`

___
<a id="ispaused"></a>

###  isPaused

▸ **isPaused**(): `boolean`

**Returns:** `boolean`

___
<a id="listenercount"></a>

###  listenerCount

▸ **listenerCount**(type: *`string` |`symbol`*): `number`

**Parameters:**

| Param | Type |
| ------ | ------ |
| type | `string` |
`symbol`
 | 

**Returns:** `number`

___
<a id="listeners"></a>

###  listeners

▸ **listeners**(event: *`string` |`symbol`*): `Function`[]

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `string` |
`symbol`
 | 

**Returns:** `Function`[]

___
<a id="on"></a>

###  on

▸ **on**(event: *"startTag"*, listener: *`function`*): `this`

▸ **on**(event: *"endTag"*, listener: *`function`*): `this`

▸ **on**(event: *"comment"*, listener: *`function`*): `this`

▸ **on**(event: *"text"*, listener: *`function`*): `this`

▸ **on**(event: *"doctype"*, listener: *`function`*): `this`

▸ **on**(event: *`string`*, listener: *`Function`*): `this`

Raised when the parser encounters a start tag.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "startTag" | 
| listener | `function` | 

**Returns:** `this`

Raised then parser encounters an end tag.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "endTag" | 
| listener | `function` | 

**Returns:** `this`

Raised then parser encounters a comment.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "comment" | 
| listener | `function` | 

**Returns:** `this`

Raised then parser encounters text content.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "text" | 
| listener | `function` | 

**Returns:** `this`

Raised then parser encounters a [document type declaration](https://en.wikipedia.org/wiki/Document_type_declaration).

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "doctype" | 
| listener | `function` | 

**Returns:** `this`

TransformStream events

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `string` | 
| listener | `Function` | 

**Returns:** `this`

___
<a id="once"></a>

###  once

▸ **once**(event: *`string`*, listener: *`function`*): `this`

▸ **once**(event: *"close"*, listener: *`function`*): `this`

▸ **once**(event: *"data"*, listener: *`function`*): `this`

▸ **once**(event: *"end"*, listener: *`function`*): `this`

▸ **once**(event: *"readable"*, listener: *`function`*): `this`

▸ **once**(event: *"error"*, listener: *`function`*): `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `string` | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "close" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "data" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "end" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "readable" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| listener | `function` | 

**Returns:** `this`

___
<a id="pause"></a>

###  pause

▸ **pause**(): `this`

**Returns:** `this`

___
<a id="pipe"></a>

###  pipe

▸ **pipe**T(destination: *`T`*, options?: *`object`*): `T`

**Type parameters:**

#### T :  `WritableStream`
**Parameters:**

| Param | Type |
| ------ | ------ |
| destination | `T` | 
| `Optional` options | `object` | 

**Returns:** `T`

___
<a id="prependlistener"></a>

###  prependListener

▸ **prependListener**(event: *`string`*, listener: *`function`*): `this`

▸ **prependListener**(event: *"close"*, listener: *`function`*): `this`

▸ **prependListener**(event: *"data"*, listener: *`function`*): `this`

▸ **prependListener**(event: *"end"*, listener: *`function`*): `this`

▸ **prependListener**(event: *"readable"*, listener: *`function`*): `this`

▸ **prependListener**(event: *"error"*, listener: *`function`*): `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `string` | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "close" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "data" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "end" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "readable" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| listener | `function` | 

**Returns:** `this`

___
<a id="prependoncelistener"></a>

###  prependOnceListener

▸ **prependOnceListener**(event: *`string`*, listener: *`function`*): `this`

▸ **prependOnceListener**(event: *"close"*, listener: *`function`*): `this`

▸ **prependOnceListener**(event: *"data"*, listener: *`function`*): `this`

▸ **prependOnceListener**(event: *"end"*, listener: *`function`*): `this`

▸ **prependOnceListener**(event: *"readable"*, listener: *`function`*): `this`

▸ **prependOnceListener**(event: *"error"*, listener: *`function`*): `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `string` | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "close" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "data" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "end" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "readable" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| listener | `function` | 

**Returns:** `this`

___
<a id="push"></a>

###  push

▸ **push**(chunk: *`any`*, encoding?: *`string`*): `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` | 
| `Optional` encoding | `string` | 

**Returns:** `boolean`

___
<a id="read"></a>

###  read

▸ **read**(size?: *`number`*): `any`

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` size | `number` | 

**Returns:** `any`

___
<a id="removealllisteners"></a>

###  removeAllListeners

▸ **removeAllListeners**(event?: *`string` |`symbol`*): `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` event | `string` |
`symbol`
 | 

**Returns:** `this`

___
<a id="removelistener"></a>

###  removeListener

▸ **removeListener**(event: *`string`*, listener: *`function`*): `this`

▸ **removeListener**(event: *"close"*, listener: *`function`*): `this`

▸ **removeListener**(event: *"data"*, listener: *`function`*): `this`

▸ **removeListener**(event: *"end"*, listener: *`function`*): `this`

▸ **removeListener**(event: *"readable"*, listener: *`function`*): `this`

▸ **removeListener**(event: *"error"*, listener: *`function`*): `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `string` | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "close" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "data" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "end" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "readable" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| listener | `function` | 

**Returns:** `this`

___
<a id="resume"></a>

###  resume

▸ **resume**(): `this`

**Returns:** `this`

___
<a id="setdefaultencoding"></a>

###  setDefaultEncoding

▸ **setDefaultEncoding**(encoding: *`string`*): `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| encoding | `string` | 

**Returns:** `this`

___
<a id="setencoding"></a>

###  setEncoding

▸ **setEncoding**(encoding: *`string`*): `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| encoding | `string` | 

**Returns:** `this`

___
<a id="setmaxlisteners"></a>

###  setMaxListeners

▸ **setMaxListeners**(n: *`number`*): `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| n | `number` | 

**Returns:** `this`

___
<a id="stop"></a>

###  stop

▸ **stop**(): `void`

Stops parsing. Useful if you want the parser to stop consuming CPU time once you've obtained the desired info from the input stream. Doesn't prevent piping, so that data will flow through the parser as usual.
*__example__*:     
    const parse5 = require('parse5');
    const http = require('http');
    const fs = require('fs');
    
    const file = fs.createWriteStream('google.com.html');
    const parser = new parse5.SAXParser();
    
    parser.on('doctype', (name, publicId, systemId) => {
       // Process doctype info ans stop parsing
       ...
       parser.stop();
    });
    
    http.get('http://google.com', res => {
       // Despite the fact that parser.stop() was called whole
       // content of the page will be written to the file
       res.pipe(parser).pipe(file);
    });

**Returns:** `void`

___
<a id="uncork"></a>

###  uncork

▸ **uncork**(): `void`

**Returns:** `void`

___
<a id="unpipe"></a>

###  unpipe

▸ **unpipe**T(destination?: *`T`*): `this`

**Type parameters:**

#### T :  `WritableStream`
**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` destination | `T` | 

**Returns:** `this`

___
<a id="unshift"></a>

###  unshift

▸ **unshift**(chunk: *`any`*): `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` | 

**Returns:** `void`

___
<a id="wrap"></a>

###  wrap

▸ **wrap**(oldStream: *`ReadableStream`*): `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| oldStream | `ReadableStream` | 

**Returns:** `this`

___
<a id="write"></a>

###  write

▸ **write**(chunk: *`any`*, cb?: *`Function`*): `boolean`

▸ **write**(chunk: *`any`*, encoding?: *`string`*, cb?: *`Function`*): `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` | 
| `Optional` cb | `Function` | 

**Returns:** `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` | 
| `Optional` encoding | `string` | 
| `Optional` cb | `Function` | 

**Returns:** `boolean`

___
<a id="listenercount-1"></a>

### `<Static>` listenerCount

▸ **listenerCount**(emitter: *`EventEmitter`*, event: *`string` |`symbol`*): `number`

**Parameters:**

| Param | Type |
| ------ | ------ |
| emitter | `EventEmitter` | 
| event | `string` |
`symbol`
 | 

**Returns:** `number`

___

