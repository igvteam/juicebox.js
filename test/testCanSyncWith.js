import {describe, it, expect} from 'vitest'
import Dataset from '../js/hicDataset.js'
import {HG19, HG38, chromosomeTable, ensemblNames} from './utils/servedMaps.js'

/**
 * The two predicates ADR-0016 decision 2 separates. `isCompatible` asks "same
 * assembly?" and is what the control-map load wants; `canSyncWith` asks "can
 * these two panels follow each other?" and is what pairing wants: the same
 * assembly **and** two-way chromosome parity.
 *
 * Real `Dataset` instances, on the real prototype, because the question is
 * exactly which lookup parity uses: `Genome.getChromosome`'s aliasing,
 * case-insensitive one (decision 3), not a comparison of name sets.
 */

function dataset(genomeId, rows) {
    return Object.assign(Object.create(Dataset.prototype), {genomeId, chromosomes: chromosomeTable(rows)})
}

const HG38_ENSEMBL = ensemblNames(HG38)

/** Both argument orders, so every row of the table also asserts symmetry. */
function bothWays(a, b) {
    const answers = [a.canSyncWith(b), b.canSyncWith(a)]
    expect(answers[0]).toBe(answers[1])
    return answers[0]
}

describe('Dataset.canSyncWith', () => {

    it('pairs two identical maps', () => {
        expect(bothWays(dataset('hg38', HG38), dataset('hg38', HG38))).toBe(true)
    })

    it('pairs names that differ only by the chr prefix, and MT with chrM', () => {
        // Both directions of `MT`/`chrM` have to resolve. The `MT` side's
        // alias for `chrM` was misspelled `chrmM` in `genome.js` until parity
        // needed it.
        expect(bothWays(dataset('hg38', HG38), dataset('hg38', HG38_ENSEMBL))).toBe(true)
    })

    it('pairs names that differ only in case', () => {
        const shouting = HG38.map(([name, size]) => [name.toUpperCase(), size])
        expect(bothWays(dataset('hg38', HG38), dataset('hg38', shouting))).toBe(true)
    })

    it('ignores All on both sides', () => {
        // ADR-0010: a zoom rung, not a chromosome. One map calling it `ALL`
        // and the other lacking it would otherwise be a coverage mismatch.
        const a = dataset('hg38', HG38)
        const b = dataset('hg38', HG38)
        b.chromosomes = b.chromosomes.slice(1)
        a.chromosomes[0] = {...a.chromosomes[0], name: 'ALL'}
        expect(bothWays(a, b)).toBe(true)
    })

    it('pairs the same chromosomes listed in another order', () => {
        expect(bothWays(dataset('hg38', HG38), dataset('hg38', [...HG38].reverse()))).toBe(true)
    })

    it('pairs two maps that carry the same extra scaffold, listed in different places', () => {
        const scaffold = ['chrUn_KI270302v1', 2274]
        expect(bothWays(dataset('hg38', [...HG38, scaffold]), dataset('hg38', [scaffold, ...HG38]))).toBe(true)
    })

    it('refuses a map carrying one extra scaffold the other cannot place', () => {
        // The other panel's lookup has nowhere to put it, so a state naming it
        // could not cross -- and parity is two-way, so neither order pairs.
        // Pairing it would bring back the half-sync ADR-0016 retires.
        const scaffolded = [...HG38, ['chrUn_KI270302v1', 2274]]
        expect(bothWays(dataset('hg38', HG38), dataset('hg38', scaffolded))).toBe(false)
    })

    it('refuses a chr1-only subset against a whole-genome map, in either order', () => {
        expect(bothWays(dataset('hg38', HG38), dataset('hg38', HG38.slice(0, 1)))).toBe(false)
    })

    it('refuses a different assembly even when every name is shared', () => {
        // hg19 at hg19's sizes, over exactly hg38's names.
        const hg19Sizes = new Map([...HG19, ['chrM', 16571]])
        const sameNames = HG38.map(([name]) => [name, hg19Sizes.get(name)])
        expect(bothWays(dataset('hg38', HG38), dataset('hg19', sameNames))).toBe(false)
    })

    it('is not satisfied by the hg38/GRCh38 genome-id short-circuit alone', () => {
        // `isCompatible` answers yes on the ids and never looks at the tables.
        // That is right for a control map and not enough for a sync partner.
        const whole = dataset('hg38', HG38)
        const subset = dataset('GRCh38', HG38.slice(0, 1))
        expect(whole.isCompatible(subset)).toBe(true)
        expect(bothWays(whole, subset)).toBe(false)
    })

    it('pairs hg38 with GRCh38 when the tables match', () => {
        expect(bothWays(dataset('hg38', HG38), dataset('GRCh38', HG38_ENSEMBL))).toBe(true)
    })
})

describe('Dataset.isCompatible keeps its answers', () => {

    it('admits a chr1-only control map against a whole-genome map', () => {
        // The control-map load's question is "same assembly?", and a subset of
        // the same assembly answers yes. ADR-0016 decision 2.
        const whole = dataset('hg38', HG38)
        const subset = dataset('hg38', HG38.slice(0, 1))
        expect(whole.isCompatible(subset)).toBe(true)
        expect(subset.isCompatible(whole)).toBe(true)
    })

    it('short-circuits on the known genome-id pairs', () => {
        expect(dataset('hg19', HG38).isCompatible(dataset('GRCh37', HG38.slice(0, 1)))).toBe(true)
        expect(dataset('mm10', HG38).isCompatible(dataset('GRCm38', []))).toBe(true)
    })

    it('admits an unlisted assembly by the chromosomes the tables share', () => {
        const scaffolded = [...HG38, ['chrUn_KI270302v1', 2274]]
        expect(dataset('custom', HG38).isCompatible(dataset('custom', scaffolded))).toBe(true)
    })

    it('refuses a shared name with a different size', () => {
        const resized = HG38.map(([name, size]) => [name, size + 1])
        expect(dataset('custom', HG38).isCompatible(dataset('custom', resized))).toBe(false)
    })
})

/**
 * The names behind a failed parity check, for the isolation mark's tooltip
 * (#637). The same lookup `canSyncWith` decides with, so a spelling difference
 * is never reported as a missing chromosome.
 */
describe('Dataset.missingChromosomes', () => {

    it('names what the other map carries and this one cannot place, in the other\'s order', () => {
        const subset = dataset('hg38', HG38.slice(0, 2))
        expect(subset.missingChromosomes(dataset('hg38', [...HG38].reverse()))).toEqual(['chrM', 'chrX', 'chr5', 'chr4', 'chr3'])
    })

    it('is empty when this map is the superset', () => {
        expect(dataset('hg38', HG38).missingChromosomes(dataset('hg38', HG38.slice(0, 1)))).toEqual([])
    })

    it('does not count a name this map places through an alias or another case', () => {
        expect(dataset('hg38', HG38).missingChromosomes(dataset('hg38', HG38_ENSEMBL))).toEqual([])
        expect(dataset('hg38', HG38).missingChromosomes(dataset('hg38', HG38.map(([n, s]) => [n.toUpperCase(), s])))).toEqual([])
    })

    it('never names All', () => {
        const noAll = dataset('hg38', HG38.slice(0, 1))
        noAll.chromosomes = noAll.chromosomes.slice(1)
        expect(noAll.missingChromosomes(dataset('hg38', HG38.slice(0, 1)))).toEqual([])
    })
})
