import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import ContactMatrixView from '../js/contactMatrixView.js'
import HICBrowser from '../js/hicBrowser.js'
import DataLoader from '../js/dataLoader.js'
import {createBrowser} from '../js/createBrowser.js'
import {withContainers} from './utils/browserFixture.js'
import State from '../js/hicState.js'
import BrowserCoordinator from '../js/browserCoordinator.js'
import {HG19, HG38 as HG38_ROWS, DM6 as DM6_ROWS, WHOLE_HG19, ensemblNames, serveMaps} from './utils/servedMaps.js'

/**
 * Two panels pair only if they can follow each other everywhere: same assembly
 * **and** each can place every chromosome the other carries. #636, ADR-0016
 * decisions 2-4.
 *
 * The real load path, stubbed only at `Dataset.loadDataset`, with datasets on
 * the real `Dataset.prototype` -- so `isCompatible`, `canSyncWith` and
 * `compareChromosomes` are the shipping code. Assertions are on who holds whom
 * in `synchedBrowsers` and on what a host is told, not on how either is stored.
 */

const url = name => `https://example.com/${name}.hic`

const SUBSET_HG19 = {genomeId: 'hg19', rows: HG19.slice(0, 1)}          // All + chr1 only
const HG38 = {genomeId: 'hg38', rows: HG38_ROWS}
const DM6 = {genomeId: 'dm6', rows: DM6_ROWS}

/** hg19 with a mitochondrion, as UCSC and as Ensembl name it. */
const HG19_M = [...HG19, ['chrM', 16571]]
const HG19_UCSC = {genomeId: 'hg19', rows: HG19_M}
const HG19_ENSEMBL = {genomeId: 'GRCh37', rows: ensemblNames(HG19_M)}
/** hg19 with its names capitalized: `Chr1`, `ChrX`, `ChrM`. */
const HG19_CAPITALIZED = {genomeId: 'hg19', rows: HG19_M.map(([name, size]) => ['C' + name.substring(1), size])}

/** Each browser's partners, by panel order, so a failure names who holds whom. */
function membership(browsers) {
    return browsers.map(browser => [...browser.synchedBrowsers].map(peer => browsers.indexOf(peer)).sort())
}

async function panels(container, maps) {
    serveMaps(maps)
    const browsers = []
    for (const [i] of maps.entries()) {
        browsers.push(await createBrowser(container, {url: url(`map-${i}`)}))
    }
    return browsers
}

describe('panels pair only on two-way chromosome parity', () => {

    const dom = withContainers()

    beforeEach(() => {
        vi.spyOn(ContactMatrixView.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(HICBrowser.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(DataLoader.prototype, 'loadTracks').mockImplementation(async () => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => vi.restoreAllMocks())

    it('pairs two identical hg19 maps', async () => {
        const browsers = await panels(dom.container, [WHOLE_HG19, WHOLE_HG19])
        expect(membership(browsers)).toEqual([[1], [0]])
    })

    it('does not pair a whole-genome hg19 map with a chr1-only hg19 map', async () => {
        // The reversal ADR-0016 records. #627 paired these, and the subset
        // panel followed across chr1 and stalled beyond it.
        const browsers = await panels(dom.container, [WHOLE_HG19, SUBSET_HG19])
        expect(membership(browsers)).toEqual([[], []])
    })

    it('does not pair them in the other load order either', async () => {
        const browsers = await panels(dom.container, [SUBSET_HG19, WHOLE_HG19])
        expect(membership(browsers)).toEqual([[], []])
    })

    it('leaves a subset panel where it is rather than syncing it on load', async () => {
        serveMaps([WHOLE_HG19, SUBSET_HG19])
        const a = await createBrowser(dom.container, {url: url('whole')})
        await a.setState(new State(1, 1, 5, 7, 9, 1, 'NONE'))
        const b = await createBrowser(dom.container, {url: url('subset')})

        expect(b.state.zoom).not.toBe(5)
    })

    it('does not pair hg38 with dm6', async () => {
        const browsers = await panels(dom.container, [HG38, DM6])
        expect(membership(browsers)).toEqual([[], []])
    })

    it('forms two groups from two hg38 and two dm6 maps, with no edge between them', async () => {
        const browsers = await panels(dom.container, [HG38, DM6, HG38, DM6])
        expect(membership(browsers)).toEqual([[2], [3], [0], [1]])
    })

    for (const [label, other] of [['chr prefix and MT/chrM', HG19_ENSEMBL], ['case', HG19_CAPITALIZED]]) {
        it(`pairs maps whose names differ by ${label}, and syncs on load`, async () => {
            serveMaps([HG19_UCSC, other])
            const a = await createBrowser(dom.container, {url: url('ucsc')})
            await a.setState(new State(2, 2, 5, 7, 9, 1, 'NONE'))
            const b = await createBrowser(dom.container, {url: url('other')})

            expect(membership([a, b])).toEqual([[1], [0]])
            expect(b.state.chr1).toBe(2)
            expect(b.state.zoom).toBe(5)
        })
    }

    it('brings a panel joining a group on load to its peer\'s current view', async () => {
        serveMaps([WHOLE_HG19, WHOLE_HG19])
        const a = await createBrowser(dom.container, {url: url('a')})
        await a.setState(new State(3, 4, 6, 11, 13, 1, 'NONE'))
        const b = await createBrowser(dom.container, {url: url('b')})

        expect([b.state.chr1, b.state.chr2, b.state.zoom, b.state.x, b.state.y]).toEqual([3, 4, 6, 11, 13])
    })

    it('never refuses a sync while a paired panel pans across every chromosome', async () => {
        const [a, b] = await panels(dom.container, [HG19_UCSC, HG19_ENSEMBL])
        const refused = vi.spyOn(BrowserCoordinator.prototype, 'onSyncRefused')

        for (let chr = 0; chr < a.dataset.chromosomes.length; chr++) {
            await a.setState(new State(chr, chr, 0, 0, 0, 1, 'NONE'))
            a.syncToOtherBrowsers()
            await vi.waitFor(() => expect(b.state.chr1).toBe(chr))
        }

        expect(refused).not.toHaveBeenCalled()
        expect(console.error).not.toHaveBeenCalled()
    })
})
