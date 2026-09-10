import {describe, it, expect, beforeEach, vi} from 'vitest'
import {registryForContainer} from '../js/browserRegistry.js'
import {withContainers} from './utils/browserFixture.js'
import {withStubbedLoads} from './utils/stubbedLoads.js'
import Genome from '../js/genome.js'
import State from '../js/hicState.js'

/**
 * A sync state naming a chromosome the receiver cannot resolve is refused, and
 * the refusal is an **assert**, not a decision. #632, ADR-0016 decision 5.
 *
 * Until #632 this was reachable by an ordinary user action: pairing asked
 * `Dataset.isCompatible`, which short-circuits to `true` on a known genome-id
 * pair, so a whole-genome hg19 map and a subset hg19 map paired, and the peer
 * went on to publish `chr17` to a browser whose map stops at `chr1`. That
 * scenario no longer pairs -- `canSyncWith` demands two-way chromosome parity
 * -- and is pinned as "does not pair" in `testSyncParity.js`. What is left here
 * is the guard itself, reached the only way it still can be: by handing
 * `syncState` a state directly.
 *
 * The guard stays because `State.sync` dereferences `genome.getChromosome(...)`
 * for its `.index`, and an unplaceable name there is a TypeError on an async
 * path (#605). If it ever fires in the wild, the pairing rule admitted a pair it
 * should not have: so it says so on `console.error`, for us, and tells the host
 * nothing, since the user cannot have caused it.
 *
 * The guard is asked of the **genome**, not of the dataset. `canBeSynched` --
 * deleted at #566 with the unreachable `config.synchState` rung it guarded --
 * asked `dataset.getChrIndexFromName`, an exact case-sensitive scan, which is
 * stricter than the `genome.getChromosome` lookup `State.sync` actually
 * consumes: it aliases `1` to `chr1` and matches case-insensitively. Restoring
 * that expression verbatim would refuse peer states that sync correctly today,
 * which is what the aliasing case below pins.
 *
 * The rule itself is `canResolveSyncState` in `syncGroup.js`, unit-tested in
 * `testSyncGroup.js`.
 */

const session = (...urls) => ({browsers: urls.map(url => ({url}))})

/**
 * A sync state as a peer publishes it, shaped like `State.getSyncState` -- the
 * bin size and pixel size name the receiver's own rung, so the origin arrives
 * unrescaled and a successful sync is legible as a bare `did it happen`. Rung
 * re-derivation has its own tests, in `testResolutionLockMirror.js`.
 */
const published = (chr1Name, chr2Name) =>
    ({chr1Name, chr2Name, binSize: 50000, binX: 3, binY: 4, pixelSize: 1})

/** Two browsers on the same genome, each at a state of its own, ready to sync. */
async function twoBrowsers(container) {
    const registry = registryForContainer(container)
    await registry.restoreSession(session('https://example.com/a.hic', 'https://example.com/b.hic'))
    const [a, b] = registry.browsers
    for (const browser of [a, b]) {
        browser.genome = new Genome(browser.dataset.genomeId, browser.dataset.chromosomes)
        await browser.setState(new State(1, 1, 4, 0, 0, 1.5, 'NONE'))
    }
    return [a, b]
}

/**
 * Cut a browser's map down to `All` plus `chr1` behind the registry's back --
 * no load, so no recompute of membership -- leaving it holding a state it can
 * no longer be sent by a legitimate peer. The genome is rebuilt from the same
 * shortened list, which is how a real load builds it (`dataLoader.js`).
 */
function shrinkToChr1(browser) {
    const subset = {...browser.dataset, chromosomes: browser.dataset.chromosomes.slice(0, 2)}
    browser.setActiveDataset(subset)
    browser.genome = new Genome(subset.genomeId, subset.chromosomes)
}

describe('syncing a state naming a chromosome the receiver does not have', () => {

    const dom = withContainers()
    withStubbedLoads()

    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    it('skips the sync rather than throwing, and leaves the state alone', async () => {
        const [a, b] = await twoBrowsers(dom.container)
        shrinkToChr1(b)
        const before = b.state.clone()

        await expect(b.syncState(published('chr17', 'chr17'))).resolves.toBeUndefined()

        expect(b.state).toEqual(before)
        expect(a.state.chr1).toBe(1)
    })

    it('reports the broken pairing rule on console.error', async () => {
        const [, b] = await twoBrowsers(dom.container)
        shrinkToChr1(b)

        await b.syncState(published('chr17', 'chr17'))

        expect(console.error).toHaveBeenCalledTimes(1)
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('pairing rule'))
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('chr17'))
    })

    it('tells the host nothing: no onSyncRefused, no onLocusChange', async () => {
        // The user cannot cause this, so it is not addressed to the host. It
        // used to be `onSyncRefused({reason: 'unresolved-chromosome'})`.
        const [, b] = await twoBrowsers(dom.container)
        shrinkToChr1(b)
        const onSyncRefused = vi.spyOn(b.coordinator, 'onSyncRefused')
        const onLocusChange = vi.spyOn(b.coordinator, 'onLocusChange')

        await b.syncState(published('chr17', 'chr17'))

        expect(onSyncRefused).not.toHaveBeenCalled()
        expect(onLocusChange).not.toHaveBeenCalled()
    })

    it('skips on the second chromosome too', async () => {
        // Both names are checked. An intra-chromosomal view resolves chr1 and
        // fails on chr2, and a guard reading only the first would sail past it.
        const [, b] = await twoBrowsers(dom.container)
        shrinkToChr1(b)
        const before = b.state.clone()

        await b.syncState(published('chr1', 'chr17'))

        expect(b.state).toEqual(before)
    })

    it('still syncs a name that resolves only through the genome\'s aliasing', async () => {
        // The regression the deleted `dataset.getChrIndexFromName` check would
        // have caused: a peer publishing `1` against a receiver whose
        // chromosome is named `chr1`. `getChrIndexFromName('1')` is undefined;
        // `genome.getChromosome('1')` is the chromosome, and `State.sync`
        // handles it. The guard must admit exactly what sync can consume.
        const [, b] = await twoBrowsers(dom.container)
        shrinkToChr1(b)

        await b.syncState(published('1', '1'))

        expect(b.state.chr1).toBe(1)
        expect(b.state.chr2).toBe(1)
        expect(b.state.x).toBe(3)
        expect(b.state.y).toBe(4)
    })

    it('leaves an ordinary sync between two full maps alone', async () => {
        const [a, b] = await twoBrowsers(dom.container)
        expect(console.error).not.toHaveBeenCalled()

        await a.setState(new State(2, 2, 5, 7, 9, 1, 'NONE'))
        await b.syncState(a.getSyncState())

        expect(b.state.chr1).toBe(2)
        expect(b.state.chr2).toBe(2)
        expect(b.state.x).toBe(7)
        expect(b.state.y).toBe(9)
    })
})
