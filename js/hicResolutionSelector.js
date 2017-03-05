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
            self.zoomHandler( parseInt($(this).val()) )
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

    hic.ResolutionSelector.prototype.zoomHandler = function  (zoom) {
        var self = this,
            scaleFactor,
            centroid,
            ss,
            ee,
            dimensionsPixels;

        scaleFactor = self.browser.bpPerBinWithZoom(zoom) / self.browser.bpPerBinWithZoom(self.browser.state.zoom);

        centroid = this.browser.xyCentroidBin();

        // magnify/minify bin coordinates
        ss = _.map(this.browser.xyStartBin(), function(bin, index){
            return ((bin - centroid[ index ]) * scaleFactor) + (centroid[ index ] * scaleFactor);
        });

        ee = _.map(this.browser.xyEndBin(), function(bin, index){
            return ((bin - centroid[ index ]) * scaleFactor) + (centroid[ index ] * scaleFactor);
        });

        dimensionsPixels = this.browser.contactMatrixView.getViewDimensions();








        self.browser.state.zoom = _.indexOf(self.browser.hicReader.bpResolutions, zoom);
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
