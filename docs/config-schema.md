# Config schema

What a browser config resolves to once the normalize stage has had it. The
executable copy is `js/normalizeSession.js`; this page is the written one, and
`test/testConfigGolden.js` snapshots the result at every entry path. For the
words — *resolved config*, *entry path*, *decode* vs *normalize* — see
`CONTEXT.md`.

**Resolved config** — a browser config *after* the normalize stage has had it,
which is the object `browser.config` then holds. Not a copy: the stage rewrites
the host's own object in place, so the host's config and the browser's are one
object. It is an observable surface, because juicebox-web reads `browser.config`
back (ADR-0003), and `test/testConfigGolden.js` snapshots it at every door
(#531).

One reader decides it: `js/normalizeSession.js`, run once per session at the
entry (#535) — `BrowserRegistry.restoreSession` for a session,
`createBrowser` for a single browser config, `HICBrowser.loadTracks` for tracks
added at runtime. **Everything below that seam reads fields.** A `??`, a
`|| default`, an `x !== false` or a string-to-object coercion **applied to a
config field** in the browser, the widgets or the loaders is a bug, not a
convenience: it puts a second answer where there is meant to be one, and it is
invisible in `browser.config` (#536). A component defaulting its *own*
constructor parameter is not that — `ContactMatrixView` names a background
colour for a view built without a config behind it, and never reads a config to
do it. The stage **defaults and coerces; it never rejects** — a config is the
most-used public surface juicebox has, so anything unrecognized is carried
through untouched.

**The schema** — what a resolved browser config carries. Fields not listed are
carried through unread, which is deliberate: a host may keep its own members on
the object.

| Field | Resolved to |
|---|---|
| `showLocusGoto`, `showHicContactMapLabel`, `showChromosomeSelector` | **Defaulted** to `true`; all three forced `false` when `figureMode === true`, which beats an explicit `true` |
| `figureMode` | **Absorbs `miniMode`**, the legacy spelling: a config naming `miniMode` and no `figureMode` gets `figureMode` set from it. One that names neither gains no member. `miniMode` is left on the config, unread. See ADR-0008 |
| `synchable` | **Defaulted** to `true`. Only a literal `false` opts out. A session-level `syncDatasets: false` writes `false` here on every browser, overriding what a browser said |
| `backgroundColor` | **Coerced** from `"r,g,b"` to `{r, g, b}`; **defaulted** to white |
| `colorScale` | **Coerced** from its wire spelling to a `ColorScale` (or the signed scale its tag names) |
| `displayMode` | Set to `"A"` when `cycle` is truthy — the cycle starts on the primary map |
| `url`, `controlUrl`, every track's `url` | **Coerced**: a `*s3/`, `*s3e/`, `*s3_/`, `*s3e_/` or `*enc/` prefix expands to the URL it stands for. Non-strings (a local `File`) pass through |
| `tracks[]` | Each track: the default annotation colour `rgb(22, 129, 198)` dropped so the renderer's own applies, `NaN` data-range bounds dropped, `displayMode` forced to `"COLLAPSED"` (an override, not a default — see #525). A `tracks` that is not an array is left alone |
| `selectedGene` | Session-level. Hoisted up from a browser that names one, last writer winning, unless the session names its own |
| `state` | **Not** resolved here: it arrives as a `State` from the query path and as a plain object from a host config, and `DataLoader` decodes it at load time. A known type divergence, pinned as a probe in the corpus |

Three things a config carries are honoured on one path only, and are not part of
the resolved schema:

- **`queryParametersSupported`** is read by `initRegistry` *before* normalize, to
  decide whether the address bar replaces the config it was passed. It cannot be
  resolved by a stage that runs after that decision.
- **`width` / `height`** are read by the browser constructor, which calls
  `setViewportSize` when both are present. Not a default — there is no default
  size in a config. A browser given neither is sized by the stylesheet, not by
  whatever browser was sized last (#477).
- **`nvi`** may be filled in at load time from a lookup table keyed on the map's
  URL (`js/nvi.js`). That is the loader answering a question about a *file*, and
  it reaches maps loaded at runtime as well as those a session named.

The loaders and `init()` answer four more questions, and none of them is a
document's to answer — each needs the load, the layout or the dataset:

- a track's **`height`** comes from the live layout, and **`autoscale`** is set
  when a track config names no `max`;
- a map's **`name`** is extracted from the file behind its URL, and a live
  contact map — which has no URL — falls back to `"Live Contact Map"`;
- **`normalization`** is checked against the loaded dataset's own set of
  normalizations and falls back to `NONE` if the map does not carry the one
  asked for. The only field still checked below the seam, and it *cannot* move
  up: the valid set does not exist until a dataset is loaded. Since #561 the
  rule is written once, in `browser.resolveNormalization`, and the same
  enforcer coerces the `normalization` a restored *state* carries — which is a
  different field arriving by a different door, asked the same question at the
  same moment (ADR-0009 decision 5).

Everything else below the seam is a plain field read.
