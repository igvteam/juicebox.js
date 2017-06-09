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


var hic = (function (hic) {

    hic.Genome = function (id, chromosomes) {

        this.id = id;
        this.chromosomes = chromosomes;

        // Alias for size for igv compatibility
        this.chromosomes.forEach(function (c) {
            c.bpLength = c.size;
        })

        /**
         * Maps the official chromosome name to an alias.  Deals with
         * 1 <-> chr1,  chrM <-> MT,  IV <-> chr4, etc.
         * @param str
         */
        var chrAliasTable = {};

        // The standard mappings
        chromosomes.forEach(function (chromosome) {
            var name = chromosome.name,
                alias = name.startsWith("chr") ? name.substring(3) : "chr" + name;
            chrAliasTable[alias] = name;
            if (name === "chrM") chrAliasTable["MT"] = "chrM";
            if (name === "MT") chrAliasTable["chrmM"] = "MT";
        });

        constructWG(this);

        this.chrAliasTable = chrAliasTable;

    }

    hic.Genome.prototype.getChromosomeName = function (str) {
        var chr = this.chrAliasTable[str];
        return chr ? chr : str;
    }

    hic.Genome.prototype.getChromosome = function (chr) {
        chr = this.getChromosomeName(chr);
        return this.chromosomes[chr];
    }

    /**
     * Return the genome coordinate in kb for the give chromosome and position.
     */
    hic.Genome.prototype.getGenomeCoordinate = function (chr, bp) {
        return this.getCumulativeOffset(chr) + Math.floor(bp / 1000);
    }



    /**
     * Return the offset in genome coordinates (kb) of the start of the given chromosome
     */
    hic.Genome.prototype.getCumulativeOffset = function (chr) {

        var self = this,
            queryChr = this.getChromosomeName(chr);
        if (this.cumulativeOffsets === undefined) {
            computeCumulativeOffsets.call(this);
        }
        return this.cumulativeOffsets[queryChr];
    }

    function computeCumulativeOffsets() {
        var self = this,
            cumulativeOffsets = {},
            offset = 0;

        self.chromosomes.forEach(function (chromosome) {
            var name = chromosome.name;
            cumulativeOffsets[name] = Math.floor(offset);
            var chromosome = self.getChromosome(name);
            offset += (chromosome.size / 1000);   // Genome coordinates are in KB.  Beware 32-bit max value limit
        });
        self.cumulativeOffsets = cumulativeOffsets;

    }


    // this.sequence = sequence;
    // this.chromosomeNames = sequence.chromosomeNames;
    // this.chromosomes = sequence.chromosomes;  // An object (functions as a dictionary)
    // this.ideograms = ideograms;
    // this.wgChromosomeNames = wgChromosomeNames;

    function constructWG(genome) {

        var l;

        // Construct the whole-genome "chromosome"
        l = 0;
        _.each(genome.chromosomes, function (chromosome) {
            l += Math.floor((chromosome.size / 1000));  // wg length is in kb.  bp would overflow maximum number limit
        });


        genome.chromosomes["all"] = {
            name: "all",
            size: l
        };
    }

    return hic;

}) (hic || {});

