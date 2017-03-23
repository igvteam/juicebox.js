/**
 * Created by dat on 3/3/17.
 */
var hic = (function (hic) {

    hic.LocusGoto = function (browser) {

        this.browser = browser;
        this.$resolution_selector = $('<input type="text" placeholder="chr-x-axis chr-y-axis">');
        this.$resolution_selector.on('change', function (e) {
            var value = $(this).val();
            browser.parseGotoInput(value);
        });

        // chromosome goto container
        this.$container = $('<div class="hic-chromosome-goto-container">');
        this.$container.append(this.$resolution_selector);

        hic.GlobalEventBus.subscribe("LocusChange", this);
    };

    hic.LocusGoto.prototype.receiveEvent = function (event) {

        var self = this,
            bpPerBin,
            pixelsPerBin,
            dimensionsPixels,
            chrs,
            startBP1,
            startBP2,
            endBP1,
            endBP2,
            xy,
            state,
            chr1,
            chr2;

        if (event.type === "LocusChange") {

            state = event.data,

                chrs = _.map([state.chr1, state.chr2], function (index) {
                    return self.browser.dataset.chromosomes[index];
                });

            chr1 = self.browser.dataset.chromosomes[state.chr1];
            chr2 = self.browser.dataset.chromosomes[state.chr2];

            bpPerBin = this.browser.dataset.bpResolutions[state.zoom];
            dimensionsPixels = this.browser.contactMatrixView.getViewDimensions();
            pixelsPerBin = state.pixelSize;

            startBP1 = 1 + Math.round(state.x * bpPerBin);
            startBP2 = 1 + Math.round(state.y * bpPerBin);

            endBP1 = Math.min(chr1.size, Math.round(((dimensionsPixels.width / pixelsPerBin) * bpPerBin)) + startBP1);
            endBP2 = Math.min(chr2.size, Math.round(((dimensionsPixels.height / pixelsPerBin) * bpPerBin)) + startBP2);

            xy = chr1.name + ":" + igv.numberFormatter(startBP1) + "-" + igv.numberFormatter(endBP1) + " " +
                chr2.name + ":" + igv.numberFormatter(startBP2) + "-" + igv.numberFormatter(endBP2);


            this.$resolution_selector.val(xy);
        }


    };

    return hic;

})
(hic || {});
