/**
 * Created by dat on 3/13/17.
 */
var hic = (function (hic) {

    hic.SweepZoom = function ($viewport) {

        var self = this,
            isMouseDown = undefined,
            isMouseIn = undefined,
            mouseDownXY = undefined,
            mouseMoveXY = undefined,
            left,
            rulerSweepWidth,
            rulerSweepThreshold = 1,
            dx;


        // self.trackView.trackDiv.dataset.rulerTrack = "rulerTrack";

        // ruler sweeper widget surface
        self.$rulerSweeper = $('<div class="hic-sweep-zoom">');
        $viewport.append(self.$rulerSweeper);

        this.$viewport.on({

            mousedown: function (e) {

                e.preventDefault();

                $viewport.off();

                $viewport.on({
                    mousedown: function (e) {
                        isMouseDown = true;
                    }
                });

                mouseDownXY = igv.translateMouseCoordinates(e, $viewport.get(0));

                left = mouseDownXY.x;
                rulerSweepWidth = 0;
                self.$rulerSweeper.css({"display": "inline", "left": left + "px", "width": rulerSweepWidth + "px"});

                isMouseIn = true;
            },

            mousemove: function (e) {

                e.preventDefault();

                if (isMouseDown && isMouseIn) {

                    mouseMoveXY = igv.translateMouseCoordinates(e, $viewport.get(0));
                    dx = mouseMoveXY.x - mouseDownXY.x;
                    rulerSweepWidth = Math.abs(dx);

                    if (rulerSweepWidth > rulerSweepThreshold) {

                        self.$rulerSweeper.css({"width": rulerSweepWidth + "px"});

                        if (dx < 0) {

                            if (mouseDownXY.x + dx < 0) {
                                isMouseIn = false;
                                left = 0;
                            } else {
                                left = mouseDownXY.x + dx;
                            }
                            self.$rulerSweeper.css({"left": left + "px"});
                        }
                    }
                }
            },

            mouseup: function (e) {

                var extent,
                    referenceFrame;

                if (isMouseDown) {

                    // End sweep
                    isMouseDown = false;
                    isMouseIn = false;

                    self.$rulerSweeper.css({"display": "none", "left": 0 + "px", "width": 0 + "px"});

                    // referenceFrame = self.genomicState.referenceFrame;

                    // extent = {};
                    // extent.start = referenceFrame.start + (left * referenceFrame.bpPerPixel);
                    // extent.end = extent.start + rulerSweepWidth * referenceFrame.bpPerPixel;

                    if (rulerSweepWidth > rulerSweepThreshold) {
                        // igv.Browser.validateLocusExtent(igv.browser.genome.getChromosome(referenceFrame.chrName), extent);
                        // self.goto(referenceFrame.chrName, extent.start, extent.end);
                    }
                }

            }
        });

    };

    return hic;
})(hic || {});