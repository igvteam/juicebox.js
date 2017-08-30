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
    hic.LayoutController.nav_bar_label_height = 32;
    hic.LayoutController.nav_bar_widget_container_height = 56;
    hic.LayoutController.nav_bar_shim_height = 8;
    hic.LayoutController.nav_bar_height = hic.LayoutController.nav_bar_label_height + hic.LayoutController.nav_bar_widget_container_height + hic.LayoutController.nav_bar_shim_height;

    function createNavBar(browser, $root) {

        var id,
            $navbar_container,
            $div,
            $e,
            $fa;

        $navbar_container = $('<div class="hic-navbar-container">');


        $navbar_container.on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            hic.Browser.setCurrentBrowser(browser);
        });

        if(browser.config.showHicContactMapLabel === false) {
            $navbar_container.height(hic.LayoutController.nav_bar_height);
        }

        $root.append($navbar_container);


        // container: contact map label | browser delete button
        id = browser.id + '_' + 'hic-nav-bar-contact-map-label-delete-button-container';
        $div = $("<div>", { id:id });
        $navbar_container.append($div);

        // contact map label
        id = browser.id + '_' + 'hic-nav-bar-contact-map-label';
        browser.$contactMaplabel = $("<div>", { id:id });
        $div.append(browser.$contactMaplabel);

        if (false === browser.config.showHicContactMapLabel) {
            browser.$contactMaplabel.hide();
        }

        // browser delete button
        $e = $("<div>", { class:'hic-nav-bar-delete-button' });
        $div.append($e);

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

        // hide delete buttons for now. All delete buttons will later
        // be shown IF there is more then one browser instance.
        $e.hide();

        // Widget container
        id = browser.id + '_' + 'hic-nav-bar-widget-container';
        $div = $("<div>", { id:id });

        if (true === browser.config.miniMode) {
            $div.addClass('hic-nav-bar-mini-mode-widget-container');
        }

        $navbar_container.append($div);


        // chromosome selector
        browser.chromosomeSelector = new hic.ChromosomeSelectorWidget(browser, $div);
        if (false === browser.config.showChromosomeSelector) {
            browser.chromosomeSelector.$container.hide();
        }

        // location box / goto
        browser.locusGoto = new hic.LocusGoto(browser, $div);

        if (false === browser.config.showLocusGoto) {
            browser.locusGoto.$container.hide();
        }

        // colorscale widget
        browser.colorscaleWidget = new hic.ColorScaleWidget(browser, $div);

        // resolution widget
        browser.normalizationSelector = new hic.NormalizationWidget(browser);
        $div.append(browser.normalizationSelector.$container);

        // resolution widget
        browser.resolutionSelector = new hic.ResolutionSelector(browser);
        $div.append(browser.resolutionSelector.$container);

        browser.resolutionSelector.setResolutionLock(browser.resolutionLocked);

        // nav-bar shim
        $div = $('<div class="hic-nav-bar-shim">');
        $navbar_container.append($div);

    }

    function createAllContainers(browser, $root) {

        var id,
            tokens,
            height_calc,
            $container,
            $menu,
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


        // menu
        $menu = $('<div>', { id:'hic-menu' });
        $root.append($menu);

        //
        $e = $('<div>');
        $menu.append($e);

        //
        $e = $('<div>');
        $menu.append($e);

        //
        $e = $('<div>');
        $menu.append($e);







        if(false === browser.config.showHicContactMapLabel) {
            tokens = _.map([ hic.LayoutController.nav_bar_height ], function(number){
                return number.toString() + 'px';
            });
            height_calc = 'calc(100% - (' + tokens.join(' + ') + '))';

            this.$content_container.css( 'height', height_calc );
        }

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
            trackRendererPair;

        if ('TrackLoad' === event.type) {

            _.each(event.data.trackXYPairs, function (trackPair) {

                var w,
                    h;

                self.doLayoutTrackXYPairCount(1 + _.size(self.browser.trackRenderers));

                // append tracks
                trackRendererPair = {};
                w = h = self.track_height;
                trackRendererPair.x = new hic.TrackRenderer(self.browser, {width: undefined, height: h}, self.$x_tracks, trackRendererPair, trackPair, 'x');
                trackRendererPair.y = new hic.TrackRenderer(self.browser, {width: w, height: undefined}, self.$y_tracks, trackRendererPair, trackPair, 'y');

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

        tokens = _.map([ hic.LayoutController.nav_bar_height, track_aggregate_height ], function(number){
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
        this.browser.$root.height(size.height + hic.LayoutController.nav_bar_height);

        count = _.size(this.browser.trackRenderers) > 0 ? _.size(this.browser.trackRenderers) : 0;
        this.doLayoutTrackXYPairCount(count);

        this.browser.updateLayout();
    };

    return hic;
})(hic || {});
