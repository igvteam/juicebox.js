import {describe, it, expect} from 'vitest'
import {pairSynchable, canResolveSyncState} from '../js/syncGroup.js'
import Genome from '../js/genome.js'

/**
 * The sync-group pairing rule -- see #476, decision 6 of ADR-0004.
 *
 * `pairSynchable` is the rule alone: given browsers, which of them should sync
 * with which. It reads no module state and touches no DOM, so the browsers here
 * are fabricated objects carrying only what the rule reads -- a `synchable`
 * flag and a `dataset` that can answer `canSyncWith`, the sync predicate
 * (ADR-0016 decision 2). `isCompatible` is the control-map predicate and the
 * rule must not read it: the fake answers it with the opposite of `canSyncWith`
 * so that a rule reading the wrong one fails here.
 */

function fakeDataset(genomeId) {
    return {
        genomeId,
        canSyncWith(other) {
            return other.genomeId === genomeId
        },
        isCompatible(other) {
            return other.genomeId !== genomeId
        }
    }
}

function fakeBrowser(name, {dataset, synchable} = {}) {
    const browser = {name}
    if (dataset !== undefined) browser.dataset = dataset
    if (synchable !== undefined) browser.synchable = synchable
    return browser
}

describe('pairSynchable', () => {

    it('pairs two browsers whose datasets are compatible', () => {
        const hg38 = fakeDataset('hg38')
        const a = fakeBrowser('a', {dataset: hg38})
        const b = fakeBrowser('b', {dataset: hg38})

        expect(pairSynchable([a, b])).toEqual([[a, b]])
    })

    it('does not pair browsers whose datasets are incompatible', () => {
        const a = fakeBrowser('a', {dataset: fakeDataset('hg38')})
        const b = fakeBrowser('b', {dataset: fakeDataset('hg19')})

        expect(pairSynchable([a, b])).toEqual([])
    })

    it('skips a browser that opted out with synchable false', () => {
        const hg38 = fakeDataset('hg38')
        const a = fakeBrowser('a', {dataset: hg38})
        const optedOut = fakeBrowser('opted-out', {dataset: hg38, synchable: false})

        expect(pairSynchable([a, optedOut])).toEqual([])
    })

    it('skips a browser that has not loaded a dataset yet', () => {
        const a = fakeBrowser('a', {dataset: fakeDataset('hg38')})
        const empty = fakeBrowser('empty')

        expect(pairSynchable([a, empty])).toEqual([])
    })

    it('returns nothing for an empty list', () => {
        expect(pairSynchable([])).toEqual([])
    })

    it('returns nothing for a single browser', () => {
        const only = fakeBrowser('only', {dataset: fakeDataset('hg38')})

        expect(pairSynchable([only])).toEqual([])
    })

    it('never pairs a browser with itself, even if the list repeats it', () => {
        const only = fakeBrowser('only', {dataset: fakeDataset('hg38')})

        expect(pairSynchable([only, only])).toEqual([])
    })

    it('pairs each compatible combination once, ignoring the rest', () => {
        const hg38 = fakeDataset('hg38')
        const a = fakeBrowser('a', {dataset: hg38})
        const b = fakeBrowser('b', {dataset: hg38})
        const c = fakeBrowser('c', {dataset: hg38})
        const other = fakeBrowser('other', {dataset: fakeDataset('hg19')})
        const optedOut = fakeBrowser('opted-out', {dataset: hg38, synchable: false})
        const empty = fakeBrowser('empty')

        expect(pairSynchable([a, other, b, optedOut, empty, c])).toEqual([[a, b], [a, c], [b, c]])
    })

    it('yields a partition: every browser in exactly one group, each group fully paired', () => {
        // `canSyncWith` is an equivalence relation, so the pairs are the
        // complete graphs of disjoint groups -- "which group is this panel in"
        // has one answer. ADR-0016 decision 4.
        const browsers = ['hg38', 'dm6', 'hg38', 'mm10', 'dm6', 'hg38']
            .map((genomeId, i) => fakeBrowser(`${genomeId}-${i}`, {dataset: fakeDataset(genomeId)}))

        const partners = new Map(browsers.map(b => [b, new Set([b])]))
        for (const [a, b] of pairSynchable(browsers)) {
            partners.get(a).add(b)
            partners.get(b).add(a)
        }

        const groups = new Set([...partners.values()].map(group => [...group].map(b => b.name).sort().join(' ')))
        expect([...groups].sort()).toEqual(['dm6-1 dm6-4', 'hg38-0 hg38-2 hg38-5', 'mm10-3'])
        for (const browser of browsers) {
            for (const peer of partners.get(browser)) {
                expect(partners.get(peer)).toEqual(partners.get(browser))
            }
        }
    })
})

/**
 * The other rule in this module, and the one that must not be mistaken for
 * membership: whether one particular sync state is one this browser can act on.
 * `HICBrowser.syncState` reads it as the second half of its gate -- #605.
 *
 * A real `Genome` rather than a stand-in, because the whole point of the rule is
 * *which* lookup it uses: the aliasing, case-insensitive one the genome offers
 * and `State.sync` consumes, not the dataset's exact scan. A fake would let the
 * distinction the rule exists for pass unasserted.
 */
describe('canResolveSyncState', () => {

    const genome = () => new Genome('hg19', [
        {name: 'All', size: 3000, index: 0},
        {name: 'chr1', size: 1000, index: 1},
        {name: 'chrM', size: 16, index: 2},
    ])

    const state = (chr1Name, chr2Name) =>
        ({chr1Name, chr2Name, binSize: 1000, binX: 0, binY: 0, pixelSize: 1})

    it('admits a state naming chromosomes the genome has', () => {
        expect(canResolveSyncState(genome(), state('chr1', 'chr1'))).toBe(true)
    })

    it('admits a name that resolves only through aliasing', () => {
        // `1` for `chr1`, `MT` for `chrM`. The dataset's `getChrIndexFromName`
        // refuses both; `State.sync` handles both.
        expect(canResolveSyncState(genome(), state('1', 'MT'))).toBe(true)
    })

    it('admits a name that differs only in case', () => {
        expect(canResolveSyncState(genome(), state('CHR1', 'chr1'))).toBe(true)
    })

    it('refuses a state naming a chromosome the genome does not have', () => {
        expect(canResolveSyncState(genome(), state('chr17', 'chr17'))).toBe(false)
    })

    it('refuses when only the second chromosome is missing', () => {
        expect(canResolveSyncState(genome(), state('chr1', 'chr17'))).toBe(false)
    })

    it('refuses rather than throwing when there is no genome yet', () => {
        // A browser mid-load. The gate is the last thing standing between a
        // peer's publication and a dereference, so it answers rather than
        // throwing on every shape it can be handed.
        expect(canResolveSyncState(undefined, state('chr1', 'chr1'))).toBe(false)
    })

    it('refuses a state whose names are missing altogether', () => {
        expect(canResolveSyncState(genome(), state(undefined, undefined))).toBe(false)
    })
})
