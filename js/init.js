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

import {Alert} from '../node_modules/igv-ui/dist/igv-ui.js'
import {Zlib} from "../node_modules/igv-utils/src/index.js"
import {allBrowsers, areCompatible, createBrowser, deleteAllBrowsers} from "./hicUtils.js"

import {Globals} from "./globals.js";

const urlShorteners = [];
let appContainer;

async function loadSession(json) {
    return restoreSession(appContainer, json);
}

async function restoreSession(container, session) {

    deleteAllBrowsers();

    if (session.hasOwnProperty("selectedGene")) {
        Globals.selectedGene = session.selectedGene;
    }

    if (session.hasOwnProperty("caption")) {
        const captionText = session.caption;
        var captionDiv = document.getElementById("hic-caption");
        if (captionDiv) {
            captionDiv.textContent = captionText;
        }
    }

    // First browser
    await createBrowser(container, session.browsers[0]);

    const promises = [];
    for (let i = 1; i < session.browsers.length; i++) {
        promises.push(createBrowser(container, session.browsers[i]));
    }
    await Promise.all(promises);

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
        Alert.presentAlert("Not all maps could be synchronized.  Incompatible assemblies: " + browsers[0].dataset.genomeId + " vs " + incompatibleDatasets.join());
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

function getCompressedDataString() {
    //return `juiceboxData=${ compressQueryParameter( getQueryString() ) }`;
    const jsonString = JSON.stringify(toJSON());
    return `session=blob:${compressQueryParameter(jsonString)}`
}

function toJSON() {
    const jsonOBJ = {};
    const browserJson = [];
    for (let browser of allBrowsers) {
        browserJson.push(browser.toJSON());
    }
    jsonOBJ.browsers = browserJson;

    const captionDiv = document.getElementById('hic-caption');
    if (captionDiv) {
        var captionText = captionDiv.textContent;
        if (captionText) {
            captionText = captionText.trim();
            if (captionText) {
                jsonOBJ.caption = captionText;
            }
        }
    }
    if (Globals.selectedGene) {
        jsonOBJ.selectedGene = Globals.selectedGene;
    }
    return jsonOBJ;
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

    Alert.presentAlert("No expanders for URL: " + url);

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


export {
    decompressQueryParameter,
    getCompressedDataString,
    syncBrowsers,
    toJSON,
    getQueryString,
    loadSession
};
