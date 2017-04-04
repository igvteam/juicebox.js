/**
 * Created by dat on 4/4/17.
 */
var hic = (function (hic) {

    hic.LayoutController = function (browser, $root) {

        createNavBar.call(this, browser, $root);

        createXTrackContainer.call(this, browser, $root);

        createContentContainer.call(this, browser, $root);

        hic.GlobalEventBus.subscribe("DidAddTrack", this);

    };

    hic.LayoutController.prototype.receiveEvent = function(event) {
        var self = this;

        if (event.type === "DidAddTrack") {
            console.log('did load track - yo from layout controller.');

            // examples of jquery calcs
            
            // $hic-scrollbar-height: 20px;
            // $hic-axis-height: 32px;

            // $track-count: 2;
            // $track-height: 32px;
            // $track-aggregate-height: $track-count * $track-height;
            
            // x-tracks:  width = calc(100% - ($track-aggregate-height + $hic-axis-height + $hic-scrollbar-height));

            // content-container: height = calc(100% - ($nav-bar-height + $nav-bar-padding-bottom + $track-aggregate-height));

            // x-axis: width = calc(100% - ($track-aggregate-height + $hic-axis-height + $hic-scrollbar-height));

            // viewport: width = calc(100% - ($track-aggregate-height + $hic-axis-height + $hic-scrollbar-height));

            // x-scrollbar: width = calc(100% - ($track-aggregate-height + $hic-axis-height + $hic-scrollbar-height));
            
            $('#your-element-id').css('width', '100%').css('width', '-=100px');

            $('#another-element-id').css( "width", "calc(100% - 100px)" );
        }
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

    function createXTrackContainer(browser, $root) {

        var $container;

        // container: track-labels | x-tracks
        $container = $('<div class="hic-x-track-container">');
        $root.append($container);

        // track labels
        this.$track_labels = $('<div>');
        $container.append(this.$track_labels);

        // x tracks
        this.$x_tracks = $('<div>');
        $container.append(this.$x_tracks);

    }

    function createContentContainer(browser, $root) {

        var $container;

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
        this.$viewport = browser.contactMatrixView.$viewport;


        // container: x-scrollbar
        $container = $('<div>');
        this.$content_container.append($container);

        // x-scrollbar
        $container.append(browser.contactMatrixView.scrollbarWidget.$x_axis_scrollbar_container);
        this.$x_scrollbar = browser.contactMatrixView.scrollbarWidget.$x_axis_scrollbar_container;

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

    return hic;
})(hic || {});
