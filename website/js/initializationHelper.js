import { Alert, TrackUtils, StringUtils, igvxhr, SessionFileLoad } from '../../node_modules/igv-widgets/dist/igv-widgets.js';
import ModalTable from '../../node_modules/data-modal/js/modalTable.js';
import EncodeDataSource from '../../node_modules/data-modal/js/encodeDataSource.js';
import hic from "../../js/api.js";
import QRCode from "./qrcode.js";
import { allBrowsers } from './site.js';
import SessionController from "./sessionController.js";
import { toJSON } from "../../js/init.js";

let googleEnabled = false;

let lastGenomeId = undefined;
let qrcode = undefined;
let currentContactMapDropdownButtonID = undefined;
let sessionController;

let $hic_share_url_modal;

const encodeModal = new ModalTable({ id: 'hic-encode-modal', title: 'ENCODE', selectHandler: selected => loadTracks(selected) });

const initializationHelper = async ($appContainer, config) => {

    const genomeChangeListener = {

        receiveEvent: async event => {

            const { data: genomeId } = event;
            if (lastGenomeId !== genomeId) {

                lastGenomeId = genomeId;

                if (config.trackMenu) {
                    let tracksURL = config.trackMenu.items.replace("$GENOME_ID", genomeId);
                    await loadAnnotationSelector($('#' + config.trackMenu.id), tracksURL, "1D");
                }

                if (config.trackMenu2D) {
                    let annotations2dURL = config.trackMenu2D.items.replace("$GENOME_ID", genomeId);
                    await loadAnnotationSelector($('#' + config.trackMenu2D.id), annotations2dURL, "2D");
                }

                if (EncodeDataSource.supportsGenome(genomeId)) {
                    $('#hic-encode-modal-button').show();
                    createEncodeTable(genomeId);
                } else {
                    $('#hic-encode-modal-button').hide();
                }
            }
        }
    };

    for (let browser of allBrowsers) {
        browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
        browser.eventBus.subscribe("MapLoad", checkBDropdown);
        updateBDropdown(browser);
    }


    // Must manually trigger the genome change event on initial load
    if (hic.HICBrowser.currentBrowser && hic.HICBrowser.currentBrowser.genome) {
        await genomeChangeListener.receiveEvent({data: hic.HICBrowser.currentBrowser.genome.id})
    }



    // session file load config
    const sessionFileLoadConfig =
        {
            localFileInput: document.querySelector('#igv-app-dropdown-local-session-file-input'),
            dropboxButton: document.querySelector('#igv-app-dropdown-dropbox-session-file-button'),
            googleEnabled,
            googleDriveButton: document.querySelector('#igv-app-dropdown-google-drive-session-file-button'),
            loadHandler: config => {
                hic.loadSession(config)
            }
        };

    // Session Controller
    const sessionControllerConfig =
        {
            sessionLoadModal: document.querySelector('#igv-app-session-from-url-modal'),
            sessionSaveModal: document.querySelector('#igv-app-session-save-modal'),
            sessionFileLoad: new SessionFileLoad(sessionFileLoadConfig),
            JSONProvider: () => toJSON()
        };
    sessionController = new SessionController(sessionControllerConfig);



    if (config.mapMenu) {
        await populatePulldown(config.mapMenu);
    }

    $hic_share_url_modal = $('#hic-share-url-modal');

    $hic_share_url_modal.on('show.bs.modal', async function (e) {

        let href = new String(window.location.href);

        // This js file is specific to the aidenlab site, and we know we have only juicebox parameters.
        // Strip href of current parameters, if any
        let idx = href.indexOf("?");
        if (idx > 0) href = href.substring(0, idx);

        const jbUrl = await hic.shortJuiceboxURL(href);

        const embedSnippet = await getEmbeddableSnippet($appContainer, config);
        const $hic_embed_url = $('#hic-embed');
        $hic_embed_url.val(embedSnippet);
        $hic_embed_url.get(0).select();

        let shareUrl = jbUrl;

        // Shorten second time
        // e.g. converts https://aidenlab.org/juicebox?juiceboxURL=https://goo.gl/WUb1mL  to https://goo.gl/ERHp5u

        const $hic_share_url = $('#hic-share-url');
        $hic_share_url.val(shareUrl);
        $hic_share_url.get(0).select();

        const tweetContainer = $('#tweetButtonContainer');
        tweetContainer.empty();

        $('#emailButton').attr('href', 'mailto:?body=' + shareUrl);

        if (shareUrl.length < 100) {

            await window.twttr.widgets.createShareButton(shareUrl, tweetContainer.get(0), { text: 'Contact map: ' });
            console.log("Tweet button updated");

            // QR code generation
            if (qrcode) {
                qrcode.clear();
                $('hic-qr-code-image').empty();
            } else {
                qrcode = new QRCode(document.getElementById("hic-qr-code-image"), { width: 128, height: 128, correctLevel: QRCode.CorrectLevel.H });
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

        browser = hic.HICBrowser.getCurrentBrowser();
        if (undefined === browser || undefined === browser.dataset) {
            Alert.presentAlert('Contact map must be loaded and selected before loading tracks');
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

    const $contact_map_select_modal = $('#hic-contact-map-select-modal');
    $('#dataset_selector').on('change', function (e) {

        const url = $(this).val();
        const $selected = $(this).find('option:selected');

        const browser = hic.HICBrowser.getCurrentBrowser();
        if (undefined === browser) {
            Alert.presentAlert('ERROR: you must select a map panel by clicking the panel header.');
        } else {
            loadHicFile(url, $selected.text());
        }

        $contact_map_select_modal.modal('hide');

        $(this).find('option').removeAttr("selected");

    });

    $('#hic-load-local-file').on('change', function (e) {

        if (undefined === hic.HICBrowser.getCurrentBrowser()) {
            Alert.presentAlert('ERROR: you must select a map panel.');
        } else {

            const file = ($(this).get(0).files)[0];

            const { name } = file;
            const suffix = name.substr(name.lastIndexOf('.') + 1);

            if ('hic' === suffix) {
                loadHicFile(file, name);
            } else {
                loadTracks([{ url: file, name }]);
            }
        }

        $(this).val("");
        $('#hic-load-local-file-modal').modal('hide');

    });

    $('#hic-load-url').on('change', function (e) {

        if (undefined === hic.HICBrowser.getCurrentBrowser()) {
            Alert.presentAlert('ERROR: you must select a map panel.');
        } else {
            const url = $(this).val();
            loadHicFile( url, 'unnamed' );
        }

        $(this).val("");
        $('#hic-load-url-modal').modal('hide');

    });

    $('#track-load-url').on('change', function (e) {

        if (undefined === hic.HICBrowser.getCurrentBrowser()) {
            Alert.presentAlert('ERROR: you must select a map panel.');
        } else {
            loadTracks([{ url: $(this).val() }]);
        }

        $(this).val("");
        $('#track-load-url-modal').modal('hide');

    });

    $('#annotation-selector').on('change', function (e) {

        if (undefined === hic.HICBrowser.getCurrentBrowser()) {
            Alert.presentAlert('ERROR: you must select a map panel.');
        } else {

            const path = $(this).val();
            const name = $(this).find('option:selected').text();

            let config = {url: path, name };
            if (path.indexOf("hgdownload.cse.ucsc.edu") > 0) {
                config.indexed = false   //UCSC files are never indexed
            }
            loadTracks([config]);
        }

        $('#hic-annotation-select-modal').modal('hide');
        $(this).find('option').removeAttr("selected");

    });

    $('#annotation-2D-selector').on('change', function (e) {

        if (undefined === hic.HICBrowser.getCurrentBrowser()) {
            Alert.presentAlert('ERROR: you must select a map panel.');
        } else {

            const path = $(this).val();
            const name = $(this).find('option:selected').text();

            loadTracks([{url: path, name}]);
        }

        $('#hic-annotation-2D-select-modal').modal('hide');
        $(this).find('option').removeAttr("selected");
    });

    $('.juicebox-app-clone-button').on('click', async () => {

        let browser = undefined;
        try {
            browser = hic.createBrowser(container, { initFromUrl: false, updateHref: false });
        } catch (e) {
            console.error(e);
        }

        if (browser) {
            browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
            hic.HICBrowser.setCurrentBrowser(browser);
        }

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

    const $e = $('button[id$=-map-dropdown]');
    $e.parent().on('show.bs.dropdown', function () {
        currentContactMapDropdownButtonID = $(this).children('.dropdown-toggle').attr('id');
    });

    $e.parent().on('hide.bs.dropdown', function () {
        console.log("hide contact/control map");
    });

    hic.eventBus.subscribe("BrowserSelect", function (event) {
        updateBDropdown(event.data);
    });
};

const createEncodeTable = genomeId => encodeModal.setDatasource(new EncodeDataSource(genomeId));

const loadAnnotationSelector = async ($container, url, type) => {

    $container.empty();

    let data = undefined;

    try {
        data = await igvxhr.loadString(url);
    } catch (e) {
        console.log('Error loading track menu: ${ url } ${ e }')
        //Alert.presentAlert(`Error loading track menu: ${ url } ${ e }`);
    }

    let lines = data ? StringUtils.splitLines(data) : [];
    if (lines.length > 0) {

        let elements = [];
        elements.push('<option value=' + '-' + '>' + '-' + '</option>');

        for (let line of lines) {
            const tokens = line.split('\t');
            if (tokens.length > 1 && ("2D" === type || igvSupports(tokens[1]))) {
                elements.push('<option value=' + tokens[1] + '>' + tokens[0] + '</option>');
            }

        }

        $container.append(elements.join(''));

    }

};

function igvSupports(path) {

    // For now we will pretend that igv does not support bedpe, we want these loaded as 2D tracks
    if (path.endsWith(".bedpe") || path.endsWith(".bedpe.gz")) {
        return false;
    }

    let config = { url: path };
    TrackUtils.inferTrackTypes(config);
    return config.type !== undefined;

}

function loadTracks(tracks) {
    // Set some juicebox specific defaults
    for(let t of tracks) {
        t.autoscale = true;
        t.displayMode = "COLLAPSED"
    }
    hic.HICBrowser.getCurrentBrowser().loadTracks(tracks);
}

function loadHicFile(url, name) {

    var synchState, browsersWithMaps, isControl, browser, query, config, uriDecode;

    browsersWithMaps = allBrowsers.filter(function (browser) {
        return browser.dataset !== undefined;
    });

    if (browsersWithMaps.length > 0) {
        synchState = browsersWithMaps[0].getSyncState();
    }

    isControl = currentContactMapDropdownButtonID === 'hic-control-map-dropdown';

    browser = hic.HICBrowser.getCurrentBrowser();

    config = {url: url, name: name, isControl: isControl};


    if (StringUtils.isString(url) && url.includes("?")) {
        query = hic.extractQuery(url);
        uriDecode = url.includes("%2C");
        hic.decodeQuery(query, config, uriDecode);
    }


    if (isControl) {
        browser
            .loadHicControlFile(config)
            .then(function (dataset) {

            });
    } else {
        browser.reset();

        browsersWithMaps = allBrowsers.filter(function (browser) {
            return browser.dataset !== undefined;
        });

        if (browsersWithMaps.length > 0) {
            config["synchState"] = browsersWithMaps[0].getSyncState();
        }


        browser
            .loadHicFile(config)
            .then(function (ignore) {
                if (!isControl) {
                    hic.syncBrowsers(allBrowsers);
                }
                $('#hic-control-map-dropdown').removeClass('disabled');
            });
    }
}

async function getEmbeddableSnippet($appContainer, config) {
    const base = (config.embedTarget || getEmbedTarget())
    const embedUrl =  await hic.shortJuiceboxURL(base);
    const height = $appContainer.height();
    return '<iframe src="' + embedUrl + '" width="100%" height="' + height + '" frameborder="0" style="border:0" allowfullscreen></iframe>';
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

const populatePulldown = async menu => {

    const { id, items } = menu;

    let data = undefined;
    try {
        data = await igvxhr.loadString(items)
    } catch (e) {
        console.error(e);
    }

    if (data) {

        const lines = StringUtils.splitLines(data);

        const parent = $("#" + id);

        for (let line of lines) {

            const tokens = line.split('\t');
            if (tokens.length > 1) {
                parent.append($('<option value="' + tokens[0] + '">' + tokens[1] + '</option>'))
            }

        }

        // parent.selectpicker("refresh");

    }

};

function checkBDropdown() {
    updateBDropdown(hic.HICBrowser.getCurrentBrowser());
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

export { initializationHelper, loadTracks }
