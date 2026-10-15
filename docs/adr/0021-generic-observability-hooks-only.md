# ADR-0021 — Generic observability hooks only; no host vocabulary

**Status:** Accepted.

**Date:** 2026-09-27
**Related:** ADR-0002 (the coordinator is the host extension point), ADR-0003
(the public surface is what the manifest says), ADR-0012 (substitution; its
first explicit no is reversed here), ADR-0014 (normalization and the colour
scale are not view preferences, so no sync group carries them), ADR-0016
(sync state as a peer reads it), `CONTEXT.md` (*Coordinator*, *Public
surface*, *Manifest*, *Substitution*, *Observability hook*), `js/publicApi.js`,
`test/testPublicApi.js`

## Context

A host wants to drive a browser from outside the page and to mirror one panel
onto another: follow its colour scale, its normalization and the substitution
of it, its display mode, and the appearance of its tracks, and apply the same
to a peer. juicebox-web is one such host; a control layer that works on any
page embedding the library is another, and it lives in its own package, with
no DOM and no shell assumptions.

A prototype of that layer got what it needed by reaching in. It monkey-patched
the coordinator's `onColorScale`, `onDisplayMode` and the browser's
`setColorScaleThreshold`, `setNormalization`, `setDisplayMode` and
`repaintMatrix`; it put `Object.defineProperty` setters on a track's colour and
data range; it called eleven browser members the manifest did not name, so
"no callers in this repo" was a half finding for every one of them (ADR-0003);
and it carried its own locus parser for spellings `parseGotoInput` refused.
Each patch was a contract nobody had agreed to, and 4.x's enforced manifest
(`test/testPublicApi.js`) is exactly what makes that kind of reaching fragile.

The alternative was a fork of the library that knew about the host. It is
rejected: the viewer is a component (ADR-0003's correctness condition), and a
component that knows one host's transport, its grouping of participants or its
protocol is no longer embeddable by the next host.

## Decision

**1. The library gains generic hooks, and only those.** Everything the host
needed is added as an observation or a declaration any host could use:

- Four coordinator callbacks, under the existing `on*Change` convention and
  the existing `addCallback` door (ADR-0002): `onColorScaleChange
  {colorScale, browser}`, `onNormalizationChange {normalization, browser}`,
  `onNormalizationSubstituted {requested, effective, reason, browser}`,
  `onDisplayModeChange {mode, browser}`. Each fires from the same coordinator
  method the widget is told through, so a host and a widget cannot disagree.
  `setColorScaleThreshold`, which announced nothing, now notifies the
  coordinator the way the auto-threshold path always did, and a restore that
  changes the normalization reaches `onNormalizationChange` too.
- Two fields on existing callbacks: `dragging` on `onLocusChange`, true on
  each pan step of a drag, and `type` on `onForegroundColorChange`, the half
  of the scale (`'+'` or `'-'`) the edit touched.
- Eleven browser members named in `BROWSER_SURFACE`: `controlDataset`,
  `trackPairs`, `tracks2D`, `zoomAndCenter`, `setColorScaleThreshold`,
  `setNormalization`, `setDisplayMode`, `getDisplayMode`, `getColorScale`,
  `getSyncState`, `syncState`. All existed; declaring them makes the finding
  whole and gives the eight methods the post-dispose guard of ADR-0005.
- Three members one dot further out: `contactMatrixView.setColorScale` and
  `contactMatrixView.setBackgroundColor` in `SUB_SURFACES`, and
  `state.getLocus` in `POST_LOAD_SURFACE`, since `state` does not exist
  until a map loads.

What a track's appearance and changes need, and the looser locus spellings
the prototype parsed for itself, are decided separately (#728, #726).

**Two channels.** A change to one panel's view is a coordinator callback; a
panel or track appearing, changing or going away is a global-bus event.

**2. Additive, and named by what happened in the viewer.** A new payload
field is added beside the old ones (`type` on `onForegroundColorChange`), never
in place of them. A hook is named for the change it reports — a colour scale,
a normalization, a display mode — not for who is listening or why.
The two coordinator methods that predate the convention (`onColorScale`,
`onDisplayMode`) keep their names, per ADR-0002.

**3. No host vocabulary.** The library does not name the host, its transport,
its way of grouping participants, its protocol or its product — not in an
identifier, a comment, a test name or a doc. A host's needs arrive here
translated into the library's own language (`CONTEXT.md`) or they do not
arrive. The one document that may mention the host is this ADR's *Context*,
and it names only juicebox-web, a consumer ADR-0003 already measures.

**4. Everything goes through the manifest.** Each addition is declared in
`js/publicApi.js` — `COORDINATOR_CALLBACKS` and `COORDINATOR_PAYLOAD_SHAPES`,
`BROWSER_SURFACE`, `SUB_SURFACES`, `POST_LOAD_SURFACE`, and for a global-bus
event `EVENTS_POSTED` and `EVENT_PAYLOAD_SHAPES` — and has a test
that drives it and asserts the payload against the manifest. An addition that
is not in the manifest is not public, whatever a host has found it can reach.

**5. What stays out.** Extracting a locus from a sentence, parsing a command
that names a map and a locus together, a colour-scale manager, and any
coordination of notifications across pages. Those are the host's, or the
control layer's; the viewer parses loci and reports changes.

## Consequences

**A host mirrors a panel's view without patching anything.** The colour
scale, normalization, substitution and display mode the prototype took by
force are now subscriptions, and every member it reached is named. Its patches
for these are deleted on its side; a future one that finds itself patching
has found a missing hook, and files for it here rather than working around
it.

**ADR-0012's first explicit no is reversed**, dated in place: a host has
asked, `onNormalizationSubstituted` is published, and its name and payload are
contract.

**The library's language is the only language.** A reviewer can reject a
change on vocabulary alone: an identifier or comment that names a host's
transport or its session model is wrong here even if the code is right, and
belongs in the package that owns that vocabulary.

**Ships as a minor release**: additive surface, no change to any
existing payload field or member, and juicebox-web builds and passes its
tests against it unchanged.
