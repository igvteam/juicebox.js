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


import {Track2DDisplaceModes} from './globals.js';
import igv from '../node_modules/igv/dist/igv.esm.min.js';

const Track2D = function (config, features) {

    var self = this;

    this.config = config;
    this.name = config.name;
    this.featureMap = {};
    this.featureCount = 0;
    this.isVisible = true;

    this.displayMode = Track2DDisplaceModes.displayAllMatrix;

    if (config.color && validateColor(config.color)) {
        this.color = this.color = config.color;    // If specified, this will override colors of individual records.
    }
    this.repColor = features.length > 0 ? features[0].color : "black";

    features.forEach(function (f) {

        self.featureCount++;

        var key = getKey(f.chr1, f.chr2),
            list = self.featureMap[key];

        if (!list) {
            list = [];
            self.featureMap[key] = list;
        }
        list.push(f);
    });

};

Track2D.loadTrack2D = function (config) {

    return igv.xhr.loadString(config.url, igv.buildOptions(config))

        .then(function (data) {

            var features = parseData(data, isBedPE(config));

            return new Track2D(config, features);
        })
}

Track2D.prototype.getColor = function () {
    return this.color || this.repColor;
}

Track2D.prototype.getFeatures = function (chr1, chr2) {
    var key = getKey(chr1, chr2),
        features = this.featureMap[key];

    return features || this.featureMap[getAltKey(chr1, chr2)];
};


function isBedPE(config) {

    if (typeof config.url === "string") {
        return config.url.toLowerCase().indexOf(".bedpe") > 0;
    } else if (typeof config.name === "string") {
        return config.name.toLowerCase().indexOf(".bedpe") > 0;
    }
    else {
        return true;  // Default
    }
}

function parseData(data, isBedPE) {

    if (!data) return null;

    var feature,
        lines = igv.splitLines(data),
        len = lines.length,
        tokens,
        allFeatures = [],
        line,
        i,
        delimiter = "\t",
        start,
        colorColumn;

    start = isBedPE ? 0 : 1;
    colorColumn = isBedPE ? 10 : 6;

    for (i = start; i < len; i++) {

        line = lines[i];

        if (line.startsWith("#") || line.startsWith("track") || line.startsWith("browser")) {
            continue;
        }

        tokens = lines[i].split(delimiter);
        if (tokens.length < 7) {
            //console.log("Could not parse line: " + line);
            continue;
        }

        feature = {
            chr1: tokens[0],
            x1: parseInt(tokens[1]),
            x2: parseInt(tokens[2]),
            chr2: tokens[3],
            y1: parseInt(tokens[4]),
            y2: parseInt(tokens[5]),
            color: "rgb(" + tokens[colorColumn] + ")"
        }

        if (!Number.isNaN(feature.x1)) {
            allFeatures.push(feature);
        }
    }

    return allFeatures;
}

function getKey(chr1, chr2) {
    return chr1 > chr2 ? chr2 + "_" + chr1 : chr1 + "_" + chr2;
}

function getAltKey(chr1, chr2) {
    var chr1Alt = chr1.startsWith("chr") ? chr1.substr(3) : "chr" + chr1,
        chr2Alt = chr2.startsWith("chr") ? chr2.substr(3) : "chr" + chr2;
    return chr1 > chr2 ? chr2Alt + "_" + chr1Alt : chr1Alt + "_" + chr2Alt;
}


function validateColor(str) {
    var div = document.createElement("div");
    div.style.borderColor = str;
    return div.style.borderColor !== "";
}


export default Track2D