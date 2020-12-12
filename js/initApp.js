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


import {decodeQuery, extractQuery, extractConfig} from "./urlUtils.js"
import {restoreSession} from "./session.js"
import {getCurrentBrowser} from "./createBrowser.js"

let appContainer;

async function initApp(container, config) {

    appContainer = container;

    let query = {};

    if (false !== config.queryParametersSupported) {
        query = extractQuery(window.location.href);
        const queryConfig = extractConfig(query);
        if(queryConfig) {
            config= queryConfig;
        }
    }

    await restoreSession(container, config);

    // Return the currently selected browser for backward compatibility with "createBrowser"
    return getCurrentBrowser();
}


export {
    initApp
}

// async function createBrowsers(container, query) {
//     let q;
//     if (query) {
//         if (query.hasOwnProperty("juicebox")) {
//             q = query["juicebox"];
//             if (q.startsWith("%7B")) {
//                 q = decodeURIComponent(q);
//             }
//         } else if (query.hasOwnProperty("juiceboxData")) {
//             q = decompressQueryParameter(query["juiceboxData"])
//         }
//     }
//
//     const browsers = [];
//     if (q) {
//         q = q.substr(1, q.length - 2);  // Strip leading and trailing bracket
//         const parts = q.split("},{");
//         const decoded = decodeURIComponent(parts[0]);
//         const browser = await createBrowser(container, {queryString: decoded})
//         browsers.push(browser);
//         if (parts && parts.length > 1) {
//             const promises = []
//             for (let i = 1; i < parts.length; i++) {
//                 promises.push(createBrowser(container, {queryString: decodeURIComponent(parts[i])}))
//                 //const b = await createBrowser($container.get(0), {queryString: decodeURIComponent(parts[i])})
//                 // b.eventBus.subscribe("GenomeChange", genomeChangeListener);
//                 // b.eventBus.subscribe("MapLoad", checkBDropdown);
//             }
//
//             const tmp = await Promise.all(promises)
//             for (let b of tmp) browsers.push(b);
//         }
//     } else {
//         const browser = await createBrowser(container, {})
//         browsers.push(browser);
//     }
//     return browsers;
// }


// async function expandJuiceboxUrl(query) {
//     if (query && query.hasOwnProperty("juiceboxURL")) {
//         const jbURL = await expandURL(query["juiceboxURL"])   // Legacy bitly urls
//         return extractQuery(jbURL);
//     } else {
//         return query
//     }
// }



