/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2019 The Regents of the University of California
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

import igv from '../node_modules/igv/dist/igv.esm.min.js';

const GoogleURL = function (config) {
    this.api = "https://www.googleapis.com/urlshortener/v1/url";
    this.apiKey = (!config.apiKey || "ABCD" === config.apiKey) ? fetchGoogleApiKey : config.apiKey;
    this.hostname = config.hostname || "goo.gl";
}

GoogleURL.prototype.shortenURL = function (url) {

    var self = this;

    return getApiKey.call(this)

        .then(function (key) {

            var endpoint = self.api + "?key=" + key;

            return igv.xhr.loadJson(endpoint,
                {
                    sendData: JSON.stringify({"longUrl": url}),
                    contentType: "application/json"
                })
        })
        .then(function (json) {
            return json.id;
        })
}


GoogleURL.prototype.expandURL = function (url) {

    var self = this;
    return getApiKey.call(this)

        .then(function (apiKey) {

            var endpoint;

            if (url.includes("goo.gl")) {

                endpoint = self.api + "?shortUrl=" + url + "&key=" + apiKey;

                return igv.xhr.loadJson(endpoint, {contentType: "application/json"})
                    .then(function (json) {
                        return json.longUrl;
                    })
            }
            else {
                // Not a google url or no api key
                return Promise.resolve(url);
            }
        })
}


async function getApiKey() {

    var self = this, token;

    if (typeof self.apiKey === "string") {
        return self.apiKey
    }
    else if (typeof self.apiKey === "function") {
        return await self.apiKey();
    }
    else {
        throw new Error("Unknown apiKey type: " + this.apiKey);
    }
}


// Example function for fetching an api key.
async function fetchGoogleApiKey() {
    const json = await igv.xhr.loadJson("https://s3.amazonaws.com/igv.org.restricted/google.json", {})
    return json["apiKey"];

}


export default GoogleURL