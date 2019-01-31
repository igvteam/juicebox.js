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
            rgbString;

        this.browser = browser;

        this.$container = $('<div class="hic-colorscale-widget-container">');
        $container.append(this.$container);


        // '-' color swatch
        rgbString = getRGBString('-', "blue");                    // TODO -- get the default from browser.
        this.$minusButton = hic.colorSwatch(rgbString);
        this.$container.append(this.$minusButton);
        this.$minusButton.hide();

        this.minusColorPicker = createColorPicker(browser, this.$minusButton, '-', function () {
            self.minusColorPicker.$container.hide()
        });

        // this.minusColorPicker.$container.draggable();
        this.minusColorPicker.$container.hide();

        // '+' color swatch
        rgbString = getRGBString('+', "red");                     // TODO -- get the default from browser
        this.$plusButton = hic.colorSwatch(rgbString);
        this.$container.append(this.$plusButton);

        this.plusColorPicker = createColorPicker(browser, this.$plusButton, '+', function () {
            self.plusColorPicker.$container.hide()
        });

        // this.plusColorPicker.$container.draggable();
        this.plusColorPicker.$container.hide();



        this.$minusButton.on('click', function (e) {
            self.presentColorPicker($(this), self.minusColorPicker.$container);
        });

        this.$plusButton.on('click', function (e) {
            self.presentColorPicker($(this), self.plusColorPicker.$container);
        });


        // threshold
        // this.$high_colorscale_input = $('<input type="text" placeholder="">');
        this.$high_colorscale_input = $('<input>', { 'type': 'text', 'placeholder': '', 'title': 'color scale input'});
        this.$container.append(this.$high_colorscale_input);
        this.$high_colorscale_input.on('change', function (e) {
            var numeric;
            numeric = igv.numberUnFormatter($(this).val());
            if (isNaN(numeric)) {
                // do nothing
            } else {
                browser.setColorScaleThreshold(numeric);
            }
        });

        // threshold -
        $fa = $("<i>", { class: 'fa fa-minus', 'aria-hidden': 'true', 'title': 'negative threshold' });
        $fa.on('click', function (e) {
            updateThreshold(1.0 / 2.0);
        });
        this.$container.append($fa);

        // threshold +
        $fa = $("<i>", { class: 'fa fa-plus', 'aria-hidden': 'true', 'title': 'positive threshold' });
        $fa.on('click', function (e) {
            updateThreshold(2.0);
        });
        this.$container.append($fa);


        this.browser.eventBus.subscribe("MapLoad", this);
        this.browser.eventBus.subscribe("ColorScale", this);
        this.browser.eventBus.subscribe("DisplayMode", this);

        function updateThreshold(scaleFactor) {
            var threshold, colorScale;
            colorScale = browser.getColorScale();
            threshold = colorScale.getThreshold() * scaleFactor;
            browser.setColorScaleThreshold(threshold);
            self.$high_colorscale_input.val(igv.numberFormatter(colorScale.getThreshold()));
        }

        function getRGBString(type, defaultColor) {
            var colorScale, comps;

            colorScale = browser.getColorScale();
            if (colorScale) {
                comps = colorScale.getColorComponents(type);
                return igv.Color.rgbColor(comps.r, comps.g, comps.b);
            }
            else {
                return defaultColor;
            }
        }

    };

    hic.ColorScaleWidget.prototype.presentColorPicker = function ($presentingButton, $colorpicker) {

        this.$plusButton.find('.fa-square').css({'-webkit-text-stroke-color': 'transparent'});
        this.$minusButton.find('.fa-square').css({'-webkit-text-stroke-color': 'transparent'});

        this.$presentingButton = $presentingButton;
        this.$presentingButton.find('.fa-square').css({'-webkit-text-stroke-color': 'black'});

        $colorpicker.show();
    };

    hic.ColorScaleWidget.prototype.receiveEvent = function (event) {

        var colorScale;

        colorScale = this.browser.getColorScale();
        this.$high_colorscale_input.val(igv.numberFormatter(colorScale.getThreshold()));

        if ("DisplayMode" === event.type) {

            if ("AOB" === event.data || "BOA" === event.data) {
                this.$minusButton.show();
            }
            else {
                this.$minusButton.hide();
            }
        }


    };

    function createColorPicker(browser, $presentingButton, type, closeHandler) {

        const config =
            {
                $parent: $presentingButton,
                width: 456,
                height: undefined,
                closeHandler: closeHandler
            };

        let colorPicker = new igv.genericContainer(config);

        function colorHandler(hexString) {
            var rgbString,
                rgb;

            $presentingButton.find('.fa-square').css({ color: hexString });

            rgbString = igv.Color.hexToRgb(hexString);

            rgb = rgbString
                .split('(')
                .pop()
                .split(')')
                .shift()
                .split(',')
                .map(function (str) { return parseInt(str, 10); });

            browser.getColorScale().setColorComponents({ r: rgb[0], g: rgb[1], b: rgb[2] }, type);
            browser.repaintMatrix();

        }

        igv.createColorSwatchSelector(colorPicker.$container, colorHandler, undefined);


        return colorPicker;
    }
    return hic;

})
(hic || {});
