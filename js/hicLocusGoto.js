/**
 * Created by dat on 3/3/17.
 */
var hic = (function (hic) {

    hic.LocusGoto = function(browser) {

        this.browser = browser;
        this.$resolution_widget = $('<input class="hic-chromosome-goto-input" type="text" placeholder="chr-x-axis chr-y-axis">');
        this.$resolution_widget.on('change', function(e){
            var value = $(this).val();
            browser.parseGotoInput( value );
        });

        // chromosome goto container
        this.$container = $('<div class="hic-chromosome-goto-container">');
        this.$container.append(this.$resolution_widget);

        hic.GlobalEventBus.subscribe("LocusChange", this);
    };

    hic.LocusGoto.prototype.receiveEvent = function(event) {

        var self = this,
            bpPerBin,
            pixelsPerBin,
            dimensionsPixels,
            chrs,
            startsBP,
            endsBP,
            xy;

        if (event.payload && event.payload instanceof hic.State) {

            chrs = _.map([ event.payload.chr1, event.payload.chr2 ], function(index) {
                return self.browser.hicReader.chromosomes[ index ].name;
            });

            bpPerBin = this.browser.hicReader.bpResolutions[ event.payload.zoom ];
            dimensionsPixels = this.browser.contactMatrixView.getViewDimensions();
            pixelsPerBin = event.payload.pixelSize;

            startsBP = _.map([ event.payload.x, event.payload.y ], function(bin) {
                return bin * bpPerBin;
            });

            endsBP = _.map([ dimensionsPixels.width, dimensionsPixels.height ], function(pixels, index) {
                return ((pixels / pixelsPerBin) * bpPerBin) + startsBP[ index ];
            });

            xy = _.map([0, 1], function(index) {
                return chrs[ index ] + ':' + igv.numberFormatter(startsBP[ index ]) + '-' + igv.numberFormatter(endsBP[ index ]);
            });

            this.$resolution_widget.val(xy.join(' '));
        }


    };

    return hic;

})
(hic || {});
