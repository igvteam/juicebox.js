/**
 * Created by dat on 4/4/17.
 */
var hic = (function (hic) {

    hic.LayoutController = function (browser, $root) {

        this.browser = browser;

        createNavBar.call(this, browser, $root);

        createAllContainers.call(this, browser, $root);

        this.scrollbar_height = 20;
        this.axis_height = 32;

        this.track_height = 32;

        this.browser.eventBus.subscribe('TrackLoad', this);
        this.browser.eventBus.subscribe('LocusChange', this);

    };

    // Dupes of corresponding juicebox.scss variables
    // Invariant during app running. If edited in juicebox.scss they MUST be kept in sync
    hic.LayoutController.nav_bar_label_height = 36;
    hic.LayoutController.nav_bar_widget_container_height = 36;
    hic.LayoutController.nav_bar_shim_height = 4;

    hic.LayoutController.navbarHeight = function (miniMode) {
        var height;
        if (true === miniMode) {
            height =  hic.LayoutController.nav_bar_label_height;
        } else {
            height  = (2 * hic.LayoutController.nav_bar_widget_container_height) + hic.LayoutController.nav_bar_shim_height +  hic.LayoutController.nav_bar_label_height;
        }
        // console.log('navbar height ' + height);
        return height;
    };

    function createNavBar(browser, $root) {

        var id,
            $navbar_container,
            $label_delete_button_container,
            $upper_widget_container,
            $lower_widget_container,
            $navbar_shim,
            $a,
            $b,
            $e,
            $fa;

        $navbar_container = $('<div class="hic-navbar-container">');
        $root.append($navbar_container);

        if(true === browser.config.miniMode) {
            $navbar_container.height(hic.LayoutController.navbarHeight(browser.config.miniMode));
        } else {

            $navbar_container.on('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                hic.Browser.setCurrentBrowser(browser);
            });

        }

        // container: label | menu button | browser delete button
        id = browser.id + '_' + 'hic-nav-bar-contact-map-label-delete-button-container';
        $label_delete_button_container = $("<div>", { id:id });
        $navbar_container.append($label_delete_button_container);

        // label
        id = browser.id + '_' + 'hic-nav-bar-contact-map-label';
        browser.$contactMaplabel = $("<div>", { id:id });
        $label_delete_button_container.append(browser.$contactMaplabel);

        // menu button
        browser.$menuPresentDismiss = $("<div>", { class:'hic-nav-bar-menu-button' });
        $label_delete_button_container.append(browser.$menuPresentDismiss);

        $fa = $("<i>", { class:'fa fa-bars fa-lg' });
        browser.$menuPresentDismiss.append($fa);
        $fa.on('click', function (e) {
            browser.toggleMenu();
        });

        // browser delete button
        $e = $("<div>", { class:'hic-nav-bar-delete-button' });
        $label_delete_button_container.append($e);

        $fa = $("<i>", { class:'fa fa-minus-circle fa-lg' });
        // class="fa fa-plus-circle fa-lg" aria-hidden="true"
        $e.append($fa);

        $fa.on('click', function (e) {

            hic.allBrowsers.splice(_.indexOf(hic.allBrowsers, browser), 1);
            browser.$root.remove();
            browser = undefined;

            if (1 === _.size(hic.allBrowsers)) {
                $('.hic-nav-bar-delete-button').hide();
            }
        });

        // hide delete buttons for now. Delete button is only
        // if there is more then one browser instance.
        $e.hide();

        // upper widget container
        id = browser.id + '_upper_' + 'hic-nav-bar-widget-container';
        $upper_widget_container = $("<div>", { id:id });
        $navbar_container.append($upper_widget_container);

        // location box / goto
        browser.locusGoto = new hic.LocusGoto(browser, $upper_widget_container);

        if(true === browser.config.miniMode) {
            browser.$contactMaplabel.addClass('hidden-text');
            $upper_widget_container.hide();
        } else {

            // lower widget container
            id = browser.id + '_lower_' + 'hic-nav-bar-widget-container';
            $lower_widget_container = $("<div>", { id:id });
            $navbar_container.append($lower_widget_container);

            // colorscale
            browser.colorscaleWidget = new hic.ColorScaleWidget(browser, $lower_widget_container);

            // normalization
            browser.normalizationSelector = new hic.NormalizationWidget(browser, $lower_widget_container);

            // resolution widget
            browser.resolutionSelector = new hic.ResolutionSelector(browser, $lower_widget_container);
            browser.resolutionSelector.setResolutionLock(browser.resolutionLocked);

            // shim
            $navbar_shim = $('<div class="hic-nav-bar-shim">');
            $navbar_container.append($navbar_shim);
        }

    }

    function createAllContainers(browser, $root) {

        var id,
            tokens,
            height_calc,
            $container,
            $e;

        // .hic-x-track-container
        id = browser.id + '_' + 'x-track-container';
        this.$x_track_container = $("<div>", { id:id });
        $root.append(this.$x_track_container);

        // track labels
        id = browser.id + '_' + 'track-shim';
        this.$track_shim = $("<div>", { id:id });
        this.$x_track_container.append(this.$track_shim);

        // x-tracks
        id = browser.id + '_' + 'x-tracks';
        this.$x_tracks = $("<div>", { id:id });
        this.$x_track_container.append(this.$x_tracks);

        // crosshairs guide
        id = browser.id + '_' + 'y-track-guide';
        $e = $("<div>", { id:id });
        this.$x_tracks.append($e);

        // content container
        id = browser.id + '_' + 'content-container';
        this.$content_container = $("<div>", { id:id });
        $root.append(this.$content_container);

        // If we are in mini-mode we must recalculate the content container height
        // to coinside with the root browser container height
        if(true === browser.config.miniMode) {
            tokens = _.map([ hic.LayoutController.navbarHeight(browser.config.miniMode) ], function(number){
                return number.toString() + 'px';
            });
            height_calc = 'calc(100% - (' + tokens.join(' + ') + '))';

            this.$content_container.css( 'height', height_calc );
        }


        // menu
        createMenu(browser, $root);

        // ColorScale swatch selector
        createColorScaleSwatchSelector(browser, $root);




        // container: x-axis
        id = browser.id + '_' + 'x-axis-container';
        $container = $("<div>", { id:id });
        this.$content_container.append($container);
        xAxis.call(this, browser, $container);


        // container: y-tracks | y-axis | viewport | y-scrollbar
        id = browser.id + '_' + 'y-tracks-y-axis-viewport-y-scrollbar';
        $container = $("<div>", { id:id });
        this.$content_container.append($container);

        // y-tracks
        id = browser.id + '_' + 'y-tracks';
        this.$y_tracks = $("<div>", { id:id });
        $container.append(this.$y_tracks);

        // crosshairs guide
        id = browser.id + '_' + 'x-track-guide';
        $e = $("<div>", { id:id });
        this.$y_tracks.append($e);

        // y-axis
        yAxis.call(this, browser, $container);

        this.xAxisRuler.$otherRulerCanvas = this.yAxisRuler.$canvas;
        this.yAxisRuler.$otherRulerCanvas = this.xAxisRuler.$canvas;

        // viewport | y-scrollbar
        browser.contactMatrixView = new hic.ContactMatrixView(browser, $container);

        // container: x-scrollbar
        id = browser.id + '_' + 'x-scrollbar-container';
        $container = $("<div>", { id:id });
        this.$content_container.append($container);

        // x-scrollbar
        $container.append(browser.contactMatrixView.scrollbarWidget.$x_axis_scrollbar_container);

    }

    function createMenu(browser, $root) {

        var $menu,
            $div,
            $fa;

        // menu
        $menu = $('<div>', { class:'hic-menu' });
        $root.append($menu);

        // menu close button
        $div = $('<div>', { class:'hic-menu-close-button' });
        $menu.append($div);

        // $fa = $("<i>", { class:'fa fa-minus-circle fa-lg' });
        $fa = $("<i>", { class:'fa fa-times' });
        $div.append($fa);

        $fa.on('click', function (e) {
            browser.toggleMenu();
        });


        // chromosome select widget
        browser.chromosomeSelector = new hic.ChromosomeSelectorWidget(browser, $menu);

        if(true === browser.config.miniMode) {

            browser.chromosomeSelector.$container.hide();

            // colorscale
            browser.colorscaleWidget = new hic.ColorScaleWidget(browser, $menu);

            // normalization
            browser.normalizationSelector = new hic.NormalizationWidget(browser, $menu);

            // resolution widget
            browser.resolutionSelector = new hic.ResolutionSelector(browser, $menu);
            browser.resolutionSelector.setResolutionLock(browser.resolutionLocked);
        }

        browser.annotation2DWidget = new hic.AnnotationWidget(browser, $menu, '2D Annotations', function () {
            return browser.tracks2D;
        }, true);

        browser.annotation1DDWidget = new hic.AnnotationWidget(browser, $menu, 'Tracks', function () {
            return browser.trackRenderers;
        }, false);

        browser.$menu = $menu;

        browser.$menu.hide();

    }

    function createColorScaleSwatchSelector(browser, $root) {

        var $scroll_container,
            $container;

        // scroll container
        $scroll_container = $('<div>', { class:'color-scale-swatch-scroll-container' });
        $root.append($scroll_container);

        // swatch container
        $container = $('<div>', { class:'color-scale-swatch-container' });
        $scroll_container.append($container);

        hic.createColorSwatchSelector($container, function (colorName) {
            var rgb;

            rgb = Colors.name2rgb(colorName);

            browser.colorscaleWidget.$button.find('.fa-square').css({ color: colorName });

            browser.contactMatrixView.colorScale.highR = rgb.R;
            browser.contactMatrixView.colorScale.highG = rgb.G;
            browser.contactMatrixView.colorScale.highB = rgb.B;

            browser.contactMatrixView.updating = false;
            browser.contactMatrixView.initialImage = undefined;
            browser.contactMatrixView.clearCaches();
            browser.contactMatrixView.colorScaleCache = {};
            browser.contactMatrixView.update();
        }, function () {
            browser.$root.find('.color-scale-swatch-scroll-container').toggle();
        });

        $scroll_container.draggable();

        $scroll_container.hide();

    }

    function xAxis(browser, $container) {
        var id,
            $xAxis;

        id = browser.id + '_' + 'x-axis';
        $xAxis = $("<div>", { id:id });
        $container.append($xAxis);

        this.xAxisRuler = new hic.Ruler(browser, $xAxis, 'x');
    }

    function yAxis(browser, $container) {
        var id,
            $yAxis;

        id = browser.id + '_' + 'y-axis';
        $yAxis = $("<div>", { id:id });
        $container.append($yAxis);

        this.yAxisRuler = new hic.Ruler(browser, $yAxis, 'y');
    }

    hic.LayoutController.prototype.receiveEvent = function(event) {
        var self = this,
            trackRendererPair,
            rev;

        if ('TrackLoad' === event.type) {

            _.each(event.data.trackXYPairs, function (trackPair, index) {

                var w,
                    h;

                self.doLayoutTrackXYPairCount(1 + _.size(self.browser.trackRenderers));

                trackRendererPair = {};
                w = h = self.track_height;
                trackRendererPair.x = new hic.TrackRenderer(self.browser, {width: undefined, height: h}, self.$x_tracks, trackRendererPair, trackPair, 'x', index);
                trackRendererPair.y = new hic.TrackRenderer(self.browser, {width: w, height: undefined}, self.$y_tracks, trackRendererPair, trackPair, 'y', index);

                self.browser.trackRenderers.push(trackRendererPair);

                self.browser.updateUriParameters();
            });

            this.browser.updateLayout();

        } else if ('LocusChange' === event.type) {
            this.browser.renderTracks(false);
        }


    };

    hic.LayoutController.prototype.removeAllTrackXYPairs = function () {
        var self = this,
            indices;

        indices = _.range(_.size(this.browser.trackRenderers));

        if (0 === _.size(indices)) {
            return;
        }

        _.each(indices, function(unused) {
            var discard,
                index;

            // select last track to dicard
            discard = _.last(self.browser.trackRenderers);

            // discard DOM element's
            discard[ 'x' ].$viewport.remove();
            discard[ 'y' ].$viewport.remove();

            // remove discard from list
            index = self.browser.trackRenderers.indexOf(discard);
            self.browser.trackRenderers.splice(index, 1);

            discard = undefined;
            self.doLayoutTrackXYPairCount( _.size(self.browser.trackRenderers) );
        });

        this.browser.updateUriParameters();

        // this.browser.updateLayout();
    };

    hic.LayoutController.prototype.removeLastTrackXYPair = function () {
        var index,
            discard;

        if (_.size(this.browser.trackRenderers) > 0) {

            // select last track to dicard
            discard = _.last(this.browser.trackRenderers);

            // discard DOM element's
            discard[ 'x' ].$viewport.remove();
            discard[ 'y' ].$viewport.remove();

            // remove discard from list
            index = this.browser.trackRenderers.indexOf(discard);
            this.browser.trackRenderers.splice(index, 1);

            discard = undefined;
            this.doLayoutTrackXYPairCount( _.size(this.browser.trackRenderers) );

            this.browser.updateLayout();

            this.browser.updateUriParameters();

        } else {
            console.log('No more tracks.');
        }

    };

    hic.LayoutController.prototype.removeTrackRendererPair = function (trackRendererPair) {

        var index,
            discard;

        if (_.size(this.browser.trackRenderers) > 0) {

            discard = trackRendererPair;

            // discard DOM element's
            discard[ 'x' ].$viewport.remove();
            discard[ 'y' ].$viewport.remove();

            // remove discard from list
            index = this.browser.trackRenderers.indexOf(discard);
            this.browser.trackRenderers.splice(index, 1);

            this.doLayoutTrackXYPairCount( _.size(this.browser.trackRenderers) );

            this.browser.updateLayout();

            this.browser.updateUriParameters();

        } else {
            console.log('No more tracks.');
        }

    };

    hic.LayoutController.prototype.doLayoutTrackXYPairCount = function (trackXYPairCount) {

        var track_aggregate_height,
            tokens,
            width_calc,
            height_calc;


        track_aggregate_height = (0 === trackXYPairCount) ? 0 : trackXYPairCount * this.track_height;

        tokens = _.map([ hic.LayoutController.navbarHeight(this.browser.config.miniMode), track_aggregate_height ], function(number){
            return number.toString() + 'px';
        });
        height_calc = 'calc(100% - (' + tokens.join(' + ') + '))';

        tokens = _.map([ track_aggregate_height, this.axis_height, this.scrollbar_height ], function(number){
            return number.toString() + 'px';
        });
        width_calc = 'calc(100% - (' + tokens.join(' + ') + '))';

        // x-track container
        this.$x_track_container.height(track_aggregate_height);

        // track labels
        this.$track_shim.width(track_aggregate_height);

        // x-tracks
        this.$x_tracks.css( 'width', width_calc );


        // content container
        this.$content_container.css( 'height', height_calc );

        // x-axis - repaint canvas
        this.xAxisRuler.updateWidthWithCalculation(width_calc);

        // y-tracks
        this.$y_tracks.width(track_aggregate_height);

        // y-axis - repaint canvas
        this.yAxisRuler.updateHeight(this.yAxisRuler.$axis.height());

        // viewport
        this.browser.contactMatrixView.$viewport.css( 'width', width_calc );

        // x-scrollbar
        this.browser.contactMatrixView.scrollbarWidget.$x_axis_scrollbar_container.css( 'width', width_calc );

    };

    hic.LayoutController.prototype.doLayoutWithRootContainerSize = function (size) {

        var count;

        this.browser.$root.width(size.width);
        this.browser.$root.height(size.height + hic.LayoutController.navbarHeight(this.browser.config.miniMode));

        count = _.size(this.browser.trackRenderers) > 0 ? _.size(this.browser.trackRenderers) : 0;
        this.doLayoutTrackXYPairCount(count);

        this.browser.updateLayout();
    };

    return hic;
})(hic || {});
