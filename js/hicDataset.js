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


    hic.Dataset = function (hicReader) {
        this.hicReader = hicReader;
        this.url = hicReader.path;
        this.matrixCache = {};
        this.blockCache = {};
        this.blockCacheKeys = [];
        this.normVectorCache = {};
    };

    hic.Dataset.prototype.clearCaches = function () {
        this.matrixCache = {};
        this.blockCache = {};
        this.normVectorCache = {};

    };

    hic.Dataset.prototype.getMatrix = function (chr1, chr2) {

        var self = this,
            reader = this.hicReader,
            key = "" + Math.min(chr1, chr2) + "_" + Math.max(chr1, chr2);
        if (this.matrixCache.hasOwnProperty(key)) {
            return Promise.resolve(self.matrixCache[key]);
        } else {
            return new Promise(function (fulfill, reject) {


                reader
                    .readMatrix(key)
                    .then(function (matrix) {


                        self.matrixCache[key] = matrix;
                        fulfill(matrix);
                    })
                    .catch(reject);
            })

        }
    };

    hic.Dataset.prototype.getNormalizedBlock = function (zd, blockNumber, normalization) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            self.getBlock(zd, blockNumber)

                .then(function (block) {

                    if (normalization === undefined || "NONE" === normalization || block === null || block === undefined) {
                        fulfill(block);
                    }
                    else {

                        // Get the norm vectors serially, its very likely they are the same and the second will be cached
                        self.getNormalizationVector(normalization, zd.chr1.index, zd.zoom.unit, zd.zoom.binSize)

                            .then(function (nv1) {

                                self.getNormalizationVector(normalization, zd.chr2.index, zd.zoom.unit, zd.zoom.binSize)

                                    .then(function (nv2) {
                                        var normRecords = [],
                                            normBlock;

                                        if (nv1 === undefined || nv2 === undefined) {
                                            console.log("Undefined normalization vector for: " + normalization);
                                            fulfill(block);
                                        }

                                        else {
                                            block.records.forEach(function (record) {

                                                var x = record.bin1,
                                                    y = record.bin2,
                                                    counts,
                                                    nvnv = nv1.data[x] * nv2.data[y];

                                                if (nvnv[x] !== 0 && !isNaN(nvnv)) {
                                                    counts = record.counts / nvnv;
                                                    //countArray.push(counts);
                                                    normRecords.push(new hic.ContactRecord(x, y, counts));
                                                }
                                            })

                                            normBlock = new hic.Block(blockNumber, zd, normRecords);   // TODO - cache this?

                                            normBlock.percentile95 = block.percentile95;

                                            fulfill(normBlock);
                                        }
                                    })
                                    .catch(reject)

                            }).catch(reject);
                    }
                })
                .catch(reject);
        })
    }

    hic.Dataset.prototype.getBlock = function (zd, blockNumber) {

        var self = this,
            key = "" + zd.chr1.name + "_" + zd.chr2.name + "_" + zd.zoom.binSize + "_" + zd.zoom.unit + "_" + blockNumber;


        if (this.blockCache.hasOwnProperty(key)) {
            return Promise.resolve(this.blockCache[key]);
        } else {
            return new Promise(function (fulfill, reject) {

                var reader = self.hicReader;

                reader.readBlock(blockNumber, zd)

                    .then(function (block) {

                        // Cache at most 10 blocks
                        if (self.blockCacheKeys.length > 10) {
                            self.blockCache[self.blockCacheKeys[0]] = undefined;
                            self.blockCacheKeys.shift();
                        }

                        self.blockCacheKeys.push(key);
                        self.blockCache[key] = block;

                        fulfill(block);

                    })
                    .catch(function (error) {
                        reject(error);
                    })
            })
        }
    };

    hic.Dataset.prototype.getNormalizationVector = function (type, chrIdx, unit, binSize) {

        var self = this,
            key = hic.getNormalizationVectorKey(type, chrIdx, unit, binSize);


        if (this.normVectorCache.hasOwnProperty(key)) {
            return Promise.resolve(this.normVectorCache[key]);
        } else {
            return new Promise(function (fulfill, reject) {

                var reader = self.hicReader;

                reader.readNormalizationVector(type, chrIdx, unit, binSize)

                    .then(function (nv) {

                        self.normVectorCache[key] = nv;

                        fulfill(nv);

                    })
                    .catch(reject)
            })
        }
    };

    hic.Dataset.prototype.getNormalizationVectorIdx = function (type, chrIdx, unit, binSize) {

        var key = hic.getNormalizationVectorKey(type, chrIdx, unit, binSize);

        return this.hicReader.normVectorIndex[key];

    }

    hic.Dataset.prototype.setNormalizationVectorIdx = function (type, chrIdx, unit, binSize, idx) {

        var key = hic.getNormalizationVectorKey(type, chrIdx, unit, binSize);
        if (undefined === this.hicReader.normVectorIndex) this.hicReader.normVectorIndex = {};
        this.hicReader.normVectorIndex[key] = idx;

    }

    /**
     * Initialization the normalization index from a "nvi" parameter value.  Called on startup from a url
     * while full norm vector index is loading
     *
     * @param state
     * @param nvi
     */
    hic.Dataset.prototype.initNormVectorIdx = function (state, nviString) {

        var nviArray = nviString.split("|"),
            nvi = nviArray[0],
            t2 = nvi.split(","),
            idx1 = {filePosition: parseInt(t2[0]), size: parseInt(t2[1])},
            binSize = this.bpResolutions[state.zoom];
        this.setNormalizationVectorIdx(state.normalization, state.chr1, "BP", binSize, idx1);
        this.normalizationTypes = [state.normalization];

        if (nviArray.length > 1) {
            nvi = nviArray[1];
            t2 = nvi.split(",");
            idx1 = {filePosition: parseInt(t2[0]), size: parseInt(t2[1])};
            binSize = this.bpResolutions[state.zoom];
            this.setNormalizationVectorIdx(state.normalization, state.chr2, "BP", binSize, idx1);
        }

    }


    hic.Block = function (blockNumber, zoomData, records) {
        this.blockNumber = blockNumber;
        this.zoomData = zoomData;
        this.records = records;
    };

    hic.ContactRecord = function (bin1, bin2, counts) {
        this.bin1 = bin1;
        this.bin2 = bin2;
        this.counts = counts;
    };


    return hic;

})
(hic || {});
