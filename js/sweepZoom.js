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
        var id;

        this.browser = browser;

        id = browser.id + '_' + 'sweep-zoom-container';
        this.$rulerSweeper = $("<div>", { id:id });
        this.$rulerSweeper.hide();

        this.sweepRect = {};

    };

    hic.SweepZoom.prototype.reset = function () {
        this.coordinateFrame = this.$rulerSweeper.parent().offset();
        this.aspectRatio = this.browser.contactMatrixView.getViewDimensions().width / this.browser.contactMatrixView.getViewDimensions().height;
        this.sweepRect.origin = {     x: 0,      y: 0 };
        this.sweepRect.size   = { width: 1, height: 1 };
        this.clipped = { value: false };
    };

    hic.SweepZoom.prototype.update = function (mouseDown, coords, viewportBBox) {
        var delta,
            multiplier,
            displacement,
            dominantAxis,
            aspectRatioScale;

        if (true === this.clipped.value) {
            return;
        }

        delta =
            {
                x: (coords.x - mouseDown.x),
                y: (coords.y - mouseDown.y)
            };

        multiplier = { x: sign(delta.x), y: sign(delta.y) };

        dominantAxis = Math.abs(delta.x) > Math.abs(delta.y) ? 'x' : 'y';

        displacement = 'x' === dominantAxis ? Math.abs(delta.x) : Math.abs(delta.y);

        this.sweepRect.size =
            {
                width : multiplier.x * displacement,
                height : multiplier.y * displacement
            };

        // if ('x' === dominantAxis) {
        //
        //     this.sweepRect.size =
        //         {
        //             width: delta.x,
        //             height: delta.x / this.aspectRatio
        //         };
        //
        // } else {
        //
        //     this.sweepRect.size =
        //         {
        //             width: delta.y * this.aspectRatio,
        //             height: delta.y
        //         };
        // }

        this.sweepRect.origin.x = Math.min(mouseDown.x, mouseDown.x + this.sweepRect.size.width);
        this.sweepRect.origin.y = Math.min(mouseDown.y, mouseDown.y + this.sweepRect.size.height);

        this.sweepRect.size.width = Math.abs(this.sweepRect.size.width);
        this.sweepRect.size.height = Math.abs(this.sweepRect.size.height);

        this.sweepRect = clip(this.sweepRect, viewportBBox, this.clipped);

        this.$rulerSweeper.width( this.sweepRect.size.width);
        this.$rulerSweeper.height(this.sweepRect.size.height);

        this.$rulerSweeper.offset(
            {
                left: this.coordinateFrame.left + this.sweepRect.origin.x,
                top: this.coordinateFrame.top  + this.sweepRect.origin.y
            }
        );
        this.$rulerSweeper.show();

    };

    hic.SweepZoom.prototype.dismiss = function () {
        var state,
            resolution,
            X,
            Y,
            Width,
            Height,
            XMax,
            YMax;

        this.$rulerSweeper.hide();

        state = this.browser.state;

        // bp-per-bin
        resolution = this.browser.resolution();

        // bp = ((bin + pixel/pixel-per-bin) / bp-per-bin)
        X = (state.x + (this.sweepRect.origin.x / state.pixelSize)) * resolution;
        Y = (state.y + (this.sweepRect.origin.y / state.pixelSize)) * resolution;

        // bp = ((bin + pixel/pixel-per-bin) / bp-per-bin)
        Width  = (this.sweepRect.size.width  / state.pixelSize) * resolution;
        Height = (this.sweepRect.size.height / state.pixelSize) * resolution;

        // bp = bp + bp
        XMax = X + Width;
        YMax = Y + Height;

        this.browser.goto(state.chr1, X, XMax, state.chr2, Y, YMax);

    };

    function sign(s) {
        return s < 0 ? -1 : 1;
    }

    function clip(rect, bbox, clipped) {
        var r,
            result,
            w,
            h;

        r = _.extend({}, { min : { x: rect.origin.x, y: rect.origin.y } });
        r = _.extend(r, { max : { x: rect.origin.x + rect.size.width, y: rect.origin.y + rect.size.height } });

        if (r.min.x <= bbox.min.x || r.min.y <= bbox.min.y) {
            clipped.value = true;
        } else if (bbox.max.x <= r.max.x || bbox.max.y <= r.max.y) {
            clipped.value = true;
        }

        r.min.x = Math.max(r.min.x, bbox.min.x);
        r.min.y = Math.max(r.min.y, bbox.min.y);

        r.max.x = Math.min(r.max.x, bbox.max.x);
        r.max.y = Math.min(r.max.y, bbox.max.y);

        result = {};
        result.origin =
            {
                x: r.min.x,
                y: r.min.y
            };

        w = r.max.x - r.min.x;
        h = r.max.y - r.min.y;

        result.size =
            {
                width: Math.min(w, h),
                height: Math.min(w, h)
            };

        return result;
    }

    return hic;
})(hic || {});
