import {describe, it, expect} from 'vitest'
import {trackSkipReason, fanOutTracks} from '../js/targetGroup.js'

/**
 * The target-set rules -- see #615 and `docs/adr/0015`.
 *
 * `js/targetGroup.js` is the rule alone: which targets a load reaches, and what
 * comes back when it has. It reads no module state and touches no DOM, so the
 * browsers here are fabricated objects carrying only what the rules read -- a
 * `dataset` and a `genome` with an id -- exactly as `test/testSyncGroup.js`
 * fabricates browsers for the pairing rule.
 */

function fakeBrowser(name, {genomeId, dataset = {}} = {}) {
    const browser = {name}
    if (genomeId !== undefined) {
        browser.dataset = dataset
        browser.genome = {id: genomeId}
    }
    return browser
}

describe('trackSkipReason', () => {

    const hg38 = fakeBrowser('originating', {genomeId: 'hg38'})

    it('does not skip a target on the originating browser\'s genome', () => {
        expect(trackSkipReason(hg38, fakeBrowser('peer', {genomeId: 'hg38'}))).toBeUndefined()
    })

    it('does not skip the originating browser itself', () => {
        expect(trackSkipReason(hg38, hg38)).toBeUndefined()
    })

    it('skips a target with no dataset', () => {
        expect(trackSkipReason(hg38, fakeBrowser('empty'))).toBe('no-dataset')
    })

    it('skips a target on a different genome', () => {
        expect(trackSkipReason(hg38, fakeBrowser('mouse', {genomeId: 'mm10'}))).toBe('genome-mismatch')
    })

    // The empty-browser check comes first, and has to: a browser with no
    // dataset has no genome either, so testing the genome first would report
    // every empty panel as a mismatch and hide the ordinary case behind the
    // alarming one.
    it('reports an empty target as empty rather than as a mismatch', () => {
        expect(trackSkipReason(hg38, fakeBrowser('empty'))).toBe('no-dataset')
    })
})

describe('fanOutTracks', () => {

    const configs = [{url: 'https://example.com/a.bigWig', name: 'a'}]

    function recordingLoad(record, failing = new Set()) {
        return async (browser, ownConfigs) => {
            record.push({browser, configs: ownConfigs})
            if (failing.has(browser)) {
                throw new Error(`boom in ${browser.name}`)
            }
        }
    }

    it('loads into every eligible target and reports them', async () => {
        const a = fakeBrowser('a', {genomeId: 'hg38'})
        const b = fakeBrowser('b', {genomeId: 'hg38'})
        const record = []

        const summary = await fanOutTracks(a, [a, b], configs, recordingLoad(record))

        expect(summary.loaded).toEqual([a, b])
        expect(summary.failed).toEqual([])
        expect(summary.skipped).toEqual([])
        expect(record.map(({browser}) => browser)).toEqual([a, b])
    })

    it('reports the two skip paths without attempting a load', async () => {
        const a = fakeBrowser('a', {genomeId: 'hg38'})
        const empty = fakeBrowser('empty')
        const mouse = fakeBrowser('mouse', {genomeId: 'mm10'})
        const record = []

        const summary = await fanOutTracks(a, [a, empty, mouse], configs, recordingLoad(record))

        expect(summary.loaded).toEqual([a])
        expect(summary.skipped).toEqual([
            {browser: empty, reason: 'no-dataset'},
            {browser: mouse, reason: 'genome-mismatch'}
        ])
        expect(record.map(({browser}) => browser)).toEqual([a])
    })

    it('reports a failing target without stopping the others', async () => {
        const a = fakeBrowser('a', {genomeId: 'hg38'})
        const b = fakeBrowser('b', {genomeId: 'hg38'})
        const c = fakeBrowser('c', {genomeId: 'hg38'})
        const record = []

        const summary = await fanOutTracks(a, [a, b, c], configs, recordingLoad(record, new Set([b])))

        expect(summary.loaded).toEqual([a, c])
        expect(summary.failed.map(({browser}) => browser)).toEqual([b])
        expect(summary.failed[0].error.message).toBe('boom in b')
    })

    it('hands each target its own copy of each config', async () => {
        const a = fakeBrowser('a', {genomeId: 'hg38'})
        const b = fakeBrowser('b', {genomeId: 'hg38'})
        const record = []

        await fanOutTracks(a, [a, b], configs, recordingLoad(record))

        const [first, second] = record
        expect(first.configs[0]).toEqual(configs[0])
        expect(first.configs[0]).not.toBe(configs[0])
        expect(second.configs[0]).not.toBe(first.configs[0])
    })

    it('leaves the caller\'s configs unmutated when a loader writes to what it is handed', async () => {
        const a = fakeBrowser('a', {genomeId: 'hg38'})
        const mutating = async (browser, ownConfigs) => {
            ownConfigs[0].autoscale = true
        }

        await fanOutTracks(a, [a], configs, mutating)

        expect(configs[0].autoscale).toBeUndefined()
    })

    it('returns an empty summary for an empty target set', async () => {
        const a = fakeBrowser('a', {genomeId: 'hg38'})
        expect(await fanOutTracks(a, [], configs, recordingLoad([])))
            .toEqual({loaded: [], failed: [], skipped: []})
    })
})
