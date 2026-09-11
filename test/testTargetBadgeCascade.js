/**
 * The target badges must survive a host stylesheet (#625).
 *
 * juicebox.js is embedded, and every host controls its own stylesheet order.
 * An anchor panel carries both `hic-root-selected` and `hic-root-target-anchor`;
 * if the anchor rule wins only on source order, a host that redeclares a bare
 * `.hic-root-selected` after juicebox.css silently turns the anchor grey again.
 * juicebox-web did exactly that.
 *
 * Both shipped forms are checked: css/juicebox.scss (what the build compiles)
 * and css/juicebox.css (the hand-synced copy dev pages link directly).
 */

import {describe, it, expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {execFileSync} from 'node:child_process'
import {JSDOM} from 'jsdom'

const cssDir = resolve(__dirname, '../css')

// Compiled out of process: test/setup.js mocks a global `document`, and sass's
// loader takes that for a browser and fails to start.
const compileScss = file => execFileSync(process.execPath,
    [resolve(__dirname, '../node_modules/sass/sass.js'), '--no-source-map', file],
    {encoding: 'utf8'})

const libraryStylesheets = {
    'css/juicebox.scss': compileScss(resolve(cssDir, 'juicebox.scss')),
    'css/juicebox.css': readFileSync(resolve(cssDir, 'juicebox.css'), 'utf8'),
}

// A host stylesheet loaded after juicebox.css. The border rule is what
// juicebox-web's app.scss carried; the outline rule is its twin for the
// targeted badge.
const hostileHost = `
.hic-root-selected { border-color: #5f5f5f; }
.hic-root-selected { outline: none; }
`

const anchorBlue = 'rgb(58, 138, 180)'
const selectedGrey = 'rgb(95, 95, 95)'

// A fresh document per case: the library stylesheet, then the host's, then a
// root div wearing the given classes.
function mount(libraryCss, classes) {
    const {window} = new JSDOM(`<!DOCTYPE html><html><head>
        <style>${libraryCss}</style>
        <style>${hostileHost}</style>
    </head><body><div class="${classes}"></div></body></html>`)
    return window.getComputedStyle(window.document.querySelector('div'))
}

describe.each(Object.entries(libraryStylesheets))('target badges in %s', (_, libraryCss) => {

    it('keeps the anchor border blue when a host redeclares .hic-root-selected later', () => {
        const style = mount(libraryCss, 'hic-root hic-root-selected hic-root-target-anchor')
        expect(style.borderTopColor).toBe(anchorBlue)
    })

    it('keeps the targeted outline when a host clears the outline on .hic-root-selected later', () => {
        const style = mount(libraryCss, 'hic-root hic-root-selected hic-root-targeted')
        // jsdom keeps `outline` as a shorthand and never fills the longhands.
        expect(style.outline).toContain('dashed')
    })

    it('still paints a plain selection with the library grey', () => {
        const style = mount(libraryCss, 'hic-root hic-root-selected')
        expect(style.borderTopColor).toBe(selectedGrey)
    })
})
