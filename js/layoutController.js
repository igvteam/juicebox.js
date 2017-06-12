/**
 * Created by dat on 4/4/17.
 */
var hic = (function (hic) {

    hic.LayoutController = function (browser, $root) {

        this.browser = browser;

        createNavBar.call(this, browser, $root);

        createAllContainers.call(this, browser, $root);

        // Compatibility wit igv menus
        igv.browser.trackContainerDiv = this.$x_track_container.get(0);

        // Dupes of corresponding juicebox.scss variables
        // Invariant during app running. If edited in juicebox.scss they MUST be kept in sync
        this.nav_bar_label_height = 32;
        this.nav_bar_widget_container_height = 70;
        this.nav_bar_height = this.nav_bar_label_height + this.nav_bar_widget_container_height;
        // this.nav_bar_padding_bottom = 8;
        this.nav_bar_padding_bottom = 0;

        this.scrollbar_height = 20;
        this.axis_height = 32;

        this.track_height = 32;

        hic.GlobalEventBus.subscribe('TrackLoad', this);
        hic.GlobalEventBus.subscribe('LocusChange', this);

    };

    function createNavBar(browser, $root) {

        var $navbar_container,
            $div;

        $navbar_container = $('<div class="hic-navbar-container">');
        $root.append($navbar_container);

        $div = $('<div id="hic-nav-bar-contact-map-label">');
        $navbar_container.append($div);

        $div = $('<div id="hic-nav-bar-widget-container">');
        $navbar_container.append($div);

        // chromosome selector
        if (browser.config.showChromosomeSelector) {
            browser.chromosomeSelector = new hic.ChromosomeSelectorWidget(browser, $div);
        }

        // location box / goto
        browser.locusGoto = new hic.LocusGoto(browser, $div);

        // colorscale widget
        browser.colorscaleWidget = new hic.ColorScaleWidget(browser, $div);

        // resolution widget
        browser.normalizationSelector = new hic.NormalizationWidget(browser);
        $div.append(browser.normalizationSelector.$container);

        // resolution widget
        browser.resolutionSelector = new hic.ResolutionSelector(browser);
        $div.append(browser.resolutionSelector.$container);

    }

    function createAllContainers(browser, $root) {

        var $container,
        $e;

        // .hic-x-track-container
        this.$x_track_container = $('<div id="x-track-container">');
        $root.append(this.$x_track_container);

        // track labels
        this.$track_shim = $('<div id="track-shim">');
        this.$x_track_container.append(this.$track_shim);

        // x-tracks
        this.$x_tracks = $('<div id="x-tracks">');
        this.$x_track_container.append(this.$x_tracks);

        // crosshairs guide
        $e = $('<div id="y-track-guide">');
        this.$x_tracks.append($e);

        // content container
        this.$content_container = $('<div id="content-container">');
        $root.append(this.$content_container);

        // container: x-axis
        $container = $('<div id="x-axis-container">');
        this.$content_container.append($container);
        xAxis.call(this, browser, $container);


        // container: y-tracks | y-axis | viewport | y-scrollbar
        $container = $('<div id="y-tracks-y-axis-viewport-y-scrollbar">');
        this.$content_container.append($container);

        // y-tracks
        this.$y_tracks = $('<div id="y-tracks">');
        $container.append(this.$y_tracks);

        // crosshairs guide
        $e = $('<div id="x-track-guide">');
        this.$y_tracks.append($e);

        // y-axis
        yAxis.call(this, browser, $container);

        // viewport | y-scrollbar
        browser.contactMatrixView = new hic.ContactMatrixView(browser, $container);

        // container: x-scrollbar
        $container = $('<div id="x-scrollbar-container">');
        this.$content_container.append($container);

        // x-scrollbar
        $container.append(browser.contactMatrixView.scrollbarWidget.$x_axis_scrollbar_container);

        function xAxis(browser, $container) {
            var $xAxis = $('<div id="x-axis">');
            $container.append($xAxis);

            this.xAxisRuler = new hic.Ruler(browser, $xAxis, 'x');
        }

        function yAxis(browser, $container) {
            var $yAxis = $('<div id="y-axis">');
            $container.append($yAxis);

            this.yAxisRuler = new hic.Ruler(browser, $yAxis, 'y');
        }

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

                self.browser.updateHref();
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

        this.browser.updateHref();

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

            this.browser.updateHref();

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

            this.browser.updateHref();

        } else {
            console.log('No more tracks.');
        }

    };

    hic.LayoutController.prototype.doLayoutTrackXYPairCount = function (trackXYPairCount) {

        var track_aggregate_height,
            tokens,
            width_calc,
            height_calc;


        track_aggregate_height = trackXYPairCount * this.track_height;

        tokens = _.map([ this.nav_bar_height, this.nav_bar_padding_bottom, track_aggregate_height ], function(number){ return number.toString() + 'px'; });
        height_calc = 'calc(100% - (' + tokens.join(' + ') + '))';

        tokens = _.map([ track_aggregate_height, this.axis_height, this.scrollbar_height ], function(number){ return number.toString() + 'px'; });
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

    return hic;
})(hic || {});
