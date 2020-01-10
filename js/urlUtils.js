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
import State from './hicState.js';
import ColorScale from "./colorScale.js"
import { Globals } from "./globals.js";

const urlShortcuts = {
    "*s3e/": "https://hicfiles.s3.amazonaws.com/external/",
    "*s3/": "https://hicfiles.s3.amazonaws.com/",
    "*s3e_/": "http://hicfiles.s3.amazonaws.com/external/",
    "*s3_/": "http://hicfiles.s3.amazonaws.com/",
    "*enc/": "https://www.encodeproject.org/files/"
}


/**
 * Extend config properties with query parameters
 *
 * @param query
 * @param config
 */
function decodeQuery(query, config, uriDecode) {

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
        hicUrl = paramDecode(hicUrl, uriDecode);
        Object.keys(urlShortcuts).forEach(function (key) {
            var value = urlShortcuts[key];
            if (hicUrl.startsWith(key)) hicUrl = hicUrl.replace(key, value);
        });
        config.url = hicUrl;

    }
    if (name) {
        config.name = paramDecode(name, uriDecode);
    }
    if (controlUrl) {
        controlUrl = paramDecode(controlUrl, uriDecode);
        Object.keys(urlShortcuts).forEach(function (key) {
            var value = urlShortcuts[key];
            if (controlUrl.startsWith(key)) controlUrl = controlUrl.replace(key, value);
        });
        config.controlUrl = controlUrl;
    }
    if (controlName) {
        config.controlName = paramDecode(controlName, uriDecode);
    }

    if (stateString) {
        stateString = paramDecode(stateString, uriDecode);
        config.state = State.parse(stateString);

    }
    if (colorScale) {
        colorScale = paramDecode(colorScale, uriDecode);
        config.colorScale = ColorScale.parse(colorScale);
    }

    if (displayMode) {
        config.displayMode = paramDecode(displayMode, uriDecode);
    }

    if (trackString) {
        trackString = paramDecode(trackString, uriDecode);
        config.tracks = destringifyTracksV0(trackString);

        // If an oAuth token is provided append it to track configs.
        if (config.tracks && config.oauthToken) {
            config.tracks.forEach(function (t) {
                t.oauthToken = config.oauthToken;
            })
        }
    }

    if (selectedGene) {
        Globals.selectedGene = selectedGene;
    }

    if (captionText) {
        captionText = paramDecode(captionText, uriDecode);
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
        config.nvi = paramDecode(nvi, uriDecode);
    }
    if (controlNvi) {
        config.controlNvi = paramDecode(controlNvi, uriDecode);
    }

    function destringifyTracksV0(tracks) {

        const trackStringList = tracks.split("|||");
        const configList = [];
        for (let trackString of trackStringList) {

            const tokens = trackString.split("|");
            const color = tokens.pop();
            let url = tokens.length > 1 ? tokens[0] : trackString;
            if (url && url.trim().length > 0 && "undefined" !== url) {
                const keys = Object.keys(urlShortcuts);
                for (let key of keys) {
                    var value = urlShortcuts[key];
                    if (url.startsWith(key)) {
                        url = url.replace(key, value);
                        break;
                    }
                }
                config = {url: url};

                if (tokens.length > 1) {
                    name = tokens[1];
                    config.name = replaceAll(name, "$", "|");
                }

                if (tokens.length > 2) {
                    const dataRangeString = tokens[2];
                    if (dataRangeString.startsWith("-")) {
                        const r = dataRangeString.substring(1).split("-");
                        config.min = -parseFloat(r[0]);
                        config.max = parseFloat(r[1]);
                    } else {
                        const r = dataRangeString.split("-");
                        config.min = parseFloat(r[0]);
                        config.max = parseFloat(r[1]);
                    }
                }

                if (color) {
                    config.color = color;
                }
                configList.push(config);
            }
        }
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


function replaceAll(str, target, replacement) {
    return str.split(target).join(replacement);
}

function extractQuery(uri) {
    var i1, i2, i, j, s, query, tokens;

    query = {};
    i1 = uri.indexOf("?");
    i2 = uri.lastIndexOf("#");
    const i3 = uri.indexOf("=");
    if (i1 > i3) i1 = -1;

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
    return query;
}

export {decodeQuery, paramDecode, paramEncode, extractQuery}
