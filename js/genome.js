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


/**
 *
 * @param id
 * @param chromosomes -- an array of hic.Chromosome objects.
 * @constructor
 */
const Genome = function (id, chromosomes) {

    this.id = id;
    this.chromosomes = chromosomes;
    this.wgChromosomeNames = [];
    this.chromosomeLookupTable = {};

    // Alias for size for igv compatibility
    this.genomeLength = 0;
    for (let c of this.chromosomes) {
        c.bpLength = c.size;
        if ('all' !== c.name.toLowerCase()) {
            this.genomeLength += c.size;
            this.wgChromosomeNames.push(c.name);
        }
    }

    /**
     * Maps chr aliases to the offical name.  Deals with
     * 1 <-> chr1,  chrM <-> MT,  IV <-> chr4, etc.
     * @param str
     */
    var chrAliasTable = {};

    // The standard mappings
    for (let chromosome of chromosomes) {

        const name = chromosome.name
        if (name.startsWith("arm_")) {
            //Special rule for aidenlab ad-hoc names for dMel
            const officialName = name.substring(4)
            chrAliasTable[officialName] = name
            chrAliasTable["chr" + officialName] = name
        } else {
            const alias = name.startsWith("chr") ? name.substring(3) : "chr" + name;
            chrAliasTable[alias] = name;
            if (name === "chrM") chrAliasTable["MT"] = "chrM";
            if (name === "MT") chrAliasTable["chrmM"] = "MT";
        }
        this.chromosomeLookupTable[name.toLowerCase()] = chromosome;
    }

    this.chrAliasTable = chrAliasTable;

}

Genome.prototype.getChromosomeName = function (str) {
    var chr = this.chrAliasTable[str];
    return chr ? chr : str;
};

Genome.prototype.getChromosome = function (str) {
    var chrname = this.getChromosomeName(str).toLowerCase();
    return this.chromosomeLookupTable[chrname];
};

/**
 * Return the genome coordinate for the give chromosome and position.
 */
Genome.prototype.getGenomeCoordinate = function (chr, bp) {
    return this.getCumulativeOffset(chr.name) + bp;
};

Genome.prototype.getChromsosomeForCoordinate = function (bp) {
    var i = 0,
        offset = 0,
        l;

    for (i = 1; i < this.chromosomes.length; i++) {
        l = this.chromosomes[i].size;
        if (offset + l > bp) return this.chromosomes[i];
        offset += l;
    }
    return this.chromosomes[this.chromosomes.length - 1];

}


/**
 * Return the offset in genome coordinates (kb) of the start of the given chromosome
 */
Genome.prototype.getCumulativeOffset = function (chr) {

    var queryChr;

    queryChr = this.getChromosomeName(chr);

    if (this.cumulativeOffsets === undefined) {
        computeCumulativeOffsets.call(this);
    }
    return this.cumulativeOffsets[queryChr];
};

function computeCumulativeOffsets() {
    var self = this,
        list,
        cumulativeOffsets,
        offset,
        i,
        chromosome;

    cumulativeOffsets = {};
    offset = 0;
    // Skip first chromosome (its chr all).
    for (i = 1; i < self.chromosomes.length; i++) {

        chromosome = self.chromosomes[i];
        cumulativeOffsets[chromosome.name] = Math.floor(offset);

        offset += (chromosome.size);
    }
    self.cumulativeOffsets = cumulativeOffsets;

}

// Required for igv.js
Genome.prototype.getGenomeLength = function () {
    return this.genomeLength;
}

export default Genome