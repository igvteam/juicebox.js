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

/**
 * Created by Jim Robinson on 3/4/17.
 *
 * Page (site specific) code for the example pages.
 *
 */


// This file depends on bootstrap modifications to jQuery => jquery & bootstrap are required.  Do not import jquery here, need the jquery from the page.

import ModalTable from '../../node_modules/data-modal/js/modalTable.js'
import EncodeDataSource from '../../node_modules/data-modal/js/encodeDataSource.js'
import HICBrowser from '../../js/hicBrowser.js'
import * as hic from '../../js/hic.js'
import igv from '../../node_modules/igv/dist/igv.esm.min.js';
import {decodeQuery} from "../../js/urlUtils.js";

//import QRCode from './qrcode'

const juicebox = {}

export default juicebox

var lastGenomeId,
    qrcode,
    control_map_dropdown_id = 'hic-control-map-dropdown';

juicebox.init = async function (container, config) {

    var genomeChangeListener,
        $appContainer,
        $hic_share_url_modal,
        $e;

    if (config.urlShortener) {
        hic.setURLShortener(config.urlShortener);
    }

    genomeChangeListener = {

        receiveEvent: function (event) {
            var genomeId = event.data;

            if (lastGenomeId !== genomeId) {

                lastGenomeId = genomeId;

                if (config.trackMenu) {
                    var tracksURL = config.trackMenu.items.replace("$GENOME_ID", genomeId);
                    loadAnnotationSelector($('#' + config.trackMenu.id), tracksURL, "1D");
                }

                if (config.trackMenu2D) {
                    var annotations2dURL = config.trackMenu2D.items.replace("$GENOME_ID", genomeId);
                    loadAnnotationSelector($('#' + config.trackMenu2D.id), annotations2dURL, "2D");
                }

                if (EncodeDataSource.supportsGenome(genomeId)) {
                    $('#hic-encode-modal-button').show();
                    createEncodeTable(genomeId);
                }
                else {
                    $('#hic-encode-modal-button').hide();
                }
            }
        }
    };

    config = config || {};

    $appContainer = $(container);

    await hic.initApp(container, config)

    postCreateBrowser()


    function postCreateBrowser() {

        for (let browser of hic.allBrowsers) {
            browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
            browser.eventBus.subscribe("MapLoad", checkBDropdown);
            updateBDropdown(browser);
        }


        // Must manually trigger the genome change event on initial load
        if (HICBrowser.currentBrowser && HICBrowser.currentBrowser.genome) {
            genomeChangeListener.receiveEvent({data: HICBrowser.currentBrowser.genome.id})
        }


        if (config.mapMenu) {
            populatePulldown(config.mapMenu);
        }

        $hic_share_url_modal = $('#hic-share-url-modal');

        function maybeShortenURL(url) {
            if (url.length < 2048) {
                return hic.shortenURL(url)
            } else {
                igv.presentAlert("URL too long to shorten")
                return Promise.resolve(url)
            }
        }


        $hic_share_url_modal.on('show.bs.modal', async function (e) {

            var queryString,
                href,
                idx;

            href = new String(window.location.href);

            // This js file is specific to the aidenlab site, and we know we have only juicebox parameters.
            // Strip href of current parameters, if any
            idx = href.indexOf("?");
            if (idx > 0) href = href.substring(0, idx);

            const jbUrl = await hic.shortJuiceboxURL(href)

            getEmbeddableSnippet(jbUrl)
                .then(function (embedSnippet) {
                    var $hic_embed_url;

                    $hic_embed_url = $('#hic-embed');
                    $hic_embed_url.val(embedSnippet);
                    $hic_embed_url.get(0).select();
                });


            var shareUrl = jbUrl

            // Shorten second time
            // e.g. converts https://aidenlab.org/juicebox?juiceboxURL=https://goo.gl/WUb1mL  to https://goo.gl/ERHp5u

            var tweetContainer,
                config,
                $hic_share_url;

            $hic_share_url = $('#hic-share-url');
            $hic_share_url.val(shareUrl);
            $hic_share_url.get(0).select();

            tweetContainer = $('#tweetButtonContainer');
            tweetContainer.empty();
            config =
                {
                    text: 'Contact map: '
                };

            $('#emailButton').attr('href', 'mailto:?body=' + shareUrl);


            if (shareUrl.length < 100) {
                window.twttr.widgets
                    .createShareButton(shareUrl, tweetContainer.get(0), config)
                    .then(function (el) {
                        console.log("Tweet button updated");
                    });


                // QR code generation
                if (qrcode) {
                    qrcode.clear();
                    $('hic-qr-code-image').empty();
                } else {
                    config =
                        {
                            width: 128,
                            height: 128,
                            correctLevel: QRCode.CorrectLevel.H
                        };

                    qrcode = new QRCode(document.getElementById("hic-qr-code-image"), config);
                }

                qrcode.makeCode(shareUrl);
            }

        });

        $hic_share_url_modal.on('hidden.bs.modal', function (e) {
            $('#hic-embed-container').hide();
            $('#hic-qr-code-image').hide();
        });

        $('#hic-track-dropdown').parent().on('shown.bs.dropdown', function () {
            var browser;

            browser = HICBrowser.getCurrentBrowser();
            if (undefined === browser || undefined === browser.dataset) {
                igv.presentAlert('Contact map must be loaded and selected before loading tracks');
            }
        });

        $('#hic-embed-button').on('click', function (e) {
            $('#hic-qr-code-image').hide();
            $('#hic-embed-container').toggle();
        });

        $('#hic-qr-code-button').on('click', function (e) {
            $('#hic-embed-container').hide();
            $('#hic-qr-code-image').toggle();
        });

        $('#dataset_selector').on('change', function (e) {
            var $selected,
                url,
                browser;

            url = $(this).val();
            $selected = $(this).find('option:selected');

            browser = HICBrowser.getCurrentBrowser();
            if (undefined === browser) {
                igv.presentAlert('ERROR: you must select a map panel by clicking the panel header.');
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

            if (undefined === HICBrowser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {

                file = ($(this).get(0).files)[0];

                suffix = file.name.substr(file.name.lastIndexOf('.') + 1);

                if ('hic' === suffix) {
                    loadHicFile(file, file.name);
                } else {
                    HICBrowser.getCurrentBrowser().loadTracks([{url: file, name: file.name}]);
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

            if (undefined === HICBrowser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {
                url = $(this).val();
                loadHicFile(url);
            }

            $(this).val("");
            $('#hic-load-url-modal').modal('hide');

        });

        $('#track-load-url').on('change', function (e) {
            var url;

            if (undefined === HICBrowser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {
                url = $(this).val();
                HICBrowser.getCurrentBrowser().loadTracks([{url: url}]);
            }

            $(this).val("");
            $('#track-load-url-modal').modal('hide');

        });

        $('#annotation-selector').on('change', function (e) {
            var path,
                name;

            if (undefined === HICBrowser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {

                path = $(this).val();
                name = $(this).find('option:selected').text();

                const config = {url: path, name: name}
                if (path.indexOf("hgdownload.cse.ucsc.edu") > 0) {
                    config.indexed = false   //UCSC files are never indexed
                }
                HICBrowser.getCurrentBrowser().loadTracks([config]);
            }

            $('#hic-annotation-select-modal').modal('hide');
            $(this).find('option').removeAttr("selected");

        });

        $('#annotation-2D-selector').on('change', function (e) {
            var path,
                name;

            if (undefined === HICBrowser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {

                path = $(this).val();
                name = $(this).find('option:selected').text();

                HICBrowser.getCurrentBrowser().loadTracks([{url: path, name: name}]);
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

            hic.createBrowser(container, config)

                .then(function (browser) {

                    browser.eventBus.subscribe("GenomeChange", genomeChangeListener);

                    HICBrowser.setCurrentBrowser(browser);
                })

        });

        $('#hic-copy-link').on('click', function (e) {
            var success;
            $('#hic-share-url')[0].select();
            success = document.execCommand('copy');
            if (success) {
                $('#hic-share-url-modal').modal('hide');
            } else {
                alert("Copy not successful");
            }
        });

        $('#hic-embed-copy-link').on('click', function (e) {
            var success;
            $('#hic-embed')[0].select();
            success = document.execCommand('copy');
            if (success) {
                $('#hic-share-url-modal').modal('hide');
            } else {
                alert("Copy not successful");
            }
        });

        $e = $('button[id$=-map-dropdown]');
        $e.parent().on('show.bs.dropdown', function () {
            const id = $(this).children('.dropdown-toggle').attr('id');
            juicebox.currentContactMapDropdownButtonID = id;
        });

        $e.parent().on('hide.bs.dropdown', function () {
            console.log("hide contact/control map");
        });

        hic.eventBus.subscribe("BrowserSelect", function (event) {
            updateBDropdown(event.data);
        });
    }

    function getEmbeddableSnippet(jbUrl) {

        return new Promise(function (fulfill, reject) {
            var idx, embedUrl, params, width, height;

            idx = jbUrl.indexOf("?");
            params = jbUrl.substring(idx);
            embedUrl = (config.embedTarget || getEmbedTarget()) + params;
            width = $appContainer.width() + 50;
            height = $appContainer.height();
            fulfill('<iframe src="' + embedUrl + '" width="100%" height="' + height + '" frameborder="0" style="border:0" allowfullscreen></iframe>');

            // Disable shortening the embedUrl for now -- we don't want to bake in the embedTarget
            // shortenURL(embedUrl)
            //     .then(function (shortURL) {
            //         fulfill('<iframe src="' + shortURL + '" width="100%" height="' + height + '" frameborder="0" style="border:0" allowfullscreen></iframe>');
            //     });
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
        return href.substring(0, idx) + "/embed.html"

    }

};


function checkBDropdown() {
    updateBDropdown(HICBrowser.getCurrentBrowser());
}

function updateBDropdown(browser) {
    if (browser) {
        if (browser.dataset) {
            $('#hic-control-map-dropdown').removeClass('disabled');
        } else {
            $('#hic-control-map-dropdown').addClass('disabled');
        }
    }
}

function loadHicFile(url, name) {

    var synchState, browsersWithMaps, isControl, browser, query, config, uriDecode;

    browsersWithMaps = hic.allBrowsers.filter(function (browser) {
        return browser.dataset !== undefined;
    });

    if (browsersWithMaps.length > 0) {
        synchState = browsersWithMaps[0].getSyncState();
    }

    isControl = juicebox.currentContactMapDropdownButtonID === control_map_dropdown_id;

    browser = HICBrowser.getCurrentBrowser();

    config = {url: url, name: name, isControl: isControl};


    if (igv.isString(url) && url.includes("?")) {
        query = hic.extractQuery(url);
        uriDecode = url.includes("%2C");
        decodeQuery(query, config, uriDecode);
    }


    if (isControl) {
        browser
            .loadHicControlFile(config)
            .then(function (dataset) {

            });
    } else {
        browser.reset();

        browsersWithMaps = hic.allBrowsers.filter(function (browser) {
            return browser.dataset !== undefined;
        });

        if (browsersWithMaps.length > 0) {
            config["synchState"] = browsersWithMaps[0].getSyncState();
        }


        browser
            .loadHicFile(config)
            .then(function (ignore) {
                if (!isControl) {
                    hic.syncBrowsers(hic.allBrowsers);
                }
                $('#hic-control-map-dropdown').removeClass('disabled');
            });
    }
}

function populatePulldown(menu) {

    var parent;

    parent = $("#" + menu.id);

    igv.xhr.loadString(menu.items)

        .then(function (data) {
            var lines = igv.splitLines(data),
                len = lines.length,
                tokens,
                i;

            for (i = 0; i < len; i++) {
                tokens = lines[i].split('\t');
                if (tokens.length > 1) {
                    parent.append($('<option value="' + tokens[0] + '">' + tokens[1] + '</option>'))
                }

            }
            parent.selectpicker("refresh");
        })
        .catch(function (error) {
            console.log(error);
        })
}


const encodeModal = new ModalTable({
    id: "hic-encode-modal",
    title: "ENCODE",
    selectHandler: function (selected) {
        HICBrowser.getCurrentBrowser().loadTracks(selected);
    }
})

function createEncodeTable(genomeId) {
    const datasource = new EncodeDataSource(genomeId)
    encodeModal.setDatasource(datasource)
}


function loadAnnotationSelector($container, url, type) {

    var elements;

    $container.empty();

    elements = [];
    elements.push('<option value=' + '-' + '>' + '-' + '</option>');

    igv.xhr
        .loadString(url)
        .then(function (data) {
            var lines = data ? igv.splitLines(data) : [];
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

    // For now we will pretend that igv does not support bedpe, we want these loaded as 2D tracks
    if (path.endsWith(".bedpe") || path.endsWith(".bedpe.gz")) {
        return false;
    }

    var config = {url: path};
    igv.inferTrackTypes(config);
    return config.type !== undefined;

}





