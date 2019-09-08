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
 * Extend config properties with query parameters
 *
 * @param query
 * @param config
 */
function decodeQuery (query, config, uriDecode) {

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
        config.state = destringifyStateV0(stateString);

    }
    if (colorScale) {
        colorScale = paramDecode(colorScale, uriDecode);
        config.colorScale = hic.destringifyColorScale(colorScale);
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
        igv.selectedGene = selectedGene;
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

    function destringifyStateV0(string) {
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

export {decodeQuery}
