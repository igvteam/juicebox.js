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


import RatioColorScale from "./ratioColorScale.js";

const defaultColorScaleConfig = { threshold: 2000, r: 255, g: 0, b: 0 }

const ColorScale = function (scale) {
    this.threshold = scale.threshold;
    this.r = scale.r;
    this.g = scale.g;
    this.b = scale.b;
    this.cache = []
    this.nbins = 2000
    this.binsize = this.threshold / this.nbins
};


ColorScale.prototype.setThreshold = function (threshold) {
    this.threshold = threshold;
    this.cache = []
    this.binsize = this.threshold / this.nbins
}

ColorScale.prototype.getThreshold = function () {
    return this.threshold;
}

ColorScale.prototype.setColorComponents = function (components) {
    this.r = components.r;
    this.g = components.g;
    this.b = components.b;
    this.cache = []
}

ColorScale.prototype.getColorComponents = function () {
    return {
        r: this.r,
        g: this.g,
        b: this.b
    }
}


ColorScale.prototype.equals = function (cs) {
    return JSON.stringify(this) === JSON.stringify(cs);
};

ColorScale.prototype.getColor = function (value) {

    const bin = Math.floor(Math.min(this.threshold, value) / this.binsize)
    let color = this.cache[bin]
    if (undefined === color) {
        const low = 0;
        const lowR = 255;
        const lowB = 255;
        const lowG = 255;

        if (value <= low) value = low;
        else if (value >= this.threshold) value = this.threshold;

        const diff = this.threshold - low;

        const frac = (value - low) / diff;

        // const red = Math.floor(lowR + frac * (this.r - lowR));
        // const green = Math.floor(lowG + frac * (this.g - lowG));
        // const blue = Math.floor(lowB + frac * (this.b - lowB));

        const red = this.r;
        const green = this.g;
        const blue = this.b;
        const alpha = Math.floor(255 * frac)

        color = { red, green, blue, alpha, rgbaString: `rgba(${ red },${ green },${ blue }, ${ alpha })` }
        this.cache[bin] = color
    }
    return color
}

ColorScale.prototype.stringify = function () {
    return "" + this.threshold + ',' + this.r + ',' + this.g + ',' + this.b;
};

ColorScale.parse = function (string) {

    var pnstr, ratioCS;

    if (string.startsWith("R:")) {
        pnstr = string.substring(2).split(":");
        ratioCS = new RatioColorScale(Number.parseFloat(pnstr[0]));
        ratioCS.positiveScale = foo(pnstr[1]);
        ratioCS.negativeScale = foo(pnstr[2]);
        return ratioCS;
    } else {
        return foo(string);
    }

    function foo(str) {
        var cs, tokens;

        tokens = str.split(",");

        cs = {
            threshold: tokens[0],
            r: tokens[1],
            g: tokens[2],
            b: tokens[3]
        };
        return new ColorScale(cs);
    }
}

export { defaultColorScaleConfig }

export default ColorScale
