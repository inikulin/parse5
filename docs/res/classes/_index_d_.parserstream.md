[](../README.md) > ["index.d"](../modules/_index_d_.md) > [ParserStream](../classes/_index_d_.parserstream.md)

# Class: ParserStream

Streaming HTML parser with scripting support. A [writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).

**NOTE:** This API is available only for Node.js.
*__example__*:     
    const parse5 = require('parse5');
    const http = require('http');
    
    // Fetch the page content and obtain it's <head> node
    http.get('http://inikulin.github.io/parse5/', res => {
       const parser = new parse5.ParserStream();
    
       parser.once('finish', () => {
           console.log(parser.document.childNodes[1].childNodes[0].tagName); //> 'head'
       });
    
       res.pipe(parser);
    });

## Hierarchy

 `Writable`

**↳ ParserStream**

↳  [PlainTextConversionStream](_index_d_.plaintextconversionstream.md)

## Implements

* `WritableStream`

## Index

### Constructors

* [constructor](_index_d_.parserstream.md#constructor)

### Properties

* [document](_index_d_.parserstream.md#document)
* [writable](_index_d_.parserstream.md#writable)
* [writableHighWaterMark](_index_d_.parserstream.md#writablehighwatermark)
* [defaultMaxListeners](_index_d_.parserstream.md#defaultmaxlisteners)

### Methods

* [_destroy](_index_d_.parserstream.md#_destroy)
* [_final](_index_d_.parserstream.md#_final)
* [_write](_index_d_.parserstream.md#_write)
* [_writev](_index_d_.parserstream.md#_writev)
* [addListener](_index_d_.parserstream.md#addlistener)
* [cork](_index_d_.parserstream.md#cork)
* [destroy](_index_d_.parserstream.md#destroy)
* [emit](_index_d_.parserstream.md#emit)
* [end](_index_d_.parserstream.md#end)
* [eventNames](_index_d_.parserstream.md#eventnames)
* [getMaxListeners](_index_d_.parserstream.md#getmaxlisteners)
* [listenerCount](_index_d_.parserstream.md#listenercount)
* [listeners](_index_d_.parserstream.md#listeners)
* [on](_index_d_.parserstream.md#on)
* [once](_index_d_.parserstream.md#once)
* [pipe](_index_d_.parserstream.md#pipe)
* [prependListener](_index_d_.parserstream.md#prependlistener)
* [prependOnceListener](_index_d_.parserstream.md#prependoncelistener)
* [removeAllListeners](_index_d_.parserstream.md#removealllisteners)
* [removeListener](_index_d_.parserstream.md#removelistener)
* [setDefaultEncoding](_index_d_.parserstream.md#setdefaultencoding)
* [setMaxListeners](_index_d_.parserstream.md#setmaxlisteners)
* [uncork](_index_d_.parserstream.md#uncork)
* [write](_index_d_.parserstream.md#write)
* [listenerCount](_index_d_.parserstream.md#listenercount-1)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new ParserStream**(options?: *[ParserOptions](../interfaces/_index_d_.options.parseroptions.md)*): [ParserStream](_index_d_.parserstream.md)

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| `Optional` options | [ParserOptions](../interfaces/_index_d_.options.parseroptions.md) |  Parsing options. |

**Returns:** [ParserStream](_index_d_.parserstream.md)

___

## Properties

<a id="document"></a>

###  document

**● document**: *[Document](../modules/_index_d_.ast.md#document)*

The resulting document node.

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

▸ **addListener**(event: *"close"*, listener: *`function`*): `this`

▸ **addListener**(event: *"drain"*, listener: *`function`*): `this`

▸ **addListener**(event: *"error"*, listener: *`function`*): `this`

▸ **addListener**(event: *"finish"*, listener: *`function`*): `this`

▸ **addListener**(event: *"pipe"*, listener: *`function`*): `this`

▸ **addListener**(event: *"unpipe"*, listener: *`function`*): `this`

Event emitter The defined events on documents including:

1.  close
2.  drain
3.  error
4.  finish
5.  pipe
6.  unpipe

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
| event | "drain" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "finish" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "pipe" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "unpipe" | 
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

▸ **emit**(event: *"drain"*, chunk: *`Buffer` |`string`*): `boolean`

▸ **emit**(event: *"error"*, err: *`Error`*): `boolean`

▸ **emit**(event: *"finish"*): `boolean`

▸ **emit**(event: *"pipe"*, src: *`Readable`*): `boolean`

▸ **emit**(event: *"unpipe"*, src: *`Readable`*): `boolean`

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
| event | "drain" | 
| chunk | `Buffer` |
`string`
 | 

**Returns:** `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| err | `Error` | 

**Returns:** `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "finish" | 

**Returns:** `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "pipe" | 
| src | `Readable` | 

**Returns:** `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "unpipe" | 
| src | `Readable` | 

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

▸ **on**(event: *"script"*, listener: *`function`*): `this`

▸ **on**(event: *`string`*, listener: *`Function`*): `this`

Raised then parser encounters a `<script>` element. If this event has listeners, parsing will be suspended once it is emitted. So, if `<script>` has the `src` attribute, you can fetch it, execute and then resume parsing just like browsers do.
*__example__*:     
    const parse = require('parse5');
    const http = require('http');
    
    const parser = new parse5.ParserStream();
    
    parser.on('script', (scriptElement, documentWrite, resume) => {
        const src = parse5.treeAdapters.default.getAttrList(scriptElement)[0].value;
    
        http.get(src, res => {
           // Fetch the script content, execute it with DOM built around `parser.document` and
           // `document.write` implemented using `documentWrite`.
           ...
           // Then resume parsing.
           resume();
        });
    });
    
    parser.end('<script src="example.com/script.js"></script>');

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "script" | 
| listener | `function` | 

**Returns:** `this`

WritableStream events

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

▸ **once**(event: *"drain"*, listener: *`function`*): `this`

▸ **once**(event: *"error"*, listener: *`function`*): `this`

▸ **once**(event: *"finish"*, listener: *`function`*): `this`

▸ **once**(event: *"pipe"*, listener: *`function`*): `this`

▸ **once**(event: *"unpipe"*, listener: *`function`*): `this`

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
| event | "drain" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "finish" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "pipe" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "unpipe" | 
| listener | `function` | 

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

▸ **prependListener**(event: *"drain"*, listener: *`function`*): `this`

▸ **prependListener**(event: *"error"*, listener: *`function`*): `this`

▸ **prependListener**(event: *"finish"*, listener: *`function`*): `this`

▸ **prependListener**(event: *"pipe"*, listener: *`function`*): `this`

▸ **prependListener**(event: *"unpipe"*, listener: *`function`*): `this`

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
| event | "drain" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "finish" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "pipe" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "unpipe" | 
| listener | `function` | 

**Returns:** `this`

___
<a id="prependoncelistener"></a>

###  prependOnceListener

▸ **prependOnceListener**(event: *`string`*, listener: *`function`*): `this`

▸ **prependOnceListener**(event: *"close"*, listener: *`function`*): `this`

▸ **prependOnceListener**(event: *"drain"*, listener: *`function`*): `this`

▸ **prependOnceListener**(event: *"error"*, listener: *`function`*): `this`

▸ **prependOnceListener**(event: *"finish"*, listener: *`function`*): `this`

▸ **prependOnceListener**(event: *"pipe"*, listener: *`function`*): `this`

▸ **prependOnceListener**(event: *"unpipe"*, listener: *`function`*): `this`

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
| event | "drain" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "finish" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "pipe" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "unpipe" | 
| listener | `function` | 

**Returns:** `this`

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

▸ **removeListener**(event: *"drain"*, listener: *`function`*): `this`

▸ **removeListener**(event: *"error"*, listener: *`function`*): `this`

▸ **removeListener**(event: *"finish"*, listener: *`function`*): `this`

▸ **removeListener**(event: *"pipe"*, listener: *`function`*): `this`

▸ **removeListener**(event: *"unpipe"*, listener: *`function`*): `this`

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
| event | "drain" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "finish" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "pipe" | 
| listener | `function` | 

**Returns:** `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "unpipe" | 
| listener | `function` | 

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
<a id="setmaxlisteners"></a>

###  setMaxListeners

▸ **setMaxListeners**(n: *`number`*): `this`

**Parameters:**

| Param | Type |
| ------ | ------ |
| n | `number` | 

**Returns:** `this`

___
<a id="uncork"></a>

###  uncork

▸ **uncork**(): `void`

**Returns:** `void`

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

