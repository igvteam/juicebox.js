import {describe, it, expect} from 'vitest'
import {pairSynchable, canResolveSyncState, isolationReasons} from '../js/syncGroup.js'
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

/**
 * Which panels wear the isolation mark, and what its tooltip says. #637,
 * ADR-0016 decisions 7-8.
 *
 * Pure, like `pairSynchable`, so the browsers are fabricated again. The fake
 * dataset is an assembly plus a list of chromosome names, and answers the three
 * questions the rule asks of a real one: `isCompatible` (same assembly),
 * `canSyncWith` (same assembly and the same chromosomes) and
 * `missingChromosomes` (what the other carries that this cannot place).
 */
describe('isolationReasons', () => {

    function coverage(genomeId, names) {
        return {
            genomeId,
            names,
            isCompatible: other => other.genomeId === genomeId,
            canSyncWith(other) {
                return other.genomeId === genomeId &&
                    0 === this.missingChromosomes(other).length &&
                    0 === other.missingChromosomes(this).length
            },
            missingChromosomes: other => other.names.filter(name => !names.includes(name))
        }
    }

    const WHOLE = ['chr1', 'chr2', 'chr3', 'chr4', 'chr5']
    const whole = (genomeId = 'hg19') => coverage(genomeId, WHOLE)
    const chr1Only = (genomeId = 'hg19') => coverage(genomeId, ['chr1'])

    /** The reasons as `{name: reason}`, so a failure says who got what. */
    function reasons(browsers) {
        return Object.fromEntries([...isolationReasons(browsers)].map(([browser, reason]) => [browser.name, reason]))
    }

    it('marks nobody when no panel holds a map', () => {
        expect(reasons([fakeBrowser('a'), fakeBrowser('b')])).toEqual({})
    })

    it('marks nobody in the empty room: one mapped panel, alone', () => {
        expect(reasons([fakeBrowser('a', {dataset: whole()})])).toEqual({})
    })

    it('marks nobody in the empty room: one mapped panel beside empty ones', () => {
        const browsers = [fakeBrowser('a', {dataset: whole()}), fakeBrowser('empty')]
        expect(reasons(browsers)).toEqual({})
    })

    it('does not mark an opted-out panel alone in the empty room either', () => {
        const browsers = [fakeBrowser('a', {dataset: whole(), synchable: false}), fakeBrowser('empty')]
        expect(reasons(browsers)).toEqual({})
    })

    it('marks nobody when every mapped panel has a partner', () => {
        const browsers = [
            fakeBrowser('a', {dataset: whole('hg38')}), fakeBrowser('b', {dataset: whole('dm6')}),
            fakeBrowser('c', {dataset: whole('hg38')}), fakeBrowser('d', {dataset: whole('dm6')}),
        ]
        expect(reasons(browsers)).toEqual({})
    })

    it('never marks a panel without a map', () => {
        const browsers = [fakeBrowser('a', {dataset: whole('hg38')}), fakeBrowser('b', {dataset: whole('dm6')}), fakeBrowser('empty')]
        expect(reasons(browsers)).not.toHaveProperty('empty')
    })

    it('marks an opted-out panel as disabled, whatever it could have paired with', () => {
        const browsers = [fakeBrowser('a', {dataset: whole()}), fakeBrowser('b', {dataset: whole()}), fakeBrowser('off', {dataset: whole(), synchable: false})]
        expect(reasons(browsers)).toEqual({off: 'sync is disabled for this panel'})
    })

    it('leaves a synchable panel whose only company is opted out unmarked', () => {
        // The opted-out panel's own mark already accounts for the stillness.
        const browsers = [fakeBrowser('a', {dataset: whole()}), fakeBrowser('off', {dataset: whole('dm6'), synchable: false})]
        expect(reasons(browsers)).toEqual({off: 'sync is disabled for this panel'})
    })

    it('marks every panel when all of them are opted out', () => {
        const browsers = [fakeBrowser('a', {dataset: whole(), synchable: false}), fakeBrowser('b', {dataset: whole(), synchable: false})]
        expect(reasons(browsers)).toEqual({a: 'sync is disabled for this panel', b: 'sync is disabled for this panel'})
    })

    it('blames coverage on both sides of a subset and a whole-genome map of one assembly', () => {
        const browsers = [fakeBrowser('whole', {dataset: whole()}), fakeBrowser('subset', {dataset: chr1Only()})]
        expect(reasons(browsers)).toEqual({
            whole: 'the other panels have no chr2, chr3, chr4, … — this map does',
            subset: 'this map has no chr2, chr3, chr4, … — the other panels do',
        })
    })

    it('names every missing chromosome, without an ellipsis, when there are three or fewer', () => {
        const browsers = [fakeBrowser('a', {dataset: coverage('hg19', ['chr1', 'chr2', 'chr3'])}), fakeBrowser('b', {dataset: chr1Only()})]
        expect(reasons(browsers)).toEqual({
            a: 'the other panels have no chr2, chr3 — this map does',
            b: 'this map has no chr2, chr3 — the other panels do',
        })
    })

    it('takes the union of what the same-assembly peers carry, in the table order of whichever carries it', () => {
        const browsers = [
            fakeBrowser('subset', {dataset: chr1Only()}),
            fakeBrowser('p', {dataset: coverage('hg19', ['chr1', 'chr7'])}),
            fakeBrowser('q', {dataset: coverage('hg19', ['chr7', 'chr1', 'chr2', 'chr9'])}),
        ]
        expect(reasons(browsers).subset).toBe('this map has no chr7, chr2, chr9 — the other panels do')
    })

    it('blames the assembly when no peer is the same assembly, naming each other genome once', () => {
        const browsers = [
            fakeBrowser('fly', {dataset: whole('dm6')}),
            fakeBrowser('a', {dataset: whole('hg38')}), fakeBrowser('b', {dataset: whole('hg38')}),
            fakeBrowser('m', {dataset: whole('mm10')}), fakeBrowser('n', {dataset: whole('mm10')}),
        ]
        expect(reasons(browsers)).toEqual({fly: 'no other panel holds a compatible map (this is dm6; the others are hg38, mm10)'})
    })

    it('blames the assembly on both sides of an hg38 and a dm6 map', () => {
        const browsers = [fakeBrowser('human', {dataset: whole('hg38')}), fakeBrowser('fly', {dataset: whole('dm6')})]
        expect(reasons(browsers)).toEqual({
            human: 'no other panel holds a compatible map (this is hg38; the others are dm6)',
            fly: 'no other panel holds a compatible map (this is dm6; the others are hg38)',
        })
    })

    it('blames coverage, not the assembly, when any partnerless peer is the same assembly', () => {
        const browsers = [fakeBrowser('subset', {dataset: chr1Only('hg38')}), fakeBrowser('whole', {dataset: whole('hg38')}), fakeBrowser('fly', {dataset: whole('dm6')})]
        expect(reasons(browsers).subset).toBe('this map has no chr2, chr3, chr4, … — the other panels do')
    })

    it('leaves out opted-out panels when naming the other genomes', () => {
        const browsers = [fakeBrowser('human', {dataset: whole('hg38')}), fakeBrowser('fly', {dataset: whole('dm6')}), fakeBrowser('off', {dataset: whole('mm10'), synchable: false})]
        expect(reasons(browsers).human).toBe('no other panel holds a compatible map (this is hg38; the others are dm6)')
    })
})
