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
var aidenlabSite = (function (site, config) {

    var apiKey,
        encodeTable,
        genomeChangeListener,
        browserListener,
        lastGenomeId,
        $appContainer;
    
    genomeChangeListener = {

        receiveEvent: function (event) {
            var browserRetrievalFunction,
                genomeId = event.data,
                tracksURL,
                annotations2dURL;

            if (lastGenomeId !== genomeId) {

                lastGenomeId = genomeId;

                tracksURL = "https://hicfiles.s3.amazonaws.com/internal/tracksMenu_" + genomeId + ".txt";
                annotations2dURL = "https://hicfiles.s3.amazonaws.com/internal/tracksMenu_2D." + genomeId + ".txt";

                loadAnnotationSelector($('#annotation-selector'), tracksURL, "1D");
                loadAnnotationSelector($('#annotation-2D-selector'), annotations2dURL, "2D");

                browserRetrievalFunction = function () {
                    return hic.Browser.getCurrentBrowser();
                };

                createEncodeTable(browserRetrievalFunction, event.data);
            }
        }
    };

    browserListener = {
        receiveEvent: function (event) {

            if (encodeTable) {
                encodeTable.browser = event.data;
            }

        }
    };


    site.init = function ($container, config) {

        var query,
            $hic_share_url_modal;

        config = config || {};
        
        $appContainer = $container;

        apiKey = config.apiKey || "AIzaSyDUUAUFpQEN4mumeMNIRWXSiTh5cPtUAD0";
        igv.setApiKey(apiKey);

        query = hic.extractQuery(window.location.href);

        if (query && query.hasOwnProperty("juiceboxURL")) {

            expandURL(query["juiceboxURL"])
                .then(function (jbURL) {

                    query = hic.extractQuery(jbURL);
                    createBrowsers(query);

                });
        }
        else {
            createBrowsers(query);
        }

        function createBrowsers(query) {

            var query, parts, q, browser, i;

            if (query && query.hasOwnProperty("juicebox")) {
                q = query["juicebox"];

                if (q.startsWith("%7B")) {
                    q = decodeURIComponent(q);
                }

                q = q.substr(1, q.length - 2);  // Strip leading and trailing bracket
                parts = q.split("},{");
                browser = hic.createBrowser($container.get(0), {queryString: decodeURIComponent(parts[0])});
                browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
                if (parts && parts.length > 1) {
                    for (i = 1; i < parts.length; i++) {
                        browser = hic.createBrowser($container.get(0), {queryString: decodeURIComponent(parts[i])});
                        browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
                    }
                    hic.syncBrowsers(hic.allBrowsers);
                }
            } else {
                browser = hic.createBrowser($container.get(0), {});
                browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
            }
        }

        $hic_share_url_modal = $('#hic-share-url-modal');

        $hic_share_url_modal.on('show.bs.modal', function (e) {
            // $hic_share_url_modal.on('show.bs.modal', function (e) {

            var queryString,
                href,
                idx;

            href = new String(window.location.href);

            // This js file is specific to the aidenlab site, and we know we have only juicebox parameters.
            // Strip href of current parameters, if any
            idx = href.indexOf("?");
            if (idx > 0) href = href.substring(0, idx);

            shortJuiceboxURL(href)

                .then(function (jbUrl) {

                    getEmbeddableSnippet(jbUrl)
                        .then(function (embedSnippet) {
                            var $hic_embed_url;

                            $hic_embed_url = $('#hic-embed');
                            $hic_embed_url.val(embedSnippet);
                            $hic_embed_url.get(0).select();
                        });

                    shortenURL(jbUrl)

                        .then(function (shortURL) {

                            // Shorten second time
                            // e.g. converts https://aidenlab.org/juicebox?juiceboxURL=https://goo.gl/WUb1mL  to https://goo.gl/ERHp5u

                            var tweetContainer,
                                emailContainer,
                                config,
                                $hic_share_url;

                            $hic_share_url = $('#hic-share-url');
                            $hic_share_url.val(shortURL);
                            $hic_share_url.get(0).select();

                            tweetContainer = $('#tweetButtonContainer');
                            tweetContainer.empty();
                            config =
                            {
                                text: 'Contact map: '
                            };
                            window.twttr.widgets
                                .createShareButton(shortURL, tweetContainer.get(0), config)
                                .then(function (el) {
                                    console.log("Tweet button updated");
                                });

                            $('#emailButton').attr('href', 'mailto:?body=' + shortURL);
                        });
                });
        });

        $hic_share_url_modal.on('hidden.bs.modal', function (e) {
            $('#hic-embed-container').hide();
        });

        $('#hic-embed-button').on('click', function (e) {
            $('#hic-embed-container').show();
        });

        $('#dataset_selector').on('change', function (e) {
            var $selected,
                url;

            url = $(this).val();
            $selected = $(this).find('option:selected');

            if (undefined === hic.Browser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {
                loadHicFile(url, $selected.text());
            }

            $('#hic-contact-map-select-modal').modal('hide');
            $(this).find('option').removeAttr("selected");

        });

        $('.selectpicker').selectpicker();

        $('#hic-load-local-file').on('change', function (e) {

            var file,
                suffix;

            if (undefined === hic.Browser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {

                file = _.first($(this).get(0).files);

                suffix = file.name.substr(file.name.lastIndexOf('.') + 1);

                if ('hic' === suffix) {
                    loadHicFile(file, file.name);
                } else {
                    hic.Browser.getCurrentBrowser().loadTrack([{url: file, name: file.name}]);
                }
            }

            $(this).val("");
            $('#hic-load-local-file-modal').modal('hide');

        });

        $('#hic-load-url').on('change', function (e) {
            var url,
                suffix,
                paramIdx,
                path;

            if (undefined === hic.Browser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {
                url = $(this).val();

                paramIdx = url.indexOf("?");
                path = paramIdx > 0 ? url.substring(0, paramIdx) : url;

                loadHicFile(url, hic.extractFilename(path));
            }

            $(this).val("");
            $('#hic-load-url-modal').modal('hide');

        });

        $('#track-load-url').on('change', function (e) {
            var url,
                suffix,
                paramIdx,
                path;

            if (undefined === hic.Browser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {
                url = $(this).val();

                paramIdx = url.indexOf("?");
                path = paramIdx > 0 ? url.substring(0, paramIdx) : url;

                hic.Browser.getCurrentBrowser().loadTrack([{url: url, name: hic.extractFilename(path)}]);
            }

            $(this).val("");
            $('#hic-load-url-modal').modal('hide');

        });

        $('#annotation-selector').on('change', function (e) {
            var path,
                name;

            if (undefined === hic.Browser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {

                path = $(this).val();
                name = $(this).find('option:selected').text();

                hic.Browser.getCurrentBrowser().loadTrack([{url: path, name: name}]);
            }

            $('#hic-annotation-select-modal').modal('hide');
            $(this).find('option').removeAttr("selected");

        });

        $('#annotation-2D-selector').on('change', function (e) {
            var path,
                name;

            if (undefined === hic.Browser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {

                path = $(this).val();
                name = $(this).find('option:selected').text();

                hic.Browser.getCurrentBrowser().loadTrack([{url: path, name: name}]);
            }

            $('#hic-annotation-2D-select-modal').modal('hide');
            $(this).find('option').removeAttr("selected");
        });

        $('.juicebox-app-clone-button').on('click', function (e) {

            var browser,
                config;

            config =
            {
                initFromUrl: false,
                updateHref: false
            };
            browser = hic.createBrowser($container.get(0), config);

            browser.eventBus.subscribe("GenomeChange", genomeChangeListener);

            hic.syncBrowsers(hic.allBrowsers);

        });

        $('#hic-copy-link').on('click', function (e) {
            var success;
            $('#hic-share-url')[0].select();
            success = document.execCommand('copy');
            if (success) {
                $('#hic-share-url-modal').modal('hide');
            }
            else {
                alert("Copy not successful");
            }
        });

        $('#hic-embed-copy-link').on('click', function (e) {
            var success;
            $('#hic-embed')[0].select();
            success = document.execCommand('copy');
            if (success) {
                $('#hic-share-url-modal').modal('hide');
            }
            else {
                alert("Copy not successful");
            }
        });


        function getEmbeddableSnippet(jbUrl) {

            return new Promise(function (fulfill, reject) {
                var idx, embedUrl, params, width, height;

                idx = jbUrl.indexOf("?");
                params = jbUrl.substring(idx);
                embedUrl = (config.embedTarget || getEmbedTarget()) + params;
                width = $appContainer.width() + 50;
                height = $appContainer.height();

                shortenURL(embedUrl)
                    .then(function (shortURL) {
                        fulfill('<iframe src="' + shortURL + '" width="100%" height="' + height + '" frameborder="0" style="border:0" allowfullscreen></iframe>');
                    });
            });

        }

        /**
         * Get the default embed html target.  Assumes an "embed.html" file in same directory as this page
         */
        function getEmbedTarget() {

            var href, idx;
            href = new String(window.location.href);

            idx = href.indexOf("?");
            if (idx > 0) href = href.substring(0, idx);

            idx = href.lastIndexOf("/");
            return href.substring(0, idx) + "/embed/embed.html"

        }

    };

    function loadHicFile(url, name) {
        var synchState;

        if (hic.allBrowsers.length > 1) {
            synchState = hic.allBrowsers[0].getSyncState();
        }

        hic.Browser.getCurrentBrowser().loadHicFile({url: url, name: name, synchState: synchState});
    }

    function createEncodeTable(browserRetrievalFunction, genomeId) {

        var config,
            columnWidths,
            encodeTableFormat;

        if (encodeTable && genomeId === encodeTable.genomeID()) {
            // do nothing
        } else {

            if (encodeTable) {
                discardEncodeTable();
            }

            columnWidths =
            {
                'Assembly': '10%',
                'Cell Type': '10%',
                'Target': '10%',
                'Assay Type': '20%',
                'Output Type': '20%',
                'Lab': '20%'
            };

            encodeTableFormat = new igv.EncodeTableFormat({columnWidths: columnWidths});

            config =
            {
                $modal: $('#hicEncodeModal'),
                $modalBody: $('#encodeModalBody'),
                $modalTopCloseButton: $('#encodeModalTopCloseButton'),
                $modalBottomCloseButton: $('#encodeModalBottomCloseButton'),
                $modalGoButton: $('#encodeModalGoButton'),
                browserRetrievalFunction: browserRetrievalFunction,
                browserLoadFunction: 'loadTrack',
                dataSource: new igv.EncodeDataSource({genomeID: genomeId}, encodeTableFormat)
            };

            encodeTable = new igv.IGVModalTable(config);

        }

    }

    function discardEncodeTable() {
        encodeTable.teardown();
        encodeTable = undefined;
    }

    function loadAnnotationSelector($container, url, type) {

        var elements;

        $container.empty();

        elements = [];
        elements.push('<option value=' + '-' + '>' + '-' + '</option>');

        igv.xhr
            .loadString(url)
            .then(function (data) {
                var lines = data ? data.splitLines() : [];
                lines.forEach(function (line) {
                    var tokens = line.split('\t');
                    if (tokens.length > 1 && ("2D" === type || igvSupports(tokens[1]))) {
                        elements.push('<option value=' + tokens[1] + '>' + tokens[0] + '</option>');
                    }
                });
                $container.append(elements.join(''));

            })
            .catch(function (error) {
                console.log("Error loading track menu: " + url + "  " + error);
            })
    }

    function igvSupports(path) {
        var config = {url: path};
        igv.inferTrackTypes(config);
        return config.type !== undefined;

    }

    function shortJuiceboxURL(base) {

        return new Promise(function (fulfill, reject) {

            var endpoint, body, url, queryString;

            url = base + "?juicebox=";

            queryString = "{";
            hic.allBrowsers.forEach(function (browser, index) {
                queryString += encodeURIComponent(browser.getQueryString());
                queryString += (index === hic.allBrowsers.length - 1 ? "}" : "},{");
            });

            url = url + encodeURIComponent(queryString);

            shortenURL(url)

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

                    fulfill(url);

                })
        });

    }

    function shortenURL(url) {

        if(undefined === apiKey) {
            return Promise.resolve(url);
        }
        else {
            var endpoint = "https://www.googleapis.com/urlshortener/v1/url?shortUrl=" + url + "&key=" + apiKey;

            return new Promise(function (fulfill, reject) {
                igv.xhr.loadJson(endpoint,
                    {
                        sendData: JSON.stringify({"longUrl": url}),
                        contentType: "application/json"
                    })
                    .then(function (json) {
                        fulfill(json.id);
                    })
            });
        }
    }

    function expandURL(url) {

        var endpoint;

        if (apiKey && url.includes("goo.gl")) {

            endpoint = "https://www.googleapis.com/urlshortener/v1/url?shortUrl=" + url + "&key=" + apiKey;

            return new Promise(function (fulfill, reject) {
                igv.xhr.loadJson(endpoint,
                    {
                        contentType: "application/json"
                    })
                    .then(function (json) {
                        fulfill(json.longUrl);
                    })
            });
        }
        else {
            // Not a google url or no api key
            return Promise.resolve(url);
        }

    }


    return site;

})({});

