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
 * Created by dat on 3/8/17.
 */


var urlShorteners;

const urlUtils = {

    setURLShortener: function (shortenerConfigs) {

        if (!shortenerConfigs || shortenerConfigs === "none") {

        } else {
            urlShorteners = [];
            shortenerConfigs.forEach(function (config) {
                urlShorteners.push(getShortener(config));
            })
        }

        function getShortener(shortener) {
            if (shortener.provider) {
                if (shortener.provider === "google") {
                    return new GoogleURL(shortener);
                }
                else if (shortener.provider === "bitly") {
                    return new BitlyURL(shortener);
                }
                else {
                    igv.presentAlert("Unknown url shortener provider: " + shortener.provider);
                }
            }
            else {    // Custom
                if (typeof shortener.shortenURL === "function" &&
                    typeof shortener.expandURL === "function" &&
                    typeof shortener.hostname === "string") {
                    return shortener;
                }
                else {
                    igv.presentAlert("URL shortener object must define functions 'shortenURL' and 'expandURL' and string constant 'hostname'")
                }
            }
        }
    },

    shortenURL: function (url) {
        if (urlShorteners) {
            return urlShorteners[0].shortenURL(url);
        }
        else {
            return Promise.resolve(url);
        }
    },

    /**
     * Returns a promise to expand the URL
     */
    expandURL: function (url) {

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

        igv.presentAlert("No expanders for URL: " + url);

        return Promise.resolve(url);
    },

    shortJuiceboxURL: async function (base) {

        var url, queryString,
            self = this;

        queryString = "{";
        hic.allBrowsers.forEach(function (browser, index) {
            queryString += encodeURIComponent(browser.getQueryString());
            queryString += (index === hic.allBrowsers.length - 1 ? "}" : "},{");
        });

        const compressedString = compressQueryParameter(queryString)

        url = base + "?juiceboxData=" + compressedString

        if (url.length > 2048) {
            return url
        }
        else {
            return self.shortenURL(url)
        }
    },


    decodeJBUrl: function (jbURL) {

        let q
        const queryMap = hic.extractQuery(jbURL)

        if (queryMap.hasOwnProperty("juicebox")) {
            q = queryMap["juicebox"];
            if (q.startsWith("%7B")) {
                q = decodeURIComponent(q);
            }
        }
        else if (queryMap.hasOwnProperty("juiceboxData")) {
            const compressed = queryMap["juiceboxData"]
            q = this.decompressQueryParameter(compressed)
        }

        if (q) {
            q = q.substr(1, q.length - 2);  // Strip leading and trailing bracket
            const parts = q.split("},{");

            return {
                queryString: decodeURIComponent(parts[0]),
                oauthToken: oauthToken
            }
        }
        else {
            return undefined
        }
    },

    decompressQueryParameter: function (enc) {

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
}


var BitlyURL = function (config) {
    this.api = "https://api-ssl.bitly.com";
    this.apiKey = (!config.apiKey || "ABCD" === config.apiKey) ? fetchBitlyApiKey : config.apiKey;
    this.hostname = config.hostname ? config.hostname : "bit.ly";
    this.devIP = "192.168.1.11";   // For development, replace with your IP address. Bitly will not shorten localhost !
}


BitlyURL.prototype.shortenURL = function (url) {

    var self = this;

    if (url.startsWith("http://localhost")) url = url.replace("localhost", this.devIP);  // Dev hack

    return getApiKey.call(this)

        .then(function (key) {
            var endpoint = self.api + "/v3/shorten?access_token=" + key + "&longUrl=" + encodeURIComponent(url);

            return igv.xhr.loadJson(endpoint, {})
        })

        .then(function (json) {
            // TODO check status code
            if (500 === json.status_code) {
                igv.presentAlert("Error shortening URL: " + json.status_txt)
                return undefined
            } else {
                return json.data.url;
            }
        })
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


var GoogleURL = function (config) {
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

function getApiKey() {

    var self = this, token;

    if (typeof self.apiKey === "string") {
        return Promise.resolve(self.apiKey);
    }
    else if (typeof self.apiKey === "function") {

        token = self.apiKey();

        if (typeof token.then === "function") {
            return token.then(function (key) {
                self.apiKey = key;
                return key;
            })
        } else {
            self.apiKey = token;
            return Promise.resolve(token);
        }
    }
    else {
        throw new Error("Unknown apiKey type: " + this.apiKey);
    }
}


// Example function for fetching an api key.
function fetchBitlyApiKey() {
    return igv.xhr.loadJson("https://s3.amazonaws.com/igv.org.restricted/bitly.json", {})
        .then(function (json) {
            return json["apiKey"];
        })
        .catch(function (error) {
            console.error(error);
        })
}

// Example function for fetching an api key.
function fetchGoogleApiKey() {
    return igv.xhr.loadJson("https://s3.amazonaws.com/igv.org.restricted/google.json", {})
        .then(function (json) {
            return json["apiKey"];
        })
        .catch(function (error) {
            console.error(error);
        })
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

// function decompressQueryParameter(enc) {
//
//     enc = enc.replace(/\./g, '+').replace(/_/g, '/').replace(/-/g, '=')
//
//     const compressedString = atob(enc);
//     const compressedBytes = [];
//     for (let i = 0; i < compressedString.length; i++) {
//         compressedBytes.push(compressedString.charCodeAt(i));
//     }
//     const bytes = new Zlib.RawInflate(compressedBytes).decompress();
//
//     let str = ''
//     for (let b of bytes) {
//         str += String.fromCharCode(b)
//     }
//
//     return str;
// }

export default urlUtils