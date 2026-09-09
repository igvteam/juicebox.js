import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import Dataset from '../js/hicDataset.js'
import ContactMatrixView from '../js/contactMatrixView.js'
import HICBrowser from '../js/hicBrowser.js'
import DataLoader from '../js/dataLoader.js'
import {createBrowser} from '../js/createBrowser.js'
import {withContainers} from './utils/browserFixture.js'
import State from '../js/hicState.js'
import BrowserCoordinator from '../js/browserCoordinator.js'

/**
 * The user's scenario, end to end: load a map into a panel, move it, add a
 * second panel, load a map into that. Does the second panel arrive at the
 * first panel's view?
 *
 * The seam is `Dataset.loadDataset` -- the network read -- and nothing above
 * it. `stubbedLoads.js` cannot be used here: it stubs `loadHicFile` whole, and
 * `loadHicFile`'s closing sync block is the code under test.
 *
 * The stand-in dataset is built on the real `Dataset.prototype`, so
 * `isCompatible` and `compareChromosomes` are the shipping implementations
 * rather than a fixture's paraphrase. That matters: the fixture in
 * `restoreDataset.js` overrides `isCompatible` to a bare genome-id comparison,
 * which is exactly the decision this bug turns on.
 */

const HG19 = [
    ['chr1', 249250621], ['chr2', 243199373], ['chr3', 198022430], ['chr4', 191154276],
    ['chr5', 180915260], ['chr6', 171115067], ['chr7', 159138663], ['chr8', 146364022],
    ['chr9', 141213431], ['chr10', 135534747], ['chr11', 135006516], ['chr12', 133851895],
    ['chr13', 115169878], ['chr14', 107349540], ['chr15', 102531392], ['chr16', 90354753],
    ['chr17', 81195210], ['chr18', 78077248], ['chr19', 59128983], ['chr20', 63025520],
    ['chr21', 48129895], ['chr22', 51304566], ['chrX', 155270560], ['chrY', 59373566],
]

const BP_RESOLUTIONS = [2500000, 1000000, 500000, 250000, 100000, 50000, 25000, 10000, 5000]

function chromosomeTable(rows) {
    const named = rows.map(([name, size], i) => ({index: i + 1, name, size}))
    const all = {index: 0, name: 'All', size: named.reduce((sum, c) => sum + c.size, 0)}
    return [all, ...named]
}

const matrix = (resolutions = BP_RESOLUTIONS) => ({
    getZoomDataByIndex(index, unit) {
        const binSize = resolutions[index]
        return binSize === undefined ? undefined : {zoom: {index, unit, binSize}}
    },
    findZoomForResolution(binSize) {
        for (let z = resolutions.length - 1; z > 0; z--) if (resolutions[z] >= binSize) return z
        return 0
    },
})

/** A dataset on the real prototype: only data and the network-backed methods differ. */
function fakeDataset({genomeId, rows, resolutions, config}) {
    const chromosomes = chromosomeTable(rows)
    const bpResolutions = resolutions || BP_RESOLUTIONS
    return Object.assign(Object.create(Dataset.prototype), {
        name: config.name,
        url: config.url,
        datasetType: 'hic',
        genomeId,
        chromosomes,
        bpResolutions,
        wholeGenomeChromosome: chromosomes[0],
        normalizationTypes: ['NONE'],
        async getMatrix() { return matrix(bpResolutions) },
        hicFile: {config: {}},
    })
}

/**
 * Queue the maps each successive `loadHicFile` should get, in load order.
 * Returns nothing; the spy is torn down with the rest of the mocks.
 */
function serveMaps(maps) {
    const queue = [...maps]
    vi.spyOn(Dataset, 'loadDataset').mockImplementation(async config => {
        const spec = queue.shift()
        return fakeDataset({...spec, config})
    })
}

const WHOLE_HG19 = {genomeId: 'hg19', rows: HG19}
const SUBSET_HG19 = {genomeId: 'hg19', rows: HG19.slice(0, 1)}          // All + chr1 only
const MM10 = [
    ['chr1', 195471971], ['chr2', 182113224], ['chr3', 160039680], ['chr4', 156508116],
    ['chr5', 151834684], ['chr6', 149736546], ['chr7', 145441459], ['chr8', 129401213],
]
const EXTRA_SCAFFOLD = {genomeId: 'hg19_scaffolds', rows: [...HG19, ['scaffold_7', 12345]]}
const PLAIN_HG19 = {genomeId: 'hg19_no_alt', rows: HG19}
/** A map binned no finer than 100kb -- a low-coverage or coarse .hic. */
const COARSE_HG19 = {genomeId: 'hg19', rows: HG19, resolutions: [2500000, 1000000, 500000, 250000, 100000]}

describe('a second panel loading a map syncs to the first panel', () => {

    const dom = withContainers()

    beforeEach(() => {
        vi.spyOn(ContactMatrixView.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(HICBrowser.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(DataLoader.prototype, 'loadTracks').mockImplementation(async () => undefined)
    })

    afterEach(() => vi.restoreAllMocks())

    /**
     * Panel 1 loads, is panned/zoomed to a locus, then panel 2 loads.
     * Returns both browsers.
     */
    async function twoPanels(container, firstMap, secondMap, view) {
        serveMaps([firstMap, secondMap])
        const a = await createBrowser(container, {url: 'https://example.com/a.hic'})
        await a.setState(view)
        const b = await createBrowser(container, {url: 'https://example.com/b.hic'})
        return [a, b]
    }

    /** chr2 vs chr2, zoom 5, origin (7, 9) -- an unmistakably non-default view. */
    const MOVED = () => new State(2, 2, 5, 7, 9, 1, 'NONE')

    it('syncs when both maps are the same whole assembly', async () => {
        const [a, b] = await twoPanels(dom.container, WHOLE_HG19, WHOLE_HG19, MOVED())
        expect(a.state.chr1).toBe(2)
        expect(b.state.chr1).toBe(2)
        expect(b.state.chr2).toBe(2)
        expect(b.state.zoom).toBe(5)
    })

    it('syncs when the second map is a chr1-only subset and panel 1 sits on chr1', async () => {
        const [, b] = await twoPanels(dom.container, WHOLE_HG19, SUBSET_HG19, new State(1, 1, 5, 7, 9, 1, 'NONE'))
        expect(b.state.chr1).toBe(1)
        expect(b.state.chr2).toBe(1)
    })

    it('syncs two maps of one assembly whose chromosome tables differ', async () => {
        // #626. Both are hg19, but neither id is one `isCompatible`
        // short-circuits on and one carries an extra scaffold, so the pair used
        // to fall to `compareChromosomes`' byte-identical rule and be refused.
        const [a, b] = await twoPanels(dom.container, PLAIN_HG19, EXTRA_SCAFFOLD, MOVED())
        expect(a.state.chr1).toBe(2)
        expect(b.state.chr1).toBe(2)
        expect(b.state.x).toBe(7)
        expect(b.state.y).toBe(9)
    })

    it('syncs when panel 1 is coarser or finer than the second map allows', async () => {
        // Panel 1 at zoom 8 (5kb); panel 2's finest rung is 100kb. Ruled out as
        // a cause during #626 and pinned here so it stays ruled out.
        const [, b] = await twoPanels(dom.container, WHOLE_HG19, COARSE_HG19, new State(2, 2, 8, 700, 900, 1, 'NONE'))
        expect(b.state.chr1).toBe(2)
    })

    it('syncs when panel 1 sits at the whole-genome view', async () => {
        const [, b] = await twoPanels(dom.container, WHOLE_HG19, WHOLE_HG19, new State(0, 0, 0, 0, 0, 1, 'NONE'))
        expect(b.state.chr1).toBe(0)
    })
})

describe('a panel that cannot follow its sibling says so', () => {

    const dom = withContainers()

    beforeEach(() => {
        vi.spyOn(ContactMatrixView.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(HICBrowser.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(DataLoader.prototype, 'loadTracks').mockImplementation(async () => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    })

    afterEach(() => vi.restoreAllMocks())

    /** Load panel 1, move it, then load panel 2 while watching for the report. */
    async function loadAndWatch(container, firstMap, secondMap, view) {
        serveMaps([firstMap, secondMap])
        const a = await createBrowser(container, {url: 'https://example.com/a.hic'})
        await a.setState(view)

        // Spied, not stubbed: the real body has to run, because the
        // `console.warn` and the `externalCallbacks` fan-out inside it are half
        // of what this suite is claiming.
        const spy = vi.spyOn(BrowserCoordinator.prototype, 'onSyncRefused')

        const b = await createBrowser(container, {url: 'https://example.com/b.hic'})
        const refusals = spy.mock.calls.map(([detail]) => detail)
        spy.mockRestore()
        return [a, b, refusals]
    }

    it('reports the chromosome the second map does not have', async () => {
        // The guard itself is correct and stays: chr2 cannot be shown on a map
        // that stops at chr1. What #626 adds is that the host is told.
        const [, b, refusals] = await loadAndWatch(
            dom.container, WHOLE_HG19, SUBSET_HG19, new State(2, 2, 5, 7, 9, 1, 'NONE'))

        expect(b.state.chr1).not.toBe(2)
        expect(refusals).toHaveLength(1)
        expect(refusals[0].reason).toBe('unresolved-chromosome')
        expect(refusals[0].chr1Name).toBe('chr2')
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('chr2'))
    })

    it('reports a peer whose map is a different assembly', async () => {
        const [, , refusals] = await loadAndWatch(
            dom.container, WHOLE_HG19, {genomeId: 'mm10', rows: MM10}, new State(2, 2, 5, 7, 9, 1, 'NONE'))

        expect(refusals).toHaveLength(1)
        expect(refusals[0].reason).toBe('no-compatible-peer')
        expect(refusals[0].peerGenomeIds).toEqual(['hg19'])
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('hg19'))
    })

    it('says nothing when the first panel loads into an empty registry', async () => {
        // No peer, but no refusal either: an empty room is not a rejection.
        serveMaps([WHOLE_HG19])
        const spy = vi.spyOn(BrowserCoordinator.prototype, 'onSyncRefused')
        await createBrowser(dom.container, {url: 'https://example.com/a.hic'})
        const calls = spy.mock.calls.length
        spy.mockRestore()

        expect(calls).toBe(0)
    })

    it('delivers the refusal to a host callback registered with addCallback', async () => {
        // The other cases here watch the coordinator method; this one watches
        // what a host actually receives, which is the published contract
        // (ADR-0003) and the half that a severed fan-out would silently drop.
        serveMaps([WHOLE_HG19])
        const browser = await createBrowser(dom.container, {url: 'https://example.com/a.hic'})

        const received = []
        const unsubscribe = browser.coordinator.addCallback('onSyncRefused', detail => received.push(detail))
        browser.coordinator.onSyncRefused({reason: 'unresolved-chromosome', message: 'no chrZ'})
        unsubscribe()
        browser.coordinator.onSyncRefused({reason: 'unresolved-chromosome', message: 'ignored'})

        expect(received).toHaveLength(1)
        expect(received[0].reason).toBe('unresolved-chromosome')
        expect(received[0].browser).toBe(browser)
    })

    it('says nothing on an ordinary successful sync', async () => {
        const [, b, refusals] = await loadAndWatch(
            dom.container, WHOLE_HG19, WHOLE_HG19, new State(2, 2, 5, 7, 9, 1, 'NONE'))

        expect(b.state.chr1).toBe(2)
        expect(refusals).toEqual([])
    })
})
