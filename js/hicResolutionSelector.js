/**
 * Created by dat on 3/4/17.
 */
var hic = (function (hic) {

    hic.ResolutionSelector = function (browser) {
        var self = this,
            elements,
            $label;

        this.browser = browser;

        this.$resolution_selector = $('<select name="select">');
        this.$resolution_selector.on('change', function(e){
            var n = $(this).val();
            self.doZoomBpB(parseInt(n, 10));
        });

        elements = _.map(browser.hicReader.bpResolutions, function(resolution){
            return '<option' + ' value=' + resolution + '>' + igv.numberFormatter(resolution) + '</option>';
        });

        this.$resolution_selector.append(elements.join(''));
        this.$resolution_selector.attr('name', 'resolution_selector');

        $label = $('<label for="resolution_selector">');
        $label.text('RESOLUTION');

        this.$container = $('<div class="hic-resolution-selector-container">');

        this.$container.append($label);
        this.$container.append(this.$resolution_selector);

        hic.GlobalEventBus.subscribe("LocusChange", this);
    };

    hic.ResolutionSelector.prototype.doZoomBpB = function (zoomBpB) {
        var self = this,
            scaleFactor,
            _xyStart,
            _xyEnd,
            centroid,
            ss,
            ee,
            pixels,
            bins;

        scaleFactor = zoomBpB / self.browser.bpPerBinWithZoom(self.browser.state.zoom);

        _xyStart = this.browser.xyStartBin();
        _xyEnd = this.browser.xyEndBin();

        centroid = hic.Browser.centroidBin(_xyStart, _xyEnd);

        // magnify/minify bin coordinates in-place by first translating
        // the scale center to the origin - via the centroid translation
        // then performing the inverse translation scaled by the scale factor
        ss = _.map(_xyStart, function(bin, index){
            return ((bin - centroid[ index ]) * scaleFactor) + centroid[ index ];
        });

        ee = _.map(_xyEnd, function(bin, index){
            return ((bin - centroid[ index ]) * scaleFactor) + centroid[ index ];
        });

        pixels = this.browser.contactMatrixView.getViewDimensions();
        bins = hic.Browser.extentBin(ss, ee);

        self.browser.state.pixelSize = _.first(_.map([ pixels.width, pixels.height ], function(pixel, index){ return pixel / bins[ index ]; }));
        self.browser.state.x = _.first(ss);
        self.browser.state.y = _.last(ss);
        self.browser.state.zoom = _.indexOf(self.browser.hicReader.bpResolutions, zoomBpB);

        self.browser.update();

    };

    hic.ResolutionSelector.prototype.receiveEvent = function(event) {

        if (event.payload && event.payload instanceof hic.State) {

            this.$resolution_selector
                .find('option')
                .filter(function(index) {
                    return index === event.payload.zoom;
                })
                .prop('selected', true);

        }

    };

    return hic;

})
(hic || {});
