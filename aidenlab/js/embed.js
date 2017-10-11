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
 * Created by Jim Robinson on 3/4/17.
 *
 * Page (site specific) code for the example pages.
 *
 */
var site = (function (site) {

    var apiKey = "AIzaSyDUUAUFpQEN4mumeMNIRWXSiTh5cPtUAD0";


    site.init = function ($container) {

        var query, parts, q, browser, i;

        if (apiKey) igv.setApiKey(apiKey);

        query = hic.extractQuery(window.location.href);

        if (query && query.hasOwnProperty("juicebox")) {
            q = query["juicebox"];

            if(q.startsWith("%7B")) {
                q = decodeURIComponent(q);
            }

            q = q.substr(1, q.length - 2);  // Strip leading and trailing bracket
            parts = q.split("},{");
            console.log(parts[0]);
            browser = hic.createBrowser($container.get(0), {href: decodeURIComponent(parts[0])});
        } else {
            browser = hic.createBrowser($container.get(0), {});
        }

        if (parts && parts.length > 1) {
            for (i = 1; i < parts.length; i++) {
                browser = hic.createBrowser($container.get(0), {href: decodeURIComponent(parts[i])});
            }
            hic.syncBrowsers(hic.allBrowsers);
        }

    }

    function loadHicFile(url, name) {
        var synchState;

        if (hic.allBrowsers.length > 1) {
            synchState = hic.allBrowsers[0].getSyncState();
        }

        hic.Browser.getCurrentBrowser().loadHicFile({url: url, name: name, synchState: synchState});
    }


    return site;

})(site || {});

