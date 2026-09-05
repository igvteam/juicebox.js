import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import BrowserRegistry from '../js/browserRegistry.js'
import EventBus from '../js/eventBus.js'

/**
 * The target set on the registry -- #615, `docs/adr/0015`.
 *
 * The rules themselves are pure and live in `js/targetGroup.js`, pinned by
 * `test/testTargetGroup.js`. What is asserted here is the registry's half:
 * membership, the implicit current browser, the event, and the lifecycle table
 * -- what a delete, a reset and a restore each do to the aim.
 *
 * The browsers are fabricated, as in `test/testBrowserRegistry.js`: the
 * registry reads only a handful of members off one, which is what makes it
 * constructible without a document. Per ADR-0013 the shift-click handler and
 * the badge get no automated test; the class the badge is keyed on is asserted
 * here because the registry is what applies it.
 */

function fakeElement() {
    const classes = new Set()
    return {
        classList: {
            add: name => classes.add(name),
            remove: name => classes.delete(name),
            contains: name => classes.has(name)
        },
        remove() {}
    }
}

let registry

function fakeBrowser(name, {genomeId} = {}) {
    const browser = {
        name,
        registry,
        rootElement: fakeElement(),
        browserPanelDeleteButton: {style: {display: 'none'}},
        synchedBrowsers: new Set(),
        loadedConfigs: [],
        failing: false,
        unsyncSelf() {},
        async loadTracksOrThrow(configs) {
            if (this.failing) {
                throw new Error(`boom in ${this.name}`)
            }
            this.loadedConfigs.push(configs)
        },
        dispose() {
            this.unsyncSelf()
            this.registry.releaseSlot(this)
        }
    }
    if (genomeId !== undefined) {
        browser.dataset = {genomeId}
        browser.genome = {id: genomeId}
    }
    return browser
}

/**
 * A browser added the way a real one is: registered, then selected.
 */
function add(name, options) {
    const browser = fakeBrowser(name, options)
    registry.add(browser)
    return browser
}

const isTargeted = browser => browser.rootElement.classList.contains('hic-root-targeted')

let events

const targetListener = event => events.push(event)

beforeEach(() => {
    registry = new BrowserRegistry()
    events = []
    EventBus.globalBus.subscribe('BrowserTargetChange', targetListener)
})

afterEach(() => {
    EventBus.globalBus.unsubscribe('BrowserTargetChange', targetListener)
})

describe('the target set', () => {

    it('is the current browser alone when nothing has been aimed at', () => {
        const a = add('a', {genomeId: 'hg38'})
        add('b', {genomeId: 'hg38'})
        registry.select(a)

        expect(registry.targetedBrowsers).toEqual([a])
    })

    it('is empty while the registry is empty', () => {
        expect(registry.targetedBrowsers).toEqual([])
    })

    it('takes a browser in and out on toggle', () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)

        registry.toggleTarget(b)
        expect(registry.targetedBrowsers).toEqual([a, b])

        registry.toggleTarget(b)
        expect(registry.targetedBrowsers).toEqual([a])
    })

    it('is in registry order, which is panel order', () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        const c = add('c', {genomeId: 'hg38'})
        registry.select(b)

        registry.toggleTarget(c)
        registry.toggleTarget(a)

        expect(registry.targetedBrowsers).toEqual([a, b, c])
    })

    it('ignores a toggle of the current browser, which is targeted implicitly', () => {
        const a = add('a', {genomeId: 'hg38'})
        registry.select(a)
        events.length = 0

        registry.toggleTarget(a)

        expect(registry.targetedBrowsers).toEqual([a])
        expect(events).toEqual([])
    })

    it('follows the selection, since the current browser is always in it', () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})

        registry.select(a)
        expect(registry.targetedBrowsers).toEqual([a])

        registry.select(b)
        expect(registry.targetedBrowsers).toEqual([b])
    })

    it('is cleared by a plain click, which is the way back from a large aim', () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        const c = add('c', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)
        registry.toggleTarget(c)

        registry.retarget(a)

        expect(registry.targetedBrowsers).toEqual([a])
    })

    it('drops explicit membership when a browser becomes current', () => {
        // A host selects through `select`, not only through the plain click. A
        // browser aimed at and then selected must not stay in the explicit set:
        // shift-clicking it while current is a no-op, so it would be
        // un-removable, and it would silently stay targeted afterwards.
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)

        registry.select(b)
        expect(registry.isTargetedExplicitly(b)).toBe(false)

        registry.select(a)
        expect(registry.targetedBrowsers).toEqual([a])
    })

    it('ignores a browser this registry does not own', () => {
        const a = add('a', {genomeId: 'hg38'})
        registry.select(a)
        const stranger = fakeBrowser('stranger', {genomeId: 'hg38'})

        registry.toggleTarget(stranger)

        expect(registry.targetedBrowsers).toEqual([a])
        expect(registry.isTargetedExplicitly(stranger)).toBe(false)
    })

    it('is cleared by a plain click on the browser that is already current', () => {
        // The case a "clear only on a real transition" rule would miss: the
        // user has aimed at three panels and clicks the one the widgets are
        // already reading.
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)

        registry.retarget(a)

        expect(registry.targetedBrowsers).toEqual([a])
    })
})

describe('BrowserTargetChange', () => {

    it('fires on a toggle, carrying the registry and the resolved set', () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        events.length = 0

        registry.toggleTarget(b)

        expect(events.length).toBe(1)
        expect(events[0].data.registry).toBe(registry)
        expect(events[0].data.targetedBrowsers).toEqual([a, b])
    })

    it('fires when the selection moves, because that moves the implicit member', () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        events.length = 0

        registry.select(b)

        expect(events.length).toBe(1)
        expect(events[0].data.targetedBrowsers).toEqual([b])
    })

    it('fires once for a plain click that both clears and re-aims', () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)
        events.length = 0

        registry.retarget(b)

        expect(events.length).toBe(1)
        expect(events[0].data.targetedBrowsers).toEqual([b])
    })

    it('does not fire when nothing about the set changed', () => {
        const a = add('a', {genomeId: 'hg38'})
        registry.select(a)
        events.length = 0

        registry.select(a)
        registry.retarget(a)

        expect(events).toEqual([])
    })

    it('drives the badge class, which is not the selected class', () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)

        expect(isTargeted(a)).toBe(true)
        expect(isTargeted(b)).toBe(true)
        expect(a.rootElement.classList.contains('hic-root-selected')).toBe(true)
        expect(b.rootElement.classList.contains('hic-root-selected')).toBe(false)

        registry.retarget(a)
        expect(isTargeted(b)).toBe(false)
    })
})

describe('the target set through a lifecycle', () => {

    it('drops a deleted browser', () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)
        events.length = 0

        registry.delete(b)

        expect(registry.targetedBrowsers).toEqual([a])
        expect(isTargeted(b)).toBe(false)
        expect(events.length).toBe(1)
        expect(events[0].data.targetedBrowsers).toEqual([a])
    })

    it('does not let a deleted browser back in through a new one taking its place', () => {
        // A disposed browser is fatal on use, not merely stale: the reference
        // has to be gone, not just filtered out on the way past.
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)

        registry.delete(b)
        registry.reclaimSlot(b, 1, false, false)

        expect(registry.targetedBrowsers).toEqual([a])
    })

    it('does not add a newly created browser to the set', () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)

        const c = add('c', {genomeId: 'hg38'})

        // `add` selects, so the new browser is current and therefore targeted
        // implicitly -- but the aim the user set up is intact underneath it.
        registry.select(a)
        expect(registry.targetedBrowsers).toEqual([a, b])
        expect(registry.isTargetedExplicitly(c)).toBe(false)
    })

    it('survives a reset, which the sync group does not', () => {
        // The teardown-and-rebuild `HICBrowser.reset` performs, as the registry
        // sees it: the slot released, then reclaimed with what the browser
        // captured before it disposed itself.
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)

        const wasTargeted = registry.isTargetedExplicitly(b)
        const slot = registry.browsers.indexOf(b)
        b.dispose()
        registry.reclaimSlot(b, slot, false, wasTargeted)

        expect(registry.targetedBrowsers).toEqual([a, b])
    })

    it('lets go of the aim when the registry gives up its browsers', () => {
        // `clear()` is the other half of the restore: `createBrowserList` calls
        // it before rebuilding. The getter filters over `browsers`, so a
        // reference left here would be invisible rather than harmless.
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)

        registry.clear()

        expect(registry.isTargetedExplicitly(b)).toBe(false)
    })

    it('starts empty after a restore, and is never serialized', () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)

        // The open of `restoreSession`, without the rebuild it cannot do
        // without a document.
        registry.deleteAll()

        expect(registry.targetedBrowsers).toEqual([])
        expect(JSON.stringify(registry.toJSON())).not.toContain('target')
    })
})

describe('loadTracksIntoTargets', () => {

    const configs = [{url: 'https://example.com/a.bigWig', name: 'a'}]

    it('loads into every targeted browser and reports them', async () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        const other = add('other', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)

        const summary = await registry.loadTracksIntoTargets(configs)

        expect(summary.loaded).toEqual([a, b])
        expect(summary.failed).toEqual([])
        expect(summary.skipped).toEqual([])
        expect(other.loadedConfigs).toEqual([])
    })

    it('reaches only the current browser when nothing has been aimed at', async () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)

        const summary = await registry.loadTracksIntoTargets(configs)

        expect(summary.loaded).toEqual([a])
        expect(b.loadedConfigs).toEqual([])
    })

    it('skips a target with no map and one on another genome, against the originating browser', async () => {
        const a = add('a', {genomeId: 'hg38'})
        const empty = add('empty')
        const mouse = add('mouse', {genomeId: 'mm10'})
        registry.select(a)
        registry.toggleTarget(empty)
        registry.toggleTarget(mouse)

        const summary = await registry.loadTracksIntoTargets(configs)

        expect(summary.loaded).toEqual([a])
        expect(summary.skipped).toEqual([
            {browser: empty, reason: 'no-dataset'},
            {browser: mouse, reason: 'genome-mismatch'}
        ])
        expect(empty.loadedConfigs).toEqual([])
        expect(mouse.loadedConfigs).toEqual([])
    })

    it('reports a failure rather than raising an alert', async () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)
        b.failing = true

        // A registry built without a container has no alert dialog and no
        // document to build one in, so an alert here would throw. That is the
        // assertion: juicebox.js raises none, the caller reports.
        const summary = await registry.loadTracksIntoTargets(configs)

        expect(summary.loaded).toEqual([a])
        expect(summary.failed.map(({browser}) => browser)).toEqual([b])
    })

    it('hands each target its own copy of each config', async () => {
        const a = add('a', {genomeId: 'hg38'})
        const b = add('b', {genomeId: 'hg38'})
        registry.select(a)
        registry.toggleTarget(b)

        await registry.loadTracksIntoTargets(configs)

        expect(a.loadedConfigs[0][0]).toEqual(configs[0])
        expect(a.loadedConfigs[0][0]).not.toBe(configs[0])
        expect(b.loadedConfigs[0][0]).not.toBe(a.loadedConfigs[0][0])
    })
})
