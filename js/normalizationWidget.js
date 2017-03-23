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
 * Created by dat on 3/21/17.
 */
var hic = (function (hic) {

    var labels = {
        VC: "Coverage",
        VC_SQRT: "Coverage (Sqrt)",
        KR: "Balanced",
        INTER_VC: "Interchromosomal Coverage",
        INTER_VC_SQRT: "Interchromosomal Coverage (Sqrt)",
        INTER_KR: "Interchromosomal Balanced",
        GW_VC: "Genome-wide Coverage",
        GW_VC_SQRT: "Genome-wide Coverage (Sqrt)",
        GW_KR: "Genome-wide Balanced",

    }

    hic.NormalizationWidget = function (browser) {
        var self = this,
            $label,
            $option,
            config;

        this.browser = browser;

        $label = $('<label for="normalization_selector">');
        $label.text('Normalization');

        this.$normalization_selector = $('<select name="select">');
        this.$normalization_selector.on('change', function (e) {
            self.browser.setNormalization($(this).val());
        });

        this.$normalization_selector.attr('name', 'dataset_selector');

        $option = $('<option value="">');
        $option.text('None');

        this.$container = $('<div class="hic-normalization-selector-container">');

        this.$container.append($label);
        this.$normalization_selector.append($option);
        this.$container.append(this.$normalization_selector);

        config = {
            receiveEvent: function (event) {
                if (event.type === "DataLoad") {
                    self.respondToDataLoadWithDataset(event.data);
                }
            }
        };

        hic.GlobalEventBus.subscribe("DataLoad", config);

    };

    hic.NormalizationWidget.prototype.respondToDataLoadWithDataset = function (dataset) {

        var selected,
            normalizationTypes,
            elements;

        selected = false;
        normalizationTypes = dataset.normalizationTypes;
        elements = _.map(normalizationTypes, function (normalization) {
            var label = labels[normalization];
            return '<option' +
                (label === undefined ? '' : ' title = "' + label + '" ') +
                ' value=' + normalization + (selected ? ' selected' : '') + '>' + normalization + '</option>';
        });

        this.$normalization_selector.empty();
        this.$normalization_selector.append(elements.join(''));

    };

    return hic;

})
(hic || {});
