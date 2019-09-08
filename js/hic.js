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

import $ from "../vendor/jquery-1.12.4.js"
import HICBrowser from './hicBrowser.js'
import ColorScale from './colorScale.js'
import State from './hicState.js'
import EventBus from './eventBus.js'
import HICEvent from './hicEvent.js'
import igvReplacements from "./igvReplacements.js"
import _ from "../vendor/underscore.js"
import GoogleURL from "./googleURL.js";
import BitlyURL from "./bitlyURL.js";
import Zlib from "../vendor/zlib_and_gzip.js";
import igv from '../node_modules/igv/dist/igv.esm.min.js';
import {decodeQuery} from "./urlUtils.js";

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

const allBrowsers = []


async function updateAllBrowsers() {

    for (let b of allBrowsers) {
        await b.update()
    }
}

async function createBrowser(hic_container, config, callback) {

    const $hic_container = $(hic_container);

    setDefaults(config);

    apiKey = config.apiKey;
    if (apiKey) {
        igv.setApiKey(apiKey);
    }

    let queryString = config.queryString || config.href;   // href for backward compatibility
    if (queryString === undefined && config.initFromUrl !== false) {
        queryString = window.location.href;
    }

    if (queryString) {
        if (!queryString.includes("?")) {
            queryString = "?" + queryString;
        }
        const query = extractQuery(queryString);
        const uriDecode = queryString.includes("%2C");
        decodeQuery(query, config, uriDecode);
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
            browser.update()
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
            browser.eventBus.post(HICEvent("GenomeChange", browser.genome.id));
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

function setApiKey(key) {
    apiKey = key;
    igv.setApiKey(key);

}

function extractQuery(uri) {
    var i1, i2, i, j, s, query, tokens;

    query = {};
    i1 = uri.indexOf("?");
    i2 = uri.lastIndexOf("#");

    if (i1 >= 0) {
        if (i2 < 0) i2 = uri.length;

        for (i = i1 + 1; i < i2;) {

            j = uri.indexOf("&", i);
            if (j < 0) j = i2;

            s = uri.substring(i, j);
            tokens = s.split("=", 2);
            if (tokens.length === 2) {
                query[tokens[0]] = tokens[1];
            }

            i = j + 1;
        }
    }
    return query;
}

function deleteBrowserPanel(browser) {

    if (browser === HICBrowser.getCurrentBrowser()) {
        HICBrowser.setCurrentBrowser(undefined);
    }

    allBrowsers.splice(_.indexOf(allBrowsers, browser), 1);
    browser.$root.remove();
    browser = undefined;

    if (1 === allBrowsers.length) {
        HICBrowser.setCurrentBrowser(allBrowsers[0]);
        HICBrowser.getCurrentBrowser().$browser_panel_delete_button.hide();
    }

}


function syncBrowsers(browsers) {

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

function destringifyColorScale(string) {

    var pnstr, ratioCS;

    if (string.startsWith("R:")) {
        pnstr = string.substring(2).split(":");
        ratioCS = new RatioColorScale(Number.parseFloat(pnstr[0]));
        ratioCS.positiveScale = foo(pnstr[1]);
        ratioCS.negativeScale = foo(pnstr[2]);
        return ratioCS;
    } else {
        return foo(string);
    }

    function foo(str) {
        var cs, tokens;

        tokens = str.split(",");

        cs = {
            threshold: tokens[0],
            r: tokens[1],
            g: tokens[2],
            b: tokens[3]
        };
        return new ColorScale(cs);
    }
}

function destringifyState(string) {

    var tokens = string.split(",");
    return new State(
        parseInt(tokens[0]),    // chr1
        parseInt(tokens[1]),    // chr2
        parseFloat(tokens[2]), // zoom
        parseFloat(tokens[3]), // x
        parseFloat(tokens[4]), // y
        parseFloat(tokens[5]), // pixelSize
        tokens.length > 6 ? tokens[6] : "NONE"   // normalization
    )
}

function isMobile() {
    return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
}

function extractFilename(urlOrFile) {
    var idx,
        str;

    if (igv.isFilePath(urlOrFile)) {
        return urlOrFile.name;
    } else {

        str = urlOrFile.split('?').shift();
        idx = urlOrFile.lastIndexOf("/");

        return idx > 0 ? str.substring(idx + 1) : str;
    }
}

function igvSupports(path) {
    var config = {url: path};
    igv.inferTrackTypes(config);
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

function setURLShortener(shortenerConfigs) {

    if (!shortenerConfigs || shortenerConfigs === "none") {

    } else {
        shortenerConfigs.forEach(function (config) {
            urlShorteners.push(getShortener(config));
        })
    }

    function getShortener(shortener) {
        if (shortener.provider) {
            if (shortener.provider === "google") {
                return new GoogleURL(shortener);
            } else if (shortener.provider === "bitly") {
                return new BitlyURL(shortener);
            } else {
                igv.presentAlert("Unknown url shortener provider: " + shortener.provider);
            }
        } else {    // Custom
            if (typeof shortener.shortenURL === "function" &&
                typeof shortener.expandURL === "function" &&
                typeof shortener.hostname === "string") {
                return shortener;
            } else {
                igv.presentAlert("URL shortener object must define functions 'shortenURL' and 'expandURL' and string constant 'hostname'")
            }
        }
    }
}

function shortenURL(url) {
    if (urlShorteners) {
        return urlShorteners[0].shortenURL(url);
    } else {
        return Promise.resolve(url);
    }
}

function expandURL(url) {

    var urlObject = new URL(url),
        hostname = urlObject.hostname,
        i,
        expander;

    if (urlShorteners) {
        for (i = 0; i < urlShorteners.length; i++) {
            expander = urlShorteners[i];
            if (hostname === expander.hostname) {
                return expander.expandURL(url);
            }
        }
    }

    igv.presentAlert("No expanders for URL: " + url);

    return Promise.resolve(url);
}

async function shortJuiceboxURL(base) {

    let queryString = "{";
    allBrowsers.forEach(function (browser, index) {
        queryString += encodeURIComponent(browser.getQueryString());
        queryString += (index === allBrowsers.length - 1 ? "}" : "},{");
    });

    const compressedString = compressQueryParameter(queryString)

    const url = base + "?juiceboxData=" + compressedString

    if (url.length > 2048) {
        return url
    } else {
        return shortenURL(url)
    }
}

function decompressQueryParameter(enc) {

    enc = enc.replace(/\./g, '+').replace(/_/g, '/').replace(/-/g, '=')

    const compressedString = atob(enc);
    const compressedBytes = [];
    for (let i = 0; i < compressedString.length; i++) {
        compressedBytes.push(compressedString.charCodeAt(i));
    }
    const bytes = new Zlib.RawInflate(compressedBytes).decompress();

    let str = ''
    for (let b of bytes) {
        str += String.fromCharCode(b)
    }

    return str;
}

async function initApp(container, config) {

    let apiKey = config.apiKey;
    if (apiKey) {
        if (apiKey === "ABCD") apiKey = "AIzaSyDUUAUFpQEN4mumeMNIRWXSiTh5cPtUAD0"
        setApiKey(apiKey);
    }

    let query = extractQuery(window.location.href);
    query = await expandJuiceboxUrl(query)
    const b = await createBrowsers(container, query)

    syncBrowsers(allBrowsers);


}

async function expandJuiceboxUrl(query) {
    if (query && query.hasOwnProperty("juiceboxURL")) {
        const jbURL = await
            expandURL(query["juiceboxURL"])
        return extractQuery(jbURL);
    } else {
        return query
    }
}

async function createBrowsers(container, query) {

    var parts, browser, i;

    let q;

    if (query && query.hasOwnProperty("juicebox")) {
        q = query["juicebox"];

        if (q.startsWith("%7B")) {
            q = decodeURIComponent(q);
        }
    } else if (query && query.hasOwnProperty("juiceboxData")) {
        q = decompressQueryParameter(query["juiceboxData"])
    }


    if (q) {

        q = q.substr(1, q.length - 2);  // Strip leading and trailing bracket
        parts = q.split("},{");

        const browser = await createBrowser(container, {queryString: decodeURIComponent(parts[0])})


        if (parts && parts.length > 1) {

            const promises = []
            for (i = 1; i < parts.length; i++) {
                promises.push(createBrowser(container, {queryString: decodeURIComponent(parts[i])}))
                //const b = await createBrowser($container.get(0), {queryString: decodeURIComponent(parts[i])})
                // b.eventBus.subscribe("GenomeChange", genomeChangeListener);
                // b.eventBus.subscribe("MapLoad", checkBDropdown);
            }

            const browsers = await Promise.all(promises)

        }

        return browser


    } else {
        const browser = await createBrowser(container, {})

        return browser

    }
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
        // convert to state object
        config.state = new State(config.state.chr1, config.state.chr2, config.state.zoom, config.state.x,
            config.state.y, config.state.pixelSize, config.state.normalization)
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

    // replace IGV functions with HIC equivalents
    igvReplacements(igv);

    igv.popover = new igv.Popover($hic_container, igv.browser);

    igv.alertDialog = new igv.AlertDialog(hicBrowser.$root, hicBrowser);

    hicBrowser.inputDialog = new igv.InputDialog($hic_container, hicBrowser);

    hicBrowser.trackRemovalDialog = new igv.TrackRemovalDialog($hic_container, hicBrowser);

    hicBrowser.dataRangeDialog = new igv.DataRangeDialog($hic_container, hicBrowser);

}


function compressQueryParameter(str) {

    var bytes, deflate, compressedBytes, compressedString, enc;

    bytes = [];
    for (var i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i));
    }
    compressedBytes = new Zlib.RawDeflate(bytes).compress();            // UInt8Arry
    compressedString = String.fromCharCode.apply(null, compressedBytes);      // Convert to string
    enc = btoa(compressedString);
    enc = enc.replace(/\+/g, '.').replace(/\//g, '_').replace(/\=/g, '-');   // URL safe

    //console.log(json);
    //console.log(enc);

    return enc;
}

// function decompressQueryParameter(enc) {
//
//     enc = enc.replace(/\./g, '+').replace(/_/g, '/').replace(/-/g, '=')
//
//     const compressedString = atob(enc);
//     const compressedBytes = [];
//     for (let i = 0; i < compressedString.length; i++) {
//         compressedBytes.push(compressedString.charCodeAt(i));
//     }
//     const bytes = new Zlib.RawInflate(compressedBytes).decompress();
//
//     let str = ''
//     for (let b of bytes) {
//         str += String.fromCharCode(b)
//     }
//
//     return str;
// }

//export default hic


export {
    defaultPixelSize, eventBus, allBrowsers, apiKey, createBrowser, extractQuery, deleteBrowserPanel,
    syncBrowsers, areCompatible, destringifyColorScale, destringifyState, isMobile, extractFilename, igvSupports,
    throttle, reflectionRotationWithContext, reflectionAboutYAxisAtOffsetWithContext, identityTransformWithContext,
    setURLShortener, shortenURL, expandURL, shortJuiceboxURL, decompressQueryParameter, initApp, expandJuiceboxUrl,
    createBrowsers, updateAllBrowsers
}
