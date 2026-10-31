Local security patch of deepmerge 4.3.1 (MIT), from https://github.com/TehShrike/deepmerge.

GHSA-gcqx-w48m-w2h4: reject __proto__, constructor and prototype on BOTH target cloning and source merging, at every recursion depth. The upstream implementation and API are otherwise preserved. No upstream patched release was available at implementation time. Covered by tests/security.test.ts. Remove this override once a fixed upstream version can replace it.
