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
    
    hic.loadTrack2D = function (config) {

        return new Promise(function (fulfill, reject) {

            igv.xhr
                .loadString(config.url, {})
                .then(function (data) {

                    var features = parseData(data);

                    fulfill(new Track2D(config, features));
                })
                .catch(reject);

        })
    }

    function parseData(data) {

        if (!data) return null;

        var feature,
            lines = data.splitLines(),
            len = lines.length,
            tokens,
            allFeatures = [],
            line,
            i,
            delimiter = "\t";


        for (i = 1; i < len; i++) {

            line = lines[i];

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
                color: "rgb(" + tokens[6] + ")"
            }
            allFeatures.push(feature);
        }

        return allFeatures;
    };

    function getKey(chr1, chr2) {
        return chr1 > chr2 ? chr2 + "_" + chr1 : chr1 + "_" + chr2;
    }

    function getAltKey(chr1, chr2) {
        var chr1Alt = chr1.startsWith("chr") ? chr1.substr(3) : "chr" + chr1,
            chr2Alt = chr2.startsWith("chr") ? chr2.substr(3) : "chr" + chr2;
        return chr1 > chr2 ? chr2Alt + "_" + chr1Alt : chr1Alt + "_" + chr2Alt;
    }


    function Track2D(config, features) {

        var self = this;

        this.config = config;
        this.name = config.name;
        this.featureMap = {};
        this.featureCount = 0;
        this.isVisible = true;
        this.color = config.color === undefined ? features[0].color : config.color;

        features.forEach(function (f) {

            self.featureCount++;

            var key = getKey(f.chr1, f.chr2),
                list = self.featureMap[key];

            if(!list) {
                list = [];
                self.featureMap[key] = list;
            }
            list.push(f);
        });
    }

    Track2D.prototype.getFeatures = function(chr1, chr2) {
        var key = getKey(chr1, chr2),
            features =  this.featureMap[key];

        return features || this.featureMap[getAltKey(chr1, chr2)];
    }

    return hic;

})
(hic || {});
