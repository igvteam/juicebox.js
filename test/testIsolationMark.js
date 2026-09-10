import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import ContactMatrixView from '../js/contactMatrixView.js'
import HICBrowser from '../js/hicBrowser.js'
import DataLoader from '../js/dataLoader.js'
import BrowserCoordinator from '../js/browserCoordinator.js'
import State from '../js/hicState.js'
import {createBrowser} from '../js/createBrowser.js'
import {registryForContainer} from '../js/browserRegistry.js'
import {withContainers} from './utils/browserFixture.js'
import {HG19, HG38 as HG38_ROWS, DM6 as DM6_ROWS, WHOLE_HG19, WHOLE_MM10, serveMaps} from './utils/servedMaps.js'

/**
 * A panel that cannot join any sync group says so, on the panel: a quiet mark
 * beside the contact-map label, the reason in its `title`. #637, ADR-0016
 * decisions 7-9.
 *
 * The real load path, stubbed only at `Dataset.loadDataset`, and assertions on
 * the mark as a user meets it -- whether it shows, and what its tooltip says --
 * rather than on how the registry decided. The rule itself is tabled in
 * `test/testSyncGroup.js`.
 */

const url = name => `https://example.com/${name}.hic`

const SUBSET_HG19 = {genomeId: 'hg19', rows: HG19.slice(0, 1)}
const HG38 = {genomeId: 'hg38', rows: HG38_ROWS}
const DM6 = {genomeId: 'dm6', rows: DM6_ROWS}

const WHOLE_REASON = 'the other panels have no chr2, chr3, chr4, … — this map does'
const SUBSET_REASON = 'this map has no chr2, chr3, chr4, … — the other panels do'
const DISABLED = 'sync is disabled for this panel'
const assembly = (mine, theirs) => `no other panel holds a compatible map (this is ${mine}; the others are ${theirs})`

/** What each panel's mark says, `null` for a hidden one, in panel order. */
function marks(browsers) {
    return browsers.map(browser => browser.isolationMark.hidden ? null : browser.isolationMark.title)
}

async function panels(container, maps) {
    serveMaps(maps)
    const browsers = []
    for (const [i] of maps.entries()) {
        browsers.push(await createBrowser(container, {url: url(`map-${i}`)}))
    }
    return browsers
}

describe('the isolation mark', () => {

    const dom = withContainers()

    beforeEach(() => {
        vi.spyOn(ContactMatrixView.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(HICBrowser.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(DataLoader.prototype, 'loadTracks').mockImplementation(async () => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    })

    afterEach(() => vi.restoreAllMocks())

    describe('where it sits', () => {

        it('is in the navbar, immediately after the contact-map label, and hidden to begin with', async () => {
            const [browser] = await panels(dom.container, [WHOLE_HG19])

            expect(browser.contactMapLabel.nextElementSibling).toBe(browser.isolationMark)
            expect(browser.isolationMark.hidden).toBe(true)
        })

        it('is out of the flow while hidden, so the navbar lays out as it did without it', async () => {
            // Tests do no layout (ADR-0013), so this pins the mechanism: the
            // `hidden` attribute, which the stylesheet keeps meaning
            // `display: none` -- nothing that reserves a box.
            const [browser] = await panels(dom.container, [WHOLE_HG19])

            expect(browser.isolationMark.hasAttribute('hidden')).toBe(true)
            expect(browser.isolationMark.style.visibility).toBe('')
        })
    })

    describe('follows the open maps', () => {

        it('marks neither of two identical hg19 maps', async () => {
            expect(marks(await panels(dom.container, [WHOLE_HG19, WHOLE_HG19]))).toEqual([null, null])
        })

        it('marks a whole-genome and a chr1-only hg19 map, each with its own coverage reason', async () => {
            expect(marks(await panels(dom.container, [WHOLE_HG19, SUBSET_HG19]))).toEqual([WHOLE_REASON, SUBSET_REASON])
        })

        it('marks hg38 and dm6 with the assembly reason', async () => {
            expect(marks(await panels(dom.container, [HG38, DM6]))).toEqual([assembly('hg38', 'dm6'), assembly('dm6', 'hg38')])
        })

        it('does not mark a single panel', async () => {
            expect(marks(await panels(dom.container, [WHOLE_HG19]))).toEqual([null])
        })

        it('does not mark one mapped panel beside an empty one', async () => {
            serveMaps([WHOLE_HG19])
            const a = await createBrowser(dom.container, {url: url('a')})
            const empty = await createBrowser(dom.container, {})

            expect(empty.dataset).toBeUndefined()
            expect(marks([a, empty])).toEqual([null, null])
        })

        it('marks only the opted-out one of a synchable panel and an opted-out one', async () => {
            serveMaps([WHOLE_HG19, WHOLE_HG19])
            const a = await createBrowser(dom.container, {url: url('a')})
            const off = await createBrowser(dom.container, {url: url('off'), synchable: false})

            expect(marks([a, off])).toEqual([null, DISABLED])
        })

        it('marks none of two hg38 and two dm6 maps -- isolation, never membership', async () => {
            expect(marks(await panels(dom.container, [HG38, DM6, HG38, DM6]))).toEqual([null, null, null, null])
        })

        it('marks a paired panel that loads an incompatible map', async () => {
            const [a, b] = await panels(dom.container, [WHOLE_HG19, WHOLE_HG19])
            expect(marks([a, b])).toEqual([null, null])

            serveMaps([WHOLE_MM10])
            await b.loadHicFile({url: url('mouse')})

            expect(marks([a, b])).toEqual([assembly('hg19', 'mm10'), assembly('mm10', 'hg19')])
        })

        it('clears an isolated panel\'s mark, and pairs it, when it loads a compatible map', async () => {
            const [a, b] = await panels(dom.container, [WHOLE_HG19, WHOLE_MM10])
            expect(marks([a, b])).toEqual([assembly('hg19', 'mm10'), assembly('mm10', 'hg19')])

            serveMaps([WHOLE_HG19])
            await b.loadHicFile({url: url('human')})

            expect(marks([a, b])).toEqual([null, null])
            expect([...b.synchedBrowsers]).toEqual([a])
        })

        it('leaves the survivors unmarked when deleting a partner leaves them a partner still', async () => {
            const [a, b, c, d] = await panels(dom.container, [WHOLE_HG19, WHOLE_HG19, WHOLE_HG19, WHOLE_MM10])

            a.registry.delete(b)

            expect(marks([a, c, d])).toEqual([null, null, assembly('mm10', 'hg19')])
        })

        it('clears the survivor\'s mark when deleting the other panel leaves it alone in the room', async () => {
            const [a, b] = await panels(dom.container, [WHOLE_HG19, WHOLE_MM10])
            expect(marks([a, b])).toEqual([assembly('hg19', 'mm10'), assembly('mm10', 'hg19')])

            a.registry.delete(b)

            expect(marks([a])).toEqual([null])
        })

        it('marks the survivor when deleting its partner leaves it beside an incompatible map', async () => {
            const [a, b, c] = await panels(dom.container, [WHOLE_HG19, WHOLE_HG19, WHOLE_MM10])

            a.registry.delete(b)

            expect(marks([a, c])).toEqual([assembly('hg19', 'mm10'), assembly('mm10', 'hg19')])
        })

        it('marks every mapped panel of a restored session that does not sync datasets', async () => {
            serveMaps([WHOLE_HG19, WHOLE_HG19, WHOLE_MM10])
            const registry = registryForContainer(dom.container)

            await registry.restoreSession({syncDatasets: false, browsers: [{url: url('a')}, {url: url('b')}, {url: url('c')}]})

            expect(marks(registry.browsers)).toEqual([DISABLED, DISABLED, DISABLED])
        })
    })

    describe('agrees with the host log', () => {

        it('gives the no-compatible-peer refusal the mark\'s own text as its message', async () => {
            serveMaps([WHOLE_HG19, SUBSET_HG19])
            await createBrowser(dom.container, {url: url('whole')})
            const refused = vi.spyOn(BrowserCoordinator.prototype, 'onSyncRefused')
            const b = await createBrowser(dom.container, {url: url('subset')})

            expect(refused).toHaveBeenCalledTimes(1)
            expect(refused.mock.calls[0][0].reason).toBe('no-compatible-peer')
            expect(refused.mock.calls[0][0].message).toBe(b.isolationMark.title)
            expect(b.isolationMark.hidden).toBe(false)
        })

        it('keeps the refusal\'s payload shape', async () => {
            serveMaps([WHOLE_HG19, WHOLE_MM10])
            await createBrowser(dom.container, {url: url('human')})
            const refused = vi.spyOn(BrowserCoordinator.prototype, 'onSyncRefused')
            await createBrowser(dom.container, {url: url('mouse')})

            expect(refused.mock.calls[0][0]).toEqual({
                reason: 'no-compatible-peer',
                message: assembly('mm10', 'hg19'),
                genomeId: 'mm10',
                peerGenomeIds: ['hg19'],
            })
        })

        it('says nothing on load for a panel the host opted out', async () => {
            serveMaps([WHOLE_HG19, WHOLE_MM10])
            await createBrowser(dom.container, {url: url('human')})
            const refused = vi.spyOn(BrowserCoordinator.prototype, 'onSyncRefused')
            const off = await createBrowser(dom.container, {url: url('mouse'), synchable: false})

            expect(refused).not.toHaveBeenCalled()
            expect(off.isolationMark.title).toBe(DISABLED)
        })
    })

    describe('stays still while the user moves', () => {

        it('is not touched by panning, zooming or changing chromosome, in any panel', async () => {
            const browsers = await panels(dom.container, [WHOLE_HG19, SUBSET_HG19, WHOLE_HG19])
            const [a] = browsers
            const before = marks(browsers)

            // Collected in the callback rather than read from `takeRecords`:
            // the awaits below deliver pending records, emptying that queue.
            const mutations = []
            const observer = new dom.window.MutationObserver(records => mutations.push(...records))
            for (const browser of browsers) {
                observer.observe(browser.isolationMark, {attributes: true})
            }

            for (const state of [
                new State(1, 1, 3, 10, 10, 1, 'NONE'),   // chr1
                new State(1, 1, 3, 40, 25, 1, 'NONE'),   // pan
                new State(1, 1, 6, 40, 25, 1, 'NONE'),   // zoom
                new State(8, 9, 2, 0, 0, 1, 'NONE'),     // another chromosome pair
                new State(0, 0, 0, 0, 0, 1, 'NONE'),     // whole genome
            ]) {
                await a.setState(state)
                a.syncToOtherBrowsers()
            }
            await vi.waitFor(() => expect(browsers[2].state.chr1).toBe(0))

            mutations.push(...observer.takeRecords())
            expect(mutations.map(record => record.attributeName)).toEqual([])
            expect(marks(browsers)).toEqual(before)
            observer.disconnect()
        })
    })
})
