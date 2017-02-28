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

    hic.createBrowser = function ($hic_container, config) {

        var browser = new hic.Browser($hic_container, config);

        return new Promise(function (fulfill, reject) {

            browser.contactMatrixView.startSpinner();

            browser.hicReader.readHeader()
                .then(function () {
                    browser.hicReader.readFooter()
                        .then(function () {
                            browser.chromosomes = browser.hicReader.chromosomes;
                            browser.bpResolutions = browser.hicReader.bpResolutions;
                            browser.fragResolutions = browser.hicReader.fragResolutions;
                            browser.update();
                            browser.contactMatrixView.stopSpinner();
                            fulfill(browser);
                        })
                        .catch(function (error) {
                            browser.contactMatrixView.stopSpinner();
                            reject(error);
                        });
                })
                .catch(function (error) {
                    browser.contactMatrixView.stopSpinner();
                    reject(error);
                });
        });
    };

    hic.Browser = function ($hic_container, config) {
        this.config = config;
        this.hicReader = new hic.HiCReader(config);
        this.contactMatrixView = new hic.ContactMatrixView(this);
        $hic_container.append(this.contactMatrixView.viewport);

        this.state = new State(1, 1, 0, 0, 0, 1);

    };

    hic.Browser.prototype.update = function () {
        this.contactMatrixView.update();
    };

    /**
     * Set the matrix state.  Used ot restore state from a bookmark
     * @param chr1  chromosome index (not the name)
     * @param chr2  cnormosome index (not the name)
     * @param zoom  zoom level index (int)
     * @param x     bin position of left-most cell (horizontal-right axis)
     * @param y     bin position top-most cell (vertical-down axis)
     * @param pixelSize   screen-pixel per bin (dimension of n by n screen region occupied by one bin)
     */
    hic.Browser.prototype.setState = function(chr1, chr2, zoom, x, y, pixelSize) {

        this.state = new State(chr1, chr2, zoom, x, y, pixelSize);

        this.contactMatrixView.update();
    }

    State = function(chr1, chr2, zoom, x, y, pixelSize) {
        this.chr1 = chr1;
        this.chr2 = chr2;
        this.zoom = zoom;
        this.x = x;
        this.y = y;
        this.pixelSize = pixelSize;
    }

    State.prototype.shiftPixels = function(dx, dy) {

        this.x += dx;
        this.y += dy;

    }


    return hic;

})
(hic || {});
