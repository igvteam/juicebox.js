/**
 * Created by dat on 4/4/17.
 */
import HICBrowser from './hicBrowser.js'
import ContactMatrixView from './contactMatrixView.js'
import ChromosomeSelectorWidget from './chromosomeSelectorWidget.js'
import ControlMapWidget from './controlMapWidget.js'
import LocusGoto from './hicLocusGoto.js'
import ResolutionSelector from './hicResolutionSelector.js'
import ColorScaleWidget from './hicColorScaleWidget.js'
import NormalizationWidget from './normalizationWidget.js'
import Ruler from './hicRuler.js'
import TrackRenderer from './trackRenderer.js'
import AnnotationWidget from './annotationWidget.js'
import  * as hic from './hicUtils.js'
import $ from '../vendor/jquery-3.3.1.slim.js'

const LayoutController = function (browser, $root) {

    this.browser = browser;

    createNavBar.call(this, browser, $root);

    createAllContainers.call(this, browser, $root);

    // Keep in sync with juicebox.scss
    this.scrollbar_height = 20;
    this.axis_height = 40;


    this.annotationTrackHeight = 40;
    this.wigTrackHeight = 40;

    // Keep in sync with $track-margin in juicebox.scss
    this.track_margin = 2;

};

// Keep in sync with juicebox.scss variables
LayoutController.nav_bar_label_height = 36;
LayoutController.nav_bar_widget_container_height = 36;
LayoutController.nav_bar_widget_container_margin = 4;

LayoutController.navbarHeight = () => 2 * (LayoutController.nav_bar_label_height + LayoutController.nav_bar_widget_container_height + (2 * LayoutController.nav_bar_widget_container_margin));

function createNavBar(browser, $root) {

    const $navbar_container = $('<div>', { class: 'hic-navbar-container' });
    $root.append($navbar_container);

    $navbar_container.on('click', e => {
        e.stopPropagation();
        e.preventDefault();
        HICBrowser.setCurrentBrowser(browser);
    });

    const html_contact_map_hic_nav_bar_map_container =
        `<div id="${ browser.id }-contact-map-hic-nav-bar-map-container">
            <div id="${ browser.id }-contact-map-hic-nav-bar-map-label">
            </div>
             <div class="hic-nav-bar-button-container">
                <i class="fa fa-bars fa-lg" title="Present menu"></i>
                <i class="fa fa-minus-circle fa-lg" title="Delete browser panel" style="display: none;"></i>
             </div>
        </div>`;

    $navbar_container.append($(html_contact_map_hic_nav_bar_map_container));

    browser.$contactMaplabel = $navbar_container.find("div[id$='contact-map-hic-nav-bar-map-label']");

    browser.$menuPresentDismiss = $navbar_container.find('.fa-bars');
    browser.$menuPresentDismiss.on('click', e => browser.toggleMenu());

    browser.$browser_panel_delete_button = $navbar_container.find('.fa-minus-circle');
    browser.$browser_panel_delete_button.on('click', e => hic.deleteBrowserPanel(browser) );

    // Delete button is only vidible if there is more then one browser
    browser.$browser_panel_delete_button.hide();


    const html_control_map_hic_nav_bar_map_container =
        `<div id="${ browser.id }-control-map-hic-nav-bar-map-container">
            <div id="${ browser.id }-control-map-hic-nav-bar-map-label"></div>
        </div>`;

    $navbar_container.append($(html_control_map_hic_nav_bar_map_container));

    browser.$controlMaplabel = $navbar_container.find("div[id$='control-map-hic-nav-bar-map-label']");

    const html_upper_hic_nav_bar_widget_container = `<div id="${ browser.id }-upper-hic-nav-bar-widget-container"></div>`;
    $navbar_container.append($(html_upper_hic_nav_bar_widget_container));

    const $html_upper_hic_nav_bar_widget_container = $navbar_container.find("div[id$='upper-hic-nav-bar-widget-container']");
    browser.locusGoto = new LocusGoto(browser, $html_upper_hic_nav_bar_widget_container);
    browser.resolutionSelector = new ResolutionSelector(browser, $html_upper_hic_nav_bar_widget_container);
    browser.resolutionSelector.setResolutionLock(browser.resolutionLocked);

    const html_lower_hic_nav_bar_widget_container = `<div id="${ browser.id }-lower-hic-nav-bar-widget-container"></div>`;
    $navbar_container.append($(html_lower_hic_nav_bar_widget_container));

    const $html_lower_hic_nav_bar_widget_container = $navbar_container.find("div[id$='lower-hic-nav-bar-widget-container']");
    browser.colorscaleWidget = new ColorScaleWidget(browser, $html_lower_hic_nav_bar_widget_container);
    browser.controlMapWidget = new ControlMapWidget(browser, $html_lower_hic_nav_bar_widget_container);
    browser.normalizationSelector = new NormalizationWidget(browser, $html_lower_hic_nav_bar_widget_container);

}

function createAllContainers(browser, $root) {

    const html_x_track_container =
        `<div id="${ browser.id }-x-track-container"><div id="${ browser.id }-track-shim"></div><div id="${ browser.id }-x-tracks"><div id="${ browser.id }-y-track-guide" style="display: none;"></div></div></div>`;
    $root.append($(html_x_track_container));

    this.$x_track_container = $root.find("div[id$='x-track-container']");
    this.$track_shim = this.$x_track_container.find("div[id$='track-shim']");
    this.$x_tracks = this.$x_track_container.find("div[id$='x-tracks']");
    this.$y_track_guide = this.$x_track_container.find("div[id$='y-track-guide']");

    // content container
    let id = browser.id + '_' + 'content-container';
    this.$content_container = $("<div>", {id: id});
    $root.append(this.$content_container);

    // menu
    createMenu(browser, $root);

    // container: x-axis
    id = browser.id + '_' + 'x-axis-container';
    let $container = $("<div>", {id: id});
    this.$content_container.append($container);
    this.xAxisRuler = new Ruler(browser, 'x', $container);


    // container: y-tracks | y-axis | viewport | y-scrollbar
    id = browser.id + '_' + 'y-tracks-y-axis-viewport-y-scrollbar';
    $container = $("<div>", {id: id});
    this.$content_container.append($container);

    // y-tracks
    id = browser.id + '_' + 'y-tracks';
    this.$y_tracks = $("<div>", {id: id});
    $container.append(this.$y_tracks);

    // crosshairs guide
    id = browser.id + '_' + 'x-track-guide';
    this.$x_track_guide = $("<div>", {id: id});
    this.$y_tracks.append(this.$x_track_guide);

    // y-axis
    this.yAxisRuler = new Ruler(browser, 'y', $container);

    this.xAxisRuler.$otherRulerCanvas = this.yAxisRuler.$canvas;
    this.xAxisRuler.otherRuler = this.yAxisRuler;

    this.yAxisRuler.$otherRulerCanvas = this.xAxisRuler.$canvas;
    this.yAxisRuler.otherRuler = this.xAxisRuler;

    // viewport | y-scrollbar
    browser.contactMatrixView = new ContactMatrixView(browser, $container);

    // container: x-scrollbar
    id = browser.id + '_' + 'x-scrollbar-container';
    $container = $("<div>", {id: id});
    this.$content_container.append($container);

    // x-scrollbar
    $container.append(browser.contactMatrixView.scrollbarWidget.$x_axis_scrollbar_container);

}

function createMenu(browser, $root) {

    var $menu,
        $div,
        $fa,
        config;

    // menu
    $menu = $('<div>', {class: 'hic-menu'});
    $root.append($menu);

    // menu close button
    $div = $('<div>', {class: 'hic-menu-close-button'});
    $menu.append($div);

    // $fa = $("<i>", { class:'fa fa-minus-circle fa-lg' });
    $fa = $("<i>", {class: 'fa fa-times'});
    $div.append($fa);

    $fa.on('click', function (e) {
        browser.toggleMenu();
    });


    // chromosome select widget
    browser.chromosomeSelector = new ChromosomeSelectorWidget(browser, $menu);

    config =
        {
            title: '2D Annotations',
            loadTitle: 'Load:',
            alertMessage: 'No 2D annotations currently loaded for this map'
        };
    browser.annotation2DWidget = new AnnotationWidget(browser, $menu, config, function () {
        return browser.tracks2D;
    });

    // config =
    //     {
    //         title: 'Tracks',
    //         loadTitle: 'Load Tracks:',
    //         alertMessage: 'No tracks currently loaded for this map'
    //     };
    //
    // browser.annotation1DDWidget = new hic.AnnotationWidget(browser, $menu, config, function () {
    //     return browser.trackRenderers;
    // });

    browser.$menu = $menu;

    browser.$menu.hide();

}

LayoutController.prototype.tracksLoaded = function (trackXYPairs) {
    var self = this,
        trackRendererPair;

    self.doLayoutTrackXYPairCount(trackXYPairs.length + self.browser.trackRenderers.length);

    trackXYPairs.forEach(function (trackPair, index) {

        var w, h;

        trackRendererPair = {};
        w = h = self.wigTrackHeight;
        trackRendererPair.x = new TrackRenderer(self.browser, {
            width: undefined,
            height: h
        }, self.$x_tracks, trackRendererPair, trackPair, 'x', index);
        trackRendererPair.y = new TrackRenderer(self.browser, {
            width: w,
            height: undefined
        }, self.$y_tracks, trackRendererPair, trackPair, 'y', index);

        self.browser.trackRenderers.push(trackRendererPair);

    });


}


LayoutController.prototype.removeAllTrackXYPairs = function () {

    // map trackRenderers items to array indices
    const indices = [...Array(this.browser.trackRenderers.length).keys()];

    if (0 === indices.length) {
        return;
    }

    [...Array(this.browser.trackRenderers.length).keys()].forEach(() => {

        // select last track to discard
        let discard = this.browser.trackRenderers[ this.browser.trackRenderers.length - 1 ];

        // discard DOM element's
        discard['x'].$viewport.remove();
        discard['y'].$viewport.remove();

        // remove discard from list
        const index = this.browser.trackRenderers.indexOf(discard);
        this.browser.trackRenderers.splice(index, 1);

        discard = undefined;
        this.doLayoutTrackXYPairCount(this.browser.trackRenderers.length);

    });
};

LayoutController.prototype.removeLastTrackXYPair = function () {

    if (this.browser.trackRenderers.length > 0) {

        // select last track to dicard
        let discard = this.browser.trackRenderers[ this.browser.trackRenderers.length - 1 ];

        // discard DOM element's
        discard['x'].$viewport.remove();
        discard['y'].$viewport.remove();

        // remove discard from list
        const index = this.browser.trackRenderers.indexOf(discard);
        this.browser.trackRenderers.splice(index, 1);

        discard = undefined;
        this.doLayoutTrackXYPairCount(this.browser.trackRenderers.length);

        this.browser.updateLayout();

    } else {
        //console.log('No more tracks.');
    }

};

LayoutController.prototype.removeTrackRendererPair = function (trackRendererPair) {

    var index,
        discard;

    if (this.browser.trackRenderers.length > 0) {

        discard = trackRendererPair;

        // discard DOM element's
        discard['x'].$viewport.remove();
        discard['y'].$viewport.remove();

        // remove discard from list
        index = this.browser.trackRenderers.indexOf(discard);
        this.browser.trackRenderers.splice(index, 1);

        this.doLayoutTrackXYPairCount(this.browser.trackRenderers.length);

        this.browser.updateLayout();


    } else {
        //console.log('No more tracks.');
    }

};

LayoutController.prototype.doLayoutTrackXYPairCount = function (trackXYPairCount) {

    var track_aggregate_height,
        tokens,
        width_calc,
        height_calc;


    track_aggregate_height = (0 === trackXYPairCount) ? 0 : trackXYPairCount * (this.wigTrackHeight + this.track_margin);

    tokens = [ LayoutController.navbarHeight(), track_aggregate_height ].map(number => `${ number }px`);
    height_calc = 'calc(100% - (' + tokens.join(' + ') + '))';

    tokens = [ track_aggregate_height, this.axis_height, this.scrollbar_height ].map(number => `${ number }px`);
    width_calc = 'calc(100% - (' + tokens.join(' + ') + '))';

    // x-track container
    this.$x_track_container.height(track_aggregate_height);

    // track labels
    this.$track_shim.width(track_aggregate_height);

    // x-tracks
    this.$x_tracks.css('width', width_calc);


    // content container
    this.$content_container.css('height', height_calc);

    // x-axis - repaint canvas
    this.xAxisRuler.updateWidthWithCalculation(width_calc);

    // y-tracks
    this.$y_tracks.width(track_aggregate_height);

    // y-axis - repaint canvas
    this.yAxisRuler.updateHeight(this.yAxisRuler.$axis.height());

    // viewport
    this.browser.contactMatrixView.$viewport.css('width', width_calc);

    // x-scrollbar
    this.browser.contactMatrixView.scrollbarWidget.$x_axis_scrollbar_container.css('width', width_calc);

};

LayoutController.prototype.doLayoutWithRootContainerSize = function (size) {

    var count;

    this.browser.$root.width(size.width);
    this.browser.$root.height(size.height + LayoutController.navbarHeight());

    count = this.browser.trackRenderers.length > 0 ? this.browser.trackRenderers.length : 0;
    this.doLayoutTrackXYPairCount(count);

    this.browser.updateLayout();
};

export default LayoutController
