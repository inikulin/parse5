# Parser error expectations

The tree-construction suites use the pinned upstream `html5lib-tests` corpus.
The upstream error names and locations differ from parse5's public parse-error
codes. `expectations.json` preserves the exact parse5 error oracle previously
supplied by the parse-error working group's fork, independently of parser output.

## Provenance and coverage

- Source: `HTMLParseErrorWG/html5lib-tests` at
  `11c3216c8ec790dbda1494a84f580e0ea41d55a1`, `tree-construction/*.dat`.
- Upstream tree corpus: `html5lib/html5lib-tests` at
  `a9f44960a9fedf265093d22b2aa3c7ca123727b9` (unchanged by this migration).
- All 1,697 fork cases are recorded in `sources`, using `index.filename.dat`.
  There are 1,671 distinct input/context/mode identities. Duplicate identities
  have identical error lists and retain every original source pointer.
- 1,690 fork cases have the same tree in the upstream corpus. The six obsolete
  `foreign-fragment.dat` trees (indices 0, 1, 38, 40, 47 and 48) are replaced by
  the upstream expectations for the current specification. Their exact empty
  error expectations are retained; they no longer need expected-failure entries.
- The remaining case, `30.doctype01.dat`, is retained verbatim in
  `../tree-construction-regressions/doctype-internal-subset.dat`, including its tree and errors.
- The combined suite has 1,765 cases: 1,764 upstream and one local regression.
  1,683 have an exact error oracle; the other 82 upstream cases retain tree-only
  checks, as before. Both tree adapters and chunked parser-stream input use the
  same combined corpus and error oracle.

The adjacent MIT `LICENSE` covers the derived expectations and retained doctype
fixture. No trees, error codes or locations were generated from parser output.

## Format and invariants

Each `test` is a tuple of input text, fragment context, scripting flag and
entity-decoding flag. Fragment context is either `null` or a namespace/tag-name
pair. These values, not corpus filenames or mutable case indices, identify the
input executed by the test runner. `errors` contains the complete sorted
`#new-errors` list, including ranges. An empty array explicitly asserts no errors;
a missing record does not.

The loader rejects duplicate identities, duplicate source pointers, an incomplete
source count and records that no longer match any upstream or local test. A
shared upstream identity can appear more than once; every occurrence checks the
same error oracle. The source count records the historical migration inventory,
not the number of upstream tests or error assertions.

When updating the upstream submodule, keep existing records matched or retain a
removed input as a local regression. Add error expectations for new upstream
inputs only after reviewing their parse5 error semantics; do not mechanically
accept current parser output or treat upstream legacy error names as equivalent.
