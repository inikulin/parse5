# Named entity array mapped radix tree generator

Prior to `v3.0.0` we've used simple pre-generated [trie data structure](https://en.wikipedia.org/wiki/Trie)
for [named character reference](https://html.spec.whatwg.org/multipage/syntax.html#named-character-references) consumption
in tokenizer. This approach suffered from huge constant memory consumption: the in-memory size of the structure was ~8.5Mb.
This new approach reduces the size of the character reference data to ~250Kb and maintains performance that is close
to trie structure.

## Radix tree
Trie was replaced with [radix tree](https://en.wikipedia.org/wiki/Radix_tree). Unlike trie, which contains
only *nodes*, radix tree contains *nodes* and *edges*. If subsequent nodes contains only one branch they can be combined into single
edge.

E.g. for words `test`, `tester` and `testing` we'll have trie (legend: `[a, ...]` - node, `<abc>` - edge, `*` - data):
```
              [t]
               |
              [e]
               |
              [s]
               |
              [t]
               |
           [e, i, *]
           /   |
         [r]  [n]
          |    |
         [*]  [g]
               |
              [*]
```

with radix tree we can reduce it to:
```
        <test>
          |
      [e, i, *]
      /   |
    <r>  <ng>
     |     |
    [*]   [*]
```

This approach has two advantages:
- it significantly reduces number of nodes, and thus memory allocated for data strucure;
- edge can be represented by simple array.

## Mapping radix tree to array

We've significantly reduced the size of the tree. However, since we need to allocate an object for each node and array for
each edge, it still consumes a lot of memory. Therefore, we map our tree to array, so we'll end up with just a single object.
From my experiments it's appeared that it's possible to map this tree to `Uint16Array`, since we don't have indices and
code points which are more than `MAX_UINT16` (which is `0xFFFF`). The only exception here is [surrogate pairs](https://en.wikipedia.org/wiki/UTF-16#U.2B10000_to_U.2B10FFFF)
which appear in named character reference results, but they can be decoupled to two `uint16` code points. The advantage
of typed arrays is what they obviously consume less memory and extremely fast to traverse.

Since edges are already arrays, we write them to array as is.

### Mapping nodes

#### Node header
Node may contain `1` or `2` bytes of data and/or branch data. Branch data is represented by dictionary, keys of
dictionary are code points and the values are references to the next node or edge. Since edges represented as raw arrays
of code points, we need marker which will tell traversing algorithm that it sought a node. Character reference names contains only
ASCII alpha characters and semicolon. So, any value less than `59` (semicolon code point) will work for us. The naive
approach is to use, e.g. `0` as the node marker, followed by number of data bytes, followed by data, and then followed by number of branches:
```
| 0 | 2 | 8847, 824 | 5 | ... |
 \    \    \          \   \
  \    \    \          \   branch data
   \    \    \          number of branches
    \    \    data code points
     \    number of data code points
      node marker
```

We can improve this structure by using binary flags to encode information about branch into marker. We have three flags:
- `HAS_DATA_FLAG` - node has data;
- `DATA_DUPLET_FLAG` - node has 2 bytes of data;
- `HAS_BRANCHES_FLAG` - node has branches.

With flags we can omit some parts of the node structure, thus reducing the in-memory size of the node.

#### Branch data

Branch data is represented by two arrays, following one after another. First array contains sorted transition code points,
and the second one - corresponding next edge/node indices. Traversing algorithm reads number of branches in node header
and then performs binary search for the matching code point. When matching code point found, next node/edge index can be
obtained on offset which is equal to the number of branches in the node. Binary search can look like a step back compared
to previous approach where branch lookup was implemented as dictionary lookup which is `O(1)`. However, since character
reference names consists of ASCII alpha characters and semicolon we have `log(26*2+1) ≈ 6` iterations of search loop
in worst case. Iteration other the typed array is extremely fast, so performance doesn't degrade here.
