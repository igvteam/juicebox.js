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
import $ from '../vendor/jquery-3.3.1.slim.js'
import EventBus from './eventBus.js'
import {FileUtils, StringUtils, TrackUtils} from '../node_modules/igv-utils/src/index.js'
import { Popover, AlertDialog, InputDialog } from '../node_modules/igv-ui/src/index.js'
import igv from "../node_modules/igv/dist/igv.esm.js";
import HICBrowser from './hicBrowser.js'
import ColorScale from './colorScale.js'
import State from './hicState.js'
import HICEvent from './hicEvent.js'
import igvReplacements from "./igvReplacements.js"
import {decodeQuery, extractQuery} from "./urlUtils.js";
import ContactMatrixView from "./contactMatrixView";

let apiKey

const defaultPixelSize = 1

const urlShorteners = [];

const defaultSize = {width: 640, height: 640}

/**
 * The global event bus.  For events outside the scope of a single browser.
 *
 * @type {EventBus}
 */
const eventBus = new EventBus()

let allBrowsers = []

igvReplacements(igv);

async function updateAllBrowsers() {

    for (let b of allBrowsers) {
        await b.update()
    }
}

function deleteAllBrowsers() {
    for (let b of allBrowsers) {
        b.$root.remove();
    }
    allBrowsers = [];
}

async function createBrowser(hic_container, config, callback) {

    const $hic_container = $(hic_container);

    setDefaults(config);

    const apiKey = config.apiKey;
    if (apiKey) {
        igv.google.setApiKey(apiKey);
    }

    let queryString = config.queryString || config.href;   // href for backward compatibility
    if (queryString === undefined && config.initFromUrl !== false) {
        queryString = window.location.href;
    }

    if (queryString) {
        const query = extractQuery(queryString);
        const uriDecode = queryString.includes("%2C");
        decodeQuery(query, config, uriDecode);
    }

    if (StringUtils.isString(config.state)) {
        config.state = State.parse(config.state);
    }
    if (StringUtils.isString(config.colorScale)) {
        config.colorScale = ColorScale.parse(config.colorScale);
    }
    if (StringUtils.isString(config.backgroundColor)) {
        config.backgroundColor = ContactMatrixView.parseBackgroundColor(config.backgroundColor);
    }

    const browser = new HICBrowser($hic_container, config);

    browser.eventBus.hold()

    allBrowsers.push(browser);

    HICBrowser.setCurrentBrowser(browser);

    if (allBrowsers.length > 1) {
        allBrowsers.forEach(function (b) {
            b.$browser_panel_delete_button.show();
        });
    }

    if (undefined === igv.browser) {
        createIGV($hic_container, browser);
    }

    browser.inputDialog = new InputDialog($hic_container.get(0), browser);

    browser.trackRemovalDialog = new igv.TrackRemovalDialog($hic_container, browser);

    browser.dataRangeDialog = new igv.DataRangeDialog($hic_container, browser);

    ///////////////////////////////////
    try {
        browser.contactMatrixView.startSpinner();
        browser.$user_interaction_shield.show();

        const hasControl = config.controlUrl !== undefined

        // if (!config.name) config.name = await extractName(config)
        // const prefix = hasControl ? "A: " : "";
        // browser.$contactMaplabel.text(prefix + config.name);
        // browser.$contactMaplabel.attr('title', config.name);

        await browser.loadHicFile(config, true)
        await loadControlFile(config)

        if (config.cycle) {
            config.displayMode = "A"
        }

        if (config.displayMode) {
            browser.contactMatrixView.displayMode = config.displayMode;
            browser.eventBus.post({type: "DisplayMode", data: config.displayMode});
        }
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

        const tmp = browser.contactMatrixView.colorScaleThresholdCache;
        browser.eventBus.release()
        browser.contactMatrixView.colorScaleThresholdCache = tmp

        if (config.cycle) {
            browser.controlMapWidget.toggleDisplayModeCycle();
        } else {
            await browser.update()
        }

        if (typeof callback === "function") callback();
    } finally {
        browser.contactMatrixView.stopSpinner();
        browser.$user_interaction_shield.hide();
    }


    return browser;


    // Explicit set dataset, do not need to load.  Used by "interactive figures"
    async function setInitialDataset(browser, config) {

        if (config.dataset) {
            config.dataset.name = config.name;
            browser.$contactMaplabel.text(config.name);
            browser.$contactMaplabel.attr('title', config.name);
            browser.dataset = config.dataset;
            browser.genome = new Genome(browser.dataset.genomeId, browser.dataset.chromosomes);
            igv.browser.genome = browser.genome;
            EventBus.globalBus.post(HICEvent("GenomeChange", browser.genome.id));
            browser.eventBus.post(HICEvent("MapLoad", browser.dataset));
            return config.dataset;
        } else {
            return undefined;
        }
    }

    // Load the control file, if any
    async function loadControlFile(config) {
        if (config.controlUrl) {
            return browser.loadHicControlFile({
                url: config.controlUrl,
                name: config.controlName,
                nvi: config.controlNvi,
                isControl: true
            }, true);
        } else {
            return undefined;
        }
    }
}

function deleteBrowserPanel(browser) {

    if (browser === HICBrowser.getCurrentBrowser()) {
        HICBrowser.setCurrentBrowser(undefined);
    }

    allBrowsers.splice(allBrowsers.indexOf(browser), 1);
    browser.$root.remove();
    browser = undefined;

    if (1 === allBrowsers.length) {
        HICBrowser.setCurrentBrowser(allBrowsers[0]);
        HICBrowser.getCurrentBrowser().$browser_panel_delete_button.hide();
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


function isMobile() {
    return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
}

function extractFilename(urlOrFile) {
    var idx,
        str;

    if (FileUtils.isFilePath(urlOrFile)) {
        return urlOrFile.name;
    } else {

        str = urlOrFile.split('?').shift();
        idx = urlOrFile.lastIndexOf("/");

        return idx > 0 ? str.substring(idx + 1) : str;
    }
}

function igvSupports(path) {
    var config = {url: path};
    TrackUtils.inferTrackTypes(config);
    return config.type !== undefined;
}

function throttle(fn, threshhold, scope) {
    var last,
        deferTimer;

    threshhold || (threshhold = 200);

    return function () {
        var context,
            now,
            args;

        context = scope || this;
        now = +new Date;
        args = arguments;

        if (last && now < last + threshhold) {
            // hold on to it
            clearTimeout(deferTimer);
            deferTimer = setTimeout(function () {
                last = now;
                fn.apply(context, args);
            }, threshhold);
        } else {
            last = now;
            fn.apply(context, args);
        }
    }
}

function reflectionRotationWithContext(context) {
    context.scale(-1, 1);
    context.rotate(Math.PI / 2.0);
}

function reflectionAboutYAxisAtOffsetWithContext(context, exe) {
    context.translate(exe, 0);
    context.scale(-1, 1);
    context.translate(-exe, 0);
}

function identityTransformWithContext(context) {
    // 3x2 matrix. column major. (sx 0 0 sy tx ty).
    context.setTransform(1, 0, 0, 1, 0, 0);
}


// Set default values for config properties
function setDefaults(config) {


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

        if (StringUtils.isString(config.state)) {
            config.state = State.parse(config.state);
        } else {
            // copy
            config.state = new State(config.state.chr1, config.state.chr2, config.state.zoom, config.state.x,
                config.state.y, config.state.pixelSize, config.state.normalization)
        }
    }
}

// mock igv browser objects for igv.js compatibility
function createIGV($hic_container, hicBrowser) {

    igv.browser =
        {
            constants: {defaultColor: "rgb(0,0,150)"},

            // Compatibility wit igv menus
            trackContainerDiv: hicBrowser.layoutController.$x_track_container.get(0)
        };

    igv.popover = new Popover($hic_container.get(0), igv.browser);

    igv.alertDialog = new AlertDialog(hicBrowser.$root.get(0), hicBrowser);

}

export {
    defaultPixelSize, eventBus, allBrowsers, apiKey, createBrowser, deleteAllBrowsers, deleteBrowserPanel,
    areCompatible, isMobile, extractFilename, igvSupports,
    throttle, reflectionRotationWithContext, reflectionAboutYAxisAtOffsetWithContext, identityTransformWithContext,
    updateAllBrowsers, HICBrowser
}
