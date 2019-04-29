/**
 * Created by dat on 4/4/17.
 */
import $ from "../vendor/jquery-1.12.4.js"
import _ from "../vendor/underscore.js"
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
import  * as hic from './hic.js'

const LayoutController = function (browser, $root) {

    this.browser = browser;

    createNavBar.call(this, browser, $root);

    createAllContainers.call(this, browser, $root);

    this.scrollbar_height = 20;

    this.axis_height = 32;

    // track dimension
    this.track_height = 32;

    // Keep in sync with .x-track-canvas-container (margin-bottom) and .y-track-canvas-container (margin-right)
    this.track_margin = 2;

};

// Dupes of corresponding juicebox.scss variables
// Invariant during app running. If edited in juicebox.scss they MUST be kept in sync
LayoutController.nav_bar_label_height = 36;
LayoutController.nav_bar_widget_container_height = 36;
LayoutController.nav_bar_shim_height = 4;

LayoutController.navbarHeight = function () {
    var height;
    height = (2 * LayoutController.nav_bar_label_height) + (2 * LayoutController.nav_bar_widget_container_height) + LayoutController.nav_bar_shim_height;
    return height;
};

function createNavBar(browser, $root) {

    var id,
        $navbar_container,
        $map_container,
        $upper_widget_container,
        $lower_widget_container,
        $e,
        $browser_panel_delete_button,
        $fa;

    $navbar_container = $('<div class="hic-navbar-container">');
    $root.append($navbar_container);


    $navbar_container.on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        HICBrowser.setCurrentBrowser(browser);
    });

    // container: contact map label | menu button | browser delete button
    id = browser.id + '_contact-map-' + 'hic-nav-bar-map-container';
    $map_container = $("<div>", {id: id});
    $navbar_container.append($map_container);

    // contact map label
    id = browser.id + '_contact-map-' + 'hic-nav-bar-map-label';
    browser.$contactMaplabel = $("<div>", {id: id});
    $map_container.append(browser.$contactMaplabel);

    // navbar button container
    $e = $("<div>", {class: 'hic-nav-bar-button-container'});
    $map_container.append($e);

    // menu present/dismiss button
    browser.$menuPresentDismiss = $("<i>", {class: 'fa fa-bars fa-lg', 'title': 'Present menu'});
    $e.append(browser.$menuPresentDismiss);
    browser.$menuPresentDismiss.on('click', function (e) {
        browser.toggleMenu();
    });

    // browser delete button
    browser.$browser_panel_delete_button = $("<i>", {
        class: 'fa fa-minus-circle fa-lg',
        'title': 'Delete browser panel'
    });
    $e.append(browser.$browser_panel_delete_button);

    browser.$browser_panel_delete_button.on('click', function (e) {
        hic.deleteBrowserPanel(browser);
    });

    // hide delete buttons for now. Delete button is only
    // if there is more then one browser instance.
    browser.$browser_panel_delete_button.hide();


    // container: control map label
    id = browser.id + '_control-map-' + 'hic-nav-bar-map-container';
    $map_container = $("<div>", {id: id});
    $navbar_container.append($map_container);

    // control map label
    id = browser.id + '_control-map-' + 'hic-nav-bar-map-label';
    browser.$controlMaplabel = $("<div>", {id: id});
    $map_container.append(browser.$controlMaplabel);

    // upper widget container
    id = browser.id + '_upper_' + 'hic-nav-bar-widget-container';
    $upper_widget_container = $("<div>", {id: id});
    $navbar_container.append($upper_widget_container);

    // location box / goto
    browser.locusGoto = new LocusGoto(browser, $upper_widget_container);

    // resolution widget
    browser.resolutionSelector = new ResolutionSelector(browser, $upper_widget_container);
    browser.resolutionSelector.setResolutionLock(browser.resolutionLocked);


    // lower widget container
    id = browser.id + '_lower_' + 'hic-nav-bar-widget-container';
    $lower_widget_container = $("<div>", {id: id});
    $navbar_container.append($lower_widget_container);

    // colorscale
    browser.colorscaleWidget = new ColorScaleWidget(browser, $lower_widget_container);

    // control map
    browser.controlMapWidget = new ControlMapWidget(browser, $lower_widget_container);

    // normalization
    browser.normalizationSelector = new NormalizationWidget(browser, $lower_widget_container);


}

function createAllContainers(browser, $root) {

    var id,
        tokens,
        height_calc,
        $container,
        $e;

    // .hic-x-track-container
    id = browser.id + '_' + 'x-track-container';
    this.$x_track_container = $("<div>", {id: id});
    $root.append(this.$x_track_container);

    // track labels
    id = browser.id + '_' + 'track-shim';
    this.$track_shim = $("<div>", {id: id});
    this.$x_track_container.append(this.$track_shim);

    // x-tracks
    id = browser.id + '_' + 'x-tracks';
    this.$x_tracks = $("<div>", {id: id});
    this.$x_track_container.append(this.$x_tracks);

    // crosshairs guide
    id = browser.id + '_' + 'y-track-guide';
    this.$y_track_guide = $("<div>", {id: id});
    this.$x_tracks.append(this.$y_track_guide);

    // content container
    id = browser.id + '_' + 'content-container';
    this.$content_container = $("<div>", {id: id});
    $root.append(this.$content_container);

    // menu
    createMenu(browser, $root);

    // container: x-axis
    id = browser.id + '_' + 'x-axis-container';
    $container = $("<div>", {id: id});
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
        w = h = self.track_height;
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
    var self = this,
        indices;

    indices = _.range(_.size(this.browser.trackRenderers));

    if (0 === _.size(indices)) {
        return;
    }

    _.each(indices, function (unused) {
        var discard,
            index;

        // select last track to dicard
        discard = _.last(self.browser.trackRenderers);

        // discard DOM element's
        discard['x'].$viewport.remove();
        discard['y'].$viewport.remove();

        // remove discard from list
        index = self.browser.trackRenderers.indexOf(discard);
        self.browser.trackRenderers.splice(index, 1);

        discard = undefined;
        self.doLayoutTrackXYPairCount(_.size(self.browser.trackRenderers));
    });

    // this.browser.updateLayout();
};

LayoutController.prototype.removeLastTrackXYPair = function () {
    var index,
        discard;

    if (_.size(this.browser.trackRenderers) > 0) {

        // select last track to dicard
        discard = _.last(this.browser.trackRenderers);

        // discard DOM element's
        discard['x'].$viewport.remove();
        discard['y'].$viewport.remove();

        // remove discard from list
        index = this.browser.trackRenderers.indexOf(discard);
        this.browser.trackRenderers.splice(index, 1);

        discard = undefined;
        this.doLayoutTrackXYPairCount(_.size(this.browser.trackRenderers));

        this.browser.updateLayout();

    } else {
        //console.log('No more tracks.');
    }

};

LayoutController.prototype.removeTrackRendererPair = function (trackRendererPair) {

    var index,
        discard;

    if (_.size(this.browser.trackRenderers) > 0) {

        discard = trackRendererPair;

        // discard DOM element's
        discard['x'].$viewport.remove();
        discard['y'].$viewport.remove();

        // remove discard from list
        index = this.browser.trackRenderers.indexOf(discard);
        this.browser.trackRenderers.splice(index, 1);

        this.doLayoutTrackXYPairCount(_.size(this.browser.trackRenderers));

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


    track_aggregate_height = (0 === trackXYPairCount) ? 0 : trackXYPairCount * (this.track_height + this.track_margin);

    tokens = _.map([LayoutController.navbarHeight(), track_aggregate_height], function (number) {
        return number.toString() + 'px';
    });
    height_calc = 'calc(100% - (' + tokens.join(' + ') + '))';

    tokens = _.map([track_aggregate_height, this.axis_height, this.scrollbar_height], function (number) {
        return number.toString() + 'px';
    });
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

    count = _.size(this.browser.trackRenderers) > 0 ? _.size(this.browser.trackRenderers) : 0;
    this.doLayoutTrackXYPairCount(count);

    this.browser.updateLayout();
};

export default LayoutController