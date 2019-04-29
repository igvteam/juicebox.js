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

import juicebox from './site.js'
import $ from '../../vendor/jquery-1.12.4.js'


$(document).ready(function () {

    var config = {
        mapMenu: {
            id: 'dataset_selector',
            items: 'res/mapMenuData.txt'
        },
        trackMenu: {
            id: 'annotation-selector',
            items: 'https://hicfiles.s3.amazonaws.com/internal/tracksMenu_$GENOME_ID.txt'
        },
        trackMenu2D: {
            id: 'annotation-2D-selector',
            items: 'https://hicfiles.s3.amazonaws.com/internal/tracksMenu_2D.$GENOME_ID.txt'
        },

        // List of URL shorteners.  First in the list is the default and will be used for shortening URLs
        // Others potentiall used for expanding short URLs.  At least 1 shortener is required for the
        // "Share" button.
        // NOTE: you must provide an API key (Google) or access token (Bitly) to use these services on your site
        urlShortener: [
            {
                provider: "bitly",
                apiKey: "ABCD",        // TODO -- replace with your Bitly access token
                hostname: 'bit.ly'
            },
            {
                provider: "google",
                apiKey: "ABCD",        // TODO -- replace with your Google API Key
                hostname: "goo.gl"
            }

        ],

        apiKey: "ABCD",   // TODO -- replace with your Google API Key

    };

    juicebox.init($('#app-container')[0], config);
})

