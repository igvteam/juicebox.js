import {StringUtils} from '../node_modules/igv-utils/src/index.js'
import {Track2DDisplaceModes} from './globals.js';
import igv from './igv.esm.js'

const google = igv.google;
const oauth = igv.oauth;

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

Track2D.loadTrack2D = async function (config) {

    if (isString(config.url) && config.url.startsWith("https://drive.google.com")) {
        const json = await google.getDriveFileInfo(config.url)
        config.url = "https://www.googleapis.com/drive/v3/files/" + json.id + "?alt=media";
        if (!config.filename) {
            config.filename = json.originalFileName || json.name;
        }
        if (!config.name) {
            config.name = json.name || json.originalFileName;
        }
    }

    const data = await igv.xhr.loadString(config.url, buildOptions(config));
    const features = parseData(data, isBedPE(config));
    return new Track2D(config, features);
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
    } else {
        return true;  // Default
    }
}

function parseData(data, isBedPE) {

    if (!data) return null;

    var feature,
        lines = StringUtils.splitLines(data),
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

    let errorCount = 0;
    for (i = start; i < len; i++) {
        line = lines[i].trim();
        if (line.startsWith("#") || line.startsWith("track") || line.startsWith("browser") || line.length === 0) {
            continue;
        }
        tokens = lines[i].split(delimiter);
        if (tokens.length < 6 && errorCount <= 5) {
            if (errorCount === 5) {
                console.error("...");
            } else {
                console.error("Could not parse line: " + line);
            }
            errorCount++;
            continue;
        }

        feature = {
            chr1: tokens[0],
            x1: parseInt(tokens[1]),
            x2: parseInt(tokens[2]),
            chr2: tokens[3],
            y1: parseInt(tokens[4]),
            y2: parseInt(tokens[5])
        }

        if (tokens.length > colorColumn) {
            feature.color = "rgb(" + tokens[colorColumn] + ")"
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

function isString(x) {
    return typeof x === "string" || x instanceof String
}

function buildOptions(config, options) {
    const defaultOptions = {
        oauthToken: config.oauthToken,
        headers: config.headers,
        withCredentials: config.withCredentials,
        filename: config.filename
    };

    return Object.assign(defaultOptions, options);
}

export default Track2D
