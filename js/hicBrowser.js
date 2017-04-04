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

    var defaultPixelSize, defaultState;
    var maxPixelSize = 100;

    hic.createBrowser = function ($hic_container, config) {

        defaultPixelSize = 1;

        defaultState = new hic.State(1, 1, 0, 0, 0, defaultPixelSize, "NONE");

        var href = window.location.href,
            hicUrl = gup(href, "hicUrl"),
            stateString = gup(href, "state"),
            colorScale = gup(href, "colorScale");

        if (hicUrl) {
            config.url = decodeURIComponent(hicUrl);
        }
        if (stateString) {
            stateString = decodeURIComponent(stateString);
            config.state = hic.destringifyState(stateString);
            var tokens = stateString.split(",");
        }
        if (colorScale) {
            config.colorScale = parseFloat(colorScale);
        }


        return new hic.Browser($hic_container, config);
    };

    hic.Browser = function ($app_container, config) {

        var $root;

        setDefaults(config);

        this.config = config;

        $root = $('<div class="hic-root unselect">');
        $app_container.append($root);

        createNavBar(this, $root);

        createXTrackContainer(this, $root);

        createContentContainer(this, $root);

        this.state = config.state ? config.state : defaultState.clone();

        if (config.colorScale && !isNaN(config.colorScale)) {
            this.contactMatrixView.colorScale.high = config.colorScale;
            this.contactMatrixView.computeColorScale = false;
        }

        if (config.url) {
            this.loadHicFile(config);
        }

        hic.GlobalEventBus.subscribe("LocusChange", this);
        hic.GlobalEventBus.subscribe("DragStopped", this);
        hic.GlobalEventBus.subscribe("DataLoad", this);
        hic.GlobalEventBus.subscribe("ColorScale", this);
        hic.GlobalEventBus.subscribe("NormalizationChange", this);
    };

    function createNavBar(browser, $root) {

        var $navbar_container = $('<div class="hic-navbar-container">');
        $root.append($navbar_container);

        // logo
        // $navbar_container.append($('<div class="hic-logo-container">'));

        // chromosome selector
        if (browser.config.showChromosomeSelector) {
            browser.chromosomeSelector = new hic.ChromosomeSelectorWidget(browser, $navbar_container);
        }

        // location box / goto
        browser.locusGoto = new hic.LocusGoto(browser, $navbar_container);

        // colorscale widget
        browser.colorscaleWidget = new hic.ColorScaleWidget(browser, $navbar_container);

        // resolution widget
        browser.normalizationSelector = new hic.NormalizationWidget(browser);
        $navbar_container.append(browser.normalizationSelector.$container);

        // resolution widget
        browser.resolutionSelector = new hic.ResolutionSelector(browser);
        $navbar_container.append(browser.resolutionSelector.$container);

    }

    function createXTrackContainer(browser, $root) {

        var $container,
            $track_labels,
            x_tracks;

        // container: track-labels | x-tracks
        $container = $('<div class="hic-x-track-container">');
        $root.append($container);

        // track labels
        $track_labels = $('<div>');
        $container.append($track_labels);

        // x tracks
        x_tracks = $('<div>');
        $container.append(x_tracks);

    }

    function createContentContainer(browser, $root) {

        var $content_container,
            $container,
            $e;

        $content_container = $('<div class="hic-content-container">');
        $root.append($content_container);

        // container: x-axis
        $container = $('<div>');
        $content_container.append($container);
        xAxis(browser, $container);


        // container: y-axis | viewport | y-scrollbar
        $container = $('<div>');
        $content_container.append($container);

        // y-tracks
        $e = $('<div>');
        $container.append($e);

        // y-axis
        yAxis(browser, $container);

        // viewport | y-scrollbar
        browser.contactMatrixView = new hic.ContactMatrixView(browser, $container);


        // container: x-scrollbar
        $container = $('<div>');
        $content_container.append($container);
        $container.append(browser.contactMatrixView.scrollbarWidget.$x_axis_scrollbar_container);

        function xAxis(browser, $container) {
            browser.$xAxis = $('<div>');
            $container.append(browser.$xAxis);
            browser.xAxisRuler = new hic.Ruler(browser, browser.$xAxis, 'x');
        }

        function yAxis(browser, $container) {
            browser.$yAxis = $('<div>');
            $container.append(browser.$yAxis);
            browser.yAxisRuler = new hic.Ruler(browser, browser.$yAxis, 'y');
        }

    }

    hic.Browser.prototype.getColorScale = function () {
        var cs = this.contactMatrixView.colorScale;
        return cs;
    };

    hic.Browser.prototype.updateColorScale = function (high) {
        this.contactMatrixView.colorScale.high = high;
        this.contactMatrixView.imageTileCache = {};
        this.contactMatrixView.update();
        this.updateHref();
    };

    hic.Browser.prototype.loadHicFile = function (config) {

        var self = this;

        if (!config.url) {
            console.log("No .hic url specified");
            return;
        }

        if (config.url === this.url) {
            console.log(this.url + " already loaded");
            return;
        }

        self.url = config.url;

        this.hicReader = new hic.HiCReader(config);

        self.contactMatrixView.clearCaches();


        self.contactMatrixView.startSpinner();

        self.hicReader.loadDataset()

            .then(function (dataset) {

                self.contactMatrixView.stopSpinner();

                self.dataset = dataset;
                self.contactMatrixView.setDataset(dataset);

                if (config.state) {
                    self.setState(config.state);
                 }
                else {

                    // Don't be clever for now

                    // z = findDefaultZoom.call(
                    //     self,
                    //     self.bpResolutions,
                    //     defaultPixelSize,
                    //     self.chromosomes[defaultState.chr1].size);
                    //
                    // defaultState.zoom = z;

                    self.setState(defaultState.clone());
                    self.contactMatrixView.computeColorScale = true;
                }




                hic.GlobalEventBus.post(hic.Event("DataLoad", dataset));

                if (config.colorScale) {
                    self.getColorScale().high = config.colorScale;
                }

            })
            .catch(function (error) {
                self.contactMatrixView.stopSpinner();
                console.log(error);
            });
    };

    function findDefaultZoom(bpResolutions, defaultPixelSize, chrLength) {

        var viewDimensions = this.contactMatrixView.getViewDimensions(),
            d = Math.max(viewDimensions.width, viewDimensions.height),
            nBins = d / defaultPixelSize,
            z;

        for (z = bpResolutions.length - 1; z >= 0; z--) {
            if (chrLength / bpResolutions[z] <= nBins) {
                return z;
            }
        }
        return 0;

    }

    hic.Browser.prototype.parseGotoInput = function (string) {

        var self = this,
            loci = string.split(' '),
            newZoom,
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

            if (xLocus.wholeChr && yLocus.wholeChr) {
                this.setChromosomes(xLocus.chr, yLocus.chr);
            }
            else {
                maxExtent = Math.max(locusExtent(xLocus), locusExtent(yLocus));
                targetResolution = maxExtent / (this.contactMatrixView.$viewport.width() / this.state.pixelSize);

                var bpResolutions = this.dataset.bpResolutions;
                newZoom = this.findMatchingZoomIndex(targetResolution, bpResolutions);
                newPixelSize = this.state.pixelSize;   // Adjusting this is complex

                this.setState(new hic.State(
                    xLocus.chr,
                    yLocus.chr,
                    newZoom,
                    xLocus.start / bpResolutions[this.state.zoom],
                    yLocus.start / bpResolutions[this.state.zoom],
                    newPixelSize
                ));
            }

        }

        function locusExtent(obj) {
            return obj.end - obj.start;
        }

    };

    hic.Browser.prototype.findMatchingZoomIndex = function (targetResolution, resolutionArray) {
        var z;
        for (z = resolutionArray.length - 1; z > 0; z--) {
            if (resolutionArray[z] >= targetResolution) {
                return z;
            }
        }
        return 0;
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

        chromosomeNames = _.map(self.dataset.chromosomes, function (chr) {
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
            locusObject.end = this.dataset.chromosomes[locusObject.chr].size;
            locusObject.wholeChr = true;
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

        this.contactMatrixView.clearCaches();
        this.contactMatrixView.computeColorScale = true;

        // Shift x,y to maintain center, if possible
        var bpResolutions = this.dataset.bpResolutions,
            viewDimensions = this.contactMatrixView.getViewDimensions(),
            n = viewDimensions.width / (2 * this.state.pixelSize),
            resRatio = bpResolutions[this.state.zoom] / bpResolutions[zoom];

        this.state.zoom = zoom;
        this.state.x = (this.state.x + n) * resRatio - n;
        this.state.y = (this.state.y + n) * resRatio - n;
        this.state.pixelSize = Math.max(defaultPixelSize, minPixelSize.call(this, this.state.chr1, this.state.chr2, zoom));

        this.clamp();

        hic.GlobalEventBus.post(hic.Event("LocusChange", this.state));
    };

    hic.Browser.prototype.setChromosomes = function (chr1, chr2) {

        this.state.chr1 = Math.min(chr1, chr2);
        this.state.chr2 = Math.max(chr1, chr2);
        this.state.zoom = 0;
        this.state.x = 0;
        this.state.y = 0;

        this.state.pixelSize = Math.min(maxPixelSize, Math.max(defaultPixelSize, minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom)));
        hic.GlobalEventBus.post(hic.Event("LocusChange", this.state));

    };

    function minPixelSize(chr1, chr2, zoom) {
        var viewDimensions = this.contactMatrixView.getViewDimensions(),
            chr1Length = this.dataset.chromosomes[chr1].size,
            chr2Length = this.dataset.chromosomes[chr2].size,
            binSize = this.dataset.bpResolutions[zoom],
            nBins1 = chr1Length / binSize,
            nBins2 = chr2Length / binSize;

        // Crude test for "whole genome"
        var isWholeGenome = this.dataset.chromosomes[chr1].name === "All";
        if(isWholeGenome) {
            nBins1 *= 1000;
            nBins2 *= 1000;
        }

        return Math.min(viewDimensions.width / nBins1, viewDimensions.height / nBins2);
//        return Math.min(viewDimensions.width * (binSize / chr1Length), viewDimensions.height * (binSize / chr2Length));
    }

    hic.Browser.prototype.update = function () {
        hic.GlobalEventBus.post(hic.Event("LocusChange", this.state));
    };

    /**
     * Set the matrix state.  Used ot restore state from a bookmark
     * @param state  browser state
     */
    hic.Browser.prototype.setState = function (state) {

        this.state = state;

        // Possibly adjust pixel size
        this.state.pixelSize = Math.max(state.pixelSize, minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom));

        hic.GlobalEventBus.post(hic.Event("LocusChange", this.state));

    };

    hic.Browser.prototype.setNormalization = function (normalization) {

        this.state.normalization = normalization;

        hic.GlobalEventBus.post(hic.Event("NormalizationChange", this.state.normalization))

    };

    hic.Browser.prototype.shiftPixels = function (dx, dy) {

        this.state.x += dx;
        this.state.y += dy;
        this.clamp();

        var locusChangeEvent = hic.Event("LocusChange", this.state);
        locusChangeEvent.dragging = true;
        hic.GlobalEventBus.post(locusChangeEvent);
    };

    hic.Browser.prototype.goto = function (bpX, bpXMax, bpY, bpYMax) {

        var viewDimensions, targetResolution, newZoom, actualResolution, pixelSize, binX, binY, currentState, newState;

        viewDimensions = this.contactMatrixView.getViewDimensions();
        targetResolution = (bpXMax - bpX) / viewDimensions.width;
        newZoom = this.findMatchingZoomIndex(targetResolution, this.dataset.bpResolutions);
        actualResolution = this.dataset.bpResolutions[newZoom];
        pixelSize = actualResolution / targetResolution;
        binX = bpX / actualResolution;
        binY = bpY / actualResolution;
        currentState = this.state;
        newState = new hic.State(currentState.chr1, currentState.chr2, newZoom, binX, binY, pixelSize, currentState.normalization);

        this.state = newState;
        this.contactMatrixView.clearCaches();
        this.contactMatrixView.computeColorScale = true;


        hic.GlobalEventBus.post(hic.Event("LocusChange", this.state));

    };

    hic.Browser.prototype.clamp = function () {
        var viewDimensions = this.contactMatrixView.getViewDimensions(),
            chr1Length = this.dataset.chromosomes[this.state.chr1].size,
            chr2Length = this.dataset.chromosomes[this.state.chr2].size,
            binSize = this.dataset.bpResolutions[this.state.zoom],
            maxX = (chr1Length / binSize) - (viewDimensions.width / this.state.pixelSize),
            maxY = (chr2Length / binSize) - (viewDimensions.height / this.state.pixelSize);

        // Negative maxX, maxY indicates pixelSize is not enough to fill view.  In this case we clamp x, y to 0,0
        maxX = Math.max(0, maxX);
        maxY = Math.max(0, maxY);

        this.state.x = Math.min(Math.max(0, this.state.x), maxX);
        this.state.y = Math.min(Math.max(0, this.state.y), maxY);
    };

    hic.Browser.prototype.receiveEvent = function (event) {

        if (event.dragging) return;

        this.updateHref(event);
    };

    hic.Browser.prototype.updateHref = function (event) {
        var location = window.location,
            href = location.href;

        var href = window.location.href;

        if (event && event.type === "DataLoad") {
            href = replaceURIParameter("hicUrl", this.url, href);
        }

        href = replaceURIParameter("state", (this.state.stringify()), href);

        href = replaceURIParameter("colorScale", "" + this.contactMatrixView.colorScale.high, href);

        window.history.replaceState("", "juicebox", href);
    };

    hic.Browser.prototype.resolution = function () {
        return this.dataset.bpResolutions[this.state.zoom];
    };

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

    function replaceURIParameter(key, newValue, href) {


        var oldValue = gup(href, key);
        if (oldValue) {
            href = href.replace(key + "=" + oldValue, key + "=" + encodeURIComponent(newValue));
        }
        else {
            var delim = href.includes("?") ? "&" : "?";
            href += delim + key + "=" + encodeURIComponent(newValue);
        }

        return href;

    }

    hic.State = function (chr1, chr2, zoom, x, y, pixelSize) {

        this.chr1 = chr1;
        this.chr2 = chr2;
        this.zoom = zoom;
        this.x = x;
        this.y = y;
        this.pixelSize = pixelSize;
    };

    // Set default values for config properties
    function setDefaults(config) {
        if (config.showChromosomeSelector === undefined) {
            config.showChromosomeSelector = true;
        }
    }


    return hic;

})
(hic || {});
