/**
 * Created by dat on 3/14/17.
 */
var hic = (function (hic) {

    hic.SweepZoom = function (browser, $rulerSweeper) {
        this.browser = browser;
        this.$rulerSweeper = $rulerSweeper;
        this.$rulerSweeper.hide();
    };

    hic.SweepZoom.prototype.reset = function(xy) {

        this.$rulerSweeper.css({ left: xy.x + "px", top: xy.y + "px", width: 1 + "px" , height: 1 + "px" });
        this.$rulerSweeper.show();

        this.originBin = this.browser.toBin(xy.x, xy.y);
        this.aspectRatio = this.browser.contactMatrixView.getViewDimensions().width / this.browser.contactMatrixView.getViewDimensions().height;
    };

    hic.SweepZoom.prototype.update = function(mouseDown, coords) {
        var dx,
            dy,
            displacement;
        dx = coords.x - mouseDown.x;
        dy = coords.y - mouseDown.y;

        displacement = Math.max(Math.abs(dx), Math.abs(dy));

        if (Math.abs(dx) > Math.abs(dy)) {
            this.sweepSizePixel = { width: displacement, height: Math.round(displacement / this.aspectRatio) };
        } else {
            this.sweepSizePixel = { width: Math.round(displacement * this.aspectRatio), height: displacement };
        }

        this.$rulerSweeper.css({ width: this.sweepSizePixel.width + "px", height: this.sweepSizePixel.height + "px" });

        if (dx < 0) {
            this.$rulerSweeper.css({ left: (mouseDown.x + dx) + "px" });
        }

        if (dy < 0) {
            this.$rulerSweeper.css({ top: (mouseDown.y + dy) + "px" });
        }

    };

    hic.SweepZoom.prototype.dismiss = function () {
        var scaleFactor,
            zoomIndex,
            s;

        this.$rulerSweeper.hide();
        scaleFactor = this.sweepSizePixel.width / this.browser.contactMatrixView.getViewDimensions().width;
        zoomIndex = this.browser.findMatchingZoomIndex(scaleFactor * this.browser.resolution(), this.browser.hicReader.bpResolutions);

        s = this.browser.state;
        this.browser.setState(new hic.State(
            s.chr1,
            s.chr2,
            zoomIndex,
            s.x,
            s.y,
            s.pixelSize
        ));

    };


    return hic;
})(hic || {});
