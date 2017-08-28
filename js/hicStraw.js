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

var hic = (function (hic) {

    hic.Straw = function (config) {

        config.loadFragData = true;

        this.config = config;
        this.reader = new hic.HiCReader(config);

    }

//straw <NONE/VC/VC_SQRT/KR> <hicFile> <chr1>[:x1:x2] <chr2>[:y1:y2] <BP/FRAG> <binsize>
//     ​
    hic.Straw.prototype.getContactRecords = function (normalization, region1, region2, units, binsize) {

        var self = this,
            chr1 = region1.chr,
            chr2 = region2.chr,
            x1 = region1.start / binsize, 
            x2 = region1.end / binsize,
            y1 = region2.start / binsize,
            y2 = region2.end / binsize;

        return getDataset.call(self)
            .then(function (dataset) {

                self.dataset = dataset;

                var chr1idx = dataset.getChrIndexFromName(chr1),
                    chr2idx = dataset.getChrIndexFromName(chr2);

                if (chr1idx === undefined || chr2idx === undefined) {
                    throw new Error("One or both chromosomes not in this dataset");
                }

                return dataset.getMatrix(chr1idx, chr2idx)
            })
            .then(function (matrix) {
                // Find the requested resolution
                var z = self.dataset.getZoomIndexForBinSize(binsize, units);
                if (z === -1) {
                    throw new Error("Invalid bin size");
                }

                var zd = matrix.bpZoomData[z],
                    blockBinCount = zd.blockBinCount,   // Dimension in bins of a block (width = height = blockBinCount)
                    col1 = x1 === undefined ? 0 : Math.floor(x1 / blockBinCount),
                    col2 = x1 === undefined ? zd.blockColumnCount : Math.floor(x2 / blockBinCount),
                    row1 = Math.floor(y1 / blockBinCount),
                    row2 = Math.floor(y2 / blockBinCount),
                    row, column, sameChr, blockNumber,
                    promises = [];

                sameChr = chr1 === chr2;

                for (row = row1; row <= row2; row++) {
                    for (column = col1; column <= col2; column++) {
                        if (sameChr && row < column) {
                            blockNumber = column * zd.blockColumnCount + row;
                        }
                        else {
                            blockNumber = row * zd.blockColumnCount + column;
                        }
                        promises.push(self.dataset.getNormalizedBlock(zd, blockNumber, normalization))
                    }
                }

                return Promise.all(promises);
            })
            .then(function (blocks) {
                var contactRecords = [];

                for (let block of blocks) {
                    if (block === null) { // This is most likely caused by a base pair range outside the chromosome
                        continue;
                    }
                    let records = block.records;
                    for (let rec of records) {
                        // TODO -- transpose?
                        if(rec.bin1 >= x1 && rec.bin1 <= x2 && rec.bin2 >= y1 && rec.bin2 <= y2) {
                            contactRecords.push(rec);
                        }
                    }
                }
                return contactRecords;
            });
    }


    function getDataset() {

        if (this.dataset) {
            return Promise.resolve(this.dataset);
        }
        else {
            return this.reader.loadDataset(this.config);
        }
    }


    return hic;
})(hic || {});
