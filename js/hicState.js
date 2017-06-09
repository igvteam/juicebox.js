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
 * @author Jim Robinson
 */


var hic = (function (hic) {


    hic.State = function (chr1, chr2, zoom, x, y, pixelSize, normalization) {

        if(chr1 <= chr2) {
            this.chr1 = chr1;
            this.chr2 = chr2;
            this.x = x;
            this.y = y;
        }
        else {
            // Transpose
            this.chr1 = chr2;
            this.chr2 = chr1;
            this.x = y;
            this.y = x;
        }
        this.zoom = zoom;
        this.pixelSize = pixelSize;

        if("undefined" === normalization) {
            console.log("No normalization defined !!!");
            normalization = undefined;
        }

        this.normalization = normalization;
    };

    hic.State.prototype.stringify = function () {
        return "" + this.chr1 + "," + this.chr2 + "," + this.zoom + "," + this.x + "," + this.y + "," + this.pixelSize + "," + this.normalization;
    }

    hic.State.prototype.clone = function () {
        return new hic.State(this.chr1, this.chr2, this.zoom, this.x, this.y, this.pixelSize, this.normalization)
    }


    hic.destringifyState = function (string) {

        var tokens = string.split(",");
        return new hic.State(
            tokens[0],    // chr1
            tokens[1],    // chr2
            parseFloat(tokens[2]), // zoom
            parseFloat(tokens[3]), // x
            parseFloat(tokens[4]), // y
            parseFloat(tokens[5]), // pixelSize
            tokens.length > 6 ? tokens[6] : "NONE"   // normalization
        )

    }

    return hic;

})
(hic || {});
