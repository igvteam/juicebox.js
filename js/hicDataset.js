/**
 * Created by jrobinso on 2/7/17.
 */
/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 James Robinson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNJuicebox web demo appECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var hic = (function (hic) {

    dragThreshold = 2;

    hic.Dataset = function (hicReader) {
        this.hicReader = hicReader;
        this.url = hicReader.path;
        this.matrixCache = {};
        this.blockCache = {};
    };

    hic.Dataset.prototype.clearCaches = function () {
        this.matrixCache = {};
        this.blockCache = {};
    };


    hic.Dataset.prototype.getMatrix = function (chr1, chr2) {

        var self = this,
            reader = this.hicReader,
            key = "" + chr1 + "_" + chr2;
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

                        self.blockCache[key] = block;

                        fulfill(block);

                    })
                    .catch(reject)
            })
        }
    };


    return hic;

})
(hic || {});
