[](../README.md) > ["index.d"](../modules/_index_d_.md) > [SerializerStream](../classes/_index_d_.serializerstream.md)

# Class: SerializerStream

Streaming AST node to an HTML serializer. A [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable).

**NOTE:** This API is available only for Node.js.
*__example__*:     
    const parse5 = require('parse5');
    const fs = require('fs');
    
    const file = fs.createWriteStream('/home/index.html');
    
    // Serializes the parsed document to HTML and writes it to the file.
    const document = parse5.parse('<body>Who is John Galt?</body>');
    const serializer = new parse5.SerializerStream(document);
    
    serializer.pipe(file);

## Hierarchy

 `Readable`

**↳ SerializerStream**

## Implements

* `ReadableStream`

## Index

### Constructors

* [constructor](_index_d_.serializerstream.md#constructor)

### Properties

* [readable](_index_d_.serializerstream.md#readable)
* [readableHighWaterMark](_index_d_.serializerstream.md#readablehighwatermark)
* [defaultMaxListeners](_index_d_.serializerstream.md#defaultmaxlisteners)

### Methods

* [_destroy](_index_d_.serializerstream.md#_destroy)
* [_read](_index_d_.serializerstream.md#_read)
* [addListener](_index_d_.serializerstream.md#addlistener)
* [destroy](_index_d_.serializerstream.md#destroy)
* [emit](_index_d_.serializerstream.md#emit)
* [eventNames](_index_d_.serializerstream.md#eventnames)
* [getMaxListeners](_index_d_.serializerstream.md#getmaxlisteners)
* [isPaused](_index_d_.serializerstream.md#ispaused)
* [listenerCount](_index_d_.serializerstream.md#listenercount)
* [listeners](_index_d_.serializerstream.md#listeners)
* [on](_index_d_.serializerstream.md#on)
* [once](_index_d_.serializerstream.md#once)
* [pause](_index_d_.serializerstream.md#pause)
* [pipe](_index_d_.serializerstream.md#pipe)
* [prependListener](_index_d_.serializerstream.md#prependlistener)
* [prependOnceListener](_index_d_.serializerstream.md#prependoncelistener)
* [push](_index_d_.serializerstream.md#push)
* [read](_index_d_.serializerstream.md#read)
* [removeAllListeners](_index_d_.serializerstream.md#removealllisteners)
* [removeListener](_index_d_.serializerstream.md#removelistener)
* [resume](_index_d_.serializerstream.md#resume)
* [setEncoding](_index_d_.serializerstream.md#setencoding)
* [setMaxListeners](_index_d_.serializerstream.md#setmaxlisteners)
* [unpipe](_index_d_.serializerstream.md#unpipe)
* [unshift](_index_d_.serializerstream.md#unshift)
* [wrap](_index_d_.serializerstream.md#wrap)
* [listenerCount](_index_d_.serializerstream.md#listenercount-1)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new SerializerStream**(node: *[Node](../modules/_index_d_.ast.md#node)*, options?: *[SerializerOptions](../interfaces/_index_d_.options.serializeroptions.md)*): [SerializerStream](_index_d_.serializerstream.md)

Streaming AST node to an HTML serializer. A readable stream.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | [Node](../modules/_index_d_.ast.md#node) |  Node to serialize. |
| `Optional` options | [SerializerOptions](../interfaces/_index_d_.options.serializeroptions.md) |  Serialization options. |

**Returns:** [SerializerStream](_index_d_.serializerstream.md)

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
<a id="_read"></a>

###  _read

▸ **_read**(size: *`number`*): `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| size | `number` | 

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

▸ **on**(event: *`string`*, listener: *`function`*): `this`

▸ **on**(event: *"close"*, listener: *`function`*): `this`

▸ **on**(event: *"data"*, listener: *`function`*): `this`

▸ **on**(event: *"end"*, listener: *`function`*): `this`

▸ **on**(event: *"readable"*, listener: *`function`*): `this`

▸ **on**(event: *"error"*, listener: *`function`*): `this`

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

