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

    // mock igv browser objects for igv.js compatibility
    function createIGV($hic_container) {
        igv.browser = {
            constants: {defaultColor: "rgb(0,0,150)"}
        }
        igv.trackMenuItemList = hic.trackMenuItemListReplacement;
        igv.trackMenuItem = hic.trackMenuItemReplacement;
        // Popover object -- singleton shared by all components
        igv.popover = new igv.Popover($hic_container);
        // igv.popover.presentTrackGearMenu = hic.popoverPresentTrackGearMenuReplacement;

        // ColorPicker object -- singleton shared by all components
        igv.colorPicker = new igv.ColorPicker($hic_container, undefined);
        igv.colorPicker.hide();

        // Dialog object -- singleton shared by all components
        igv.dialog = new igv.Dialog($hic_container, igv.Dialog.dialogConstructor);
        igv.dialog.hide();

        // Data Range Dialog object -- singleton shared by all components
        igv.dataRangeDialog = new igv.DataRangeDialog($hic_container);
        igv.dataRangeDialog.hide();
    }


    hic.createBrowser = function ($hic_container, config) {

        var browser;

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

        createIGV($hic_container);

        browser = new hic.Browser($hic_container, config);


        return browser;

    };

    hic.Browser = function ($app_container, config) {

        var $root;

        hic.browser = this;
        this.config = config;

        setDefaults(config);

        this.trackRenderers = [];

        $root = $('<div class="hic-root unselect">');
        $app_container.append($root);

        this.layoutController = new hic.LayoutController(this, $root);

        this.hideCrosshairs();

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
        hic.GlobalEventBus.subscribe("MapLoad", this);
        hic.GlobalEventBus.subscribe("ColorScale", this);
        hic.GlobalEventBus.subscribe("NormalizationChange", this);
    };

    hic.Browser.prototype.updateCrosshairs = function (coords) {

        this.contactMatrixView.$x_guide.css({top: coords.y, left: 0});
        this.layoutController.$y_tracks.find('#x-track-guide').css({top: coords.y, left: 0});

        this.contactMatrixView.$y_guide.css({top: 0, left: coords.x});
        this.layoutController.$x_tracks.find('#y-track-guide').css({top: 0, left: coords.x});

    };

    hic.Browser.prototype.hideCrosshairs = function () {

        _.each([this.contactMatrixView.$x_guide, this.contactMatrixView.$y_guide, this.layoutController.$x_tracks.find('#y-track-guide'), this.layoutController.$y_tracks.find('#x-track-guide')], function ($e) {
            $e.hide();
        });

    };

    hic.Browser.prototype.showCrosshairs = function () {

        _.each([this.contactMatrixView.$x_guide, this.contactMatrixView.$y_guide, this.layoutController.$x_tracks.find('#y-track-guide'), this.layoutController.$y_tracks.find('#x-track-guide')], function ($e) {
            $e.show();
        });

    };

    hic.Browser.prototype.genomicState = function () {
        var gs,
            bpResolution;

        bpResolution = this.dataset.bpResolutions[this.state.zoom];

        gs = {};
        gs.bpp = bpResolution / this.state.pixelSize;

        gs.chromosome = {x: this.dataset.chromosomes[this.state.chr1], y: this.dataset.chromosomes[this.state.chr2]};

        gs.startBP = {x: this.state.x * bpResolution, y: this.state.y * bpResolution};
        gs.endBP = {
            x: gs.startBP.x + gs.bpp * this.contactMatrixView.getViewDimensions().width,
            y: gs.startBP.y + gs.bpp * this.contactMatrixView.getViewDimensions().height
        };

        return gs;
    };

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

    hic.Browser.prototype.loadTrackXY = function (trackConfigurations) {
        var self = this,
            promises;

        promises = [];
        _.each(trackConfigurations, function (config) {

            igv.inferTrackTypes(config);

            config.height = self.layoutController.track_height;

            promises.push(self.loadTrack(config));   // X track
            promises.push(self.loadTrack(config));   // Y track

        });

        Promise
            .all(promises)
            .then(function (tracks) {
                var trackXYPairs = [],
                    index;

                for (index = 0; index < tracks.length; index += 2) {
                    trackXYPairs.push({x: tracks[index], y: tracks[index + 1]});
                }

                self.addTrackXYPairs(trackXYPairs);
            })
            .catch(function (error) {
                console.log(error.message);
                alert(error.message);
            });

    };

    hic.Browser.prototype.loadTrack = function (config) {

        return new Promise(function (fulfill, reject) {

            var newTrack;

            newTrack = igv.createTrackWithConfiguration(config);

            if (undefined === newTrack) {
                reject(new Error('Could not create track'));
            } else if (typeof newTrack.getFileHeader === "function") {

                newTrack
                    .getFileHeader()
                    .then(function (header) {
                        fulfill(newTrack);
                    })
                    .catch(reject);

            } else {
                fulfill(newTrack);
            }
        });

    };

    hic.Browser.prototype.addTrackXYPairs = function (trackXYPairs) {
        hic.GlobalEventBus.post(hic.Event("TrackLoad", {trackXYPairs: trackXYPairs}));
    };

    hic.Browser.prototype.renderTracks = function (doSyncCanvas) {

        var list;

        if (_.size(this.trackRenderers) > 0) {

            // append each x-y track pair into a single list for Promise'ing
            list = [];
            _.each(this.trackRenderers, function (xy) {

                // sync canvas size with container div if needed
                _.each(xy, function (r) {
                    if (true === doSyncCanvas) {
                        r.syncCanvas();
                    }
                });

                // concatenate Promises
                list.push(xy.x.promiseToRepaint());
                list.push(xy.y.promiseToRepaint());
            });


            // Execute list of async Promises serially, waiting for
            // completion of one before executing the next.
            Promise
                .all(list)
                .then(function (strings) {
                    // console.log(strings.join('\n'));
                })
                .catch(function (error) {
                    console.log(error.message)
                });

        }

    };

    hic.Browser.prototype.renderTrackXY = function (trackXY) {
        var list;

        // append each x-y track pair into a single list for Promise'ing
        list = [];

        list.push(trackXY.x.promiseToRepaint());
        list.push(trackXY.y.promiseToRepaint());

        Promise
            .all(list)
            .then(function (strings) {
                // console.log(strings.join('\n'));
            })
            .catch(function (error) {
                console.log(error.message)
            });

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

        this.url = config.url;

        this.layoutController.removeAllTrackXYPairs();

        this.hicReader = new hic.HiCReader(config);

        self.contactMatrixView.clearCaches();

        self.contactMatrixView.startSpinner();

        self.hicReader
            .loadDataset()
            .then(function (dataset) {

                var $e, newGenome;

                self.contactMatrixView.stopSpinner();

                self.dataset = dataset;

                self.genome = new hic.Genome(self.dataset.genomeId, self.dataset.chromosomes);

                igv.browser.genome = self.genome;

                if (config.state) {
                    self.setState(config.state);
                }
                else {
                    self.setState(defaultState.clone());
                    self.contactMatrixView.computeColorScale = true;
                }
                self.contactMatrixView.setDataset(dataset);

                hic.GlobalEventBus.post(hic.Event("MapLoad", dataset));

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
            xLocus,
            yLocus;


        if (loci.length === 1) {
            xLocus = self.parseLocusString(loci[0]);
            yLocus = xLocus;
        } else {
            xLocus = self.parseLocusString(loci[0]);
            yLocus = self.parseLocusString(loci[1]);
            if(yLocus === undefined) yLocus = xLocus;
        }

        if (xLocus === undefined) {
            // Try a gene name search.
            hic.geneSearch(this.genome.id, loci[0].trim())

                .then(function (result) {
                    if (result) {
                        xLocus = self.parseLocusString(result);
                        yLocus = xLocus;
                        self.state.selectedGene = loci[0].trim();
                        self.goto(xLocus.chr, xLocus.start, xLocus.end, yLocus.chr, yLocus.start, yLocus.end, 5000);
                    }
                    else {
                        alert('No feature found with name "' + loci[0] + '"');
                    }
                })
                .catch(function (error) {
                    alert(error);
                    console.log(error);
                });
        } else {

            if (xLocus.wholeChr && yLocus.wholeChr) {
                self.setChromosomes(xLocus.chr, yLocus.chr);
            }
            else {
                self.goto(xLocus.chr, xLocus.start, xLocus.end, yLocus.chr, yLocus.start, yLocus.end, 5000);
            }
        }

    }

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

        chrName = this.genome.getChromosomeName(parts[0]);

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
            currentResolution = bpResolutions[this.state.zoom],
            viewDimensions = this.contactMatrixView.getViewDimensions(),
            xCenter = this.state.x + viewDimensions.width  / (2 * this.state.pixelSize),    // center in bins
            yCenter = this.state.y + viewDimensions.height / (2 * this.state.pixelSize),    // center in bins
            newResolution = bpResolutions[zoom],
            newXCenter = xCenter * (currentResolution / newResolution),
            newYCenter = yCenter * (currentResolution / newResolution),
            newPixelSize = Math.max(defaultPixelSize, minPixelSize.call(this, this.state.chr1, this.state.chr2, zoom));


        this.state.zoom = zoom;
        this.state.x = Math.max(0, newXCenter - viewDimensions.width  / (2 * newPixelSize));
        this.state.y = Math.max(0, newYCenter - viewDimensions.height  / (2 * newPixelSize));
        this.state.pixelSize = newPixelSize;

        this.clamp();

        hic.GlobalEventBus.post(hic.Event("LocusChange", this.state));
    };

    hic.Browser.prototype.updateLayout = function () {
        this.state.pixelSize = Math.max(defaultPixelSize, minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom));
        this.clamp();
        this.renderTracks(true);
        this.contactMatrixView.clearCaches();
        this.contactMatrixView.update();


    };

    hic.Browser.prototype.setChromosomes = function (chr1, chr2) {

        this.state.chr1 = Math.min(chr1, chr2);
        this.state.chr2 = Math.max(chr1, chr2);
        this.state.zoom = 0;
        this.state.x = 0;
        this.state.y = 0;

        this.state.pixelSize = Math.min(maxPixelSize, Math.max(defaultPixelSize, minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom)));

        this.contactMatrixView.computeColorScale = true;

        hic.GlobalEventBus.post(hic.Event("LocusChange", this.state));
    };

    hic.Browser.prototype.updateLayout = function () {
        this.state.pixelSize = Math.max(defaultPixelSize, minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom));
        this.clamp();
        this.renderTracks(true);
        this.layoutController.xAxisRuler.update();
        this.layoutController.yAxisRuler.update();
        this.contactMatrixView.clearCaches();
        this.contactMatrixView.update();
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
        if (isWholeGenome) {
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
        this.contactMatrixView.computeColorScale = true;
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


    hic.Browser.prototype.goto = function (chr1, bpX, bpXMax, chr2, bpY, bpYMax, minResolution) {


        var self = this,
            xCenter,
            yCenter,
            maxExtent,
            targetResolution,
            viewWidth;

        if (minResolution === undefined) minResolution = 200;

        maxExtent = Math.max(bpXMax - bpX, bpYMax - bpY);
        viewWidth = this.contactMatrixView.getViewDimensions().width;
        targetResolution = maxExtent / viewWidth;

        if (targetResolution < minResolution) {
            maxExtent = viewWidth * minResolution;
            xCenter = (bpX + bpXMax) / 2;
            yCenter = (bpY + bpYMax) / 2;
            bpX = Math.max(xCenter - maxExtent / 2);
            bpY = Math.max(0, yCenter - maxExtent / 2);
            targetResolution = minResolution;
        }

        var bpResolutions = self.dataset.bpResolutions,
            newZoom = self.findMatchingZoomIndex(targetResolution, bpResolutions),
            newResolution = bpResolutions[newZoom],
            newPixelSize = Math.max(1, (viewWidth * newResolution / maxExtent)),
            newXBin = bpX / newResolution,
            newYBin = bpY / newResolution;

        self.state = new hic.State(
            chr1,
            chr2,
            newZoom,
            newXBin,
            newYBin,
            newPixelSize
        );
        self.contactMatrixView.clearCaches();
        self.contactMatrixView.computeColorScale = true;
        hic.GlobalEventBus.post(hic.Event("LocusChange", self.state));

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

        if (event && event.type === "MapLoad") {
            href = replaceURIParameter("hicUrl", this.url, href);
        }

        href = replaceURIParameter("state", (this.state.stringify()), href);

        href = replaceURIParameter("colorScale", "" + this.contactMatrixView.colorScale.high, href);

        if (this.trackRenderers && this.trackRenderers.length > 0) {
            var trackString = "";
            this.trackRenderers.forEach(function (trackRenderer) {
                var track = trackRenderer.x.track,
                    config = track.config,
                    url = config.url,
                    dataRange = track.dataRange;

                if (typeof url === "string") {
                    trackString += url + "@"
                }
            });
            if (trackString.length > 0) {
                href = replaceURIParameter("tracks", trackString, href);
            }
        }


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


    function updateAnnotationSelector(annotationSelector, genomeId) {

        var $select,
            elements;

        $select = $("#" + annotationSelector);
        $select.empty();

        elements = [];
        elements.push('<option value=' + '-' + '>' + '-' + '</option>');

        if ('hg19' === genomeId) {
            elements.push('<option value=' + 'https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.collapsed.bed.gz' + '>' + 'Genes' + '</option>');
            $select.append(elements.join(''));

        } else if ('hg38' === genomeId) {
            elements.push('<option value=' + 'https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.collapsed.bed.gz' + '>' + 'Genes' + '</option>');
            $select.append(elements.join(''));

        }

    }


    return hic;

})
(hic || {});
