/*
 * @author Jim Robinson Dec-2020
 */

import {StringUtils} from '../node_modules/igv-utils/src/index.js'
import {InputDialog} from '../node_modules/igv-ui/dist/igv-ui.js'
import $ from '../vendor/jquery-3.3.1.slim.js'
import HICBrowser from './hicBrowser.js'
import ColorScale from './colorScale.js'
import State from './hicState.js'
import ContactMatrixView from "./contactMatrixView.js"
import HICEvent from "./hicEvent.js"
import EventBus from "./eventBus.js"

const defaultSize = {width: 640, height: 640}

let allBrowsers = []
let currentBrowser

async function createBrowser(hic_container, config, callback) {

    const $hic_container = $(hic_container);

    setDefaults(config);

    if (StringUtils.isString(config.state)) {
        config.state = State.parse(config.state);
    }
    if (StringUtils.isString(config.colorScale)) {
        config.colorScale = ColorScale.parse(config.colorScale);
    }
    if (StringUtils.isString(config.backgroundColor)) {
        config.backgroundColor = ContactMatrixView.parseBackgroundColor(config.backgroundColor);
    }

    const browser = new HICBrowser($hic_container, config);
    browser.eventBus.hold()

    //if (undefined === igv.browser) {
    //    createIGV($hic_container, browser);
    //}

    browser.inputDialog = new InputDialog($hic_container.get(0), browser);

    ///////////////////////////////////
    try {
        browser.contactMatrixView.startSpinner();
        browser.$user_interaction_shield.show();

        // if (!config.name) config.name = await extractName(config)
        // const prefix = hasControl ? "A: " : "";
        // browser.$contactMaplabel.text(prefix + config.name);
        // browser.$contactMaplabel.attr('title', config.name);

        await browser.loadHicFile(config, true);

        if (config.controlUrl) {
            await browser.loadHicControlFile({
                url: config.controlUrl,
                name: config.controlName,
                nvi: config.controlNvi,
                isControl: true
            }, true);
        }

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
            await browser.update()
        }

        if (typeof callback === "function") callback();
    } finally {
        browser.contactMatrixView.stopSpinner();
        browser.$user_interaction_shield.hide();
    }

    allBrowsers.push(browser);
    setCurrentBrowser(browser);
    if (allBrowsers.length > 1) {
        allBrowsers.forEach(function (b) {
            b.$browser_panel_delete_button.show();
        });
    }

    return browser;

}

async function updateAllBrowsers() {
    for (let b of allBrowsers) {
        await b.update()
    }
}

function deleteAllBrowsers() {
    for (let b of allBrowsers) {
        b.$root.remove();
    }
    allBrowsers = [];
}

function setCurrentBrowser(browser) {// unselect current browser
    if (undefined === browser) {
        if (currentBrowser) {
            currentBrowser.$root.removeClass('hic-root-selected');
        }
        currentBrowser = browser;
        return;
    }
    if (browser !== currentBrowser) {
        if (currentBrowser) {
            currentBrowser.$root.removeClass('hic-root-selected');
        }
        browser.$root.addClass('hic-root-selected');
        currentBrowser = browser;
        EventBus.globalBus.post(HICEvent("BrowserSelect", browser))
    }
}


function deleteBrowser(browser) {
    browser.unsyncSelf();
    browser.$root.remove();
    allBrowsers = allBrowsers.filter(b => b != browser);
    if (allBrowsers.length <= 1) {
        allBrowsers.forEach(function (b) {
            b.$browser_panel_delete_button.hide();
        });
    }
}

function getCurrentBrowser() {
    return currentBrowser;
}

function syncBrowsers(browsers) {
    const browsersWithMaps = (browsers || allBrowsers).filter(b => b.dataset !== undefined);
    // Sync compatible maps only
    const incompatibleDatasets = [];
    for (let b1 of browsersWithMaps) {
        for (let b2 of browsersWithMaps) {
            if (b1 === b2) continue;
            if (b1.dataset.isCompatible(b2.dataset)) {
                b1.synchedBrowsers.push(b2);
                b2.synchedBrowsers.push(b1);
            } else {
                incompatibleDatasets.push(b1.dataset.genomeId);
            }
        }
    }
}

function getAllBrowsers() {
    return allBrowsers;
}


// Set default values for config properties
function setDefaults(config) {


    if (config.figureMode === true) {
        config.showLocusGoto = false;
        config.showHicContactMapLabel = false;
        config.showChromosomeSelector = false;
    } else {
        if (undefined === config.width) {
            config.width = defaultSize.width;
        }
        if (undefined === config.height) {
            config.height = defaultSize.height;
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

        if (StringUtils.isString(config.state)) {
            config.state = State.parse(config.state);
        } else {
            // copy
            config.state = new State(config.state.chr1, config.state.chr2, config.state.zoom, config.state.x,
                config.state.y, config.state.pixelSize, config.state.normalization)
        }
    }
}



// mock igv browser objects for igv.js compatibility
// function createIGV($hic_container, hicBrowser) {
//
//     igv.browser =
//         {
//             constants: {defaultColor: "rgb(0,0,150)"},
//
//             // Compatibility wit igv menus
//             trackContainerDiv: hicBrowser.layoutController.$x_track_container.get(0)
//         };
//     igv.popover = new Popover($hic_container.get(0), igv.browser);
// }

export {createBrowser, deleteBrowser, setCurrentBrowser, getCurrentBrowser, syncBrowsers, deleteAllBrowsers, getAllBrowsers}