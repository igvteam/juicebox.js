/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2016-2020 The Regents of the University of California
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */


/**
 * @author Jim Robinson
 */

import * as hic from './hicUtils.js'
import Straw from '../node_modules/hic-straw/src/straw.js'
import {GoogleUtils} from '../node_modules/igv-utils/src/index.js'
import IGVRemoteFile from "./igvRemoteFile.js"

const knownGenomes = {

    "hg19": [249250621, 243199373, 198022430],
    "hg38": [248956422, 242193529, 198295559],
    "mm10": [195471971, 182113224, 160039680],
    "mm9": [197195432, 181748087, 159599783],
    "dm6": [23513712, 25286936, 28110227]

}

class Dataset {

    constructor(config) {
        this.straw = new Straw(config)
    }

    async init() {

        this.hicFile = this.straw.hicFile;
        await this.hicFile.init();
        this.matrixCache = {};
        this.blockCache = {};
        this.blockCacheKeys = [];
        this.normVectorCache = {};
        this.normalizationTypes = ['NONE'];

        // Cache at most 10 blocks
        this.blockCacheLimit = hic.isMobile() ? 4 : 10;

        this.genomeId = this.hicFile.genomeId
        this.chromosomes = this.hicFile.chromosomes
        this.bpResolutions = this.hicFile.bpResolutions
        this.wholeGenomeChromosome = this.hicFile.wholeGenomeChromosome
        this.wholeGenomeResolution = this.hicFile.wholeGenomeResolution

        // Attempt to determine genomeId if not recognized
        // if (!Object.keys(knownGenomes).includes(this.genomeId)) {
        const tmp = matchGenome(this.chromosomes);
        if (tmp) this.genomeId = tmp;
        //  }
    }

    async getContactRecords(normalization, region1, region2, units, binsize) {
        return this.straw.getContactRecords(normalization, region1, region2, units, binsize)
    }

    async hasNormalizationVector(type, chr, unit, binSize) {
        return this.straw.hicFile.hasNormalizationVector(type, chr, unit, binSize);
    }

    clearCaches() {
        this.matrixCache = {};
        this.blockCache = {};
        this.normVectorCache = {};
        this.colorScaleCache = {};
    }

    async getMatrix(chr1, chr2) {
        if (chr1 > chr2) {
            const tmp = chr1
            chr1 = chr2
            chr2 = tmp
        }
        const key = `${chr1}_${chr2}`

        if (this.matrixCache.hasOwnProperty(key)) {
            return this.matrixCache[key];

        } else {
            const matrix = await this.hicFile.readMatrix(chr1, chr2)
            this.matrixCache[key] = matrix;
            return matrix;

        }
    }

    getZoomIndexForBinSize(binSize, unit) {
        var i,
            resolutionArray;

        unit = unit || "BP";

        if (unit === "BP") {
            resolutionArray = this.bpResolutions;
        } else if (unit === "FRAG") {
            resolutionArray = this.fragResolutions;
        } else {
            throw new Error("Invalid unit: " + unit);
        }

        for (i = 0; i < resolutionArray.length; i++) {
            if (resolutionArray[i] === binSize) return i;
        }

        return -1;
    }

    getBinSizeForZoomIndex(zoomIndex, unit) {
        var i,
            resolutionArray;

        unit = unit || "BP";

        if (unit === "BP") {
            resolutionArray = this.bpResolutions;
        } else if (unit === "FRAG") {
            resolutionArray = this.fragResolutions;
        } else {
            throw new Error("Invalid unit: " + unit);
        }

        return resolutionArray[zoomIndex];
    }

    getChrIndexFromName(chrName) {
        var i;
        for (i = 0; i < this.chromosomes.length; i++) {
            if (chrName === this.chromosomes[i].name) return i;
        }
        return undefined;
    }

    compareChromosomes(otherDataset) {
        const chrs = this.chromosomes;
        const otherChrs = otherDataset.chromosomes;
        if (chrs.length !== otherChrs.length) {
            return false;
        }
        for (let i = 0; i < chrs.length; i++) {
            if (chrs[i].size !== otherChrs[i].size) {
                return false;
            }
        }
        return true;
    }

    isWholeGenome(chrIndex) {
        return (this.wholeGenomeChromosome != null && this.wholeGenomeChromosome.index === chrIndex);
    }

    async getNormVectorIndex() {
        return this.hicFile.getNormVectorIndex()
    }

    async getNormalizationOptions() {
        return this.hicFile.getNormalizationOptions()
    }

    /**
     * Compare 2 datasets for compatibility.  Compatibility is defined as from the same assembly, even if
     * different IDs are used (e.g. GRCh38 vs hg38)
     * @param d1
     * @param d2
     */
    isCompatible(d2) {
        return (this.genomeId === d2.genomeId) || this.compareChromosomes(d2)
    }

    static async loadDataset(config) {

        // If this is a local file, use the "blob" field for straw
        if (config.url instanceof File) {
            config.blob = config.url
            delete config.url
        } else {
            // If this is a google url, add api KEY
            if (GoogleUtils.isGoogleURL(config.url)) {
                if (GoogleUtils.isGoogleDriveURL(config.url)) {
                    config.url = GoogleUtils.driveDownloadURL(config.url)
                }
                const copy = Object.assign({}, config);
                config.file = new IGVRemoteFile(copy);
            }
        }

        const dataset = new Dataset(config)
        await dataset.init();
        dataset.url = config.url
        return dataset
    }
}

function matchGenome(chromosomes) {

    if (chromosomes.length < 4) return undefined;

    const keys = Object.keys(knownGenomes);

    // Find a candidate
    let candidate;
    for (let chr of chromosomes) {
        for (let key of keys) {
            if (knownGenomes[key].includes(chr.size)) {
                candidate = key;
                break;
            }
        }
    }

    // Confirm candidate
    if (candidate) {
        const chrSizes = new Set(chromosomes.map((chr) => chr.size));
        for (let sz of knownGenomes[candidate]) {
            if (!chrSizes.has(sz)) {
                return undefined;
            }
        }
        return candidate;
    } else {
        return undefined;
    }


}

export default Dataset
