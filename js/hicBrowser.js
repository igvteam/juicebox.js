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


                            // These elements are dependent of full instantiation of HICReader
                            // Thus must me instantiated here.

                            // chromosome goto
                            browser.locusGoto = new hic.LocusGoto(browser);
                            browser.$navbar_container.append(browser.locusGoto.$container);

                            // resolution widget
                            browser.resolutionSelector = new hic.ResolutionSelector(browser);
                            browser.$navbar_container.append(browser.resolutionSelector.$container);

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

    hic.Browser = function ($app_container, config) {

        var $root,
            $content_container;

        this.config = config;
        this.hicReader = new hic.HiCReader(config);

        $root = $('<div class="hic-root unselect">');
        $app_container.append($root);

        // navbar
        this.$navbar_container = $('<div class="hic-navbar-container">');
        $root.append(this.$navbar_container);

        // logo
        this.$navbar_container.append($('<div class="hic-logo-container">'));

        $content_container = $('<div class="hic-content-container">');
        $root.append($content_container);

        this.$xAxis = xAxis();
        $content_container.append(this.$xAxis);
        this.xAxisRuler = new hic.Ruler(this, this.$xAxis.find('.hic-x-axis-ruler-container'), 'x');

        this.$yAxis = yAxis();
        $content_container.append(this.$yAxis);
        this.yAxisRuler = new hic.Ruler(this, this.$yAxis.find('.hic-y-axis-ruler-container'), 'y');

        this.contactMatrixView = new hic.ContactMatrixView(this);
        $content_container.append(this.contactMatrixView.$viewport);

        this.state = new hic.State(1, 1, 0, 0, 0, 1);

        function xAxis() {
            var $x_axis,
                $e;

            $x_axis = $('<div class="hic-x-axis">');
            $e = $('<div class="hic-x-axis-ruler-container">');
            $x_axis.append($e);
            return $x_axis
        }

        function yAxis() {
            var $y_axis,
                $e;

            $y_axis = $('<div class="hic-y-axis">');
            $e = $('<div class="hic-y-axis-ruler-container">');
            $y_axis.append($e);
            return $y_axis

        }
    };

    hic.Browser.prototype.parseGotoInput = function(string) {

        var self = this,
            loci = string.split(' '),
            validLoci,
            bpp;

        if (_.size(loci) !== 2) {
            console.log('ERROR. Must enter locus for x and y axes.');
        } else {

            validLoci = [];
            _.each(loci, function(locus) {

                var validLocus = {};
                if (self.isLocusChrNameStartEnd(locus, validLocus)) {
                    validLoci.push(validLocus)
                }

            });

            if (_.first(validLoci).chr !== _.last(validLoci).chr) {
                console.log('ERROR. Chromosome indices do not match.');
            } else if (locusExtent(_.first(validLoci)) !== locusExtent(_.last(validLoci))) {
                console.log('ERROR. Chromosome extents do not match.');
            } else {

                // this.state.chr1 = _.first(validLoci).chr;
                // this.state.chr2 =  _.last(validLoci).chr;

                bpp = locusExtent( _.first(validLoci) ) / this.contactMatrixView.$viewport.width();

                // this.state.pixelSize = this.hicReader.bpResolutions[ this.state.zoom ] / bpp;
                // this.state.x = _.first(validLoci).start / this.hicReader.bpResolutions[ this.state.zoom ];
                // this.state.y =  _.last(validLoci).start / this.hicReader.bpResolutions[ this.state.zoom ];

                this.setState(
                    _.first(validLoci).chr,
                     _.last(validLoci).chr,
                    this.state.zoom,
                    _.first(validLoci).start / this.hicReader.bpResolutions[ this.state.zoom ],
                     _.last(validLoci).start / this.hicReader.bpResolutions[ this.state.zoom ],
                    this.hicReader.bpResolutions[ this.state.zoom ] / bpp
                );
            }

        }

        function locusExtent(obj) {
            return obj.end - obj.start;
        }

    };

    hic.Browser.prototype.isLocusChrNameStartEnd = function (locus, locusObject) {

        var self = this,
            parts,
            chrName,
            extent,
            succeeded,
            chromosomeNames;

        parts = locus.split(':');

        chromosomeNames = _.map(self.hicReader.chromosomes, function(chr){
            return chr.name.toLowerCase();
        });

        chrName = _.first(parts).replace(/^chr/, '');

        if ( !_.contains(chromosomeNames, chrName) ) {
            return false;
        } else {
            locusObject.chr = _.indexOf(chromosomeNames, chrName);
            // locusObject.start = 0;
            // locusObject.end = this.hicReader.chromosomes[ locusObject.chr ].size;
        }

        // must have start and end
        extent = _.last(parts).split('-');
        if (2 !== _.size(extent)) {
            return false;
        } else {

            succeeded = true;
            _.each(extent, function(value, index) {

                var numeric;
                if (true === succeeded) {
                    numeric = value.replace(/\,/g,'');
                    succeeded = !isNaN(numeric);
                    if (true === succeeded) {
                        locusObject[ 0 === index ? 'start' : 'end' ] = parseInt(numeric, 10);
                    }
                }
            });

        }

        // if (true === succeeded) {
        //     igv.Browser.validateLocusExtent(locusObject.chromosome, locusObject);
        // }

        return succeeded;

    };

    hic.Browser.prototype.update = function () {
        hic.GlobalEventBus.post(new hic.LocusChangeEvent(this.state));
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
    hic.Browser.prototype.setState = function (chr1, chr2, zoom, x, y, pixelSize) {

        this.state = new hic.State(chr1, chr2, zoom, x, y, pixelSize);

        hic.GlobalEventBus.post(new hic.LocusChangeEvent(this.state));

    };

    hic.Browser.prototype.shiftPixels = function (dx, dy) {

        var viewDimensions = this.contactMatrixView.getViewDimensions(),
            chr1Length = this.hicReader.chromosomes[this.state.chr1].size,
            chr2Length = this.hicReader.chromosomes[this.state.chr2].size,
            binSize = this.hicReader.bpResolutions[this.state.zoom],
            maxX =  (chr1Length / binSize)  - (viewDimensions.width / this.state.pixelSize),
            maxY = (chr2Length / binSize) - (viewDimensions.height / this.state.pixelSize);

        this.state.x += dx;
        this.state.y += dy;

        this.state.x = Math.min(Math.max(0, this.state.x), maxX);
        this.state.y = Math.min(Math.max(0, this.state.y), maxY);

        hic.GlobalEventBus.post(new hic.LocusChangeEvent(this.state));

    };

    return hic;

})
(hic || {});
