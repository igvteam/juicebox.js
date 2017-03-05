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
            centroidBin,
            ss,
            ee,
            chrXLengthBin,
            chrYLengthBin,
            newExtent,
            pixels,
            bins;

        scaleFactor = zoomBpB / self.browser.bpPerBinWithZoom(self.browser.state.zoom);

        centroidBin = hic.Browser.centroidBin(this.browser.xyStartBin(), this.browser.xyEndBin());

        // magnify/minify bin coordinates in-place by 1) translating
        // the centroid to the origin 2) perform scale
        // 3) translate the centroid to the original location
        ss = _.map(this.browser.xyStartBin(), function(bin, index){
            return Math.floor(((bin - centroidBin[ index ]) * scaleFactor) + centroidBin[ index ]);
        });

        ee = _.map(this.browser.xyEndBin(), function(bin, index){
            return Math.floor(((bin - centroidBin[ index ]) * scaleFactor) + centroidBin[ index ]);
        });

        newExtent = hic.Browser.extentBin(ss, ee);
        chrXLengthBin = Math.floor(this.browser.hicReader.chromosomes[ this.browser.state.chr1 ].size / zoomBpB);
        chrYLengthBin = Math.floor(this.browser.hicReader.chromosomes[ this.browser.state.chr2 ].size / zoomBpB);

        if (_.first(newExtent) > chrXLengthBin || _.last(newExtent) > chrYLengthBin) {
            console.log('doZoomBpB. Error: Attempted minify exceeds either x-axis or y-axis chr extent');
            return;
        }

        pixels = this.browser.contactMatrixView.getViewDimensions();

        // clamp
        ss = [Math.max(            0, _.first(ss)), Math.max(0,             _.last(ss))];
        ee = [Math.min(chrXLengthBin, _.first(ee)), Math.min(chrYLengthBin, _.last(ee))];
        bins = hic.Browser.extentBin(ss, ee);

        self.browser.state.pixelSize = _.first(_.map([ pixels.width, pixels.height ], function(pixel, index){
            return Math.floor(pixel/bins[index]);
        }));

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
