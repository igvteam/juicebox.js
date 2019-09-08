

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

import igv from '../node_modules/igv/dist/igv.esm.min.js';

var BitlyURL = function (config) {
    this.api = "https://api-ssl.bitly.com";
    this.apiKey = (!config.apiKey || "ABCD" === config.apiKey) ? fetchBitlyApiKey : config.apiKey;
    this.hostname = config.hostname ? config.hostname : "bit.ly";
    this.devIP = "192.168.1.11";   // For development, replace with your IP address. Bitly will not shorten localhost !
}


BitlyURL.prototype.shortenURL = async function (url) {

    var self = this;

    if (url.startsWith("http://localhost")) url = url.replace("localhost", this.devIP);  // Dev hack

    try {
        const key = await getApiKey.call(this)

        var endpoint = self.api + "/v3/shorten?access_token=" + key + "&longUrl=" + encodeURIComponent(url);

        const json = await igv.xhr.loadJson(endpoint, {})

        // TODO check status code
        if (500 === json.status_code) {
            alert("Error shortening URL: " + json.status_txt)
            //igv.presentAlert("Error shortening URL: " + json.status_txt)
            return url
        } else {
            return json.data.url;
        }
    } catch (e) {
        alert("Error shortening URL: " + e)
        //igv.presentAlert("Error shortening URL: " + e)
        return url
    }

};


BitlyURL.prototype.expandURL = function (url) {

    var self = this;

    return getApiKey.call(this)

        .then(function (key) {

            var endpoint = self.api + "/v3/expand?access_token=" + key + "&shortUrl=" + encodeURIComponent(url);

            return igv.xhr.loadJson(endpoint, {})
        })

        .then(function (json) {

            var longUrl = json.data.expand[0].long_url;

            // Fix some Bitly "normalization"
            longUrl = longUrl.replace("{", "%7B").replace("}", "%7D");

            return longUrl;

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
async function fetchBitlyApiKey() {
    const json = await igv.xhr.loadJson("https://s3.amazonaws.com/igv.org.restricted/bitly.json", {})
    return json["apiKey"];

}

export default BitlyURL