/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including 
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the 
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial 
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING 
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND 
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY 
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, 
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
 * THE SOFTWARE.
 *
 */

/**
 * Created by dat on 3/14/17.
 */
var hic = (function (hic) {

    hic.SweepZoom = function (browser) {

        this.browser = browser;

        this.$rulerSweeper = $('<div>');
        this.$rulerSweeper.hide();

        this.sweepRect = {};

    };

    hic.SweepZoom.prototype.reset = function () {
        this.coordinateFrame = this.$rulerSweeper.parent().offset();
        this.aspectRatio = this.browser.contactMatrixView.getViewDimensions().width / this.browser.contactMatrixView.getViewDimensions().height;
        this.sweepRect.origin = {x: 0, y: 0};
        this.sweepRect.size = {width: 1, height: 1};
    };

    hic.SweepZoom.prototype.update = function (mouseDown, coords, viewportBBox) {
        var displacement,
            delta,
            aspectRatioScale,
            xMax,
            yMax,
            str;

        delta = { x: (coords.x - mouseDown.x), y: (coords.y - mouseDown.y) };

        this.sweepRect.origin.x = (delta.x < 0 ? mouseDown.x + delta.x : mouseDown.x);
        this.sweepRect.origin.y = (delta.y < 0 ? mouseDown.y + delta.y : mouseDown.y);
        this.dominantAxis = (Math.abs(delta.x) > Math.abs(delta.y) ? 'x' : 'y');

        if ('x' === this.dominantAxis) {
            displacement = Math.abs(delta.x);
            aspectRatioScale = {x: 1.0, y: 1.0 / this.aspectRatio};
        } else {
            displacement = Math.abs(delta.y);
            aspectRatioScale = {x: this.aspectRatio, y: 1.0};
        }

        this.sweepRect.size = { width: aspectRatioScale.x * displacement, height: aspectRatioScale.y * displacement };

        xMax = (mouseDown.x + this.sweepRect.size.width ) - viewportBBox.size.width;
        yMax = (mouseDown.y + this.sweepRect.size.height) - viewportBBox.size.height;

        if ('y' === this.dominantAxis && xMax > 0) {
            this.sweepRect.size.width -= xMax;
            this.sweepRect.size.height = this.sweepRect.size.width / this.aspectRatio;
        } else if (yMax > 0) {
            this.sweepRect.size.height -= yMax;
            this.sweepRect.size.width = this.sweepRect.size.height * this.aspectRatio;
        }

        this.$rulerSweeper.width(Math.floor(this.sweepRect.size.width));
        this.$rulerSweeper.height(Math.floor(this.sweepRect.size.height));

        this.$rulerSweeper.offset({ left: this.coordinateFrame.left + this.sweepRect.origin.x, top: this.coordinateFrame.top + this.sweepRect.origin.y });

        this.$rulerSweeper.show();

    };

    hic.SweepZoom.prototype.dismiss = function () {
        var s = this.browser.state,
            bpResolution = this.browser.resolution(),
            bpX = (s.x + this.sweepRect.origin.x / s.pixelSize) * bpResolution,
            bpY = (s.y + this.sweepRect.origin.y / s.pixelSize) * bpResolution,
            bpXMax = bpX + (this.sweepRect.size.width / s.pixelSize) * bpResolution,
            bpYMax = bpY + (this.sweepRect.size.height / s.pixelSize) * bpResolution;

        this.$rulerSweeper.hide();
        this.browser.goto(bpX, bpXMax, bpY, bpYMax);

    };

    return hic;
})(hic || {});
