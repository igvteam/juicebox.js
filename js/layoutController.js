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

        this.scrollbar_height = 20;
        this.axis_height = 32;

        this.track_height = 32;

        this.browser.eventBus.subscribe('TrackLoad', this);
        this.browser.eventBus.subscribe('LocusChange', this);

    };

    function createNavBar(browser, $root) {

        var id,
            $navbar_container,
            $div;

        $navbar_container = $('<div class="hic-navbar-container">');
        $root.append($navbar_container);

        if(browser.config.showHicContactMapLabel === false) {
            $navbar_container.css("height", "60");
        }

        // HiC Contact Map Label
        id = browser.id + '_' + 'hic-nav-bar-contact-map-label';
        browser.$contactMaplabel = $("<div>", { id:id });
        $navbar_container.append(browser.$contactMaplabel);
        if (false === browser.config.showHicContactMapLabel) {
            browser.$contactMaplabel.hide();
        }

        // Widget container
        id = browser.id + '_' + 'hic-nav-bar-widget-container';
        $div = $("<div>", { id:id });
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

        // nav-bar shim
        $div = $('<div class="hic-nav-bar-shim">');
        $navbar_container.append($div);

    }

    function createAllContainers(browser, $root) {

        var id,
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

        tokens = _.map([ this.nav_bar_height, track_aggregate_height ], function(number){ return number.toString() + 'px'; });
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
