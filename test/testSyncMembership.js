import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import ContactMatrixView from '../js/contactMatrixView.js'
import HICBrowser from '../js/hicBrowser.js'
import DataLoader from '../js/dataLoader.js'
import {createBrowser} from '../js/createBrowser.js'
import {registryForContainer} from '../js/browserRegistry.js'
import {withContainers} from './utils/browserFixture.js'
import {HG19, MM10, UNREACHABLE, serveMaps} from './utils/servedMaps.js'

/**
 * Sync membership is a pure function of the open maps, derived fresh wherever
 * the set of open maps changes rather than only ever added to. #635, ADR-0016
 * decision 6.
 *
 * Every case drives the real load path, stubbed only at `Dataset.loadDataset`,
 * and reads `synchedBrowsers` -- what `syncToOtherBrowsers` walks -- rather than
 * how the registry stores it.
 */

const WHOLE_HG19 = {genomeId: 'hg19', rows: HG19}
const WHOLE_MM10 = {genomeId: 'mm10', rows: MM10}

const url = name => `https://example.com/${name}.hic`

/** Each browser's partners, by panel order, so a failure names who holds whom. */
function membership(browsers) {
    return browsers.map(browser => [...browser.synchedBrowsers].map(peer => browsers.indexOf(peer)))
}

describe('sync membership follows the open maps', () => {

    const dom = withContainers()

    beforeEach(() => {
        vi.spyOn(ContactMatrixView.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(HICBrowser.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(DataLoader.prototype, 'loadTracks').mockImplementation(async () => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    })

    afterEach(() => vi.restoreAllMocks())

    it('pairs a panel created with a compatible map', async () => {
        // `createBrowser` loads before it registers, so the load's own
        // recompute cannot see the newcomer; joining the registry is itself a
        // change to the open maps.
        serveMaps([WHOLE_HG19, WHOLE_HG19])
        const a = await createBrowser(dom.container, {url: url('a')})
        const b = await createBrowser(dom.container, {url: url('b')})

        expect(membership([a, b])).toEqual([[1], [0]])
    })

    it('unpairs a panel on both sides when it loads an incompatible map', async () => {
        serveMaps([WHOLE_HG19, WHOLE_HG19, WHOLE_MM10])
        const a = await createBrowser(dom.container, {url: url('a')})
        const b = await createBrowser(dom.container, {url: url('b')})
        expect(membership([a, b])).toEqual([[1], [0]])

        await b.loadHicFile({url: url('mouse')})

        expect(membership([a, b])).toEqual([[], []])
    })

    it('no longer hands a panel its former peer\'s states once it has moved on', async () => {
        serveMaps([WHOLE_HG19, WHOLE_HG19, WHOLE_MM10])
        const a = await createBrowser(dom.container, {url: url('a')})
        const b = await createBrowser(dom.container, {url: url('b')})
        await b.loadHicFile({url: url('mouse')})

        const received = vi.spyOn(b, 'syncState')
        a.syncToOtherBrowsers()

        expect(received).not.toHaveBeenCalled()
    })

    it('pairs an unpaired panel that loads a compatible map', async () => {
        serveMaps([WHOLE_HG19, WHOLE_MM10, WHOLE_HG19])
        const a = await createBrowser(dom.container, {url: url('a')})
        const b = await createBrowser(dom.container, {url: url('mouse')})
        expect(membership([a, b])).toEqual([[], []])

        await b.loadHicFile({url: url('b')})

        expect(membership([a, b])).toEqual([[1], [0]])
    })

    it('drops a panel from every group when its load fails and leaves it without a map', async () => {
        serveMaps([WHOLE_HG19, WHOLE_HG19, UNREACHABLE])
        const a = await createBrowser(dom.container, {url: url('a')})
        const b = await createBrowser(dom.container, {url: url('b')})

        await expect(b.loadHicFile({url: url('gone')})).rejects.toThrow()

        expect(b.dataset).toBeUndefined()
        expect(membership([a, b])).toEqual([[], []])
    })

    it('leaves the survivors of a delete paired among themselves and nobody holding the deleted one', async () => {
        serveMaps([WHOLE_HG19, WHOLE_HG19, WHOLE_HG19, WHOLE_MM10])
        const a = await createBrowser(dom.container, {url: url('a')})
        const b = await createBrowser(dom.container, {url: url('b')})
        const c = await createBrowser(dom.container, {url: url('c')})
        const d = await createBrowser(dom.container, {url: url('mouse')})

        a.registry.delete(b)

        expect(membership([a, c, d])).toEqual([[1], [0], []])
    })
})

describe('a restored session\'s sync membership', () => {

    const dom = withContainers()

    beforeEach(() => {
        vi.spyOn(ContactMatrixView.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(HICBrowser.prototype, 'update').mockImplementation(async () => undefined)
        vi.spyOn(DataLoader.prototype, 'loadTracks').mockImplementation(async () => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    })

    afterEach(() => vi.restoreAllMocks())

    const session = (extra = {}) => ({
        ...extra,
        browsers: [{url: url('a')}, {url: url('b')}, {url: url('mouse')}]
    })

    it('pairs the compatible browsers when the session syncs datasets', async () => {
        serveMaps([WHOLE_HG19, WHOLE_HG19, WHOLE_MM10])
        const registry = registryForContainer(dom.container)

        await registry.restoreSession(session({syncDatasets: true}))

        expect(membership(registry.browsers)).toEqual([[1], [0], []])
    })

    it('pairs nothing when the session does not sync datasets', async () => {
        serveMaps([WHOLE_HG19, WHOLE_HG19, WHOLE_MM10])
        const registry = registryForContainer(dom.container)

        await registry.restoreSession(session({syncDatasets: false}))

        expect(membership(registry.browsers)).toEqual([[], [], []])
    })

    it('replaces the membership a previous session left behind', async () => {
        serveMaps([WHOLE_HG19, WHOLE_HG19, WHOLE_MM10, WHOLE_HG19, WHOLE_HG19, WHOLE_MM10])
        const registry = registryForContainer(dom.container)
        await registry.restoreSession(session())
        const previous = [...registry.browsers]

        await registry.restoreSession(session({syncDatasets: false}))

        expect(membership(registry.browsers)).toEqual([[], [], []])
        expect(previous.every(browser => browser.synchedBrowsers.size === 0)).toBe(true)
    })
})
