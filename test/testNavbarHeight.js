/**
 * The navbar's height has one source, and it is the browser's own root (#746).
 *
 * Before, 160px was worked out twice: once in the stylesheet for the root's
 * height, and once in JS for the content container, which read the page's
 * `:root` variables rather than the browser's. Collapsing the navbar on one
 * registry's browsers must be a change to one value on those roots, so both
 * sides now read `--nav-bar-height`, declared on `.hic-root`.
 *
 * jsdom does not resolve `var()` or `calc()`, so these assert *what is read*,
 * not the pixels. The pixels are unchanged; that was checked in a real browser.
 *
 * Both shipped stylesheets are checked, as in testTargetBadgeCascade.js.
 */

import {describe, it, expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {execFileSync} from 'node:child_process'
import {JSDOM} from 'jsdom'
import {withContainers} from './utils/browserFixture.js'
import HICBrowser from '../js/hicBrowser.js'

const cssDir = resolve(__dirname, '../css')

// Out of process: sass mistakes test/setup.js's mocked `document` for a browser.
const compileScss = file => execFileSync(process.execPath,
    [resolve(__dirname, '../node_modules/sass/sass.js'), '--no-source-map', file],
    {encoding: 'utf8'})

const libraryStylesheets = {
    'css/juicebox.scss': compileScss(resolve(cssDir, 'juicebox.scss')),
    'css/juicebox.css': readFileSync(resolve(cssDir, 'juicebox.css'), 'utf8'),
}

// The head of the sum. Sass keeps a custom property's value verbatim but
// normalises a `calc()` elsewhere, so the tail of the two spellings differs.
const navbarSum = /2 \* \(var\(--nav-bar-label-height\)/g

function mount(css) {
    const {window} = new JSDOM(`<!DOCTYPE html><html><head><style>${css}</style></head><body>
        <div class="hic-root"><div id="b-content-container"></div></div>
    </body></html>`)
    const root = window.document.querySelector('.hic-root')
    return {window, root, content: root.firstElementChild}
}

describe.each(Object.entries(libraryStylesheets))('navbar height in %s', (_, css) => {

    it('is summed exactly once', () => {
        expect(css.match(navbarSum)).toHaveLength(1)
    })

    it('is declared on the browser root, not the page', () => {
        const {window, root} = mount(css)
        expect(window.getComputedStyle(window.document.documentElement).getPropertyValue('--nav-bar-height')).toBe('')
        expect(window.getComputedStyle(root).getPropertyValue('--nav-bar-height')).not.toBe('')
    })

    it('is what the root height reads', () => {
        const {window, root} = mount(css)
        expect(window.getComputedStyle(root).height).toContain('var(--nav-bar-height)')
    })

    it('is what the content container height reads', () => {
        const {window, content} = mount(css)
        expect(window.getComputedStyle(content).height).toContain('var(--nav-bar-height)')
    })
})

describe('the layout code', () => {

    const dom = withContainers()

    it('sizes the content container from the browser root, not a number of its own', () => {
        const style = globalThis.document.createElement('style')
        style.textContent = libraryStylesheets['css/juicebox.scss']
        globalThis.document.head.appendChild(style)

        const browser = new HICBrowser(dom.container, {width: 400, height: 300})
        browser.layoutController.resizeLayoutWithTrackXYPairCount(2)

        // Two tracks of 36px + 2px margin.
        expect(browser.layoutController.contentContainer.style.height)
            .toBe('calc(100% - (var(--nav-bar-height) + 76px))')
    })
})
