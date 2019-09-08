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

import $ from "../vendor/jquery-1.12.4.js"
import _ from "../vendor/underscore.js"
import  * as hic from './hic.js'
import Track2D from './track2D.js'
import EventBus from'./eventBus.js'
import LayoutController from './layoutController.js'
import HICEvent from './hicEvent.js'
import Dataset from './hicDataset.js'
import Genome from './genome.js'
import State from './hicState.js'
import geneSearch from './geneSearch.js'
import Straw from '../vendor/hic-straw_es6.js'
import igv from '../node_modules/igv/dist/igv.esm.min.js';

const MAX_PIXEL_SIZE = 12;
const DEFAULT_ANNOTATION_COLOR = "rgb(22, 129, 198)";
const defaultState = new State(0, 0, 0, 0, 0, 1, "NONE")

const HICBrowser = function ($app_container, config) {

    this.config = config;
    this.figureMode = config.figureMode || config.miniMode;    // Mini mode for backward compatibility
    this.resolutionLocked = false;
    this.eventBus = new EventBus();


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
        this.$root.css("height", String(config.height + LayoutController.navbarHeight(this.config.figureMode)));
    }

    $app_container.append(this.$root);

    this.layoutController = new LayoutController(this, this.$root);  // <- contactMatixView created here, nasty side-effect!

    // prevent user interaction during lengthy data loads
    this.$user_interaction_shield = $('<div>', {class: 'hic-root-prevent-interaction'});
    this.$root.append(this.$user_interaction_shield);
    this.$user_interaction_shield.hide();

    this.hideCrosshairs();

    this.state = config.state ? config.state : defaultState.clone();

    this.eventBus.subscribe("LocusChange", this);

};


HICBrowser.getCurrentBrowser = function () {

    if (hic.allBrowsers.length === 1) {
        return hic.allBrowsers[0];
    } else {
        return HICBrowser.currentBrowser;
    }

};

HICBrowser.setCurrentBrowser = function (browser) {

    // unselect current browser
    if (undefined === browser) {

        if (HICBrowser.currentBrowser) {
            HICBrowser.currentBrowser.$root.removeClass('hic-root-selected');
        }

        HICBrowser.currentBrowser = browser;
        return;
    }


    if (browser !== HICBrowser.currentBrowser) {

        if (HICBrowser.currentBrowser) {
            HICBrowser.currentBrowser.$root.removeClass('hic-root-selected');
        }

        browser.$root.addClass('hic-root-selected');
        HICBrowser.currentBrowser = browser;

        hic.eventBus.post(HICEvent("BrowserSelect", browser));
    }

};

HICBrowser.prototype.toggleMenu = function () {

    if (this.$menu.is(':visible')) {
        this.hideMenu();
    } else {
        this.showMenu();
    }

};

HICBrowser.prototype.showMenu = function () {
    this.$menu.show();
};

HICBrowser.prototype.hideMenu = function () {
    this.$menu.hide();
};

HICBrowser.prototype.startSpinner = function () {
    this.contactMatrixView.startSpinner();
};

HICBrowser.prototype.stopSpinner = function () {
    this.contactMatrixView.stopSpinner();
};

HICBrowser.prototype.setDisplayMode = async function (mode) {
    await this.contactMatrixView.setDisplayMode(mode);
    this.eventBus.post(HICEvent("DisplayMode", mode));
};

HICBrowser.prototype.getDisplayMode = function () {
    return this.contactMatrixView ? this.contactMatrixView.displayMode : undefined;
};

HICBrowser.prototype.toggleDisplayMode = function () {
    this.controlMapWidget.toggleDisplayMode();
};

HICBrowser.prototype.getColorScale = function () {

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

HICBrowser.prototype.setColorScaleThreshold = function (threshold) {
    this.contactMatrixView.setColorScaleThreshold(threshold);
};

HICBrowser.prototype.updateCrosshairs = function (coords) {
    var xGuide,
        yGuide;

    xGuide = coords.y < 0 ? {left: 0} : {top: coords.y, left: 0};
    this.contactMatrixView.$x_guide.css(xGuide);
    this.layoutController.$x_track_guide.css(xGuide);

    yGuide = coords.x < 0 ? {top: 0} : {top: 0, left: coords.x};
    this.contactMatrixView.$y_guide.css(yGuide);
    this.layoutController.$y_track_guide.css(yGuide);


};

HICBrowser.prototype.hideCrosshairs = function () {

    this.contactMatrixView.$x_guide.hide();
    this.layoutController.$x_track_guide.hide();

    this.contactMatrixView.$y_guide.hide();
    this.layoutController.$y_track_guide.hide();

};

HICBrowser.prototype.showCrosshairs = function () {

    this.contactMatrixView.$x_guide.show();
    this.layoutController.$x_track_guide.show();

    this.contactMatrixView.$y_guide.show();
    this.layoutController.$y_track_guide.show();
};

HICBrowser.prototype.genomicState = function (axis) {
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
HICBrowser.prototype.loadTracks = async function (configs) {

    var self = this, errorPrefix;

    // If loading a single track remember its name, for error message
    errorPrefix = 1 === configs.length ? ("Error loading track " + configs[0].name) : "Error loading tracks";

    try {
        this.contactMatrixView.startSpinner();
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

                if (config.type === undefined || "interaction" === config.type) {
                    // Assume this is a 2D track
                    promises2D.push(Track2D.loadTrack2D(config));
                } else {
                    var track = igv.createTrack(config, this);
                    trackXYPairs.push({x: track, y: track});
                }
            }
        }

        if (trackXYPairs.length > 0) {
            this.layoutController.tracksLoaded(trackXYPairs);
            await this.updateLayout();
        }

        const tracks2D = await Promise.all(promises2D)
        if (tracks2D && tracks2D.length > 0) {
            this.tracks2D = self.tracks2D.concat(tracks2D);
            this.eventBus.post(HICEvent("TrackLoad2D", this.tracks2D));
        }

        const normVectors = await Promise.all(promisesNV)

    } catch (error) {
        presentError(errorPrefix, error);
        console.error(error)

    } finally {
        this.contactMatrixView.stopSpinner();
    }

    function inferTypes(trackConfigurations) {

        var promises = [];
        trackConfigurations.forEach(function (config) {

            var url = config.url;

            if (url && typeof url === "string" && url.includes("drive.google.com")) {

                promises.push(igv.google.getDriveFileInfo(config.url)

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


HICBrowser.prototype.loadNormalizationFile = function (url) {

    var self = this;

    if (!this.dataset) return;

    self.eventBus.post(HICEvent("NormalizationFileLoad", "start"));

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

                self.eventBus.post(HICEvent("NormVectorIndexLoad", self.dataset));
            });

            return normVectors;
        })

}


HICBrowser.prototype.renderTracks = function () {
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
HICBrowser.prototype.renderTrackXY = async function (xy) {

    try {
        this.startSpinner()
        await xy.x.repaint();
        await xy.y.repaint();
    } finally {
        this.stopSpinner()
    }

}


HICBrowser.prototype.reset = function () {
    this.layoutController.removeAllTrackXYPairs();
    this.contactMatrixView.clearImageCaches();
    this.tracks2D = [];
    this.tracks = [];
    this.$contactMaplabel.text("");
    this.$contactMaplabel.attr('title', "");
    this.$controlMaplabel.text("");
    this.$controlMaplabel.attr('title', "");
    this.dataset = undefined;
    this.controlDataset = undefined;
}


HICBrowser.prototype.clearSession = function () {
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
HICBrowser.prototype.loadHicFile = async function (config, noUpdates) {

    if (!config.url) {
        console.log("No .hic url specified");
        return undefined;
    }

    this.clearSession();

    try {

        if (!noUpdates) {
            this.contactMatrixView.startSpinner();
            this.$user_interaction_shield.show();
        }

        const name = await extractName(config)
        const prefix = this.controlDataset ? "A: " : "";
        this.$contactMaplabel.text(prefix + name);
        this.$contactMaplabel.attr('title', name);
        config.name = name;

        this.dataset = await loadDataset(config)
        this.dataset.name = name

        const previousGenomeId = this.genome ? this.genome.id : undefined;
        this.genome = new Genome(this.dataset.genomeId, this.dataset.chromosomes);

        // TODO -- this is not going to work with browsers on different assemblies on the same page.
        igv.browser.genome = this.genome;

        if (this.genome.id !== previousGenomeId) {
            this.eventBus.post(HICEvent("GenomeChange", this.genome.id));
        }
        this.eventBus.post(HICEvent("MapLoad", this.dataset));

        if (config.state) {
            this.setState(config.state);
        } else if (config.synchState && this.canBeSynched(config.synchState)) {
            this.syncState(config.synchState);
        } else {
            this.setState(defaultState.clone());
        }
    } finally {
        if (!noUpdates) {
            this.$user_interaction_shield.hide();
            this.stopSpinner();
        }
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
        eventBus.post(HICEvent("NormVectorIndexLoad", this.dataset));
    } else {
        const dataset = this.dataset
        dataset.getNormVectorIndex(config)
            .then(function (normVectorIndex) {
                if (!config.isControl) {
                    eventBus.post(HICEvent("NormVectorIndexLoad", dataset));
                }
            })
    }
}

/**
 * Load a .hic file for a control map
 *
 * NOTE: public API function
 *
 * @return a promise for a dataset
 * @param config
 */
HICBrowser.prototype.loadHicControlFile = async function (config, noUpdates) {

    try {
        this.$user_interaction_shield.show()
        this.contactMatrixView.startSpinner()
        this.controlUrl = config.url
        const name = await extractName(config)
        config.name = name

        const controlDataset = await loadDataset(config)
        controlDataset.name = name

        if (!this.dataset || hic.areCompatible(this.dataset, controlDataset)) {
            this.controlDataset = controlDataset;
            if (this.dataset) {
                this.$contactMaplabel.text("A: " + this.dataset.name);
            }
            this.$controlMaplabel.text("B: " + controlDataset.name);
            this.$controlMaplabel.attr('title', controlDataset.name);

            //For the control dataset, block until the norm vector index is loaded
            await controlDataset.getNormVectorIndex(config)
            this.eventBus.post(HICEvent("ControlMapLoad", this.controlDataset));

            if (!noUpdates) {
                this.update();
            }
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
        const json = await igv.google.getDriveFileInfo(config.url)
        return json.name;
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

HICBrowser.prototype.parseGotoInput = async function (string) {

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
        const result = await geneSearch(this.genome.id, loci[0].trim())

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

HICBrowser.prototype.findMatchingZoomIndex = function (targetResolution, resolutionArray) {
    var z;
    for (z = resolutionArray.length - 1; z > 0; z--) {
        if (resolutionArray[z] >= targetResolution) {
            return z;
        }
    }
    return 0;
};

HICBrowser.prototype.parseLocusString = function (locus) {

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
HICBrowser.prototype.pinchZoom = async function (anchorPx, anchorPy, scaleFactor) {

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
                // Zoom out to whole genome
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

                this.contactMatrixView.zoomIn(anchorPx, anchorPy, 1 / scaleFactor)

                this.eventBus.post(HICEvent("LocusChange", {
                    state: state,
                    resolutionChanged: zoomChanged
                }));
            }
        } finally {
            this.stopSpinner()
        }
    }

}

HICBrowser.prototype.wheelClickZoom = async function (direction, centerPX, centerPY) {

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
HICBrowser.prototype.zoomAndCenter = async function (direction, centerPX, centerPY) {

    if (!this.dataset) return;

    if (this.state.chr1 === 0 && direction > 0) {
        // jump from whole genome to chromosome
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
            const newPixelSize = Math.max(Math.min(MAX_PIXEL_SIZE, state.pixelSize * (direction > 0 ? 2 : 0.5)), minPS);

            const shiftRatio = (newPixelSize - state.pixelSize) / newPixelSize;
            state.pixelSize = newPixelSize;
            state.x += shiftRatio * (viewDimensions.width / state.pixelSize);
            state.y += shiftRatio * (viewDimensions.height / state.pixelSize);

            this.clamp();
            this.eventBus.post(HICEvent("LocusChange", {state: state, resolutionChanged: false}));

        } else {
            this.setZoom(this.state.zoom + direction, centerPY, centerPY);
        }
    }

};

HICBrowser.prototype.setZoom = async function (zoom, cpx, cpy) {

    try {
        // this.startSpinner()
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
        newPixelSize = Math.max(hic.defaultPixelSize, minPS);
        zoomChanged = (state.zoom !== zoom);

        state.zoom = zoom;
        state.x = Math.max(0, newXCenter - viewDimensions.width / (2 * newPixelSize));
        state.y = Math.max(0, newYCenter - viewDimensions.height / (2 * newPixelSize));
        state.pixelSize = newPixelSize;
        self.clamp();

        await self.contactMatrixView.zoomIn()

        self.eventBus.post(HICEvent("LocusChange", {state: state, resolutionChanged: zoomChanged}));
    } finally {
        // this.stopSpinner()
    }

};

HICBrowser.prototype.setChromosomes = async function (chr1, chr2) {

    try {
        this.startSpinner()

        this.state.chr1 = Math.min(chr1, chr2);
        this.state.chr2 = Math.max(chr1, chr2);
        this.state.x = 0;
        this.state.y = 0;

        const z = await minZoom.call(this, chr1, chr2)
        this.state.zoom = z;

        const minPS = await minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom)
        this.state.pixelSize = Math.min(100, Math.max(hic.defaultPixelSize, minPS));
        this.eventBus.post(HICEvent("LocusChange", {state: this.state, resolutionChanged: true}));
    } finally {
        this.stopSpinner()
    }
}

HICBrowser.prototype.updateLayout = async function () {

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

    await this.update();

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
HICBrowser.prototype.setState = async function (state) {

    this.state = state;
    // Possibly adjust pixel size
    const minPS = await minPixelSize.call(this, this.state.chr1, this.state.chr2, this.state.zoom)
    this.state.pixelSize = Math.max(state.pixelSize, minPS);
    this.eventBus.post(new HICEvent("LocusChange", {state: this.state, resolutionChanged: true}));
};


/**
 * Return a modified state object used for synching.  Other datasets might have different chromosome ordering
 * and resolution arrays
 */
HICBrowser.prototype.getSyncState = function () {
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
HICBrowser.prototype.canBeSynched = function (syncState) {

    return this.dataset &&
        (this.dataset.getChrIndexFromName(syncState.chr1Name) !== undefined) &&
        (this.dataset.getChrIndexFromName(syncState.chr2Name) !== undefined);

}

/**
 * Used to synch state with other browsers
 * @param state  browser state
 */
HICBrowser.prototype.syncState = function (syncState) {

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

    this.eventBus.post(HICEvent("LocusChange", {state: this.state, resolutionChanged: zoomChanged}, false));

};

HICBrowser.prototype.setNormalization = function (normalization) {

    this.state.normalization = normalization;
    this.eventBus.post(HICEvent("NormalizationChange", this.state.normalization))
};


HICBrowser.prototype.shiftPixels = function (dx, dy) {

    var self = this;

    if (!this.dataset) return;

    this.state.x += (dx / this.state.pixelSize);
    this.state.y += (dy / this.state.pixelSize);
    this.clamp();

    var locusChangeEvent = HICEvent("LocusChange", {
        state: this.state,
        resolutionChanged: false,
        dragging: true
    });
    locusChangeEvent.dragging = true;
    this.eventBus.post(locusChangeEvent);


};


HICBrowser.prototype.goto = function (chr1, bpX, bpXMax, chr2, bpY, bpYMax, minResolution) {


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

    this.contactMatrixView.clearImageCaches();
    this.eventBus.post(HICEvent("LocusChange", {state: this.state, resolutionChanged: zoomChanged}));

};

HICBrowser.prototype.clamp = function () {
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

HICBrowser.prototype.receiveEvent = function (event) {
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
HICBrowser.prototype.update = async function (event) {

    try {
        this.startSpinner();

        if (event !== undefined && "LocusChange" === event.type) {
            this.layoutController.xAxisRuler.locusChange(event);
            this.layoutController.yAxisRuler.locusChange(event);
        }

        this.renderTracks();
        //this.contactMatrixView.update();

    } finally {
        this.stopSpinner();
    }
}


HICBrowser.prototype.repaintMatrix = function () {
    this.contactMatrixView.imageTileCache = {};
    this.contactMatrixView.initialImage = undefined;
    this.contactMatrixView.update();
}


HICBrowser.prototype.resolution = function () {
    return this.dataset.bpResolutions[this.state.zoom];
};




function getNviString(dataset) {

    return dataset.hicFile.config.nvi
    // if (dataset.hicFile.normalizationVectorIndexRange) {
    //     var range = dataset.hicFile.normalizationVectorIndexRange,
    //         nviString = String(range.start) + "," + String(range.size);
    //     return nviString
    // } else {
    //     return undefined;
    // }
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


HICBrowser.prototype.getQueryString = function () {

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

function paramDecode(str, uriDecode) {

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

async function loadDataset(config) {

    // If this is a local file, supply an io.File object.  Straw knows nothing about browser local files
    if (config.url instanceof File) {
        config.blob = config.url
        //config.file = new hic.LocalFile(config.url)
        delete config.url
    } else {
        // If this is a google url, add api KEY
        if (config.url.indexOf("drive.google.com") >= 0 || config.url.indexOf("www.googleapis.com") > 0) {
            config.url = igv.google.driveDownloadURL(config.url)
            config.apiKey = igv.google.apiKey
        }
    }

    const straw = new Straw(config)
    const hicFile = straw.hicFile
    await hicFile.init()
    const dataset = new Dataset(hicFile)
    dataset.url = config.url
    return dataset
}


function presentError (prefix, error) {
    const httpMessages = {
        "401": "Access unauthorized",
        "403": "Access forbidden",
        "404": "Not found"
    }
    var msg = error.message;
    if (httpMessages.hasOwnProperty(msg)) {
        msg = httpMessages[msg];
    }
    igv.presentAlert(prefix + ": " + msg);

};

export default HICBrowser
    
