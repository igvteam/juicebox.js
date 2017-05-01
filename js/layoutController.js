/**
 * Created by dat on 4/4/17.
 */
var hic = (function (hic) {

    hic.LayoutController = function (browser, $root) {

        this.browser = browser;

        createNavBar.call(this, browser, $root);

        createAllContainers.call(this, browser, $root);

        // Dupes of corresponding juicebox.scss variables
        // Invariant during app running. If edited in juicebox.scss they MUST be kept in sync
        this.nav_bar_height = 70;
        this.nav_bar_padding_bottom = 8;

        this.axis_height = 32;
        this.scrollbar_height = 20;

        this.track_height = 32;

        hic.GlobalEventBus.subscribe('DidAddTrack', this);
        hic.GlobalEventBus.subscribe('LocusChange', this);

    };

    function createNavBar(browser, $root) {

        var $navbar_container = $('<div class="hic-navbar-container">');
        $root.append($navbar_container);

        // logo
        // $navbar_container.append($('<div class="hic-logo-container">'));

        // chromosome selector
        if (browser.config.showChromosomeSelector) {
            browser.chromosomeSelector = new hic.ChromosomeSelectorWidget(browser, $navbar_container);
        }

        // location box / goto
        browser.locusGoto = new hic.LocusGoto(browser, $navbar_container);

        // colorscale widget
        browser.colorscaleWidget = new hic.ColorScaleWidget(browser, $navbar_container);

        // resolution widget
        browser.normalizationSelector = new hic.NormalizationWidget(browser);
        $navbar_container.append(browser.normalizationSelector.$container);

        // resolution widget
        browser.resolutionSelector = new hic.ResolutionSelector(browser);
        $navbar_container.append(browser.resolutionSelector.$container);

    }

    function createAllContainers(browser, $root) {

        var $container;

        // .hic-x-track-container
        this.$x_track_container = $('<div class="hic-x-track-container">');
        $root.append(this.$x_track_container);

        // track labels
        this.$track_labels = $('<div>');
        this.$x_track_container.append(this.$track_labels);

        // x-tracks
        this.$x_tracks = $('<div>');
        this.$x_track_container.append(this.$x_tracks);


        // content container
        this.$content_container = $('<div class="hic-content-container">');
        $root.append(this.$content_container);

        // container: x-axis
        $container = $('<div>');
        this.$content_container.append($container);
        xAxis.call(this, browser, $container);


        // container: y-tracks | y-axis | viewport | y-scrollbar
        $container = $('<div>');
        this.$content_container.append($container);

        // y-tracks
        this.$y_tracks = $('<div>');
        $container.append(this.$y_tracks);

        // y-axis
        yAxis.call(this, browser, $container);

        // viewport | y-scrollbar
        browser.contactMatrixView = new hic.ContactMatrixView(browser, $container);

        // container: x-scrollbar
        $container = $('<div>');
        this.$content_container.append($container);

        // x-scrollbar
        $container.append(browser.contactMatrixView.scrollbarWidget.$x_axis_scrollbar_container);

        function xAxis(browser, $container) {
            var $xAxis = $('<div>');
            $container.append($xAxis);

            this.xAxisRuler = new hic.Ruler(browser, $xAxis, 'x');
        }

        function yAxis(browser, $container) {
            var $yAxis = $('<div>');
            $container.append($yAxis);

            this.yAxisRuler = new hic.Ruler(browser, $yAxis, 'y');
        }

    }

    hic.LayoutController.prototype.receiveEvent = function(event) {
        var self = this,
            trackXY;

        if ('DidAddTrack' === event.type) {

            _.each(event.data.trackXYPairs, function (trackXYPair) {

                var w,
                    h;

                self.doLayoutTrackXYPairCount(1 + _.size(self.browser.trackRenderers));

                // append tracks
                trackXY = {};
                w = h = self.track_height;
                trackXY.x = new hic.TrackRenderer(self.browser, { width: undefined, height: h         }, self.$x_tracks, trackXYPair[ 'x' ], 'x');
                trackXY.y = new hic.TrackRenderer(self.browser, { width: w,         height: undefined }, self.$y_tracks, trackXYPair[ 'y' ], 'y');

                self.browser.trackRenderers.push(trackXY);
            });

            this.browser.renderTracks(true);
            this.browser.setZoom(this.browser.state.zoom);

        } else if ('LocusChange' === event.type) {
            this.browser.renderTracks(false);
        }


    };

    hic.LayoutController.prototype.removeTrackXYPair = function () {
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

            this.browser.renderTracks(true);
            this.browser.setZoom(this.browser.state.zoom);

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
        this.$track_labels.width(track_aggregate_height);
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
