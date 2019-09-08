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
import igv from '../node_modules/igv/dist/igv.esm.min.js';

const geneSearch = function (genomeId, featureName) {

    return new Promise(function (fulfill, reject) {

        // Hardcode this for now
        var searchServiceURL = "https://portals.broadinstitute.org/webservices/igv/locus?genome=" + genomeId + "&name=" + featureName;

        igv.xhr.loadString(searchServiceURL)
            .then(function (data) {

                var results = parseSearchResults(data);

                if (results.length == 0) {
                    //alert('No feature found with name "' + feature + '"');
                    fulfill(undefined);
                }
                else {
                    // Just take first result for now
                    fulfill(results[0])

                }
            })
            .catch(reject);
    });
}

function parseSearchResults(data) {

    var lines = igv.splitLines(data),
        linesTrimmed = [],
        results = [];

    lines.forEach(function (item) {
        if ("" === item) {
            // do nothing
        } else {
            linesTrimmed.push(item);
        }
    });

    linesTrimmed.forEach(function (line) {
        // Example result -  EGFR	chr7:55,086,724-55,275,031	refseq

        var tokens = line.split("\t");

        if (tokens.length >= 3) {
            results.push(tokens[1]);

        }

    });

    return results;

}

export default geneSearch