/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
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

import  * as hic from './hic.js'
import NormalizationVector from './normalizationVector.js'
import HICEvent from './hicEvent.js'
import igv from '../node_modules/igv/dist/igv.esm.min.js';

const knownGenomes = {

    "hg19": [249250621, 243199373, 198022430],
    "hg38": [248956422, 242193529, 198295559],
    "mm10": [195471971, 182113224, 160039680],
    "mm9": [197195432, 181748087, 159599783],
    "dm6": [23513712, 25286936, 28110227]

}

const Dataset = function (hicFile) {

    this.hicFile = hicFile;
    this.matrixCache = {};
    this.blockCache = {};
    this.blockCacheKeys = [];
    this.normVectorCache = {};
    this.normalizationTypes = ['NONE'];

    // Cache at most 10 blocks
    this.blockCacheLimit = hic.isMobile() ? 4 : 10;

    this.genomeId = hicFile.genomeId
    this.chromosomes = hicFile.chromosomes
    this.bpResolutions = hicFile.bpResolutions
    this.wholeGenomeChromosome = hicFile.wholeGenomeChromosome
    this.wholeGenomeResolution = hicFile.wholeGenomeResolution

    // Attempt to determine genomeId if not recognized
    if (!Object.keys(knownGenomes).includes(this.genomeId)) {
        const tmp = matchGenome(this.chromosomes);
        if (tmp) this.genomeId = tmp;
    }

}

Dataset.prototype.clearCaches = function () {
    this.matrixCache = {};
    this.blockCache = {};
    this.normVectorCache = {};
    this.colorScaleCache = {};
};

Dataset.prototype.getMatrix = async function (chr1, chr2) {
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

Dataset.prototype.getNormalizedBlock = async function (zd, blockNumber, normalization, eventBus) {

    const block = await this.getBlock(zd, blockNumber)

    if (normalization === undefined || "NONE" === normalization || block === null || block === undefined) {
        return block;
    }
    else {
        // Get the norm vectors serially, its very likely they are the same and the second will be cached
        const nv1 = await this.getNormalizationVector(normalization, zd.chr1.index, zd.zoom.unit, zd.zoom.binSize)
        const nv2 = zd.chr1 === zd.chr2 ?
            nv1 :
            await this.getNormalizationVector(normalization, zd.chr2.index, zd.zoom.unit, zd.zoom.binSize)

        var normRecords = [],
            normBlock;

        if (nv1 === undefined || nv2 === undefined) {
            igv.presentAlert("Normalization option " + normalization + " unavailable at this resolution.");
            if (eventBus) {
                eventBus.post(new HICEvent("NormalizationExternalChange", "NONE"));
            }
            return block;
        }

        else {
            for (let record of block.records) {

                const x = record.bin1
                const y = record.bin2
                const nvnv = nv1.data[x] * nv2.data[y];

                if (nvnv[x] !== 0 && !isNaN(nvnv)) {
                    const counts = record.counts / nvnv;
                    normRecords.push(new ContactRecord(x, y, counts));
                }
            }

            normBlock = new Block(blockNumber, zd, normRecords);   // TODO - cache this?

            //normBlock.percentile95 = block.percentile95;

            return normBlock;
        }

    }

}

Dataset.prototype.getBlock = async function (zd, blockNumber) {

    const key = "" + zd.chr1.name + "_" + zd.chr2.name + "_" + zd.zoom.binSize + "_" + zd.zoom.unit + "_" + blockNumber;

    if (this.blockCache.hasOwnProperty(key)) {
        return this.blockCache[key];

    } else {

        const block = await this.hicFile.readBlock(blockNumber, zd)
        if (this.blockCacheKeys.length > this.blockCacheLimit) {
            delete this.blockCache[this.blockCacheKeys[0]];
            this.blockCacheKeys.shift();
        }
        this.blockCacheKeys.push(key);
        this.blockCache[key] = block;

        return block;

    }
};

Dataset.prototype.getNormalizationVector = async function (type, chrIdx, unit, binSize) {

    const key = NormalizationVector.getNormalizationVectorKey(type, chrIdx, unit, binSize);

    if (this.normVectorCache.hasOwnProperty(key)) {
        return this.normVectorCache[key];
    } else {

        const nv = await this.hicFile.getNormalizationVector(type, chrIdx, unit, binSize)
        this.normVectorCache[key] = nv;
        return nv;


    }
};

Dataset.prototype.getZoomIndexForBinSize = function (binSize, unit) {
    var i,
        resolutionArray;

    unit = unit || "BP";

    if (unit === "BP") {
        resolutionArray = this.bpResolutions;
    }
    else if (unit === "FRAG") {
        resolutionArray = this.fragResolutions;
    } else {
        throw new Error("Invalid unit: " + unit);
    }

    for (i = 0; i < resolutionArray.length; i++) {
        if (resolutionArray[i] === binSize) return i;
    }

    return -1;
}

Dataset.prototype.getChrIndexFromName = function (chrName) {
    var i;
    for (i = 0; i < this.chromosomes.length; i++) {
        if (chrName === this.chromosomes[i].name) return i;
    }
    return undefined;
}

Dataset.prototype.compareChromosomes = function (otherDataset) {
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

Dataset.prototype.getNormVectorIndex = async function () {
    return this.hicFile.getNormVectorIndex()

}

Dataset.prototype.getNormalizationOptions = async function () {
    return this.hicFile.getNormalizationOptions()
}

const Block = function (blockNumber, zoomData, records) {
    this.blockNumber = blockNumber;
    this.zoomData = zoomData;
    this.records = records;
};

const ContactRecord = function (bin1, bin2, counts) {
    this.bin1 = bin1;
    this.bin2 = bin2;
    this.counts = counts;
};

ContactRecord.prototype.getKey = function () {
    return "" + this.bin1 + "_" + this.bin2;
}


function matchGenome(chromosomes) {


    var keys = Object.keys(knownGenomes),
        i, l;

    if (chromosomes.length < 4) return undefined;

    for (i = 0; i < keys.length; i++) {
        l = knownGenomes[keys[i]];
        if (chromosomes[1].size === l[0] && chromosomes[2].size === l[1] && chromosomes[3].size === l[2]) {
            return keys[i];
        }
    }

    return undefined;


}

export default Dataset