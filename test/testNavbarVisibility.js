import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {resolve} from 'node:path'
import {execFileSync} from 'node:child_process'
import juicebox from '../js/index.js'
import HICBrowser from '../js/hicBrowser.js'
import {registryForContainer} from '../js/browserRegistry.js'
import EventBus from '../js/eventBus.js'
import {withContainers} from './utils/browserFixture.js'

/**
 * A host hides and shows the navbar on every browser in a registry at once
 * (#745). The setting is the registry's, like the selected gene, so a browser
 * made while it is hidden comes up hidden and another embed is untouched.
 *
 * Read through the shipped stylesheet rather than a class name: hidden means
 * the navbar is not displayed and the root's `--nav-bar-height` -- the one
 * value both the root's and the content container's heights subtract (#746) --
 * is zero. jsdom does not resolve `calc()`, so the pixels were checked in a
 * real browser.
 */

// Out of process: sass mistakes test/setup.js's mocked `document` for a browser.
const stylesheet = execFileSync(process.execPath,
    [resolve(__dirname, '../node_modules/sass/sass.js'), '--no-source-map', resolve(__dirname, '../css/juicebox.scss')],
    {encoding: 'utf8'})

describe('navbar visibility', () => {

    const dom = withContainers()

    beforeEach(() => {
        const style = dom.window.document.createElement('style')
        style.textContent = stylesheet
        dom.window.document.head.appendChild(style)
    })

    function added(container) {
        const browser = new HICBrowser(container, {})
        registryForContainer(container).add(browser)
        return browser
    }

    function navbarShown(browser) {
        const navbar = browser.rootElement.querySelector('.hic-navbar-container')
        return dom.window.getComputedStyle(navbar).display !== 'none'
    }

    function navbarHeight(browser) {
        return dom.window.getComputedStyle(browser.rootElement).getPropertyValue('--nav-bar-height').trim()
    }

    // The registries live as long as their containers, and each test has fresh
    // ones; this only puts the page-wide answer back for the next suite.
    afterEach(() => {
        juicebox.setNavbarVisible(true)
        vi.restoreAllMocks()
    })

    it('is shown by default', () => {
        const browser = added(dom.container)

        expect(juicebox.isNavbarVisible()).toBe(true)
        expect(navbarShown(browser)).toBe(true)
        expect(navbarHeight(browser)).not.toBe('0px')
    })

    it('hides on every browser in the registry', () => {
        const browsers = [added(dom.container), added(dom.container)]

        juicebox.setNavbarVisible(false)

        expect(juicebox.isNavbarVisible()).toBe(false)
        for (const browser of browsers) {
            expect(navbarShown(browser)).toBe(false)
            expect(navbarHeight(browser)).toBe('0px')
        }
    })

    it('shows again exactly as before', () => {
        const browser = added(dom.container)
        const before = navbarHeight(browser)

        juicebox.setNavbarVisible(false)
        juicebox.setNavbarVisible(true)

        expect(navbarShown(browser)).toBe(true)
        expect(navbarHeight(browser)).toBe(before)
    })

    it('reaches a browser built while it is hidden', () => {
        added(dom.container)
        juicebox.setNavbarVisible(false)

        const later = added(dom.container)

        expect(navbarShown(later)).toBe(false)
    })

    it('reaches a browser hidden while it was still loading its map', async () => {
        // `createBrowser` constructs, awaits the load, and only then adds: a
        // set made in between finds the browser in no registry's list.
        const registry = added(dom.container).registry
        let finishLoad
        vi.spyOn(HICBrowser.prototype, 'init').mockImplementation(() => new Promise(resolve => finishLoad = resolve))

        const creating = juicebox.createBrowser(dom.container, {})
        registry.setNavbarVisible(false)
        finishLoad()
        const later = await creating

        expect(navbarShown(later)).toBe(false)
    })

    it('survives a reset, which rebuilds the root', () => {
        const browser = added(dom.container)
        juicebox.setNavbarVisible(false)

        browser.reset()

        expect(navbarShown(browser)).toBe(false)
    })

    it('leaves another registry on the page alone', () => {
        const other = added(dom.another())
        const browser = added(dom.container)

        juicebox.setNavbarVisible(false)

        expect(navbarShown(browser)).toBe(false)
        expect(navbarShown(other)).toBe(true)
        expect(other.registry.isNavbarVisible()).toBe(true)
    })

    describe('NavbarVisibilityChange', () => {

        const heard = []
        const listener = ({data}) => heard.push(data)

        beforeEach(() => {
            heard.length = 0
            EventBus.globalBus.subscribe('NavbarVisibilityChange', listener)
        })

        afterEach(() => EventBus.globalBus.unsubscribe('NavbarVisibilityChange', listener))

        it('is posted once per real change, naming the registry', () => {
            const browser = added(dom.container)

            juicebox.setNavbarVisible(false)
            juicebox.setNavbarVisible(true)

            expect(heard).toEqual([
                {registry: browser.registry, visible: false},
                {registry: browser.registry, visible: true}
            ])
        })

        it('is not posted by a set that changes nothing', () => {
            added(dom.container)

            juicebox.setNavbarVisible(true)
            juicebox.setNavbarVisible(false)
            juicebox.setNavbarVisible(false)

            expect(heard.map(({visible}) => visible)).toEqual([false])
        })
    })
})
