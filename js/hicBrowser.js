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

    const defaultPixelSize = 1
    const MAX_PIXEL_SIZE = 12;
    const DEFAULT_ANNOTATION_COLOR = "rgb(22, 129, 198)";
    const defaultSize =
        {
            width: 640,
            height: 640
        };
    let defaultState;

    hic.allBrowsers = [];


    // Callback used to  sync browsers
    hic.createBrowser = async function (hic_container, config, callback) {

        var browser,
            queryString,
            query,
            isFigureMode,
            initialImageImg,
            initialImageX,
            initialImageY,
            uriDecode,
            apiKey,
            $hic_container;

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
            igv.Browser.decodeQuery(query, config, uriDecode);
        }

        browser = new hic.Browser($hic_container, config);

        if (config.displayMode) {
            browser.contactMatrixView.displayMode = config.displayMode;
            browser.eventBus.post({type: "DisplayMode", data: config.displayMode});
        }


        hic.allBrowsers.push(browser);

        hic.Browser.setCurrentBrowser(browser);

        isFigureMode = (config.figureMode && true === config.figureMode);
        if (!isFigureMode && hic.allBrowsers.length > 1) {
            hic.allBrowsers.forEach(function (b) {
                b.$browser_panel_delete_button.show();
            });
        }

        browser.trackMenuReplacement = new hic.TrackMenuReplacement(browser);

        if (undefined === igv.browser) {
            createIGV($hic_container, browser, browser.trackMenuReplacement);
        }

        await loadControlFile(config)
        await setInitialDataset(browser, config)
        await browser.loadHicFile(config)

        if (config.colorScale) {
            // This must be done after dataset load
            browser.contactMatrixView.setColorScale(config.colorScale);
            browser.eventBus.post({type: "ColorScale", data: browser.contactMatrixView.getColorScale()});
        }

        var promises = [];
        if (config.tracks) {
            promises.push(browser.loadTracks(config.tracks))
        }

        if (config.normVectorFiles) {
            config.normVectorFiles.forEach(function (nv) {
                promises.push(browser.loadNormalizationFile(nv));
            })
        }
        await Promise.all(promises);

        if (config.cycle) {
            browser.controlMapWidget.toggleDisplayModeCycle();
        }

        if (typeof callback === "function") callback();

        return browser;


        // Explicit set dataset, do not need to load.  Used by "interactive figures"
        function setInitialDataset(browser, config) {

            if (config.dataset) {
                config.dataset.name = config.name;
                browser.$contactMaplabel.text(config.name);
                browser.$contactMaplabel.attr('title', config.name);
                browser.dataset = config.dataset;
                browser.genome = new hic.Genome(browser.dataset.genomeId, browser.dataset.chromosomes);
                igv.browser.genome = browser.genome;
                browser.eventBus.post(hic.Event("GenomeChange", browser.genome.id));
                browser.eventBus.post(hic.Event("MapLoad", browser.dataset));
                return Promise.resolve(config.dataset);
            } else {
                return Promise.resolve(undefined);
            }
        }

        // Load the control file, if any
        function loadControlFile(config) {
            if (config.controlUrl) {
                return browser.loadHicControlFile({
                    url: config.controlUrl,
                    name: config.controlName,
                    nvi: config.controlNvi,
                    isControl: true
                });
            } else {
                return Promise.resolve(undefined);
            }
        }
    };

    hic.deleteBrowserPanel = function (browser) {

        if (browser === hic.Browser.getCurrentBrowser()) {
            hic.Browser.setCurrentBrowser(undefined);
        }

        hic.allBrowsers.splice(_.indexOf(hic.allBrowsers, browser), 1);
        browser.$root.remove();
        browser = undefined;

        if (1 === hic.allBrowsers.length) {
            hic.Browser.setCurrentBrowser(hic.allBrowsers[0]);
            hic.Browser.getCurrentBrowser().$browser_panel_delete_button.hide();
        }

    };


    /**
     * Load a dataset outside the context of a browser.  Purpose is to "pre load" a shared dataset when
     * instantiating multiple browsers in a page.
     *
     * @param config
     */
    hic.loadDataset = async function (config) {


        const name = await extractName(config)
        config.name = name;
        var hicReader;
        hicReader = new hic.HiCReader(config);

        const straw = new HicStraw(config)
        const dataset = await loadDataset(config)
        dataset.name = name

        dataset.name = this.name;

        if (config.nvi) {
            var nviArray = decodeURIComponent(config.nvi).split(","),
                range = {start: parseInt(nviArray[0]), size: parseInt(nviArray[1])};

            await hicReader.readNormVectorIndex(dataset, range)
            return dataset;
        } else {
            return dataset;
        }


    };

    hic.syncBrowsers = function (browsers) {

        var browsersWithMaps, genome, incompatibleDatasets, gid;

        browsersWithMaps = browsers.filter(function (b) {
            return b.dataset !== undefined;
        })

        if (browsersWithMaps.length < 2) {
            // Nothing to sync
            return;
        }

        // Canonical browser is the first one, arbitrarily
        genome = canonicalGenomeId(browsers[0].dataset.genomeId);

        // Sync compatible maps only

        incompatibleDatasets = [];
        browsersWithMaps.forEach(function (b1) {

            gid = canonicalGenomeId(b1.dataset.genomeId);

            if (areCompatible(browsers[0].dataset, b1.dataset)) {
                browsers.forEach(function (b2) {
                    if (b1 !== b2 && !b1.synchedBrowsers.includes(b2)) {
                        b1.synchedBrowsers.push(b2);
                    }

                })
            } else {
                incompatibleDatasets.push(b1.dataset.genomeId);
            }
        });

        if (incompatibleDatasets.length > 0) {
            igv.presentAlert("Not all maps could be synchronized.  Incompatible assemblies: " + browsers[0].dataset.genomeId + " vs " + incompatibleDatasets.join());
        }


        function canonicalGenomeId(genomeId) {

            switch (genomeId) {
                case "GRCh38":
                    return "hg38";
                case "GRCh37":
                    return "hg19";
                case "GRCm38" :
                    return "mm10";
                default:
                    return genomeId;
            }
        }

    };

    hic.Browser = function ($app_container, config) {

        this.config = config;
        this.figureMode = config.figureMode || config.miniMode;    // Mini mode for backward compatibility
        this.resolutionLocked = false;
        this.eventBus = new hic.EventBus();

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

        this.layoutController = new hic.LayoutController(this, this.$root);  // <- contactMatixView created here, nasty side-effect!

        // prevent user interaction during lengthy data loads
        this.$user_interaction_shield = $('<div>', {class: 'hic-root-prevent-interaction'});
        this.$root.append(this.$user_interaction_shield);
        this.$user_interaction_shield.hide();

        this.hideCrosshairs();

        this.state = config.state ? config.state : defaultState.clone();

        this.eventBus.subscribe("LocusChange", this);

    };


    hic.Browser.getCurrentBrowser = function () {

        if (hic.allBrowsers.length === 1) {
            return hic.allBrowsers[0];
        } else {
            return hic.Browser.currentBrowser;
        }

    };

    hic.Browser.setCurrentBrowser = function (browser) {

        // unselect current browser
        if (undefined === browser) {

            if (hic.Browser.currentBrowser) {
                hic.Browser.currentBrowser.$root.removeClass('hic-root-selected');
            }

            hic.Browser.currentBrowser = browser;
            return;
        }


        if (browser !== hic.Browser.currentBrowser) {

            if (hic.Browser.currentBrowser) {
                hic.Browser.currentBrowser.$root.removeClass('hic-root-selected');
            }

            browser.$root.addClass('hic-root-selected');
            hic.Browser.currentBrowser = browser;

            hic.eventBus.post(hic.Event("BrowserSelect", browser));
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
        this.contactMatrixView.startSpinner();
    };

    hic.Browser.prototype.stopSpinner = function () {
        this.contactMatrixView.stopSpinner();
    };

    hic.Browser.prototype.setDisplayMode = function (mode) {
        this.contactMatrixView.setDisplayMode(mode);
        this.eventBus.post(hic.Event("DisplayMode", mode));
    };

    hic.Browser.prototype.getDisplayMode = function () {
        return this.contactMatrixView ? this.contactMatrixView.displayMode : undefined;
    };

    hic.Browser.prototype.toggleDisplayMode = function () {
        this.controlMapWidget.toggleDisplayMode();
    };

    hic.Browser.prototype.getColorScale = function () {

        if (!this.contactMatrixView) return undefined;

        switch (this.getDisplayMode()) {
            case 'AOB':
            case 'BOA':
                return this.contactMatrixView.ratioColorScale;
            case 'AMB':
                return this.contactMatrixView.diffColorScale;
            default:
                return this.contactMatrixView.colorScale;
        }
    };

    hic.Browser.prototype.setColorScaleThreshold = function (threshold) {
        this.contactMatrixView.setColorScaleThreshold(threshold);
    };

    hic.Browser.prototype.updateCrosshairs = function (coords) {
        var xGuide,
            yGuide;

        xGuide = coords.y < 0 ? {left: 0} : {top: coords.y, left: 0};
        this.contactMatrixView.$x_guide.css(xGuide);
        this.layoutController.$x_track_guide.css(xGuide);

        yGuide = coords.x < 0 ? {top: 0} : {top: 0, left: coords.x};
        this.contactMatrixView.$y_guide.css(yGuide);
        this.layoutController.$y_track_guide.css(yGuide);


    };

    hic.Browser.prototype.hideCrosshairs = function () {

        this.contactMatrixView.$x_guide.hide();
        this.layoutController.$x_track_guide.hide();

        this.contactMatrixView.$y_guide.hide();
        this.layoutController.$y_track_guide.hide();

    };

    hic.Browser.prototype.showCrosshairs = function () {

        this.contactMatrixView.$x_guide.show();
        this.layoutController.$x_track_guide.show();

        this.contactMatrixView.$y_guide.show();
        this.layoutController.$y_track_guide.show();
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
        } else {
            gs.chromosome = this.dataset.chromosomes[this.state.chr2];
            gs.startBP = this.state.y * bpResolution;
            gs.endBP = gs.startBP + gs.bpp * this.contactMatrixView.getViewDimensions().height;
        }
        return gs;
    };


    /**
     * Load a list of 1D genome tracks (wig, etc).
     *
     * NOTE: public API function
     *
     * @param configs
     */
    hic.Browser.prototype.loadTracks = async function (configs) {

        var self = this, errorPrefix;

        // If loading a single track remember its name, for error message
        errorPrefix = 1 === configs.length ? ("Error loading track " + configs[0].name) : "Error loading tracks";

        this.contactMatrixView.startSpinner();

        try {
            const ps = inferTypes(configs)
            const trackConfigurations = await Promise.all(ps)

            var trackXYPairs, promises2D;

            trackXYPairs = [];
            promises2D = [];
            const promisesNV = []

            for (let config of trackConfigurations) {
                if (config) {
                    var isLocal = config.url instanceof File,
                        fn = isLocal ? config.url.name : config.url;
                    if ("annotation" === config.type && config.color === undefined) {
                        config.color = DEFAULT_ANNOTATION_COLOR;
                    }
                    config.height = this.layoutController.track_height;

                    if (fn.endsWith(".juicerformat") || fn.endsWith("nv") || fn.endsWith(".juicerformat.gz") || fn.endsWith("nv.gz")) {
                        promisesNV.push(this.loadNormalizationFile(config.url))
                    }

                    if (config.type === undefined) {
                        // Assume this is a 2D track
                        promises2D.push(hic.loadTrack2D(config));
                    } else {
                        var track = igv.createTrack(config, this);
                        trackXYPairs.push({x: track, y: track});
                    }
                }
            }

            if (trackXYPairs.length > 0) {
                this.layoutController.tracksLoaded(trackXYPairs);
                this.updateLayout();
            }

            const tracks2D = await Promise.all(promises2D)
            if (tracks2D && tracks2D.length > 0) {
                this.tracks2D = self.tracks2D.concat(tracks2D);
                this.eventBus.post(hic.Event("TrackLoad2D", this.tracks2D));
            }

            const normVectors = await Promise.all(promisesNV)

            this.contactMatrixView.stopSpinner();

        } catch (error) {
            hic.presentError(errorPrefix, error);
            console.error(error)
            this.contactMatrixView.stopSpinner();
        }

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
                } else {
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


    hic.Browser.prototype.loadNormalizationFile = function (url) {

        var self = this;

        if (!this.dataset) return;

        self.eventBus.post(hic.Event("NormalizationFileLoad", "start"));

        return this.dataset.hicFile.readNormalizationVectorFile(url, this.dataset.chromosomes)

            .then(function (normVectors) {

                Object.assign(self.dataset.normVectorCache, normVectors);

                normVectors["types"].forEach(function (type) {

                    if (!self.dataset.normalizationTypes) {
                        self.dataset.normalizationTypes = [];
                    }
                    if (_.contains(self.dataset.normalizationTypes, type) === false) {
                        self.dataset.normalizationTypes.push(type);
                    }

                    self.eventBus.post(hic.Event("NormVectorIndexLoad", self.dataset));
                });

                return normVectors;
            })

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


    hic.Browser.prototype.reset = function () {
        var self = this;
        self.dataset = undefined;
        self.controlDataset = undefined;
        self.layoutController.removeAllTrackXYPairs();
        self.contactMatrixView.clearCaches();
        self.tracks2D = [];
        self.tracks = [];

        self.$contactMaplabel.text("");
        self.$contactMaplabel.attr('title', "");
        self.$controlMaplabel.text("");
        self.$controlMaplabel.attr('title', "");
    }


    hic.Browser.prototype.clearSession = function () {
        // Clear current datasets.
        this.dataset = undefined;
        this.controlDataset = undefined;
        this.setDisplayMode('A');
    }

    /**
     * Load a .hic file
     *
     * NOTE: public API function
     *
     * @return a promise for a dataset
     * @param config
     */
    hic.Browser.prototype.loadHicFile = async function (config) {

        if (!config.url) {
            console.log("No .hic url specified");
            return undefined;
        }

        this.clearSession();

        try {
            this.contactMatrixView.startSpinner();
            this.$user_interaction_shield.show();

            const name = await extractName(config)
            const prefix = this.controlDataset ? "A: " : "";
            this.$contactMaplabel.text(prefix + name);
            this.$contactMaplabel.attr('title', name);
            config.name = name;

            this.dataset = await loadDataset(config)
            this.dataset.name = name

            const previousGenomeId = this.genome ? this.genome.id : undefined;
            this.genome = new hic.Genome(this.dataset.genomeId, this.dataset.chromosomes);
            // TODO -- this is not going to work with browsers on different assemblies on the same page.
            igv.browser.genome = this.genome;

            if (this.genome.id !== previousGenomeId) {
                this.eventBus.post(hic.Event("GenomeChange", this.genome.id));
            }
            this.eventBus.post(hic.Event("MapLoad", this.dataset));

            if (config.state) {
                this.setState(config.state);
            } else if (config.synchState && this.canBeSynched(config.synchState)) {
                this.syncState(config.synchState);
            } else {
                this.setState(defaultState.clone());
            }
        } finally {
            this.$user_interaction_shield.hide();
            this.stopSpinner();
        }

        // Initiate loading of the norm vector index, but don't block if the "nvi" parameter is not available.
        // Let it load in the background
        const eventBus = this.eventBus

        // If nvi is not supplied, try reading it from remote lambda service
        if (!config.nvi && typeof config.url === "string") {
            const url = new URL(config.url)
            const key = encodeURIComponent(url.hostname + url.pathname)
            const nviResponse = await fetch('https://t5dvc6kn3f.execute-api.us-east-1.amazonaws.com/dev/nvi/' + key)
            if (nviResponse.status === 200) {
                const nvi = await nviResponse.text()
                if (nvi) {
                    config.nvi = nvi
                }
            }
        }

        if (config.nvi) {
            await this.dataset.getNormVectorIndex(config)
            eventBus.post(hic.Event("NormVectorIndexLoad", this.dataset));
        } else {
            this.dataset.getNormVectorIndex(config)
                .then(function (nvi) {
                    if (!config.isControl) {
                        eventBus.post(hic.Event("NormVectorIndexLoad", this.dataset));
                    }
                })
        }
    }

    /**
     * Compare 2 datasets for compatibility.  Compatibility is defined as from the same assembly, even if
     * different IDs are used (e.g. GRCh38 vs hg38)
     * @param d1
     * @param d2
     */
    function areCompatible(d1, d2) {
        return (d1.genomeId === d2.genomeId) || d1.compareChromosomes(d2)
    }

    /**
     * Load a .hic file for a control map
     *
     * NOTE: public API function
     *
     * @return a promise for a dataset
     * @param config
     */
    hic.Browser.prototype.loadHicControlFile = async function (config) {

        this.$user_interaction_shield.show()
        this.contactMatrixView.startSpinner()

        try {
            this.controlUrl = config.url
            const name = await extractName(config)
            config.name = name

            const controlDataset = await loadDataset(config)
            controlDataset.name = name

            if (!this.dataset || areCompatible(this.dataset, controlDataset)) {
                this.controlDataset = controlDataset;
                if (this.dataset) {
                    this.$contactMaplabel.text("A: " + this.dataset.name);
                }
                this.$controlMaplabel.text("B: " + controlDataset.name);
                this.$controlMaplabel.attr('title', controlDataset.name);

                //For the control dataset, block until the norm vector index is loaded
                await controlDataset.getNormVectorIndex(config)
                this.eventBus.post(hic.Event("ControlMapLoad", this.controlDataset));
                this.update();
            } else {
                igv.presentAlert('"B" map genome (' + controlDataset.genomeId + ') does not match "A" map genome (' + this.genome.id + ')');
            }
        } finally {
            this.$user_interaction_shield.hide();
            this.stopSpinner();
        }


    }


    /**
     * Return a promise to extract the name of the dataset.  The promise is neccessacary because
     * google drive urls require a call to the API
     *
     * @returns Promise for the name
     */
    async function extractName(config) {

        if (config.name === undefined && typeof config.url === "string" && config.url.includes("drive.google.com")) {
            const json = await igv.Google.getDriveFileInfo(config.url)
            return json.originalFilename;
        } else {
            if (config.name === undefined) {
                return hic.extractFilename(config.url);
            } else {
                return config.name;
            }
        }
    }


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

    hic.Browser.prototype.parseGotoInput = async function (string) {

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
            const result = await hic.geneSearch(this.genome.id, loci[0].trim())

            if (result) {
                igv.selectedGene = loci[0].trim();
                xLocus = self.parseLocusString(result);
                yLocus = xLocus;
                self.state.selectedGene = loci[0].trim();
                self.goto(xLocus.chr, xLocus.start, xLocus.end, yLocus.chr, yLocus.start, yLocus.end, 5000);
            } else {
                alert('No feature found with name "' + loci[0] + '"');
            }

        } else {

            if (xLocus.wholeChr && yLocus.wholeChr) {
                self.setChromosomes(xLocus.chr, yLocus.chr);
            } else {
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
            chromosome,
            extent,
            locusObject = {},
            numeric;

        parts = locus.trim().split(':');


        chromosome = this.genome.getChromosome(_.first(parts).toLowerCase());

        if (!chromosome) {
            return undefined;
        } else {
            locusObject.chr = chromosome.index;
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
            } else {
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
    hic.Browser.prototype.pinchZoom = async function (anchorPx, anchorPy, scaleFactor) {

        if (this.state.chr1 === 0) {
            await this.zoomAndCenter(1, anchorPx, anchorPy);
        }
        else {
            try {
                this.startSpinner()

                const bpResolutions = this.dataset.bpResolutions
                const currentResolution = bpResolutions[this.state.zoom];

                let newResolution
                let newZoom
                let newPixelSize
                let zoomChanged

                if (this.resolutionLocked ||
                    (this.state.zoom === bpResolutions.length - 1 && scaleFactor > 1) ||
                    (this.state.zoom === 0 && scaleFactor < 1)) {
                    // Can't change resolution level, must adjust pixel size
                    newResolution = currentResolution;
                    newPixelSize = Math.min(MAX_PIXEL_SIZE, this.state.pixelSize * scaleFactor);
                    newZoom = this.state.zoom;
                    zoomChanged = false;
                } else {
                    const targetResolution = (currentResolution / this.state.pixelSize) / scaleFactor;
                    newZoom = this.findMatchingZoomIndex(targetResolution, bpResolutions);
                    newResolution = bpResolutions[newZoom];
                    zoomChanged = newZoom !== this.state.zoom;
                    newPixelSize = Math.min(MAX_PIXEL_SIZE, newResolution / targetResolution);
                }
                const z = await minZoom.call(this, this.state.chr1, this.state.chr2)


                if (!this.resolutionLocked && scaleFactor < 1 && newZoom < z) {
                    this.setChromosomes(0, 0);
                } else {
                    const minPS = await minPixelSize.call(this, this.state.chr1, this.state.chr2, newZoom)

                    const state = this.state;

                    newPixelSize = Math.max(newPixelSize, minPS);

                    // Genomic anchor  -- this position should remain at anchorPx, anchorPy after state change
                    const gx = (state.x + anchorPx / state.pixelSize) * currentResolution;
                    const gy = (state.y + anchorPy / state.pixelSize) * currentResolution;

                    state.x = gx / newResolution - anchorPx / newPixelSize;
                    state.y = gy / newResolution - anchorPy / newPixelSize;

                    state.zoom = newZoom;
                    state.pixelSize = newPixelSize;

                    this.clamp();
                    this.eventBus.post(hic.Event("LocusChange", {
                        state: state,
                        resolutionChanged: zoomChanged
                    }));
                }
            } finally {
                this.stopSpinner()
            }
        }

    }

    hic.Browser.prototype.wheelClickZoom = async function (direction, centerPX, centerPY) {

        if (this.resolutionLocked || this.state.chr1 === 0) {   // Resolution locked OR whole genome view
            this.zoomAndCenter(direction, centerPX, centerPY);
        } else {
            const z = await minZoom.call(this, this.state.chr1, this.state.chr2)
            var newZoom = this.state.zoom + direction;
            if (direction < 0 && newZoom < z) {
                this.setChromosomes(0, 0);
            } else {
                this.zoomAndCenter(direction, centerPX, centerPY);
            }

        }

    }

    // Zoom in response to a double-click
    hic.Browser.prototype.zoomAndCenter = async function (direction, centerPX, centerPY) {

        if (!this.dataset) return;

        if (this.state.chr1 === 0 && direction > 0) {
            var genomeCoordX = centerPX * this.dataset.wholeGenomeResolution / this.state.pixelSize,
                genomeCoordY = centerPY * this.dataset.wholeGenomeResolution / this.state.pixelSize,
                chrX = this.genome.getChromsosomeForCoordinate(genomeCoordX),
                chrY = this.genome.getChromsosomeForCoordinate(genomeCoordY);
            this.setChromosomes(chrX.index, chrY.index);
        } else {
            const bpResolutions = this.dataset.bpResolutions
            const viewDimensions = this.contactMatrixView.getViewDimensions()
            const dx = centerPX === undefined ? 0 : centerPX - viewDimensions.width / 2
            const dy = centerPY === undefined ? 0 : centerPY - viewDimensions.height / 2

            this.state.x += (dx / this.state.pixelSize);
            this.state.y += (dy / this.state.pixelSize);

            if (this.resolutionLocked ||
                (direction > 0 && this.state.zoom === bpResolutions.length - 1) ||
                (direction < 0 && this.state.zoom === 0)) {

                const minPS = await minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom)
                const state = this.state;
                const newPixelSize = Math.max(Math.min(MAX_PIXEL_SIZE, state.pixelSize * (direction > 0 ? 2 : 0.5)),
                    minPS);

                const shiftRatio = (newPixelSize - state.pixelSize) / newPixelSize;
                state.pixelSize = newPixelSize;
                state.x += shiftRatio * (viewDimensions.width / state.pixelSize);
                state.y += shiftRatio * (viewDimensions.height / state.pixelSize);

                this.clamp();
                this.eventBus.post(hic.Event("LocusChange", {state: state, resolutionChanged: false}));

            } else {
                this.setZoom(this.state.zoom + direction);
            }
        }

    };

    hic.Browser.prototype.setZoom = async function (zoom) {

        try {
            this.startSpinner()
            var bpResolutions, currentResolution, viewDimensions, xCenter, yCenter, newResolution, newXCenter,
                newYCenter,
                newPixelSize, zoomChanged,
                self = this;


            // Shift x,y to maintain center, if possible
            bpResolutions = this.dataset.bpResolutions;
            currentResolution = bpResolutions[this.state.zoom];
            viewDimensions = this.contactMatrixView.getViewDimensions();
            xCenter = this.state.x + viewDimensions.width / (2 * this.state.pixelSize);    // center in bins
            yCenter = this.state.y + viewDimensions.height / (2 * this.state.pixelSize);    // center in bins
            newResolution = bpResolutions[zoom];
            newXCenter = xCenter * (currentResolution / newResolution);
            newYCenter = yCenter * (currentResolution / newResolution);

            const minPS = await minPixelSize.call(this, this.state.chr1, this.state.chr2, zoom)

            var state = self.state;
            newPixelSize = Math.max(defaultPixelSize, minPS);
            zoomChanged = (state.zoom !== zoom);

            state.zoom = zoom;
            state.x = Math.max(0, newXCenter - viewDimensions.width / (2 * newPixelSize));
            state.y = Math.max(0, newYCenter - viewDimensions.height / (2 * newPixelSize));
            state.pixelSize = newPixelSize;
            self.clamp();

            self.eventBus.post(hic.Event("LocusChange", {state: state, resolutionChanged: zoomChanged}));
        } finally {
            this.stopSpinner()
        }

    };

    hic.Browser.prototype.setChromosomes = async function (chr1, chr2) {

        try {
            this.startSpinner()

            this.state.chr1 = Math.min(chr1, chr2);
            this.state.chr2 = Math.max(chr1, chr2);
            this.state.x = 0;
            this.state.y = 0;

            const z = await minZoom.call(this, chr1, chr2)
            this.state.zoom = z;

            const minPS = await minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom)
            this.state.pixelSize = Math.min(100, Math.max(defaultPixelSize, minPS));
            this.eventBus.post(hic.Event("LocusChange", {state: this.state, resolutionChanged: true}));
        } finally {
            this.stopSpinner()
        }
    }

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

    async function minZoom(chr1, chr2) {

        const viewDimensions = this.contactMatrixView.getViewDimensions();
        const chr1Length = this.dataset.chromosomes[chr1].size;
        const chr2Length = this.dataset.chromosomes[chr2].size;
        const binSize = Math.max(chr1Length / viewDimensions.width, chr2Length / viewDimensions.height);

        const matrix = await this.dataset.getMatrix(chr1, chr2)
        return matrix.findZoomForResolution(binSize);
    }

    async function minPixelSize(chr1, chr2, z) {

        const viewDimensions = this.contactMatrixView.getViewDimensions();
        const chr1Length = this.dataset.chromosomes[chr1].size;
        const chr2Length = this.dataset.chromosomes[chr2].size;

        const matrix = await this.dataset.getMatrix(chr1, chr2)
        const zd = matrix.getZoomDataByIndex(z, "BP");
        const binSize = zd.zoom.binSize;
        const nBins1 = chr1Length / binSize;
        const nBins2 = chr2Length / binSize;
        return (Math.min(viewDimensions.width / nBins1, viewDimensions.height / nBins2));

    }

    /**
     * Set the matrix state.  Used to restore state from a bookmark
     * @param state  browser state
     */
    hic.Browser.prototype.setState = async function (state) {

        this.state = state;
        // Possibly adjust pixel size
        const minPS = await minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom)
        this.state.pixelSize = Math.max(state.pixelSize, minPS);
        this.eventBus.post(new hic.Event("LocusChange", {state: this.state, resolutionChanged: true}));

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

        var chr1 = this.genome.getChromosome(syncState.chr1Name),
            chr2 = this.genome.getChromosome(syncState.chr2Name),
            zoom = this.dataset.getZoomIndexForBinSize(syncState.binSize, "BP"),
            x = syncState.binX,
            y = syncState.binY,
            pixelSize = syncState.pixelSize;

        if (!(chr1 && chr2)) {
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
        this.state.chr1 = chr1.index;
        this.state.chr2 = chr2.index;
        this.state.zoom = zoom;
        this.state.x = x;
        this.state.y = y;
        this.state.pixelSize = pixelSize;

        this.eventBus.post(hic.Event("LocusChange", {state: this.state, resolutionChanged: zoomChanged}, false));

    };

    hic.Browser.prototype.setNormalization = function (normalization) {

        this.state.normalization = normalization;
        this.eventBus.post(hic.Event("NormalizationChange", this.state.normalization))
        this.repaintMatrix();
    };


    hic.Browser.prototype.shiftPixels = function (dx, dy) {

        var self = this;

        if (!this.dataset) return;

        this.state.x += (dx / this.state.pixelSize);
        this.state.y += (dy / this.state.pixelSize);
        this.clamp();

        var locusChangeEvent = hic.Event("LocusChange", {
            state: this.state,
            resolutionChanged: false,
            dragging: true
        });
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

        if (minResolution && targetResolution < minResolution) {
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
        var self = this;

        if ("LocusChange" === event.type) {

            if (event.propogate) {

                self.synchedBrowsers.forEach(function (browser) {
                    browser.syncState(self.getSyncState());
                })

            }

            this.update(event);
        }

    };

    /**
     * Update the maps and tracks.
     *
     * @param event
     */
    hic.Browser.prototype.update = async function (event) {

        try {
            this.startSpinner();

            // First get all data for map and tracks, then repaint
            const tiles = await this.contactMatrixView.getImageTiles()

            for (let xyTrackRenderPair of this.trackRenderers) {
                await xyTrackRenderPair.x.readyToPaint()
                await xyTrackRenderPair.y.readyToPaint()
            }

            if (event !== undefined && "LocusChange" === event.type) {
                this.layoutController.xAxisRuler.locusChange(event);
                this.layoutController.yAxisRuler.locusChange(event);
            }

            this.contactMatrixView.repaint(tiles);
            this.renderTracks();
            this.stopSpinner();

        } finally{
            this.stopSpinner();
        }
    }


    hic.Browser.prototype.repaintMatrix = function () {
        this.contactMatrixView.imageTileCache = {};
        this.contactMatrixView.initialImage = undefined;
        this.contactMatrixView.update();
    }


    hic.Browser.prototype.resolution = function () {
        return this.dataset.bpResolutions[this.state.zoom];
    };


// Set default values for config properties
    function setDefaults(config) {


        defaultState = new hic.State(0, 0, 0, 0, 0, defaultPixelSize, "NONE");

        if (config.figureMode === true) {
            config.showLocusGoto = false;
            config.showHicContactMapLabel = false;
            config.showChromosomeSelector = false;
        } else {
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

    function getNviString(dataset) {

        if (dataset.hicFile.normalizationVectorIndexRange) {
            var range = dataset.hicFile.normalizationVectorIndexRange,
                nviString = String(range.start) + "," + String(range.size);
            return nviString
        } else {
            return undefined;
        }
    }

    function getBlockString(dataset) {


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

        var queryString, nviString, trackString, displayMode;

        if (!(this.dataset && this.dataset.url)) return "";   // URL is required

        queryString = [];

        queryString.push(paramString("hicUrl", this.dataset.url));

        if (this.dataset.name) {
            queryString.push(paramString("name", this.dataset.name));
        }

        queryString.push(paramString("state", this.state.stringify()));

        queryString.push(paramString("colorScale", this.contactMatrixView.getColorScale().stringify()));

        if (igv.selectedGene) {
            queryString.push(paramString("selectedGene", igv.selectedGene));
        }

        nviString = getNviString(this.dataset);
        if (nviString) {
            queryString.push(paramString("nvi", nviString));
        }

        if (this.controlDataset) {

            queryString.push(paramString("controlUrl", this.controlUrl));

            if (this.controlDataset.name) {
                queryString.push(paramString("controlName", this.controlDataset.name))
            }

            displayMode = this.getDisplayMode();
            if (displayMode) {
                queryString.push(paramString("displayMode", this.getDisplayMode()));
            }

            nviString = getNviString(this.controlDataset);
            if (nviString) {
                queryString.push(paramString("controlNvi", nviString));
            }

            if (this.controlMapWidget.getDisplayModeCycle() !== undefined) {
                queryString.push(paramString("cycle", "true"))
            }

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

        var captionDiv = document.getElementById('hic-caption');
        if (captionDiv) {
            var captionText = captionDiv.textContent;
            if (captionText) {
                captionText = captionText.trim();
                if (captionText) {
                    queryString.push(paramString("caption", captionText));
                }
            }
        }

        // if (this.config.normVectorFiles && this.config.normVectorFiles.length > 0) {
        //
        //     var normVectorString = "";
        //     this.config.normVectorFiles.forEach(function (url) {
        //
        //         if (normVectorString.length > 0) normVectorString += "|||";
        //         normVectorString += url;
        //
        //     });
        //     queryString.push(paramString("normVectorFiles", normVectorString));
        // }

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
    igv.Browser.decodeQuery = function (query, config, uriDecode) {

        var hicUrl, name, stateString, colorScale, trackString, selectedGene, nvi, normVectorString,
            controlUrl, ratioColorScale, controlName, displayMode, controlNvi, captionText, cycle;


        hicUrl = query["hicUrl"];
        name = query["name"];
        stateString = query["state"];
        colorScale = query["colorScale"];
        trackString = query["tracks"];
        selectedGene = query["selectedGene"];
        nvi = query["nvi"];
        normVectorString = query["normVectorFiles"];

        controlUrl = query["controlUrl"];
        controlName = query["controlName"];
        ratioColorScale = query["ratioColorScale"];
        displayMode = query["displayMode"];
        controlNvi = query["controlNvi"];
        captionText = query["caption"];
        cycle = query["cycle"];

        if (hicUrl) {
            hicUrl = parapmDecode(hicUrl, uriDecode);
            Object.keys(urlShortcuts).forEach(function (key) {
                var value = urlShortcuts[key];
                if (hicUrl.startsWith(key)) hicUrl = hicUrl.replace(key, value);
            });
            config.url = hicUrl;

        }
        if (name) {
            config.name = parapmDecode(name, uriDecode);
        }
        if (controlUrl) {
            controlUrl = parapmDecode(controlUrl, uriDecode);
            Object.keys(urlShortcuts).forEach(function (key) {
                var value = urlShortcuts[key];
                if (controlUrl.startsWith(key)) controlUrl = controlUrl.replace(key, value);
            });
            config.controlUrl = controlUrl;
        }
        if (controlName) {
            config.controlName = parapmDecode(controlName, uriDecode);
        }

        if (stateString) {
            stateString = parapmDecode(stateString, uriDecode);
            config.state = destringifyStateV0(stateString);

        }
        if (colorScale) {
            colorScale = parapmDecode(colorScale, uriDecode);
            config.colorScale = hic.destringifyColorScale(colorScale);
        }

        if (displayMode) {
            config.displayMode = parapmDecode(displayMode, uriDecode);
        }

        if (trackString) {
            trackString = parapmDecode(trackString, uriDecode);
            config.tracks = destringifyTracksV0(trackString);

            // If an oAuth token is provided append it to track configs.
            if (config.tracks && config.oauthToken) {
                config.tracks.forEach(function (t) {
                    t.oauthToken = config.oauthToken;
                })
            }
        }

        if (selectedGene) {
            igv.selectedGene = selectedGene;
        }

        if (captionText) {
            captionText = parapmDecode(captionText, uriDecode);
            var captionDiv = document.getElementById("hic-caption");
            if (captionDiv) {
                captionDiv.textContent = captionText;
            }
        }

        config.cycle = cycle;

        // Norm vector file loading disabled -- too slow
        // if (normVectorString) {
        //     config.normVectorFiles = normVectorString.split("|||");
        // }

        if (nvi) {
            config.nvi = parapmDecode(nvi, uriDecode);
        }
        if (controlNvi) {
            config.controlNvi = parapmDecode(controlNvi, uriDecode);
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

            trackStringList.forEach(function (trackString) {
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
                        if (dataRangeString.startsWith("-")) {
                            r = dataRangeString.substring(1).split("-");
                            config.min = -parseFloat(r[0]);
                            config.max = parseFloat(r[1]);
                        } else {
                            r = dataRangeString.split("-");
                            config.min = parseFloat(r[0]);
                            config.max = parseFloat(r[1]);
                        }
                    }

                    if (color) {
                        config.color = color;
                    }

                    configList.push(config);
                }

            });

            return configList;

        }

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

    function parapmDecode(str, uriDecode) {

        if (uriDecode) {
            return decodeURIComponent(str);   // Still more backward compatibility
        } else {
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

    /**
     * Encode an array of strings.  A "|" is used as a delimiter, therefore any "|" in individual elements
     * must be encoded.
     *
     * @param array
     * @returns {string}
     */
    function encodeArray(array) {

        var arrayStr = "", i;

        if (array.length > 0) {
            arrayStr += encodeArrayElement(array[0]);
            for (i = 1; i < array.length; i++) {
                arrayStr += "|";
                arrayStr += encodeArrayElement(array[i]);
            }
        }
        return arrayStr;

        function encodeArrayElement(elem) {
            var s = paramEncode(elem);
            s = replaceAll(s, "|", "%7C");
            return s;
        }
    }

    /**
     * Decode a string to an array of strings.  Its assumed that the string was created with encodeArray.
     *
     * @param str
     * @returns {Array}
     */
    function decodeArray(str) {

        var array, elements;
        array = [];
        elements = str.split("|");
        elements.forEach(function (elem) {
            array.push(decodeArrayElement(elem));
        })
        return array;

        function decodeArrayElement(elem) {
            var s = paramDecode(elem, false);
            s = replaceAll(s, "%7C", "|");
            return s;
        }
    }


    // mock igv browser objects for igv.js compatibility
    function createIGV($hic_container, hicBrowser, trackMenuReplacement) {

        igv.browser =
            {
                constants: {defaultColor: "rgb(0,0,150)"},

                // Compatibility wit igv menus
                trackContainerDiv: hicBrowser.layoutController.$x_track_container.get(0)
            };

        igv.trackMenuItem = function () {
            return trackMenuReplacement.trackMenuItem_Replacement.apply(trackMenuReplacement, arguments);
        };

        igv.trackMenuItemList = function () {
            return trackMenuReplacement.trackMenuItemList_Replacement.apply(trackMenuReplacement, arguments);
        };

        igv.popover = new igv.Popover($hic_container, igv.browser);

        igv.alertDialog = new igv.AlertDialog(hicBrowser.$root, hicBrowser);

        hicBrowser.inputDialog = new igv.InputDialog($hic_container, hicBrowser);

        hicBrowser.trackRemovalDialog = new igv.TrackRemovalDialog($hic_container, hicBrowser);

        hicBrowser.dataRangeDialog = new igv.DataRangeDialog($hic_container, hicBrowser);

    }

    async function loadDataset(config) {

        const url = config.url

        // If this is a local file, supply an io.File object.  Straw knows nothing about browser local files
        if (config.url instanceof File) {
            config.file = new hic.LocalFile(config.url)
            delete config.url
        }

        const straw = new HicStraw(config)
        const hicFile = straw.hicFile
        await hicFile.init()
        const dataset = new hic.Dataset(hicFile)
        dataset.url = url
        return dataset
    }

    return hic;

})
(hic || {});
