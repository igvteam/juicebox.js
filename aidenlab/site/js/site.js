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

    var encodeTable,
        genomeChangeListener,
        browserListener;

    genomeChangeListener = {

        receiveEvent: function (event) {
            var browserRetrievalFunction,
                genomeId = event.data,
                tracksURL,
                annotations2dURL;

            tracksURL = "https://hicfiles.s3.amazonaws.com/internal/tracksMenu_" + genomeId + ".txt";
            annotations2dURL = "https://hicfiles.s3.amazonaws.com/internal/tracksMenu_2D." + genomeId + ".txt";

            loadAnnotationSelector($('#annotation-selector'), tracksURL, "1D");
            loadAnnotationSelector($('#annotation-2D-selector'), annotations2dURL, "2D");

            browserRetrievalFunction = function () {
                return hic.Browser.getCurrentBrowser();
            };

            createEncodeTable(browserRetrievalFunction, $('#encodeModalBody'), event.data);
        }
    };

    browserListener = {
        receiveEvent: function (event) {

            if (encodeTable) {
                encodeTable.browser = event.data;
            }

        }
    };

    site.init = function () {

        // Listen for GenomeChange events for all browsers.
        hic.Browser.getCurrentBrowser().eventBus.subscribe("GenomeChange", genomeChangeListener);

        function loadHicFile(url, name) {
            var synchState;

            if (hic.allBrowsers.length > 1) {
                synchState = hic.allBrowsers[0].getSyncState();
            }

            hic.Browser.getCurrentBrowser().loadHicFile({url: url, name: name, synchState: synchState});
        }

        $('#dataset_selector').on('change', function (e) {
            var $selected,
                url,
                name;

            $('#hic-contact-map-select-modal').modal('hide');

            url = $(this).val();

            $selected = $(this).find('option:selected');

            if (undefined === hic.Browser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {
                loadHicFile(url, $selected.text());
            }

        });

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

                $(this).val("");
                $('#hic-load-local-file-modal').modal('hide');
            }

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

                suffix = path.substr(path.lastIndexOf('.') + 1);

                if ('hic' === suffix) {
                    loadHicFile(url, hic.extractFilename(path));
                } else {
                    hic.Browser.getCurrentBrowser().loadTrack([{url: url, name: hic.extractFilename(path)}]);
                }

                $(this).val("");
                $('#hic-load-url-modal').modal('hide');

            }

        });

        $('.selectpicker').selectpicker();

        $('#annotation-selector').on('change', function (e) {
            var path,
                name;

            if (undefined === hic.Browser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {
                $('#hic-annotation-select-modal').modal('hide');

                path = $(this).val();
                name = $(this).find('option:selected').text();

                // deselect all
                $(this).find('option').removeAttr("selected");

                hic.Browser.getCurrentBrowser().loadTrack([{url: path, name: name}]);
            }

        });

        $('#annotation-2D-selector').on('change', function (e) {
            var path,
                name;

            if (undefined === hic.Browser.getCurrentBrowser()) {
                igv.presentAlert('ERROR: you must select a map panel.');
            } else {
                $('#hic-annotation-2D-select-modal').modal('hide');

                path = $(this).val();
                name = $(this).find('option:selected').text();

                // deselect all
                $(this).find('option').removeAttr("selected");

                hic.Browser.getCurrentBrowser().loadTrack([{url: path, name: name}]);
            }

        });

        $('.juicebox-app-clone-button').on('click', function (e) {

            var browser,
                config;

            // If this is the first invocation strep href of parameters and turn off href updating
            // if(hic.allBrowsers.length === 1) {
            //     hic.allBrowsers[0].updateHref = false;
            //     hic.allBrowsers[0].stripUriParameters();
            // }

            config =
            {
                initFromUrl: false,
                updateHref: false
            };
            browser = hic.createBrowser($('.juicebox-app-clone-container'), config);

            browser.eventBus.subscribe("GenomeChange", genomeChangeListener);

            // hic.Browser.setCurrentBrowser(browser);

            hic.syncBrowsers(hic.allBrowsers);

        });

    };

    function createEncodeTable(browser, $container, genomeId) {

        var columnWidths,
            encodeTableFormat,
            encodeDataSource;

        if (undefined === hic.Browser.getCurrentBrowser()) {
            igv.presentAlert('ERROR: you must select a map panel.');
            return;
        }

        if (encodeTable && genomeId === encodeTable.genomeID()) {
            // do nothing
            console.log('nuthin');
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

            encodeDataSource = new igv.EncodeDataSource({genomeID: genomeId}, encodeTableFormat);

            encodeTable = new igv.IGVModalTable($container, browser, 'loadTrack', encodeDataSource);
        }

    }

    function discardEncodeTable() {
        encodeTable.unbindAllMouseHandlers();
        $('#encodeModalBody').empty();
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
                    if (tokens.length > 1 && ("2D" === type|| igvSupports(tokens[1]))) {
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

    return site;

})(site || {});

