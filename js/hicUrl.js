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
var hic = (function (hic) {

    var urlShorteners;

    hic.setURLShortener = function (shortenerConfigs) {

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
                    typeof shortner.hostname === "string") {
                    return shortener;
                }
                else {
                    igv.presentAlert("URL shortener object must define functions 'shortenURL' and 'expandURL' and string constant 'hostname'")
                }
            }
        }
    }

    hic.shortenURL = function (url) {
        if (urlShorteners) {
            return urlShorteners[0].shortenURL(url);
        }
        else {
            return Promise.resolve(url);
        }
    }

    /**
     * Expand the shortened URL.  Currently we support google and bitly.
     *
     * TODO -- support custom shortener
     *
     * Returns a promise to expand the URL
     */
    hic.expandURL = function (url) {

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
    }

    hic.shortJuiceboxURL = function (base) {

        var url, queryString,
            self = this;

        url = base + "?juicebox=";

        queryString = "{";
        hic.allBrowsers.forEach(function (browser, index) {
            queryString += encodeURIComponent(browser.getQueryString());
            queryString += (index === hic.allBrowsers.length - 1 ? "}" : "},{");
        });

        url = url + encodeURIComponent(queryString);

        return self.shortenURL(url)

            .then(function (shortURL) {

                // Now shorten a second time, with short url as a parameter.  This solves the problem of
                // the expanded url (after a redirect) being over the browser limit.

                var idx, href, url;

                href = window.location.href;
                idx = href.indexOf("?");
                if (idx > 0) {
                    href = href.substr(0, idx);
                }

                url = href + "?juiceboxURL=" + shortURL;
                return url;
            })
    };


    hic.decodeJBUrl = function (jbURL) {

        var q, parts, config;

        q = hic.extractQuery(jbURL)["juicebox"];

        if (q.startsWith("%7B")) {
            q = decodeURIComponent(q);
        }

        q = q.substr(1, q.length - 2);  // Strip leading and trailing bracket
        parts = q.split("},{");

        return {
            queryString: decodeURIComponent(parts[0]),
            oauthToken: oauthToken
        }
    }


    var BitlyURL = function (config) {
        this.api = "https://api-ssl.bitly.com";
        this.apiKey = (!config.apiKey || "ABCD" === config.apiKey) ? "76670dc60b519eaf9be4fc1c227b4f3e3b3a5e26" : config.apiKey;
        this.hostname = config.hostname ? config.hostname : "bit.ly";
        this.devIP = "192.168.1.11";   // For development, replace with your IP address. Bitly will not shorten localhost !
    }


    BitlyURL.prototype.shortenURL = function (url) {

        if (url.startsWith("http://localhost")) url = url.replace("localhost", this.devIP);  // Dev hack

        var endpoint = this.api + "/v3/shorten?access_token=" + this.apiKey + "&longUrl=" + encodeURIComponent(url);
        return igv.xhr.loadJson(endpoint, {})

            .then(function (json) {
                return json.data.url;
            })

    };

    BitlyURL.prototype.expandURL = function (url) {

        var endpoint = this.api + "/v3/expand?access_token=" + this.apiKey + "&shortUrl=" + encodeURIComponent(url);

        return igv.xhr.loadJson(endpoint, {})

            .then(function (json) {

                var longUrl = json.data.expand[0].long_url;

                // Fix some Bitly "normalization"
                longUrl = longUrl.replace("{", "%7B").replace("}", "%7D");

                return longUrl;

            })
    }


    var GoogleURL = function (config) {
        this.apiKey = (!config.apiKey || "ABCD" === config.apiKey) ? "AIzaSyDUUAUFpQEN4mumeMNIRWXSiTh5cPtUAD0" : config.apiKey;
        this.hostname = config.hostname || "goo.gl";
    }

    GoogleURL.prototype.shortenURL = function (url) {

        var apiKey = this.apiKey;

        if (!apiKey) {
            return Promise.resolve(url);
        }
        else {
            var endpoint = "https://www.googleapis.com/urlshortener/v1/url" + "?key=" + apiKey;

            return igv.xhr.loadJson(endpoint,
                {
                    sendData: JSON.stringify({"longUrl": url}),
                    contentType: "application/json"
                })
                .then(function (json) {
                    return json.id;
                })
        }
    };

    GoogleURL.prototype.expandURL = function (url) {

        var endpoint,
            apiKey = this.apiKey;

        if (apiKey && url.includes("goo.gl")) {

            endpoint = "https://www.googleapis.com/urlshortener/v1/url?shortUrl=" + url + "&key=" + apiKey;

            return igv.xhr.loadJson(endpoint,
                {
                    contentType: "application/json"
                })
                .then(function (json) {
                    return json.longUrl;
                })
        }
        else {
            // Not a google url or no api key
            return Promise.resolve(url);
        }
    };


    return hic;

})
(hic || {});
