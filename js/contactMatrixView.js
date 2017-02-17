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
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


var hic = (function (hic) {


    hic.ContactMatrixView = function (browser) {

        var $viewport, $viewportContent;

        this.browser = browser;

        $viewport = $('<div class="hic-viewport-div">');
        this.viewport = $viewport[0];

        $viewportContent = $('<div class="hic-viewport-content-div">');
        $viewport.append($viewportContent[0]);

        //content canvas
        this.canvas = $('<canvas class = "hic-viewport-canvas">')[0];
        $viewportContent.append(this.canvas);

        this.canvas.setAttribute('width', this.viewport.clientWidth);
        this.canvas.setAttribute('height', this.viewport.clientHeight);
        this.ctx = this.canvas.getContext("2d");

        this.matrixCache = [];

        this.colorScale = new igv.GradientColorScale(
            {
                low: 0,
                lowR: 255,
                lowG: 255,
                lowB: 255,
                high: 4000,
                highR: 255,
                highG: 0,
                highB: 0
            }
        );

    }

    hic.ContactMatrixView.setState = function (state) {
        this.state = state;


    }


    hic.ContactMatrixView.prototype.update = function () {

        var self = this,
            reader = this.browser.hicReader,
            state = {
                chr1: 1,
                chr2: 1,
                x: 0,
                y: 0,
                zoom: 4
            },
            pixelSize = 2;

        // Get zoom data
        getMatrix.call(this, state.chr1, state.chr2).then(function (matrix) {
            var imageWidth = self.viewport.clientWidth / pixelSize;
            var imageHeight = self.viewport.clientHeight / pixelSize;
            var zd = matrix.bpZoomData[state.zoom],
                blockBinCount = zd.blockBinCount,
                blockColumnCount = zd.blockColumnCount,
                col1 = Math.floor(state.x / blockBinCount),
                col2 = Math.floor((state.x + imageWidth) / blockBinCount),
                row1 = Math.floor(state.y / blockBinCount),
                row2 = Math.floor((state.y + imageHeight) / blockBinCount),
                r, c, i, b,
                promises = [],
                blocks = [];

            for (r = row1; r <= row2; r++) {
                for (c = col1; c <= col2; c++) {
                    b = r * blockColumnCount + c;
                    promises.push(reader.readBlock(b, zd));
                }
            }

            Promise.all(promises).then(function (blocks) {
                self.draw(blocks, zd)
            }).catch(function (error) {
                console.error(error);
            })
        }).catch(function (error) {
            console.error(error);
        })
    }

    hic.ContactMatrixView.prototype.draw = function (blocks, zd) {

        var self = this,
            state = {
                chr1: 1,
                chr2: 1,
                x: 0,
                y: 0,
                zoom: 0
            },
            pixelSize = 2,
            widthInBins = zd.blockBinCount,
            imageSize = widthInBins * pixelSize,
            blockBinCount = zd.blockBinCount,
            blockColumnCount = zd.blockColumnCount;


        blocks.forEach(function (block) {
            if (block != null) {
                var blockNumber = block.blockNumber,
                    row = Math.floor(blockNumber / blockColumnCount),
                    col = blockNumber = row * blockColumnCount,
                    x0 = blockBinCount * row,
                    y0 = blockBinCount * col,
                    buffer = document.createElement('canvas'),
                    ctx;
                buffer.width = imageSize;
                buffer.height = imageSize;
                ctx = buffer.getContext('2d');

                // Draw the image
                var i, rec, x, y, rgb;
                for (i = 0; i < block.records.length; i++) {
                    rec = block.records[i];
                    x = (rec.bin1 - x0) * pixelSize;
                    y = (rec.bin2 - y0) * pixelSize;
                    rgb = self.colorScale.getColor(rec.counts);

                    ctx.fillStyle = rgb;
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                    ctx.fillRect(y, x, pixelSize, pixelSize);
                }

                var offsetX = x0 - state.x;
                var offsetY = y0 - state.y;
               // self.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                self.canvas.setAttribute('width', self.viewport.clientWidth);
                self.canvas.setAttribute('height', self.viewport.clientHeight);

                self.ctx.drawImage(buffer, offsetX, offsetY);
                self.ctx.save();
                self.ctx.restore();


            }
        })

    }

    function getMatrix(chr1, chr2) {

        var self = this,
            reader = this.browser.hicReader,
            key = "" + chr1 + "_" + chr2;
        if (this.matrixCache.hasOwnProperty(key)) {
            return Promise.resolve(self.matrixCache[key]);
        }
        else {
            return new Promise(function (fulfill, reject) {
                reader.readMatrix(key).then(function (matrix) {
                    self.matrixCache[key] = matrix;
                    fulfill(matrix);
                }).catch(reject);
            })

        }
    }

    return hic;

})
(hic || {});
