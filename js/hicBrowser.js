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


                            // These elements dependent on full instantiation of HICReader state
                            // Thus they must me created here.

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

        hic.GlobalEventBus.subscribe("LocusChange", this);
    };

    hic.Browser.prototype.parseGotoInput = function (string) {

        var self = this,
            loci = string.split(' '),
            validLoci,
            bpp,
            xLocus,
            yLocus,
            maxExtent,
            targetResolution,
            newZoom,
            newPixelSize;

        if (loci.length !== 2) {
            console.log('ERROR. Must enter locus for x and y axes.');
        } else {

            xLocus = self.parseLocusString(loci[0]);
            yLocus = self.parseLocusString(loci[1]);

            if (xLocus === undefined || yLocus === undefined) {
                console.log('ERROR. Must enter valid loci for X and Y axes');
            }

            maxExtent = Math.max(locusExtent(xLocus), locusExtent(yLocus));
            targetResolution = maxExtent / (this.contactMatrixView.$viewport.width() / this.state.pixelSize);
            newZoom = findMatchingResolution(targetResolution, this.hicReader.bpResolutions);
            newPixelSize = this.state.pixelSize;   // Adjusting this is complex

            this.setState(
                xLocus.chr,
                yLocus.chr,
                newZoom,
                xLocus.start / this.hicReader.bpResolutions[this.state.zoom],
                yLocus.start / this.hicReader.bpResolutions[this.state.zoom],
                newPixelSize
            );


        }

        function locusExtent(obj) {
            return obj.end - obj.start;
        }

        function findMatchingResolution(target, resolutionArray) {
            var z;
            for (z = 0; z < resolutionArray.length; z++) {
                if (resolutionArray[z] <= target) {
                    return z;
                }
            }
            return 0;
        }

    };

    hic.Browser.prototype.parseLocusString = function (locus) {

        var self = this,
            parts,
            chrName,
            extent,
            succeeded,
            chromosomeNames,
            locusObject = {},
            numeric;

        parts = locus.trim().split(':');

        chromosomeNames = _.map(self.hicReader.chromosomes, function (chr) {
            return chr.name;
        });

        chrName = parts[0];

        if (!_.contains(chromosomeNames, chrName)) {
            return undefined;
        } else {
            locusObject.chr = _.indexOf(chromosomeNames, chrName);
        }


        if (parts.length === 1) {
            // Chromosome name only
            locusObject.start = 0;
            locusObject.end = this.hicReader.chromosomes[locusObject.chr].size;
        } else {
            extent = parts[1].split("-");
            if (extent.length !== 2) {
                return undefined;
            }
            else {
                _.each(extent, function (value, index) {
                    var numeric = value.replace(/\,/g, '');
                    if (isNaN(numeric)) {
                        return undefined;
                    }
                    locusObject[0 === index ? 'start' : 'end'] = parseInt(numeric, 10);
                });
            }
        }
        return locusObject;
    };

    hic.Browser.prototype.setZoom = function (zoom) {

        // Shift x,y to maintain center, if possible
        var bpResolutions = this.hicReader.bpResolutions,
            viewDimensions = this.contactMatrixView.getViewDimensions(),
            n = viewDimensions.width / (2 * this.state.pixelSize),
            resRatio = bpResolutions[this.state.zoom] / bpResolutions[zoom];

        this.state.zoom = zoom;
        this.state.x = (this.state.x + n) * resRatio - n;
        this.state.y = (this.state.y + n) * resRatio - n;
        this.clamp();

        hic.GlobalEventBus.post(new hic.LocusChangeEvent(this.state));
    }

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

        this.state.x += dx;
        this.state.y += dy;
        this.clamp();

        hic.GlobalEventBus.post(new hic.LocusChangeEvent(this.state));
    };

    hic.Browser.prototype.clamp = function () {
        var viewDimensions = this.contactMatrixView.getViewDimensions(),
            chr1Length = this.hicReader.chromosomes[this.state.chr1].size,
            chr2Length = this.hicReader.chromosomes[this.state.chr2].size,
            binSize = this.hicReader.bpResolutions[this.state.zoom],
            maxX = (chr1Length / binSize) - (viewDimensions.width / this.state.pixelSize),
            maxY = (chr2Length / binSize) - (viewDimensions.height / this.state.pixelSize);

        // Negative maxX, maxY indicates pixelSize is not enough to fill view.  In this case we clamp x, y to 0,0
        maxX = Math.max(0, maxX);
        maxY = Math.max(0, maxY);

        this.state.x = Math.min(Math.max(0, this.state.x), maxX);
        this.state.y = Math.min(Math.max(0, this.state.y), maxY);
    }

    hic.Browser.prototype.receiveEvent = function (event) {

        if (event.payload && event.payload instanceof hic.State) {

            var location = window.location,
                href = location.href,
                queryString = location.search;

            var state = gup(href, 'state');
            if (state) {
                href = href.replace("state=" + state, "state=" + this.state.toString());
            }
            else {
                var delim = href.includes("?") ? "&" : "?";
                href += delim + "state=" + this.state.toString();
            }

            // Replace state parameter
            window.history.replaceState(this.state, "juicebox", href);
        }
    }


    function gup(href, name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(href);
        if (results == null)
            return undefined;
        else
            return results[1];
    }

// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

    function parseUri(str) {
        var o = parseUri.options,
            m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
            uri = {},
            i = 14;

        while (i--) uri[o.key[i]] = m[i] || "";

        uri[o.q.name] = {};
        uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
            if ($1) uri[o.q.name][$1] = $2;
        });

        return uri;
    };

    parseUri.options = {
        strictMode: false,
        key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
        q: {
            name: "queryKey",
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };

    hic.Browser.prototype.bpPerBinWithZoom = function (zoom) {
        return this.hicReader.bpResolutions[ zoom ];
    };

    hic.Browser.prototype.binToBP = function (bin, zoom) {

        // bin * bp/bin
        return bin * this.hicReader.bpResolutions[ zoom ];
    };

    hic.Browser.prototype.bpToBin = function (bp, zoom) {

        // bp / (bp/bin)
        return bp / this.hicReader.bpResolutions[ zoom ];
    };

    hic.Browser.prototype.xyStartBin = function () {
        return [this.state.x, this.state.y];
    };

    hic.Browser.prototype.xyEndBin = function () {
        var self = this,
            dimensionsPixels,
            pixels;

        dimensionsPixels = this.contactMatrixView.getViewDimensions();
        pixels = [ dimensionsPixels.width, dimensionsPixels.height ];
        return _.map(this.xyStartBin(), function(bin, index) {
            return bin + pixels[ index ] / self.state.pixelSize;
        });
    };

    hic.Browser.prototype.xyExtentBin = function (ss, ee) {
        return _.map([0, 1], function(index){
            return ee[ index ] - ss[ index ];
        });
    };

    hic.Browser.prototype.xyCentroidBin = function () {

        var s,
            e;

        s = this.xyStartBin();
        e = this.xyEndBin();
        return _.map([0, 1], function(index) {
            return Math.floor((s[ index ] + e[ index ])/2);
        });
    };

    hic.Browser.prototype.xyStartBP = function () {
        var self = this;
        return _.map([this.state.x, this.state.y], function(bin){
            return self.binToBP(bin, self.state.zoom);
        });
    };

    hic.Browser.prototype.xyEndBP = function () {
        var self = this,
            dimensionsPixels,
            pixelsPerBin,
            startBP;

        dimensionsPixels = this.contactMatrixView.getViewDimensions();
        pixelsPerBin = this.state.pixelSize;

        startBP = this.xyStartBP();

        return _.map([ dimensionsPixels.width, dimensionsPixels.height ], function(pixels, index) {
            return ((pixels / pixelsPerBin) * self.bpPerBinWithZoom(self.state.zoom)) + startBP[ index ];
        });

    };

    hic.Browser.prototype.xyCentroidBP = function () {
        var s,
            e;

        s = this.xyStartBP();
        e = this.xyEndBP();
        return _.map([0, 1], function(index){
            return Math.floor( (s[index] + e[index])/2 );
        });
    };

    return hic;


})
(hic || {});
