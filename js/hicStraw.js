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

    hic.Straw = function (urlOrFile) {

        this.url = urlOrFile

        this.reader = new hic.Reader({url: this.url, loadFragData: true});

    }

//straw <NONE/VC/VC_SQRT/KR> <hicFile> <chr1>[:x1:x2] <chr2>[:y1:y2] <BP/FRAG> <binsize>
    ​
    hic.Straw.getContactRecords = function (normalization, region1, region2, units, binsize) {

        return new Promise(function (success, reject) {
            var self = this,
                chr1 = region1.chr2,
                chr2 = region2.chr2,
                bpx1 = region1.start,
                bpx2 = region1.end,
                bpy1 = region2.start,
                bpy2 = region2.end;

            getDataset.call(this).then(function (dataset) {

                dataset.getMatrix(state.chr1, state.chr2)

                    .then(function (matrix) {

                        var zd = matrix.bpZoomData[state.zoom],
                            blockBinCount = zd.blockBinCount,   // Dimension in bins of a block (width = height = blockBinCount)
                            pixelSizeInt = Math.max(1, Math.floor(state.pixelSize)),
                            col1 = bpx1 === undefined ? 0 : Math.floor(bpx1 / blockBinCount),
                            col2 = bpx1 === undefined ? zd.blockColumnCount : Math.floor(bpx2 / blockBinCount),
                            row1 = Math.floor(bpy1 / blockBinCount),
                            row2 = Math.floor(bpy2 / blockBinCount),
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

                        Promise.all(promises)
                            .then(function (blocks) {

                            })
                            .catch(reject)

                    })
                    .catch(function (error) {
                        self.stopSpinner();
                        self.updating = false;
                        console.error(error);
                    })
            })
                .catch(reject);
        });
    }


    function getDataset() {

        if (this.dataset) {
            return Promise.resolve(this.dataset);
        }
        else {
            return this.reader.loadDataset();
        }

    }


    return hic;
})(hic || {});
