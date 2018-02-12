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

        // color chip
        rgbString = browser.config.colorScale ? igv.Color.rgbColor(browser.config.colorScale.highR, browser.config.colorScale.highG, browser.config.colorScale.highB) : 'red';

        // '+' color swatch
        this.$plusButton = hic.colorSwatch(rgbString, '+');
        this.$container.append(this.$plusButton);

        // '-' color swatch
        this.$minusButton = hic.colorSwatch(rgbString, 'i');
        this.$container.append(this.$minusButton);

        // input
        this.$high_colorscale_input = $('<input type="text" placeholder="">');
        this.$container.append(this.$high_colorscale_input);

        this.$high_colorscale_input.on('change', function(e){

            var numeric;

            numeric = igv.numberUnFormatter( $(this).val() );
            if (isNaN(numeric)) {
                // do nothing
            } else {
                browser.updateColorScale({ high: parseInt( numeric, 10 ) });
            }
        });

        // -
        $fa = $("<i>", { class:'fa fa-minus', 'aria-hidden':'true' });
        $fa.on('click', function (e) {
            doUpdateColorScale(1.0/2.0);
        });
        this.$container.append($fa);

        // +
        $fa = $("<i>", { class:'fa fa-plus', 'aria-hidden':'true' });
        $fa.on('click', function (e) {
            doUpdateColorScale(2.0);
        });
        this.$container.append($fa);

        this.$colorpicker = createColorpicker.call(this, browser);

        this.$colorpicker.draggable();
        this.$colorpicker.hide();

        this.$plusButton.on('click', function (e) {
            self.presentColorPicker($(this));
        });

        this.$minusButton.on('click', function (e) {
            self.presentColorPicker($(this));
        });


        // this.$minusButton.hide();


        this.browser.eventBus.subscribe("MapLoad", this);
        this.browser.eventBus.subscribe("ColorScale", this);

        function doUpdateColorScale (scaleFactor) {
            var colorScale;

            colorScale = browser.getColorScale();
            browser.updateColorScale({ high: colorScale.high * scaleFactor });
            self.$high_colorscale_input.val( igv.numberFormatter(Math.round( colorScale.high )) );
        }

    };

    hic.ColorScaleWidget.prototype.presentColorPicker = function ($presentingButton) {
        var str;

        this.$plusButton.find('.fa-square').css({ '-webkit-text-stroke-color':'transparent' });
        this.$minusButton.find('.fa-square').css({ '-webkit-text-stroke-color':'transparent' });

        this.$presentingButton = $presentingButton;
        this.$presentingButton.find('.fa-square').css({ '-webkit-text-stroke-color':'black' });

        str = this.$presentingButton.find('i').hasClass('fa-plus') ? '+' : '-';
        // console.log('presenting button ' + str);
        // this.$colorpicker.toggle();
        this.$colorpicker.show();
    };

    hic.ColorScaleWidget.prototype.receiveEvent = function(event) {

        var colorScale;

        if (event.type === "MapLoad" || event.type === "ColorScale") {
            colorScale = this.browser.getColorScale();
            this.$high_colorscale_input.val( igv.numberFormatter(Math.round( colorScale.high )) );
        }

    };

    function createColorpicker(browser) {

        var self = this,
            $colorpicker,
            config;

        config =
            {
                // width = (29 * swatch-width) + border-width + border-width
                width: ((29 * 24) + 1 + 1),
                classes: [ 'igv-position-absolute' ]
            };

        $colorpicker = igv.genericContainer(browser.$root, config, function () {
            $colorpicker.toggle();
        });

        igv.createColorSwatchSelector($colorpicker, function (colorName) {
            var rgb;

            self.$presentingButton.find('.fa-square').css({ color: colorName });

            rgb = _.map(colorName.split('(').pop().split(')').shift().split(','), function (str) {
                return parseInt(str, 10);
            });

            browser.updateColorScale(
                {
                    high:parseInt(igv.numberUnFormatter( self.$high_colorscale_input.val() ), 10),
                    highR:rgb[0],
                    highG:rgb[1],
                    highB:rgb[2]
                }
            );

        });

        return $colorpicker;

    }

    return hic;

})
(hic || {});
