# ADR-0016 — Sync membership is static: settled at pair time, never per state

**Status:** Accepted — #632 landed as #635, #636 and #637.

**Date:** 2026-09-10
**Related:** #632 (the work), #626 / #627 (the refusal this reverses in part),
#605 (`canResolveSyncState`, the guard being demoted), ADR-0014 (what crosses a
sync group), ADR-0015 (targeting is not a sync group — the mechanism this is
*not*), ADR-0010 (`All` is a zoom rung), ADR-0003 (public API contract),
`CONTEXT.md` (*Sync group*, *Sync state*, *Isolation mark*), `js/syncGroup.js`, `js/hicDataset.js`

## Context

#627 fixed two silent drops and left a third problem in place, which is only
visible once you ask what a *user* sees rather than what a developer reads in the
console.

`Dataset.isCompatible` decides whether two browsers pair. `canResolveSyncState`
(#605) then declines individual peer states naming a chromosome the receiving
genome cannot place. #627 kept those deliberately separate, and said so:

> Pairing a subset is deliberate. `canResolveSyncState` is the per-**state**
> question and stays where it is.

The reading that makes this look right is that the two questions carry different
information — that pairing is what you can know at load time, and resolvability is
what you can only know once a particular state arrives.

**That reading is wrong, and one line disproves it.** `js/dataLoader.js:133`:

```js
this.browser.genome = new Genome(dataset.genomeId, dataset.chromosomes);
```

The genome is not an external reference assembly. It is built *from the `.hic`
file's own chromosome table*. So `genome.getChromosome(name)` asks "does this file
carry this chromosome?", and both tables are in hand the moment both datasets
load. `canResolveSyncState` has no information at state time that was unavailable
at pair time. It is the same question, asked later.

Asked later, it produces behaviour no one designed. A subset map paired with a
whole-genome map of the same assembly follows its peer across chr1, stops at
chr8, and resumes on the way back. A user watching a wall of panels sees some of
them periodically syncing and unsyncing, with nothing on screen accounting for
it. The bug reported in #626 was "these panels will not sync and nothing says
why"; the fix for it introduced "these panels sync intermittently and nothing
says why", which is worse, because the first is at least stable enough to
describe.

## Decision

**1. Membership is settled at pair time and does not change while anyone pans.**
If two panels are compatible in every way, they sync. If not, they do not. The
per-state question is retired as a *decision* — see 5 for what remains of it.

**2. Two predicates, because one was answering two questions.** `isCompatible`
has three production callers and only two of them are about sync:

| caller | question | wants |
| --- | --- | --- |
| `syncGroup.js:41` (`pairSynchable`) | can these follow each other? | strict |
| `dataLoader.js:217` (sync-on-load peer search) | can these follow each other? | strict |
| `dataLoader.js:363` (control map load) | same assembly? | loose |

`canSyncWith(other)` = same assembly **and** chromosome parity. The two sync
callers move to it. `isCompatible` is left exactly as it is, hg38/hg19/mm10
genome-id short-circuit included: that short-circuit is not a bug, it is a
correct answer to the question the third caller is asking. Loading a chr1-only
control map against a whole-genome map stays legal, and should.

Deleting the short-circuit, or folding parity into `isCompatible`, would have
been the smaller diff and would have broken that caller silently.

**3. Parity is decided by `genome.getChromosome`, never by comparing name sets.**
The lookup resolves aliases (`1`↔`chr1`, `MT`↔`chrM`, the `arm_` names for dMel)
and matches case-insensitively. A raw set comparison is *stricter* than the
lookup it stands in for, so it would refuse pairs that sync correctly today —
trading a flicker for a routine false negative. This is the same trap
`canResolveSyncState`'s own comment already documents about `getChrIndexFromName`,
and it is worth writing down twice because the obvious implementation is the
wrong one. `All` is excluded, per ADR-0010: a zoom rung, not a chromosome, and
its size is in kb besides.

**4. Parity must hold in both directions, or the pair does not form.** A subset
map can follow a whole-genome map only within the chromosomes it carries; the
whole-genome map can always follow the subset. Compatibility is therefore
asymmetric while `synchedBrowsers` is a symmetric `Set` and `pairSynchable` tests
each combination once *because* `isCompatible` is symmetric.

Asymmetric sync was considered and rejected. A user who drags panel A and watches
panel B follow, then drags panel B and watches nothing happen, has no reading of
that available except "broken". Symmetric refusal is legible; half-sync is not.

Two-directional parity is reflexive, symmetric and transitive — an equivalence
relation — so sync groups become true **partitions** rather than the arbitrary
graph `pairSynchable` can produce today. "Which group is this panel in" becomes a
question with an answer, which is what makes decision 6 expressible at all.

**5. `canResolveSyncState` stays, demoted to a defensive assert.** With parity
settled at pair time it is unreachable. It is not deleted: it is the guard #605
added against a real TypeError, keeping it costs nothing, and an unreachable
guard that fires is the cheapest possible detector of a bug in the pairing rule.
It therefore `console.error`s — a message for us, not for the user, because by
construction the user cannot cause it.

**6. `registry.sync()` recomputes membership rather than accumulating it.** It
currently only adds:

```js
sync(browsers) {
    for (const [b1, b2] of pairSynchable(browsers || this.browsers)) {
        b1.synchedBrowsers.add(b2)
        b2.synchedBrowsers.add(b1)
    }
}
```

Harmless while the per-state gate caught the fallout; a hole once it does not.
Load an incompatible map into an already-paired panel and the stale pairing
survives, handing `State.sync` a name the new genome cannot place — reaching the
assert of decision 5 by a route that is our fault, not the caller's. Membership
is now a pure function of the open datasets, so it is derived fresh. ADR-0015
decision 6 already asserts the principle — *"sync membership is a rule that gets
recomputed, so losing it costs nothing"* — and this is what makes the sentence
true.

**7. A panel that cannot join any sync group says so, on the panel.** Static
membership is what makes this a quiet permanent mark rather than a notification:
nothing appears or disappears while the user is interacting. Panel navbar, beside
the map label, non-dismissible, reason in the `title`.

| condition | reported |
| --- | --- |
| different assembly | yes — "no other panel holds a compatible map (this is dm6; the others are hg38)" |
| same assembly, mismatched coverage | yes — "this map has no chr8, chr9, … — the other panels do" |
| `synchable: false` | yes — "sync is disabled for this panel" |
| the only panel open | **no** |

The last row is the empty room, not a refusal — the line the load-time refusal
already drew (#626), and which `isolationReasons` in `js/syncGroup.js` now draws
for both the mark and that refusal. Marking it would put a permanent badge on the most common
view in the application and teach every user to ignore the mark before they ever
saw it mean something.

The `synchable: false` row reverses the reasoning in #627, which held that a host
does not need telling what it configured itself. True of the host, irrelevant to
the person looking at the screen — and in an embed those are never the same
party. The mark answers "why is this panel not moving", and the answer "because
the page author turned it off" is as useful as any other.

**8. The mark shows isolation, never group membership.** Panels in a group move
together the instant anyone pans, so grouping already has a signal. Isolation has
none: a panel that *cannot* follow looks exactly like a panel nobody has driven
yet. The mark goes where behaviour provides no signal, and nowhere else.

**9. It ships in the library, not in the host.** Same argument as ADR-0015
decision 4b for the targeting badges: everything adjacent to a panel is library
DOM, so a host-side mark would either reach across the boundary into markup it
does not own, or sit far enough away to be unreadable. juicebox-web hands
`#app-container` to `hic.init()` and owns nothing inside it. Requiring every host
to reimplement this would mean every host that did not looked broken.

`onSyncRefused` (#627) keeps its contract unchanged — the seventh registerable
callback under ADR-0003. Nothing is renamed or removed and no host must act.

## Consequences

**A subset `.hic` no longer syncs with a whole-genome map of the same assembly.**
This is the reversal, and it is the price. #627 paired them on purpose and argued
for it; two hg38 maps, one of them a chr1-only test file, will now show as
unsynced rather than syncing across chr1 and stalling beyond it. The trade is
stability for coverage, taken because partial sync is not a feature a user can
predict, describe, or rely on — and because the panel now says why, which the
partial version never did.

Recorded at length because a future reader arriving at `compareChromosomes` finds
#627's comments arguing the permissive case in detail, with no note that it was
reconsidered, and would re-derive the flicker in good faith.

**Multiple sync groups remain invisible.** Two hg38 panels beside two dm6 panels
produce no marks at all — every panel has a partner, so nothing is isolated — and
a user glancing at four panels cannot tell there are two groups rather than one.
Fixing it needs a second grouping colour on every panel, which collides with the
target-set outline of ADR-0015 decision 4b and would spend a permanent visual
system on a rare configuration. Accepted knowingly.

**Embeds get the mark.** A panel navbar is viewer chrome, not a menu or a
catalog, so this does not contradict an embed being surface-free. It is also
where it matters most: an embed host may opt a panel out with `synchable: false`
while the person reading the page has no way to know it did.

**`onSyncApplied` was designed and then not needed.** A clearing signal is
required only while membership is dynamic. Worth recording that there is no
"sync succeeded" callback at all today — a successful sync exits through
`coordinator.onLocusChange` (`hicBrowser.js:1320`), the same callback a user's own
pan fires (line 1126), with nothing in the payload distinguishing them. Anyone
who later needs to observe successful syncs is starting from zero, not from a
callback they can filter.

**Latching was the other way to get one-shot behaviour, and is worse.** Pair
permissively as #627 does, then permanently drop a panel from its group on the
first refusal. It removes the flicker, but makes membership depend on browsing
history: two sessions with identical maps diverge based on where someone happened
to pan, and nothing on screen distinguishes them.
