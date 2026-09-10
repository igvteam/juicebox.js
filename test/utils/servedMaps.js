import {vi} from 'vitest'
import Dataset from '../../js/hicDataset.js'

/**
 * Maps served to the real load path, stubbed only at `Dataset.loadDataset` --
 * the network read -- and nothing above it. `stubbedLoads.js` cannot stand in:
 * it stubs `loadHicFile` whole, and the sync steps that method ends with are
 * what the suites using this are about.
 *
 * The stand-in dataset is built on the real `Dataset.prototype`, so
 * `isCompatible` and `compareChromosomes` are the shipping implementations
 * rather than a fixture's paraphrase. That matters: the fixture in
 * `restoreDataset.js` overrides `isCompatible` to a bare genome-id comparison,
 * which is exactly the decision these suites turn on.
 */

export const HG19 = [
    ['chr1', 249250621], ['chr2', 243199373], ['chr3', 198022430], ['chr4', 191154276],
    ['chr5', 180915260], ['chr6', 171115067], ['chr7', 159138663], ['chr8', 146364022],
    ['chr9', 141213431], ['chr10', 135534747], ['chr11', 135006516], ['chr12', 133851895],
    ['chr13', 115169878], ['chr14', 107349540], ['chr15', 102531392], ['chr16', 90354753],
    ['chr17', 81195210], ['chr18', 78077248], ['chr19', 59128983], ['chr20', 63025520],
    ['chr21', 48129895], ['chr22', 51304566], ['chrX', 155270560], ['chrY', 59373566],
]

export const MM10 = [
    ['chr1', 195471971], ['chr2', 182113224], ['chr3', 160039680], ['chr4', 156508116],
    ['chr5', 151834684], ['chr6', 149736546], ['chr7', 145441459], ['chr8', 129401213],
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
 * A map spec that makes its load fail, as an unreachable URL would: the read
 * rejects, and `loadHicFile` is left to clean up after it.
 */
export const UNREACHABLE = {unreachable: true}

/**
 * Queue the maps each successive `loadHicFile` should get, in load order.
 * Returns nothing; the spy is torn down with the rest of the mocks.
 */
export function serveMaps(maps) {
    const queue = [...maps]
    vi.spyOn(Dataset, 'loadDataset').mockImplementation(async config => {
        const spec = queue.shift()
        if (spec.unreachable) {
            throw new Error(`could not read ${config.url}`)
        }
        return fakeDataset({...spec, config})
    })
}
