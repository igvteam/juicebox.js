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
import $ from '../vendor/jquery-3.3.1.slim.js'
import { IGVColor, StringUtils } from '../node_modules/igv-utils/src/index.js'
import { UIUtils, GenericContainer } from '../node_modules/igv-ui/src/index.js'
import { defaultRatioColorScaleConfig } from './ratioColorScale.js'

const ColorScaleWidget = function (browser, $hic_navbar_container) {

    this.browser = browser;

    const $container = $hic_navbar_container.find("div[id$='lower-hic-nav-bar-widget-container']");

    this.$container = $('<div class="hic-colorscale-widget-container">');
    $container.append(this.$container);

    // '-' color swatch
    const { r:nr, g:ng, b:nb } = defaultRatioColorScaleConfig.negative
    this.$minusButton = colorSwatch(IGVColor.rgbColor(nr, ng, nb));
    this.$container.append(this.$minusButton);

    this.minusColorPicker = createColorPicker(browser, this.$minusButton, '-', () => this.minusColorPicker.hide());

    this.$minusButton.hide();
    this.minusColorPicker.hide();

    // '+' color swatch
    const { r, g, b } = defaultRatioColorScaleConfig.positive
    this.$plusButton = colorSwatch(IGVColor.rgbColor(r, g, b));
    this.$container.append(this.$plusButton);

    this.plusColorPicker = createColorPicker(browser, this.$plusButton, '+', () => this.plusColorPicker.hide());

    this.plusColorPicker.hide();

    this.$minusButton.on('click', () => presentColorPicker(this.$minusButton, this.$plusButton, this.minusColorPicker, this.plusColorPicker));
    this.$plusButton.on('click', () => presentColorPicker(this.$plusButton, this.$minusButton, this.plusColorPicker, this.minusColorPicker));

    // threshold
    this.$high_colorscale_input = $('<input>', {'type': 'text', 'placeholder': '', 'title': 'color scale input'});
    this.$container.append(this.$high_colorscale_input);
    this.$high_colorscale_input.on('change', function (e) {
        var numeric;
        numeric = StringUtils.numberUnFormatter($(this).val());
        if (isNaN(numeric)) {
            // do nothing
        } else {
            browser.setColorScaleThreshold(numeric);
        }
    });

    // threshold -
    let $fa = $("<i>", {class: 'fa fa-minus', 'aria-hidden': 'true', 'title': 'negative threshold'});
    $fa.on('click', () => this.$high_colorscale_input.val(updateThreshold(browser, 0.5)));
    this.$container.append($fa);

    // threshold +
    $fa = $("<i>", {class: 'fa fa-plus', 'aria-hidden': 'true', 'title': 'positive threshold'});
    $fa.on('click', () => this.$high_colorscale_input.val(updateThreshold(browser, 2.0)));
    this.$container.append($fa);

    const handleColorScaleEvent = event => {
        this.$high_colorscale_input.val(event.data.threshold);
        this.$plusButton.find('.fa-square').css({color: IGVColor.rgbColor(event.data.r, event.data.g, event.data.b)})
    }

    this.browser.eventBus.subscribe("ColorScale", handleColorScaleEvent);

    const handleDisplayModeEvent = event => {
        if ('AOB' === event.data || 'BOA' === event.data) {
            this.$minusButton.show();
        } else {
            this.$minusButton.hide();
        }
    }

    this.browser.eventBus.subscribe("DisplayMode", handleDisplayModeEvent);

};

const updateThreshold = (browser, scaleFactor) => {
    const colorScale = browser.getColorScale();
    browser.setColorScaleThreshold(colorScale.getThreshold() * scaleFactor);
    return StringUtils.numberFormatter(colorScale.getThreshold());
}

const presentColorPicker = ($presentButton, $otherButton, presentColorpicker, otherColorpicker) => {

    $presentButton.find('.fa-square').css({'-webkit-text-stroke-color': 'transparent'});
    $otherButton.find('.fa-square').css({'-webkit-text-stroke-color': 'transparent'});

    $presentButton.find('.fa-square').css({'-webkit-text-stroke-color': 'black'});

    otherColorpicker.hide();
    presentColorpicker.show();
}

function createColorPicker(browser, $parent, type, closeHandler) {

    const config =
        {
            parent: $parent.get(0),
            width: 456,
            closeHandler
        }
    const genericContainer = new GenericContainer(config)

    const defaultColors = [ defaultRatioColorScaleConfig.negative, defaultRatioColorScaleConfig.positive ].map(({ r, g, b }) => IGVColor.rgbToHex(IGVColor.rgbColor(r, g, b)))

    function colorHandler(hexString) {
        $parent.find('.fa-square').css({color: hexString});
        const [ r, g, b ] = IGVColor.hexToRgb(hexString).split('(').pop().split(')').shift().split(',').map(str => parseInt(str, 10));
        browser.getColorScale().setColorComponents({ r, g, b }, type);
        browser.repaintMatrix();
    }

    UIUtils.createColorSwatchSelector(genericContainer.container, colorHandler, defaultColors)

    const bbox = $parent.get(0).getBoundingClientRect()
    const { x: left, y: top } = $parent.get(0).getBoundingClientRect()
    $(genericContainer.container).offset({ left, top })

    return genericContainer;
}

function colorSwatch(rgbString) {

    const $swatch = $('<div>', {class: 'igv-color-swatch'});
    const $fa = $('<i>', {class: 'fa fa-square fa-2x', 'title': 'Present color swatches'});

    $swatch.append($fa);
    $fa.css({color: rgbString});

    return $swatch;
}


export default ColorScaleWidget
