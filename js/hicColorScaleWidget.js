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
 * Created by dat on 3/3/17.
 */

var hic = (function (hic) {

    hic.ColorScaleWidget = function (browser, $container) {

        var self = this,
            $fa,
            $e;

        this.browser = browser;

        this.$container = $('<div class="hic-colorscale-widget-container">');
        $container.append(this.$container);

        // color chip
        this.$button = hic.colorSwatch('red');
        this.$container.append(this.$button);
        this.$button.on('click', function (e) {
            self.browser.$root.find('.color-scale-swatch-scroll-container').toggle();
        });

        // input
        this.$high_colorscale_input = $('<input type="text" placeholder="high">');
        this.$container.append(this.$high_colorscale_input);

        this.$high_colorscale_input.on('change', function(e){

            var value,
                numeric;

            value = $(this).val();
            numeric = value.replace(/\,/g, '');

            if (isNaN(numeric)) {
            } else {
                browser.updateColorScale({ high: parseInt(numeric, 10) })
            }
        });

        // -
        $fa = $("<i>", { class:'fa fa-minus', 'aria-hidden':'true' });
        $fa.on('click', function (e) {
            var value;

            value = Math.floor(browser.getColorScale().high / 2.0);
            self.$high_colorscale_input.val(value);
            browser.updateColorScale({ high: value });

        });
        this.$container.append($fa);

        // +
        $fa = $("<i>", { class:'fa fa-plus', 'aria-hidden':'true' });
        $fa.on('click', function (e) {
            var value;

            value = Math.floor(browser.getColorScale().high * 2.0);
            self.$high_colorscale_input.val(value);
            browser.updateColorScale({ high: value });

        });
        this.$container.append($fa);

        createColorSwatchSelector.call(this, browser);

        this.browser.eventBus.subscribe("MapLoad", this);
        this.browser.eventBus.subscribe("ColorScale", this);
    };

    hic.ColorScaleWidget.prototype.receiveEvent = function(event) {

        var colorScaleHigh;
        if (event.type === "MapLoad" || event.type === "ColorScale") {

            colorScaleHigh = Math.round( this.browser.getColorScale().high );

            this.$high_colorscale_input.val(igv.numberFormatter(colorScaleHigh));
        }

    };

    function createColorSwatchSelector(browser) {

        var self = this,
            $scroll_container,
            $container;

        // scroll container
        $scroll_container = $('<div>', { class:'color-scale-swatch-scroll-container' });
        browser.$root.append($scroll_container);

        // swatch container
        $container = $('<div>', { class:'color-scale-swatch-container' });
        $scroll_container.append($container);

        hic.createColorSwatchSelector($container, function (colorName) {
            var rgb;

            rgb = Colors.name2rgb(colorName);

            self.$button.find('.fa-square').css({ color: colorName });

            browser.updateColorScale({ highR:rgb.R, highG:rgb.G, highB:rgb.B });

            // browser.contactMatrixView.colorScale.highR = rgb.R;
            // browser.contactMatrixView.colorScale.highG = rgb.G;
            // browser.contactMatrixView.colorScale.highB = rgb.B;
            //
            // browser.contactMatrixView.updating = false;
            // browser.contactMatrixView.initialImage = undefined;
            // browser.contactMatrixView.clearCaches();
            // browser.contactMatrixView.colorScaleCache = {};
            // browser.contactMatrixView.update();
        }, function () {
            $scroll_container.toggle();
        });

        $scroll_container.draggable();

        $scroll_container.hide();

    }

    return hic;

})
(hic || {});
