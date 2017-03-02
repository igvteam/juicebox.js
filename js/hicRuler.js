/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var hic = (function (hic) {

    hic.Ruler = function (browser, $container, axis) {

        this.browser = browser;
        this.$canvas = $('<canvas>');
        this.$canvas.attr('width', $container.width());
        this.$canvas.attr('height', $container.height());
        $container.append(this.$canvas);

        this.ctx = this.$canvas.get(0).getContext("2d");

        this.axis = axis;

        this.yAxisTransformWithContext = function(context) {

            context.translate($container.width(), 0);
            // context.translate(10, 0);
            context.rotate(Math.PI/2.0);
        };

        this.setAxis( axis );

        hic.GlobalEventBus.subscribe("LocusChange", this);

    };

    hic.Ruler.prototype.receiveEvent = function(event) {
        // Perhaps in the future we'll do something special based on event type & properties
        this.update();

    }

    hic.Ruler.prototype.setAxis = function (axis) {

        this.canvasTransform = ('y' === axis) ? this.yAxisTransformWithContext : identityTransformWithContext;

    };

    hic.Ruler.prototype.update= function () {

        var bin,
            config = {},
            browser = this.browser;  

        identityTransformWithContext(this.ctx);
        igv.graphics.fillRect(this.ctx, 0, 0, this.$canvas.width(), this.$canvas.height(), { fillStyle: igv.rgbColor(255, 255, 255) });

        this.canvasTransform(this.ctx);

        if ('x' === this.axis) {
            igv.graphics.fillRect(this.ctx, 0, 0, this.$canvas.width(), this.$canvas.height(), { fillStyle: igv.rgbColor(255, 255, 255) });
            // igv.graphics.fillRect(this.ctx, 0, 0, this.$canvas.width(), this.$canvas.height(), { fillStyle: igv.randomRGB(120, 240) });
        } else {
            igv.graphics.fillRect(this.ctx, 0, 0, this.$canvas.height(), this.$canvas.width(), { fillStyle: igv.rgbColor(255, 255, 255) });
            // igv.graphics.fillRect(this.ctx, 0, 0, this.$canvas.height(), this.$canvas.width(), { fillStyle: igv.randomRGB(120, 240) });
        }

        // config.bpPerPixel = 9.4277;
        config.bpPerPixel = browser.hicReader.bpResolutions[ browser.state.zoom ] / browser.state.pixelSize;
        config.viewportWidth = Math.max(this.$canvas.width(), this.$canvas.height());

        // config.bpStart = 124502438;
        bin = ('x' === this.axis) ? browser.state.x : browser.state.y;
        config.bpStart = bin * browser.hicReader.bpResolutions[ browser.state.zoom ];
        // console.log('ruler ' + this.axis + ' bin ' + bin);

        config.pixelWidth = config.viewportWidth;
        config.height = Math.min(this.$canvas.width(), this.$canvas.height());

        this.draw(config);
    };

    hic.Ruler.prototype.draw = function (options) {

        var fontStyle,
            ts,
            spacing,
            nTick,
            x,
            l,
            yShim,
            tickHeight;

        if (options.chrName === "all") {
            // drawAll.call(this);
        } else {

            fontStyle = {
                textAlign: 'center',
                font: '10px PT Sans',
                fillStyle: "rgba(64, 64, 64, 1)",
                strokeStyle: "rgba(64, 64, 64, 1)"
            };

            ts = findSpacing( Math.floor(options.viewportWidth * options.bpPerPixel) );
            spacing = ts.majorTick;

            // Find starting point closest to the current origin
            nTick = Math.floor(options.bpStart / spacing) - 1;
            x = 0;

            igv.graphics.setProperties(this.ctx, fontStyle);

            while (x < options.pixelWidth) {

                l = Math.floor(nTick * spacing);
                yShim = 2;
                tickHeight = 6;

                x = Math.round(((l - 1) - options.bpStart + 0.5) / options.bpPerPixel);
                var chrPosition = formatNumber(l / ts.unitMultiplier, 0) + " " + ts.majorUnit;

                if (nTick % 1 == 0) {
                    igv.graphics.fillText(this.ctx, chrPosition, x, options.height - (tickHeight / 0.75));
                }

                igv.graphics.strokeLine(this.ctx, x, options.height - tickHeight, x, options.height - yShim);

                nTick++;
            }
            igv.graphics.strokeLine(this.ctx, 0, options.height - yShim, options.pixelWidth, options.height - yShim);

        }

        function formatNumber(anynum, decimal) {
            //decimal  - the number of decimals after the digit from 0 to 3
            //-- Returns the passed number as a string in the xxx,xxx.xx format.
            //anynum = eval(obj.value);
            var divider = 10;
            switch (decimal) {
                case 0:
                    divider = 1;
                    break;
                case 1:
                    divider = 10;
                    break;
                case 2:
                    divider = 100;
                    break;
                default:       //for 3 decimal places
                    divider = 1000;
            }

            var workNum = Math.abs((Math.round(anynum * divider) / divider));

            var workStr = "" + workNum;

            if (workStr.indexOf(".") == -1) {
                workStr += "."
            }

            var dStr = workStr.substr(0, workStr.indexOf("."));
            var dNum = dStr - 0;
            var pStr = workStr.substr(workStr.indexOf("."));

            while (pStr.length - 1 < decimal) {
                pStr += "0"
            }

            if (pStr == '.') pStr = '';

            //--- Adds a comma in the thousands place.
            if (dNum >= 1000) {
                var dLen = dStr.length;
                dStr = parseInt("" + (dNum / 1000)) + "," + dStr.substring(dLen - 3, dLen)
            }

            //-- Adds a comma in the millions place.
            if (dNum >= 1000000) {
                dLen = dStr.length;
                dStr = parseInt("" + (dNum / 1000000)) + "," + dStr.substring(dLen - 7, dLen)
            }
            var retval = dStr + pStr;
            //-- Put numbers in parentheses if negative.
            if (anynum < 0) {
                retval = "(" + retval + ")";
            }

            //You could include a dollar sign in the return value.
            //retval =  "$"+retval
            return retval;
        }


        function drawAll() {

            var self = this,
                lastX = 0,
                yShim = 2,
                tickHeight = 10;

            _.each(igv.browser.genome.wgChromosomeNames, function (chrName) {

                var chromosome = igv.browser.genome.getChromosome(chrName),
                    bp = igv.browser.genome.getGenomeCoordinate(chrName, chromosome.bpLength),
                    x = Math.round((bp - options.bpStart ) / options.bpPerPixel),
                    chrLabel = chrName.startsWith("chr") ? chrName.substr(3) : chrName;

                self.ctx.textAlign = 'center';
                igv.graphics.strokeLine(self.ctx, x, self.height - tickHeight, x, self.height - yShim);
                igv.graphics.fillText(self.ctx, chrLabel, (lastX + x) / 2, self.height - (tickHeight / 0.75));

                lastX = x;

            });
            igv.graphics.strokeLine(self.ctx, 0, self.height - yShim, options.pixelWidth, self.height - yShim);
        }

    };

    function TickSpacing(majorTick, majorUnit, unitMultiplier) {
        this.majorTick = majorTick;
        this.majorUnit = majorUnit;
        this.unitMultiplier = unitMultiplier;
    }

    function findSpacing(maxValue) {

        if (maxValue < 10) {
            return new TickSpacing(1, "", 1);
        }


        // Now man zeroes?
        var nZeroes = Math.floor(log10(maxValue));
        var majorUnit = "";
        var unitMultiplier = 1;
        if (nZeroes > 9) {
            majorUnit = "gb";
            unitMultiplier = 1000000000;
        }
        if (nZeroes > 6) {
            majorUnit = "mb";
            unitMultiplier = 1000000;
        } else if (nZeroes > 3) {
            majorUnit = "kb";
            unitMultiplier = 1000;
        }

        var nMajorTicks = maxValue / Math.pow(10, nZeroes - 1);
        if (nMajorTicks < 25) {
            return new TickSpacing(Math.pow(10, nZeroes - 1), majorUnit, unitMultiplier);
        } else {
            return new TickSpacing(Math.pow(10, nZeroes) / 2, majorUnit, unitMultiplier);
        }

        function log10(x) {
            var dn = Math.log(10);
            return Math.log(x) / dn;
        }
    }

    function identityTransformWithContext(context) {
        // 3x2 matrix. column major. (sx 0 0 sy tx ty).
        context.setTransform(1, 0, 0, 1, 0, 0);
    }

    return hic;
})(hic || {});
