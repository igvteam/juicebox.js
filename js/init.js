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


import {createBrowser, areCompatible, allBrowsers, setApiKey} from "./hicUtils.js";
import igv from '../node_modules/igv/dist/igv.esm.js';
import {extractQuery} from "./urlUtils.js"
import GoogleURL from "../website/dev/js/googleURL.js"
import BitlyURL from "../website/dev/js/bitlyURL.js"
import Zlib from "../vendor/zlib_and_gzip.js"

const urlShorteners = [];

async function initApp(container, config) {

    let apiKey = config.apiKey;
    if (apiKey) {
        if (apiKey === "ABCD") apiKey = "AIzaSyDUUAUFpQEN4mumeMNIRWXSiTh5cPtUAD0"
        setApiKey(apiKey);
    }

    if (config.urlShortener) {
        setURLShortener(config.urlShortener);
    }

    let query = {};

    config.queryParametersSupported = undefined === config.queryParametersSupported ? true : config.queryParametersSupported;

    if (false === config.queryParametersSupported) {
        // ignore window.location.href params
    } else {
        query = extractQuery(window.location.href);
        query = await expandJuiceboxUrl(query)
    }

    const unused = await createBrowsers(container, query);
    syncBrowsers(allBrowsers);

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

        const decoded = decodeURIComponent(parts[0]);
        const browser = await createBrowser(container, {queryString: decoded})


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
        igv.Alert.presentAlert("Not all maps could be synchronized.  Incompatible assemblies: " + browsers[0].dataset.genomeId + " vs " + incompatibleDatasets.join());
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

async function expandJuiceboxUrl(query) {
    if (query && query.hasOwnProperty("juiceboxURL")) {
        const jbURL = await
            expandURL(query["juiceboxURL"])
        return extractQuery(jbURL);
    } else {
        return query
    }
}

function setURLShortener(shortenerConfigs) {
    if (!shortenerConfigs || shortenerConfigs === "none") ; else {
        shortenerConfigs.forEach(function (config) {
            urlShorteners.push(getShortener(config));
        });
    }

    function getShortener(shortener) {
        if (shortener.provider) {
            if (shortener.provider === "google") {
                return new GoogleURL(shortener);
            } else if (shortener.provider === "bitly") {
                return new BitlyURL(shortener);
            } else {
                ac.presentAlert("Unknown url shortener provider: " + shortener.provider);
            }
        } else {
            // Custom
            if (typeof shortener.shortenURL === "function" && typeof shortener.expandURL === "function" && typeof shortener.hostname === "string") {
                return shortener;
            } else {
                ac.presentAlert("URL shortener object must define functions 'shortenURL' and 'expandURL' and string constant 'hostname'");
            }
        }
    }
}

function shortenURL(url) {

    if (urlShorteners.length > 0) {
        return urlShorteners[ 0 ].shortenURL(url);
    } else {
        return Promise.resolve(url);
    }
}

async function shortJuiceboxURL(base) {

    const url = `${ base }?${ getCompressedDataString() }`;

    if (url.length > 2048) {

        return url
    } else {
        return shortenURL(url)
    }
}

function getCompressedDataString() {
    return `juiceboxData=${ compressQueryParameter( getQueryString() ) }`;
}

function getQueryString() {

    let queryString = "{";
    allBrowsers.forEach(function (browser, index) {
        const state = browser.getQueryString();
        queryString += encodeURIComponent(state);
        queryString += (index === allBrowsers.length - 1 ? "}" : "},{");
    });

    return queryString;
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

    igv.Alert.presentAlert("No expanders for URL: " + url);

    return Promise.resolve(url);
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

export {decompressQueryParameter, getCompressedDataString, initApp, syncBrowsers, shortJuiceboxURL};
