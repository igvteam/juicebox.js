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

import Browser from './hicBrowser'
import ColorScale from './colorScale'
import State from './hicState'
import EventBus from './eventBus'
import HICEvent from './hicEvent'
import igvReplacements from "./igvReplacements"

const defaultPixelSize = 1

const hic = {

    defaultPixelSize: defaultPixelSize,

    defaultSize:
        {
            width: 640,
            height: 640
        },

    defaultState: new State(0, 0, 0, 0, 0, defaultPixelSize, "NONE"),

    /**
     * The global event bus.  For events outside the scope of a single browser.
     *
     * @type {EventBus}
     */
    eventBus: new EventBus(),

    allBrowsers: [],

    createBrowser: async function (hic_container, config, callback) {

        const $hic_container = $(hic_container);

        setDefaults(config);

        const apiKey = config.apiKey;
        if (apiKey) {
            igv.setApiKey(apiKey);
            hic.apiKey = apiKey;
        }

        let queryString = config.queryString || config.href;   // href for backward compatibility
        if (queryString === undefined && config.initFromUrl !== false) {
            queryString = window.location.href;
        }

        if (queryString) {
            if (!queryString.includes("?")) {
                queryString = "?" + queryString;
            }
            const query = hic.extractQuery(queryString);
            const uriDecode = queryString.includes("%2C");
            igv.Browser.decodeQuery(query, config, uriDecode);
        }

        const browser = new Browser($hic_container, config);

        browser.eventBus.hold()

        hic.allBrowsers.push(browser);

        Browser.setCurrentBrowser(browser);

        if (hic.allBrowsers.length > 1) {
            hic.allBrowsers.forEach(function (b) {
                b.$browser_panel_delete_button.show();
            });
        }

        if (undefined === igv.browser) {
            createIGV($hic_container, browser);
        }

        ///////////////////////////////////
        try {
            browser.contactMatrixView.startSpinner();
            browser.$user_interaction_shield.show();

            const hasControl = config.controlUrl !== undefined

            // if (!config.name) config.name = await extractName(config)
            // const prefix = hasControl ? "A: " : "";
            // browser.$contactMaplabel.text(prefix + config.name);
            // browser.$contactMaplabel.attr('title', config.name);

            await browser.loadHicFile(config, true)
            await loadControlFile(config)

            if (config.cycle) {
                config.displayMode = "A"
            }

            if (config.displayMode) {
                browser.contactMatrixView.displayMode = config.displayMode;
                browser.eventBus.post({type: "DisplayMode", data: config.displayMode});
            }
            if (config.colorScale) {
                // This must be done after dataset load
                browser.contactMatrixView.setColorScale(config.colorScale);
                browser.eventBus.post({type: "ColorScale", data: browser.contactMatrixView.getColorScale()});
            }

            var promises = [];
            if (config.tracks) {
                promises.push(browser.loadTracks(config.tracks))
            }

            if (config.normVectorFiles) {
                config.normVectorFiles.forEach(function (nv) {
                    promises.push(browser.loadNormalizationFile(nv));
                })
            }
            await Promise.all(promises);

            const tmp = browser.contactMatrixView.colorScaleThresholdCache;
            browser.eventBus.release()
            browser.contactMatrixView.colorScaleThresholdCache = tmp

            if (config.cycle) {
                browser.controlMapWidget.toggleDisplayModeCycle();
            } else {
                browser.update()
            }

            if (typeof callback === "function") callback();
        } finally {
            browser.contactMatrixView.stopSpinner();
            browser.$user_interaction_shield.hide();
        }


        return browser;


        // Explicit set dataset, do not need to load.  Used by "interactive figures"
        async function setInitialDataset(browser, config) {

            if (config.dataset) {
                config.dataset.name = config.name;
                browser.$contactMaplabel.text(config.name);
                browser.$contactMaplabel.attr('title', config.name);
                browser.dataset = config.dataset;
                browser.genome = new hic.Genome(browser.dataset.genomeId, browser.dataset.chromosomes);
                igv.browser.genome = browser.genome;
                browser.eventBus.post(HICEvent("GenomeChange", browser.genome.id));
                browser.eventBus.post(HICEvent("MapLoad", browser.dataset));
                return config.dataset;
            } else {
                return undefined;
            }
        }

        // Load the control file, if any
        async function loadControlFile(config) {
            if (config.controlUrl) {
                return browser.loadHicControlFile({
                    url: config.controlUrl,
                    name: config.controlName,
                    nvi: config.controlNvi,
                    isControl: true
                }, true);
            } else {
                return undefined;
            }
        }
    },


    setApiKey: function (key) {
        this.apiKey = key;
        igv.setApiKey(key);

    },


    extractQuery: function (uri) {
        var i1, i2, i, j, s, query, tokens;

        query = {};
        i1 = uri.indexOf("?");
        i2 = uri.lastIndexOf("#");

        if (i1 >= 0) {
            if (i2 < 0) i2 = uri.length;

            for (i = i1 + 1; i < i2;) {

                j = uri.indexOf("&", i);
                if (j < 0) j = i2;

                s = uri.substring(i, j);
                tokens = s.split("=", 2);
                if (tokens.length === 2) {
                    query[tokens[0]] = tokens[1];
                }

                i = j + 1;
            }
        }
        return query;
    },

    deleteBrowserPanel: function (browser) {

        if (browser === Browser.getCurrentBrowser()) {
            Browser.setCurrentBrowser(undefined);
        }

        hic.allBrowsers.splice(_.indexOf(hic.allBrowsers, browser), 1);
        browser.$root.remove();
        browser = undefined;

        if (1 === hic.allBrowsers.length) {
            Browser.setCurrentBrowser(hic.allBrowsers[0]);
            Browser.getCurrentBrowser().$browser_panel_delete_button.hide();
        }

    },


    /**
     * Load a dataset outside the context of a browser.  Purpose is to "pre load" a shared dataset when
     * instantiating multiple browsers in a page.
     *
     * @param config
     */
    loadDataset: async function (config) {


        const name = await extractName(config)
        config.name = name;
        var hicReader;
        hicReader = new hic.HiCReader(config);

        const straw = new HicStraw(config)
        const dataset = await loadDataset(config)
        dataset.name = name

        dataset.name = this.name;

        if (config.nvi) {
            var nviArray = decodeURIComponent(config.nvi).split(","),
                range = {start: parseInt(nviArray[0]), size: parseInt(nviArray[1])};

            await hicReader.readNormVectorIndex(dataset, range)
            return dataset;
        } else {
            return dataset;
        }


    },

    syncBrowsers: function (browsers) {

        var browsersWithMaps, genome, incompatibleDatasets, gid;

        browsersWithMaps = browsers.filter(function (b) {
            return b.dataset !== undefined;
        })

        if (browsersWithMaps.length < 2) {
            // Nothing to sync
            return;
        }

        // Canonical browser is the first one, arbitrarily
        genome = canonicalGenomeId(browsers[0].dataset.genomeId);

        // Sync compatible maps only

        incompatibleDatasets = [];
        browsersWithMaps.forEach(function (b1) {

            gid = canonicalGenomeId(b1.dataset.genomeId);

            if (areCompatible(browsers[0].dataset, b1.dataset)) {
                browsers.forEach(function (b2) {
                    if (b1 !== b2 && !b1.synchedBrowsers.includes(b2)) {
                        b1.synchedBrowsers.push(b2);
                    }

                })
            } else {
                incompatibleDatasets.push(b1.dataset.genomeId);
            }
        });

        if (incompatibleDatasets.length > 0) {
            igv.presentAlert("Not all maps could be synchronized.  Incompatible assemblies: " + browsers[0].dataset.genomeId + " vs " + incompatibleDatasets.join());
        }


        function canonicalGenomeId(genomeId) {

            switch (genomeId) {
                case "GRCh38":
                    return "hg38";
                case "GRCh37":
                    return "hg19";
                case "GRCm38" :
                    return "mm10";
                default:
                    return genomeId;
            }
        }

    },


    destringifyColorScale: function (string) {

        var pnstr, ratioCS;

        if (string.startsWith("R:")) {
            pnstr = string.substring(2).split(":");
            ratioCS = new RatioColorScale(Number.parseFloat(pnstr[0]));
            ratioCS.positiveScale = foo(pnstr[1]);
            ratioCS.negativeScale = foo(pnstr[2]);
            return ratioCS;
        }

        else {
            return foo(string);
        }

        function foo(str) {
            var cs, tokens;

            tokens = str.split(",");

            cs = {
                threshold: tokens[0],
                r: tokens[1],
                g: tokens[2],
                b: tokens[3]
            };
            return new ColorScale(cs);
        }
    },


    destringifyState: function (string) {

        var tokens = string.split(",");
        return new State(
            parseInt(tokens[0]),    // chr1
            parseInt(tokens[1]),    // chr2
            parseFloat(tokens[2]), // zoom
            parseFloat(tokens[3]), // x
            parseFloat(tokens[4]), // y
            parseFloat(tokens[5]), // pixelSize
            tokens.length > 6 ? tokens[6] : "NONE"   // normalization
        )
    },


    isMobile: function () {
        return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    },



    extractFilename: function (urlOrFile) {
        var idx,
            str;

        if (igv.isFilePath(urlOrFile)) {
            return urlOrFile.name;
        }
        else {

            str = urlOrFile.split('?').shift();
            idx = urlOrFile.lastIndexOf("/");

            return idx > 0 ? str.substring(idx + 1) : str;
        }
    },

    igvSupports: function (path) {
        var config = {url: path};
        igv.inferTrackTypes(config);
        return config.type !== undefined;
    },

    throttle: function (fn, threshhold, scope) {
        var last,
            deferTimer;

        threshhold || (threshhold = 200);

        return function () {
            var context,
                now,
                args;

            context = scope || this;
            now = +new Date;
            args = arguments;

            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        }
    },

    reflectionRotationWithContext: function (context) {
        context.scale(-1, 1);
        context.rotate(Math.PI / 2.0);
    },

    reflectionAboutYAxisAtOffsetWithContext: function (context, exe) {
        context.translate(exe, 0);
        context.scale(-1, 1);
        context.translate(-exe, 0);
    },

    identityTransformWithContext: function (context) {
        // 3x2 matrix. column major. (sx 0 0 sy tx ty).
        context.setTransform(1, 0, 0, 1, 0, 0);
    },

    Track2DDisplaceModes: {
        displayAllMatrix: 'displayAllMatrix',
        displayLowerMatrix: 'displayLowerMatrix',
        displayUpperMatrix: 'displayUpperMatrix'
    }
}

// Set default values for config properties
function setDefaults(config) {


    if (config.figureMode === true) {
        config.showLocusGoto = false;
        config.showHicContactMapLabel = false;
        config.showChromosomeSelector = false;
    } else {
        if (undefined === config.width) {
            config.width = hic.defaultSize.width;
        }
        if (undefined === config.height) {
            config.height = hic.defaultSize.height;
        }
        if (undefined === config.showLocusGoto) {
            config.showLocusGoto = true;
        }
        if (undefined === config.showHicContactMapLabel) {
            config.showHicContactMapLabel = true;
        }
        if (undefined === config.showChromosomeSelector) {
            config.showChromosomeSelector = true
        }
    }

    if (config.state) {
        // convert to state object
        config.state = new State(config.state.chr1, config.state.chr2, config.state.zoom, config.state.x,
            config.state.y, config.state.pixelSize, config.state.normalization)
    }
}


// mock igv browser objects for igv.js compatibility
function createIGV($hic_container, hicBrowser) {

    igv.browser =
        {
            constants: {defaultColor: "rgb(0,0,150)"},

            // Compatibility wit igv menus
            trackContainerDiv: hicBrowser.layoutController.$x_track_container.get(0)
        };

    // replace IGV functions with HIC equivalents
    igvReplacements(igv);

    igv.popover = new igv.Popover($hic_container, igv.browser);

    igv.alertDialog = new igv.AlertDialog(hicBrowser.$root, hicBrowser);

    hicBrowser.inputDialog = new igv.InputDialog($hic_container, hicBrowser);

    hicBrowser.trackRemovalDialog = new igv.TrackRemovalDialog($hic_container, hicBrowser);

    hicBrowser.dataRangeDialog = new igv.DataRangeDialog($hic_container, hicBrowser);

}


export default hic