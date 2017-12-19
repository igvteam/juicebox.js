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

    var defaultPixelSize, defaultState;
    var MAX_PIXEL_SIZE = 12;
    var DEFAULT_ANNOTATION_COLOR = "rgb(22, 129, 198)";
    var defaultSize =
    {
        width: 640,
        height: 640
    };

    hic.allBrowsers = [];

    // mock igv browser objects for igv.js compatibility
    function createIGV($hic_container, hicBrowser, trackMenuReplacement) {

        var firstBrowser;

        igv.browser =
        {
            constants: {defaultColor: "rgb(0,0,150)"},

            // Compatibility wit igv menus
            trackContainerDiv: hicBrowser.layoutController.$x_track_container.get(0)
        };

        igv.trackMenuItem = function () {
            return trackMenuReplacement.trackMenuItemReplacement.apply(trackMenuReplacement, arguments);
        };

        igv.trackMenuItemList = function () {
            // var args;
            // args = Array.prototype.slice.call(arguments);
            // args.push(hicBrowser);
            return trackMenuReplacement.trackMenuItemListReplacement.apply(trackMenuReplacement, arguments);
        };

        // Popover object -- singleton shared by all components
        igv.popover = new igv.Popover($hic_container);

        // Dialog object -- singleton shared by all components
        igv.dialog = new igv.Dialog($hic_container, igv.Dialog.dialogConstructor);
        igv.dialog.hide();

        // Data Range Dialog object -- singleton shared by all components
        igv.dataRangeDialog = new igv.DataRangeDialog($hic_container);
        igv.dataRangeDialog.hide();

        // alert object -- singleton shared by all components

        // firstBrowser = (hic.allBrowsers && hic.allBrowsers.length > 1) ? hic.allBrowsers[ 0 ] : hicBrowser;
        // igv.alert = new igv.AlertDialog(firstBrowser.$root, "igv-alert");
        igv.alert = new igv.AlertDialog(hicBrowser.$root, "igv-alert");
        igv.alert.hide();

    }

    hic.createBrowser = function (hic_container, config) {

        var browser,
            queryString,
            query,
            isFigureMode,
            initialImageImg,
            initialImageX,
            initialImageY,
            uriDecode,
            apiKey;

        $hic_container = $(hic_container);

        setDefaults(config);

        apiKey = config.apiKey;
        if (apiKey) {
            igv.setApiKey(apiKey);
            hic.apiKey = apiKey;
        }

        queryString = config.queryString || config.href;   // href for backward compatibility
        if (queryString === undefined && config.initFromUrl !== false) {
            queryString = window.location.href;
        }

        if (queryString) {
            if (!queryString.includes("?")) {
                queryString = "?" + queryString;
            }
            query = hic.extractQuery(queryString);
            uriDecode = queryString.includes("%2C");
            decodeQuery(query, config, uriDecode);
        }

        browser = new hic.Browser($hic_container, config);

        hic.allBrowsers.push(browser);

        hic.Browser.setCurrentBrowser(browser);

        isFigureMode = (config.figureMode && true === config.figureMode);
        if (!isFigureMode && _.size(hic.allBrowsers) > 1) {
            $('.hic-nav-bar-delete-button').show();
        }

        browser.trackMenuReplacement = new hic.TrackMenuReplacement(browser);

        createIGV($hic_container, browser, browser.trackMenuReplacement);


        if (config.initialImage) {

            initialImageImg = new Image();

            initialImageImg.onload = function () {

                if (typeof config.initialImage === 'string') {
                    initialImageX = browser.state.x;
                    initialImageY = browser.state.y;
                } else {
                    initialImageX = config.initialImage.left || browser.state.x;
                    initialImageY = config.initialImage.top || browser.state.y;
                }

                browser.contactMatrixView.setInitialImage(initialImageX, initialImageY, initialImageImg, browser.state);

                // Load hic file after initial image is loaded -- important
                // Defer track loads until hic file is loaded.  The hic file defines the reference for the tracks.
                if (config.url || config.dataset) {

                    browser.loadHicFile(config)

                        .then(function (dataset) {

                            if (config.tracks) {

                                browser.loadTracks(config.tracks);
                            }

                        })
                }
            }
            initialImageImg.src = (typeof config.initialImage === 'string') ? config.initialImage : config.initialImage.imageURL;
        }
        else {
            if (config.url || config.dataset) {

                browser.loadHicFile(config)

                    .then(function (dataset) {

                        if (config.tracks) {
                            browser.loadTracks(config.tracks);
                        }

                    })
                    .catch(function (error) {
                        hic.presentError("Error loading " + (config.name || config.url), error);
                    })
            }
        }


        return browser;

    };


    hic.Browser = function ($app_container, config) {

        this.config = config;
        this.figureMode = config.figureMode || config.miniMode;    // Mini mode for backward compatibility
        this.resolutionLocked = false;
        this.eventBus = new hic.EventBus(this);

        this.id = _.uniqueId('browser_');
        this.trackRenderers = [];
        this.tracks2D = [];
        this.normVectorFiles = [];

        this.synchedBrowsers = [];

        this.isMobile = hic.isMobile();

        this.$root = $('<div class="hic-root unselect">');

        if (config.width) {
            this.$root.css("width", String(config.width));
        }
        if (config.height) {
            this.$root.css("height", String(config.height + hic.LayoutController.navbarHeight(this.config.figureMode)));
        }

        $app_container.append(this.$root);

        this.layoutController = new hic.LayoutController(this, this.$root);

        // prevent user interaction during lengthy data loads
        this.$user_interaction_shield = $('<div>', {class: 'hic-root-prevent-interaction'});
        this.$root.append(this.$user_interaction_shield);
        this.$user_interaction_shield.hide();


        this.hideCrosshairs();

        this.state = config.state ? config.state : defaultState.clone();

        if (config.colorScale) {
            this.contactMatrixView.setColorScale(config.colorScale, this.state);
        }

        this.eventBus.subscribe("LocusChange", this);

        function configureHover($e) {

            var self = this;

            $e.hover(_in, _out);

            _out();

            function _in() {

                if (_.size(hic.allBrowsers) > 1) {
                    $e.css('border-color', '#df0000');
                }

            }

            function _out() {

                if (_.size(hic.allBrowsers) > 1) {
                    $e.css('border-color', '#5f5f5f');
                }

            }
        }

    };

    hic.Browser.prototype.toggleMenu = function () {

        if (this.$menu.is(':visible')) {
            this.hideMenu();
        } else {
            this.showMenu();
        }

    };

    hic.Browser.prototype.showMenu = function () {
        this.$menu.show();
    };

    hic.Browser.prototype.hideMenu = function () {
        this.$menu.hide();
    };

    hic.Browser.prototype.startSpinner = function () {

        if (true === this.isLoadingHICFile) {
            this.$user_interaction_shield.show();
        }

        this.contactMatrixView.startSpinner();
    }

    hic.Browser.prototype.stopSpinner = function () {

        if (!this.isLoadingHICFile) {
            this.$user_interaction_shield.hide();
        }

        this.contactMatrixView.stopSpinner();
    }

    /**
     * Load a dataset outside the context of a browser.  Purpose is to "pre load" a shared dataset when
     * instantiating multiple browsers in a page.
     *
     * @param config
     */
    hic.loadDataset = function (config) {
        var self = this;

        var hicReader = new hic.HiCReader(config);

        return hicReader.loadDataset(config)

            .then(function (dataset) {

                if (config.nvi) {
                    var nviArray = decodeURIComponent(config.nvi).split(","),
                        range = {start: parseInt(nviArray[0]), size: parseInt(nviArray[1])};

                    return hicReader.readNormVectorIndex(dataset, range)
                        .then(function (ignore) {
                            return dataset;
                        })

                }
                else {
                    return dataset;
                }
            })

    };

    hic.syncBrowsers = function (browsers) {

        var browsersWithMaps, genome;

        browsersWithMaps = browsers.filter(function (b) {
            return b.dataset !== undefined;
        })

        if (browsersWithMaps.length < 2) {
            // Nothing to sync
            return;
        }

        // Canonical browser is the first one, arbitrarily
        genome = browsers[0].dataset.genomeId;

        // Sync compatible maps only

        browsersWithMaps.filter(function (b) {
            return b.dataset.genomeId === genome;
        })
            .forEach(function (b1) {

                browsers.forEach(function (b2) {
                    if (b1 !== b2 && !b1.synchedBrowsers.includes(b2)) {
                        b1.synchedBrowsers.push(b2);
                    }

                })

            })
    };

    hic.Browser.getCurrentBrowser = function () {

        if (hic.allBrowsers.length === 1) {
            return hic.allBrowsers[0];
        } else {
            return hic.Browser.currentBrowser;
        }

    };

    hic.Browser.setCurrentBrowser = function (browser) {

        if (undefined === browser) {

            $('.hic-root').removeClass('hic-root-selected');
            hic.Browser.currentBrowser = browser;
        } else if (browser === hic.Browser.currentBrowser) {

            // toggle state (turn selection off)
            $('.hic-root').removeClass('hic-root-selected');
            hic.Browser.currentBrowser = undefined;

        } else {

            if (hic.allBrowsers.length > 1) {
                $('.hic-root').removeClass('hic-root-selected');
                browser.$root.addClass('hic-root-selected');
            }

            hic.Browser.currentBrowser = browser;
        }

    };

    hic.Browser.prototype.updateCrosshairs = function (coords) {
        var obj;

        obj = coords.y < 0 ? {left: 0} : {top: coords.y, left: 0};
        this.contactMatrixView.$x_guide.css(obj);
        this.layoutController.$y_tracks.find("div[id$='x-track-guide']").css(obj);

        obj = coords.x < 0 ? {top: 0} : {top: 0, left: coords.x};
        this.contactMatrixView.$y_guide.css(obj);
        this.layoutController.$x_tracks.find("div[id$='y-track-guide']").css(obj);
    };

    hic.Browser.prototype.hideCrosshairs = function () {
        this.contactMatrixView.$x_guide.hide();
        this.contactMatrixView.$y_guide.hide();
        this.layoutController.$x_tracks.find("div[id$='y-track-guide']").hide();
        this.layoutController.$y_tracks.find("div[id$='x-track-guide']").hide();
    };

    hic.Browser.prototype.showCrosshairs = function () {
        this.contactMatrixView.$x_guide.show();
        this.contactMatrixView.$y_guide.show();
        this.layoutController.$x_tracks.find("div[id$='y-track-guide']").show();
        this.layoutController.$y_tracks.find("div[id$='x-track-guide']").show();
    };

    hic.Browser.prototype.genomicState = function (axis) {
        var gs,
            bpResolution;

        bpResolution = this.dataset.bpResolutions[this.state.zoom];
        gs = {
            bpp: bpResolution / this.state.pixelSize
        };

        if (axis === "x") {
            gs.chromosome = this.dataset.chromosomes[this.state.chr1];
            gs.startBP = this.state.x * bpResolution;
            gs.endBP = gs.startBP + gs.bpp * this.contactMatrixView.getViewDimensions().width;
        }
        else {
            gs.chromosome = this.dataset.chromosomes[this.state.chr2];
            gs.startBP = this.state.y * bpResolution;
            gs.endBP = gs.startBP + gs.bpp * this.contactMatrixView.getViewDimensions().height;
        }
        return gs;
    };


    hic.Browser.prototype.getColorScale = function () {
        return this.contactMatrixView.colorScale;
    };

    hic.Browser.prototype.updateColorScale = function (options) {

        var self = this,
            state;

        this.contactMatrixView.setColorScale(options);
        this.contactMatrixView.imageTileCache = {};
        this.contactMatrixView.initialImage = undefined;
        this.contactMatrixView.update();

        state = this.state;
        this.dataset.getMatrix(state.chr1, state.chr2)
            .then(function (matrix) {
                var zd = matrix.bpZoomData[state.zoom];
                var colorKey = zd.getKey() + "_" + state.normalization;
                self.contactMatrixView.colorScaleCache[colorKey] = options.high;
                self.contactMatrixView.update();
            })
            .catch(function (error) {
                console.log(error);
                alert(error);
            });
    };

    hic.Browser.prototype.loadTracks = function (trackConfigurations) {

        var self = this,
            errorPrefix;

        // If loading a single track remember its name, for error message
        errorPrefix = trackConfigurations.length == 1 ? "Error loading track " + trackConfigurations[0].name : "Error loading tracks";

        Promise.all(inferTypes(trackConfigurations))

            .then(function (trackConfigurations) {


                var trackXYPairs,
                    promises2D;

                trackXYPairs = [];
                promises2D = [];

                trackConfigurations.forEach(function (config) {

                    if (config) {

                        var isLocal = config.url instanceof File,
                            fn = isLocal ? config.url.name : config.url;

                        if ("annotation" === config.type && config.color === undefined) {
                            config.color = DEFAULT_ANNOTATION_COLOR;
                        }

                        config.height = self.layoutController.track_height;

                        if (config.type === undefined) {
                            // Assume this is a 2D track
                            promises2D.push(hic.loadTrack2D(config));
                        }
                        else {
                            var track = igv.createTrack(config);
                            trackXYPairs.push({x: track, y: track});
                        }
                    }
                });

                if (trackXYPairs.length > 0) {
                    self.layoutController.tracksLoaded(trackXYPairs);
                    self.updateLayout();
                }


                // 2D tracks
                if (promises2D.length > 0) {
                    Promise.all(promises2D)
                        .then(function (tracks2D) {
                            self.tracks2D = self.tracks2D.concat(tracks2D);
                            self.eventBus.post(hic.Event("TrackLoad2D", self.tracks2D));

                        })
                        .catch(function (error) {
                            hic.presentError(errorPrefix, error);
                        });
                }
            })

            .catch(function (error) {
                hic.presentError(errorPrefix, error);
            })

        function inferTypes(trackConfigurations) {

            var promises = [];
            trackConfigurations.forEach(function (config) {

                var url = config.url;

                if (url && typeof url === "string" && url.includes("drive.google.com")) {

                    promises.push(igv.Google.getDriveFileInfo(config.url)

                        .then(function (json) {
                            // Temporarily switch URL to infer tipes
                            config.url = json.originalFilename;
                            igv.inferTrackTypes(config);
                            if (config.name === undefined) {
                                config.name = json.originalFilename;
                            }
                            config.url = url;
                            return config;
                        })
                    );
                }

                else {
                    igv.inferTrackTypes(config);
                    if (!config.name) {
                        config.name = hic.extractFilename(config.url);
                    }
                    promises.push(Promise.resolve(config));
                }

            });

            return promises;
        }


    }


    hic.Browser.prototype.renderTracks = function () {

        var self = this;
        this.trackRenderers.forEach(function (xyTrackRenderPair, index) {
            self.renderTrackXY(xyTrackRenderPair);
        });

    };

    /**
     * Render the XY pair of tracks.
     *
     * @param xy
     */
    hic.Browser.prototype.renderTrackXY = function (xy) {

        //xy.x.repaint();
        //xy.y.repaint();

        var self = this;
        xy.x.readyToPaint()
            .then(function (ignore) {
                return xy.y.readyToPaint();
            })
            .then(function (ignore) {
                self.stopSpinner();
                xy.x.repaint();
                xy.y.repaint();
            })
            .catch(function (error) {
                self.stopSpinner();
                console.error(error);
            })
    }


    /**
     * Load a .hic file
     *
     * @return a promise for a dataset
     * @param config
     */
    hic.Browser.prototype.loadHicFile = function (config) {

        var self = this,
            hicReader, queryIdx, parts, tmp, id, url,
            apiKey = hic.apiKey,
            endPoint;


        if (!config.url && !config.dataset) {
            console.log("No .hic url specified");
            return;
        }

        self.layoutController.removeAllTrackXYPairs();
        self.contactMatrixView.clearCaches();
        self.tracks2D = [];
        self.tracks = [];

        this.isLoadingHICFile = true;
        if (!self.config.initialImage) {
            self.contactMatrixView.startSpinner();
        }


        if (config.url) {
            this.url = config.url;
            if (typeof config.url === "string") {
                queryIdx = config.url.indexOf("?");
                if (queryIdx > 0) {
                    parts = parseUri(config.url);
                    if (parts.queryKey) {
                        Object.assign(config, parts.queryKey);
                    }
                }
            }
        }

        if (config.dataset) {
            self.$contactMaplabel.text(config.name);
            self.name = config.name;
            return Promise.resolve(setDataset(config.dataset));
        }
        else {

            return extractName(config)

                .then(function (name) {
                    hicReader = new hic.HiCReader(config);
                    return hicReader.loadDataset(config);
                })

                .then(function (dataset) {
                    var previousGenomeId = self.genome ? self.genome.id : undefined;
                    self.dataset = dataset;
                    self.genome = new hic.Genome(self.dataset.genomeId, self.dataset.chromosomes);

                    // TODO -- this is not going to work with browsers on different assemblies on the same page.
                    igv.browser.genome = self.genome;
                    if (self.genome.id !== previousGenomeId) {
                        self.eventBus.post(hic.Event("GenomeChange", self.genome.id));
                    }
                    self.eventBus.post(hic.Event("MapLoad", self.dataset));

                    return loadNVI(dataset)
                })

                .then(function (nvi) {
                    self.isLoadingHICFile = false;
                    self.stopSpinner();

                    $('.hic-root').removeClass('hic-root-selected');
                    hic.Browser.setCurrentBrowser(undefined);

                    self.$contactMaplabel.text(config.name);
                    self.name = config.name;

                    if (config.colorScale) {
                        self.contactMatrixView.setColorScale(config.colorScale, self.state);
                    }

                    self.isLoadingHICFile = false;


                    if (config.state) {
                        self.setState(config.state);
                    } else if (config.synchState && self.canBeSynched(config.synchState)) {
                        self.syncState(config.synchState);
                    } else {
                        self.setState(defaultState.clone());
                    }

                })
                .catch(function (error) {
                    self.isLoadingHICFile = false;
                    self.stopSpinner();
                    console.error(error);
                    igv.presentAlert("Error loading hic file: " + error);
                    return error;
                })
        }


        function loadNVI(dataset) {

            if (dataset.hicReader.normVectorIndex) {
                // TODO jtr -- how can this happen?
                return Promise.resolve(hicReader.normVectorIndex);
            }
            else {
                if (config.nvi) {

                    var nviArray = decodeURIComponent(config.nvi).split(","),
                        range = {start: parseInt(nviArray[0]), size: parseInt(nviArray[1])};

                    return dataset.hicReader.readNormVectorIndex(dataset, range)
                        .then(function (nvi) {
                            self.eventBus.post(hic.Event("NormVectorIndexLoad", dataset));
                            return nvi;
                        })
                } else {

                    // Load norm vector index in the background
                    dataset.hicReader.readNormExpectedValuesAndNormVectorIndex(dataset)
                        .then(function (ignore) {
                            return self.eventBus.post(hic.Event("NormVectorIndexLoad", dataset));
                        })
                        .catch(function (error) {
                            igv.presentAlert("Error loading normalization vectors");
                            console.log(error);
                        });

                    return Promise.resolve(undefined);   // NVI not loaded yeat
                }

            }
        }

        /**
         * Return a promise to extract the name of the dataset.  The promise is neccessacary because
         * google drive urls require a call to the API
         *
         * @returns Promise for the name
         */
        function extractName(config) {

            if (config.name === undefined && typeof config.url === "string" && config.url.includes("drive.google.com")) {
                tmp = hic.extractQuery(config.url);
                id = tmp["id"];
                endPoint = "https://www.googleapis.com/drive/v2/files/" + id;
                if (apiKey) endPoint += "?key=" + apiKey;

                return igv.Google.getDriveFileInfo(config.url)
                    .then(function (json) {
                        config.name = json.originalFilename;
                        return config.name;
                    })
            } else {
                if (config.name === undefined) {
                    config.name = hic.extractFilename(config.url);
                }
                return Promise.resolve(config.name);
            }
        }


        stripUriParameters = function () {

            var href = window.location.href,
                idx = href.indexOf("?");

            if (idx > 0) window.history.replaceState("", "juicebox", href.substr(0, idx));

        };

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
            if (yLocus === undefined) yLocus = xLocus;
        }

        if (xLocus === undefined) {
            // Try a gene name search.
            hic.geneSearch(this.genome.id, loci[0].trim())

                .then(function (result) {
                    if (result) {
                        igv.FeatureTrack.selectedGene = loci[0].trim();
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
                self.goto(xLocus.chr, xLocus.start, xLocus.end, yLocus.chr, yLocus.start, yLocus.end);
            }
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
            return chr.name.toLowerCase();
        });

        chrName = this.genome.getChromosomeName(_.first(parts).toLowerCase());

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
                numeric = extent[0].replace(/\,/g, '');
                locusObject.start = isNaN(numeric) ? undefined : parseInt(numeric, 10) - 1;

                numeric = extent[1].replace(/\,/g, '');
                locusObject.end = isNaN(numeric) ? undefined : parseInt(numeric, 10);
            }
        }
        return locusObject;
    };


    /**
     * @param scaleFactor Values range from greater then 1 to decimal values less then one
     *                    Value > 1 are magnification (zoom in)
     *                    Decimal values (.9, .75, .25, etc.) are minification (zoom out)
     * @param anchorPx -- anchor position in pixels (should not move after transformation)
     * @param anchorPy
     */
    hic.Browser.prototype.pinchZoom = function (anchorPx, anchorPy, scaleFactor) {

        var self = this,
            bpResolutions = this.dataset.bpResolutions,
            currentResolution,
            targetResolution,
            newResolution,
            newZoom,
            newPixelSize,
            zoomChanged, gx, gy;

        currentResolution = bpResolutions[this.state.zoom];

        if (this.resolutionLocked ||
            (this.state.zoom === bpResolutions.length - 1 && scaleFactor > 1) ||
            (this.state.zoom === 0 && scaleFactor < 1)) {
            // Can't change resolution level, must adjust pixel size
            newResolution = currentResolution;
            newPixelSize = Math.min(MAX_PIXEL_SIZE, this.state.pixelSize * scaleFactor);
            newZoom = this.state.zoom;
            zoomChanged = false;
        }
        else {
            targetResolution = (currentResolution / this.state.pixelSize) / scaleFactor;
            newZoom = this.findMatchingZoomIndex(targetResolution, bpResolutions);
            newResolution = bpResolutions[newZoom];
            zoomChanged = newZoom !== this.state.zoom;
            newPixelSize = Math.min(MAX_PIXEL_SIZE, newResolution / targetResolution);
        }

        minPixelSize.call(this, this.state.chr1, this.state.chr2, newZoom)

            .then(function (minPS) {

                var state = self.state;

                newPixelSize = Math.max(newPixelSize, minPS);

                // Genomic anchor  -- this position should remain at anchorPx, anchorPy after state change
                gx = (state.x + anchorPx / state.pixelSize) * currentResolution;
                gy = (state.y + anchorPy / state.pixelSize) * currentResolution;

                state.x = gx / newResolution - anchorPx / newPixelSize;
                state.y = gy / newResolution - anchorPy / newPixelSize;

                state.zoom = newZoom;
                state.pixelSize = newPixelSize;

                self.clamp();
                self.eventBus.post(hic.Event("LocusChange", {state: state, resolutionChanged: zoomChanged}));
            });

    };

// Zoom in response to a double-click
    hic.Browser.prototype.zoomAndCenter = function (direction, centerPX, centerPY) {

        if (!this.dataset) return;

        if (this.state.chr === 0) {

        }

        else {
            var self = this,
                bpResolutions = this.dataset.bpResolutions,
                viewDimensions = this.contactMatrixView.getViewDimensions(),
                dx = centerPX === undefined ? 0 : centerPX - viewDimensions.width / 2,
                dy = centerPY === undefined ? 0 : centerPY - viewDimensions.height / 2,
                newPixelSize, shiftRatio;


            this.state.x += (dx / this.state.pixelSize);
            this.state.y += (dy / this.state.pixelSize);

            if (this.resolutionLocked ||
                (direction > 0 && this.state.zoom === bpResolutions.length - 1) ||
                (direction < 0 && this.state.zoom === 0)) {

                minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom)

                    .then(function (minPS) {

                        var state = self.state;

                        newPixelSize = Math.max(Math.min(MAX_PIXEL_SIZE, state.pixelSize * (direction > 0 ? 2 : 0.5)),
                            minPS);

                        shiftRatio = (newPixelSize - state.pixelSize) / newPixelSize;
                        state.pixelSize = newPixelSize;
                        state.x += shiftRatio * (viewDimensions.width / state.pixelSize);
                        state.y += shiftRatio * (viewDimensions.height / state.pixelSize);

                        self.clamp();
                        self.eventBus.post(hic.Event("LocusChange", {state: state, resolutionChanged: false}));
                    });
            } else {
                this.setZoom(this.state.zoom + direction);
            }
        }
    };

    hic.Browser.prototype.setZoom = function (zoom) {

        var bpResolutions, currentResolution, viewDimensions, xCenter, yCenter, newResolution, newXCenter, newYCenter,
            newPixelSize, zoomChanged,
            self = this;
        ;

        // Shift x,y to maintain center, if possible
        bpResolutions = this.dataset.bpResolutions;
        currentResolution = bpResolutions[this.state.zoom];
        viewDimensions = this.contactMatrixView.getViewDimensions();
        xCenter = this.state.x + viewDimensions.width / (2 * this.state.pixelSize);    // center in bins
        yCenter = this.state.y + viewDimensions.height / (2 * this.state.pixelSize);    // center in bins
        newResolution = bpResolutions[zoom];
        newXCenter = xCenter * (currentResolution / newResolution);
        newYCenter = yCenter * (currentResolution / newResolution);

        minPixelSize.call(this, this.state.chr1, this.state.chr2, zoom)

            .then(function (minPS) {

                var state = self.state;
                newPixelSize = Math.max(defaultPixelSize, minPS);
                zoomChanged = (state.zoom !== zoom);

                state.zoom = zoom;
                state.x = Math.max(0, newXCenter - viewDimensions.width / (2 * newPixelSize));
                state.y = Math.max(0, newYCenter - viewDimensions.height / (2 * newPixelSize));
                state.pixelSize = newPixelSize;
                self.clamp();

                self.eventBus.post(hic.Event("LocusChange", {state: state, resolutionChanged: zoomChanged}));
            });
    };

    hic.Browser.prototype.setChromosomes = function (chr1, chr2) {

        var self = this;

        this.state.chr1 = Math.min(chr1, chr2);
        this.state.chr2 = Math.max(chr1, chr2);
        this.state.zoom = 0;
        this.state.x = 0;
        this.state.y = 0;

        minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom)
            .then(function (minPS) {
                self.state.pixelSize = Math.min(100, Math.max(defaultPixelSize, minPS));
                self.eventBus.post(hic.Event("LocusChange", {state: self.state, resolutionChanged: true}));
            });

    };

    hic.Browser.prototype.updateLayout = function () {

        var self = this;
        this.clamp();

        this.trackRenderers.forEach(function (xyTrackRenderPair, index) {
            sync(xyTrackRenderPair.x, index);
            sync(xyTrackRenderPair.y, index);
        });

        function sync(trackRenderer, index) {
            trackRenderer.$viewport.css({order: index});
            trackRenderer.syncCanvas();
        }

        this.layoutController.xAxisRuler.update();
        this.layoutController.yAxisRuler.update();

        this.update();

    };

    function minPixelSize(chr1, chr2, z) {

        var self = this;

        var viewDimensions, chr1Length, chr2Length, binSize, nBins1, nBins2, isWholeGenome;

        viewDimensions = self.contactMatrixView.getViewDimensions();
        chr1Length = self.dataset.chromosomes[chr1].size;
        chr2Length = self.dataset.chromosomes[chr2].size;

        return self.dataset.getMatrix(chr1, chr2)

            .then(function (matrix) {
                var zd = matrix.getZoomDataByIndex(z, "BP");
                binSize = zd.zoom.binSize;
                nBins1 = chr1Length / binSize;
                nBins2 = chr2Length / binSize;
                return (Math.min(viewDimensions.width / nBins1, viewDimensions.height / nBins2));
            })


    }

    /**
     * Set the matrix state.  Used to restore state from a bookmark
     * @param state  browser state
     */
    hic.Browser.prototype.setState = function (state) {

        var self = this,
            zoomChanged = (this.state.zoom !== state.zoom);
        this.state = state;

        // Possibly adjust pixel size
        minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom)
            .then(function (minPS) {
                self.state.pixelSize = Math.max(state.pixelSize, minPS);
                self.eventBus.post(new hic.Event("LocusChange", {state: self.state, resolutionChanged: true}));
            });
    };


    /**
     * Return a modified state object used for synching.  Other datasets might have different chromosome ordering
     * and resolution arrays
     */
    hic.Browser.prototype.getSyncState = function () {
        return {
            chr1Name: this.dataset.chromosomes[this.state.chr1].name,
            chr2Name: this.dataset.chromosomes[this.state.chr2].name,
            binSize: this.dataset.bpResolutions[this.state.zoom],
            binX: this.state.x,            // TODO -- tranlsate to lower right corner
            binY: this.state.y,
            pixelSize: this.state.pixelSize
        };
    }

    /**
     * Return true if this browser can be synched to the given state
     * @param syncState
     */
    hic.Browser.prototype.canBeSynched = function (syncState) {

       return this.dataset &&
           (this.dataset.getChrIndexFromName(syncState.chr1Name) !== undefined) &&
           (this.dataset.getChrIndexFromName(syncState.chr2Name) !== undefined);

    }

        /**
     * Used to synch state with other browsers
     * @param state  browser state
     */
    hic.Browser.prototype.syncState = function (syncState) {

        if (!this.dataset) return;

        var chr1 = this.dataset.getChrIndexFromName(syncState.chr1Name),
            chr2 = this.dataset.getChrIndexFromName(syncState.chr2Name),
            zoom = this.dataset.getZoomIndexForBinSize(syncState.binSize, "BP"),
            x = syncState.binX,
            y = syncState.binY,
            pixelSize = syncState.pixelSize;

        if(!(chr1 && chr2)) {
            return;   // Can't be synched.
        }

        if (zoom === undefined) {
            // Get the closest zoom available and adjust pixel size.   TODO -- cache this somehow
            zoom = this.findMatchingZoomIndex(syncState.binSize, this.dataset.bpResolutions);

            // Compute equivalent in basepairs / pixel
            pixelSize = (syncState.pixelSize / syncState.binSize) * this.dataset.bpResolutions[zoom];

            // Translate bins so that origin is unchanged in basepairs
            x = (syncState.binX / syncState.pixelSize) * pixelSize;
            y = (syncState.binY / syncState.pixelSize) * pixelSize;

            if (pixelSize > MAX_PIXEL_SIZE) {
                console.log("Cannot synch map " + this.dataset.name + " (resolution " + syncState.binSize + " not available)");
                return;
            }
        }


        var zoomChanged = (this.state.zoom !== zoom);
        this.state.chr1 = chr1;
        this.state.chr2 = chr2;
        this.state.zoom = zoom;
        this.state.x = x;
        this.state.y = y;
        this.state.pixelSize = pixelSize;

        this.eventBus.post(hic.Event("LocusChange", {state: this.state, resolutionChanged: zoomChanged}, false));

    };

    hic.Browser.prototype.setNormalization = function (normalization) {

        this.state.normalization = normalization;
        this.eventBus.post(hic.Event("NormalizationChange", this.state.normalization))

    };


    hic.Browser.prototype.shiftPixels = function (dx, dy) {

        var self = this;

        if (!this.dataset) return;
        if (self.updating) return;

        this.state.x += (dx / this.state.pixelSize);
        this.state.y += (dy / this.state.pixelSize);
        this.clamp();

        var locusChangeEvent = hic.Event("LocusChange", {state: this.state, resolutionChanged: false, dragging: true});
        locusChangeEvent.dragging = true;
        this.eventBus.post(locusChangeEvent);


    };


    hic.Browser.prototype.goto = function (chr1, bpX, bpXMax, chr2, bpY, bpYMax, minResolution) {


        var xCenter,
            yCenter,
            targetResolution,
            newResolution,
            viewDimensions = this.contactMatrixView.getViewDimensions(),
            bpResolutions = this.dataset.bpResolutions,
            viewWidth = viewDimensions.width,
            maxExtent, newZoom, newPixelSize, newXBin, newYBin,
            zoomChanged;

        targetResolution = Math.max((bpXMax - bpX) / viewDimensions.width, (bpYMax - bpY) / viewDimensions.height);

        if (targetResolution < minResolution) {
            maxExtent = viewWidth * minResolution;
            xCenter = (bpX + bpXMax) / 2;
            yCenter = (bpY + bpYMax) / 2;
            bpX = Math.max(xCenter - maxExtent / 2);
            bpY = Math.max(0, yCenter - maxExtent / 2);
            targetResolution = minResolution;
        }


        if (true === this.resolutionLocked && minResolution === undefined) {
            zoomChanged = false;
            newZoom = this.state.zoom;
        } else {
            newZoom = this.findMatchingZoomIndex(targetResolution, bpResolutions);
            zoomChanged = (newZoom !== this.state.zoom);
        }

        newResolution = bpResolutions[newZoom];
        newPixelSize = Math.min(MAX_PIXEL_SIZE, Math.max(1, newResolution / targetResolution));
        newXBin = bpX / newResolution;
        newYBin = bpY / newResolution;

        this.state.chr1 = chr1;
        this.state.chr2 = chr2;
        this.state.zoom = newZoom;
        this.state.x = newXBin;
        this.state.y = newYBin;
        this.state.pixelSize = newPixelSize;

        this.contactMatrixView.clearCaches();
        this.eventBus.post(hic.Event("LocusChange", {state: this.state, resolutionChanged: zoomChanged}));

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

        if ("LocusChange" === event.type) {
            this.update(event);
        }

    };

    /**
     * Update the maps and tracks.
     *
     * Data load functions for tracks and the map are not neccessarily thread safe.   Although JS is single-threaded,
     * the ascyncronous nature of XmLHttpRequests makes it possible to call these functions multiple times
     * simultaneously.   To prevent this we check for an update in progress before proceeding.   If and update
     * is in progress the call to self is deferred with a timeout until the currently executing update completes.
     *
     * This might involve asynchronous data loads,  insure that all data loads are complete
     * before painting track.
     *
     * @param event
     */
    hic.Browser.prototype.update = function (event) {

        var self = this;

        // Allow only 1 update at a time, if an update is in progress queue up until its finished
        if (self.updating) {
            if (self.updateTimer) {
                clearTimeout(self.updateTimer);
            }
            self.updateTimer = setTimeout(function () {
                    self.update(event);
                    self.updateTimer = null;
                },
                100)
            return;
        }

        self.updating = true;
        self.contactMatrixView.startSpinner();
        var promises = [];

        promises.push(this.contactMatrixView.readyToPaint());
        this.trackRenderers.forEach(function (xyTrackRenderPair, index) {
            promises.push(
                xyTrackRenderPair.x.readyToPaint()
                    .then(function (ignore) {
                        return xyTrackRenderPair.y.readyToPaint();
                    }))
        });


        Promise.all(promises)
            .then(function (results) {
                if (event !== undefined && "LocusChange" === event.type) {
                    self.layoutController.xAxisRuler.locusChange(event);
                    self.layoutController.yAxisRuler.locusChange(event);
                }
                self.contactMatrixView.repaint();
                self.renderTracks();
                self.stopSpinner();
                self.updating = false;
            })
            .catch(function (error) {
                self.stopSpinner();
                self.updating = false;
                console.error(error);
            })

    };


    hic.Browser.prototype.resolution = function () {
        return this.dataset.bpResolutions[this.state.zoom];
    };


// Set default values for config properties
    function setDefaults(config) {

        defaultPixelSize = 1;
        defaultState = new hic.State(1, 1, 0, 0, 0, defaultPixelSize, "NONE");

        if (config.figureMode === true) {
            config.showLocusGoto = false;
            config.showHicContactMapLabel = false;
            config.showChromosomeSelector = false;
        }
        else {
            if (undefined === config.width) {
                config.width = defaultSize.width;
            }
            if (undefined === config.height) {
                config.height = defaultSize.height;
            }
            if (undefined === config.showLocusGoto) {
                config.showLocusGoto = true;
            }
            if (undefined === config.showHicContactMapLabel) {
                config.showHicContactMapLabel = true;
            }
            if (undefined === config.showChromosomeSelector) {
                config.showChromosomeSelector = true
            }
        }

        if (config.state) {
            // convert to state object
            config.state = new hic.State(config.state.chr1, config.state.chr2, config.state.zoom, config.state.x,
                config.state.y, config.state.pixelSize, config.state.normalization)
        }
    }

    function getNviString(dataset, state) {

        if (dataset.hicReader.normalizationVectorIndexRange) {
            var range = dataset.hicReader.normalizationVectorIndexRange,
                nviString = String(range.start) + "," + String(range.size);
            return nviString
        }
        else {
            return undefined;
        }
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
    }

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


    function replaceAll(str, target, replacement) {
        return str.split(target).join(replacement);
    }


    var urlShortcuts = {
        "*s3e/": "https://hicfiles.s3.amazonaws.com/external/",
        "*s3/": "https://hicfiles.s3.amazonaws.com/",
        "*s3e_/": "http://hicfiles.s3.amazonaws.com/external/",
        "*s3_/": "http://hicfiles.s3.amazonaws.com/",
        "*enc/": "https://www.encodeproject.org/files/"
    }


    hic.Browser.prototype.getQueryString = function () {

        var queryString, nviString, trackString;

        if (!this.url) return "";   // URL is required

        queryString = [];

        queryString.push(paramString("hicUrl", this.url));

        if (this.name) {
            queryString.push(paramString("name", this.name));
        }

        queryString.push(paramString("state", this.state.stringify()));

        queryString.push(paramString("colorScale", this.contactMatrixView.colorScale.stringify()));

        if (igv.FeatureTrack.selectedGene) {
            queryString.push(paramString("selectedGene", igv.FeatureTrack.selectedGene));
        }

        nviString = getNviString(this.dataset, this.state);
        if (nviString) {
            queryString.push(paramString("nvi", nviString));
        }

        if (this.trackRenderers.length > 0 || this.tracks2D.length > 0) {
            trackString = "";

            this.trackRenderers.forEach(function (trackRenderer) {
                var track = trackRenderer.x.track,
                    config = track.config,
                    url = config.url,
                    dataRange = track.dataRange;

                if (typeof url === "string") {
                    if (trackString.length > 0) trackString += "|||";
                    trackString += url;
                    trackString += "|" + (track.name ? replaceAll(track.name, "|", "$") : '');
                    trackString += "|" + (dataRange ? (dataRange.min + "-" + dataRange.max) : "");
                    trackString += "|" + track.color;
                }
            });

            this.tracks2D.forEach(function (track) {

                var config = track.config,
                    url = config.url;

                if (typeof url === "string") {
                    if (trackString.length > 0) trackString += "|||";
                    trackString += url;
                    trackString += "|" + (track.name ? replaceAll(track.name, "|", "$") : '');
                    trackString += "|";   // Data range
                    trackString += "|" + track.color;
                }
            });

            if (trackString.length > 0) {
                queryString.push(paramString("tracks", trackString));
            }
        }

        if (this.normVectorFiles.length > 0) {

            var normVectorString = "";
            this.normVectorFiles.forEach(function (url) {

                if (normVectorString.length > 0) normVectorString += "|||";
                normVectorString += url;

            });

            queryString.push(paramString("normVectorFiles", normVectorString));

        }

        return queryString.join("&");

        function paramString(key, value) {
            return key + "=" + paramEncode(value)
        }

    };

    /**
     * Extend config properties with query parameters
     *
     * @param query
     * @param config
     */
    function decodeQuery(query, config, uriDecode) {

        var hicUrl, name, stateString, colorScale, trackString, selectedGene, nvi, normVectorString, defaultColorScaleInitializer;

        defaultColorScaleInitializer =
        {
            low: 0,
            lowR: 255,
            lowG: 255,
            lowB: 255,
            high: 2000,
            highR: 255,
            highG: 0,
            highB: 0
        };

        hicUrl = query["hicUrl"];
        name = query["name"];
        stateString = query["state"];
        colorScale = query["colorScale"];
        trackString = query["tracks"];
        selectedGene = query["selectedGene"];
        nvi = query["nvi"];
        normVectorString = query["normVectorFiles"];

        if (hicUrl) {

            hicUrl = paramDecodeV0(hicUrl, uriDecode);

            Object.keys(urlShortcuts).forEach(function (key) {
                var value = urlShortcuts[key];
                if (hicUrl.startsWith(key)) hicUrl = hicUrl.replace(key, value);
            });

            config.url = hicUrl;

        }
        if (name) {
            config.name = paramDecodeV0(name, uriDecode);
        }
        if (stateString) {
            stateString = paramDecodeV0(stateString, uriDecode);
            config.state = destringifyStateV0(stateString);

        }
        if (colorScale) {
            colorScale = paramDecodeV0(colorScale, uriDecode);
            config.colorScale = destringifyColorScaleV0(colorScale);
        }

        if (trackString) {
            trackString = paramDecodeV0(trackString, uriDecode);
            config.tracks = destringifyTracksV0(trackString);

            // If an oAuth token is provided append it to track configs.
            if (config.tracks && config.oauthToken) {
                config.tracks.forEach(function (t) {
                    t.oauthToken = config.oauthToken;
                })
            }
        }

        if (selectedGene) {
            igv.FeatureTrack.selectedGene = selectedGene;
        }

        if (normVectorString) {
            config.normVectorFiles = normVectorString.split("|||");
        }

        if (nvi) {
            config.nvi = nvi;
        }

        function destringifyStateV0(string) {
            var tokens = string.split(",");
            return new hic.State(
                parseInt(tokens[0]),    // chr1
                parseInt(tokens[1]),    // chr2
                parseFloat(tokens[2]), // zoom
                parseFloat(tokens[3]), // x
                parseFloat(tokens[4]), // y
                parseFloat(tokens[5]), // pixelSize
                tokens.length > 6 ? tokens[6] : "NONE"   // normalization
            )
        }

        function destringifyTracksV0(tracks) {

            var trackStringList = tracks.split("|||"),
                configList = [], keys, key, i, len;

            _.each(trackStringList, function (trackString) {
                var tokens,
                    url,
                    config,
                    name,
                    dataRangeString,
                    color,
                    r;

                tokens = trackString.split("|");
                color = tokens.pop();

                url = tokens[0];

                if (url && url.trim().length > 0) {

                    keys = Object.keys(urlShortcuts);
                    for (i = 0, len = keys.length; i < len; i++) {
                        key = keys[i];
                        var value = urlShortcuts[key];
                        if (url.startsWith(key)) {
                            url = url.replace(key, value);
                            break;
                        }
                    }
                    config = {url: url};

                    if (tokens.length > 1) {
                        name = tokens[1];
                    }

                    if (tokens.length > 2) {
                        dataRangeString = tokens[2];
                    }

                    if (name) {
                        config.name = replaceAll(name, "$", "|");
                    }

                    if (dataRangeString) {
                        r = dataRangeString.split("-");
                        config.min = parseFloat(r[0]);
                        config.max = parseFloat(r[1])
                    }

                    if (color) {
                        config.color = color;
                    }

                    configList.push(config);
                }

            });

            return configList;

        }

        function destringifyColorScaleV0(string) {

            var cs,
                tokens;

            tokens = string.split(",");

            cs = _.clone(defaultColorScaleInitializer);
            cs.high = tokens[0];
            cs.highR = tokens[1];
            cs.highG = tokens[2];
            cs.highB = tokens[3];

            return new hic.ColorScale(cs);
        };

    }

    /**
     * Minimally encode a parameter string (i.e. value in a query string).  In general its not neccessary
     * to fully % encode parameter values (see RFC3986).
     *
     * @param str
     */
    function paramEncode(str) {
        var s = replaceAll(str, '&', '%26');
        s = replaceAll(s, ' ', '+');
        s = replaceAll(s, "#", "%23");
        s = replaceAll(s, "?", "%3F");
        s = replaceAll(s, "=", "%3D");
        return s;
    }

    function paramDecodeV0(str, uriDecode) {

        if (uriDecode) {
            return decodeURIComponent(str);   // Still more backward compatibility
        }
        else {
            var s = replaceAll(str, '%26', '&');
            s = replaceAll(s, '%20', ' ');
            s = replaceAll(s, '+', ' ');
            s = replaceAll(s, "%7C", "|");
            s = replaceAll(s, "%23", "#");
            s = replaceAll(s, "%3F", "?");
            s = replaceAll(s, "%3D", "=");
            return s;
        }
    }

    return hic;

})
(hic || {});
