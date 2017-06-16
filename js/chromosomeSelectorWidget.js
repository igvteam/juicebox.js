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
 * Created by dat on 3/22/17.
 */
var hic = (function (hic) {

    hic.ChromosomeSelectorWidget = function (browser, $container) {

        var self = this,
            $label,
            $selector_container,
            $doit;

        this.browser = browser;

        this.$container = $('<div class="hic-chromosome-selector-widget-container">');
        $container.append(this.$container);

        $label = $('<div>');
        this.$container.append($label);
        $label.text('Chromosomes');

        $selector_container = $('<div>');
        this.$container.append($selector_container);

        this.$x_axis_selector = $('<select name="x-axis-selector">');
        $selector_container.append(this.$x_axis_selector);

        this.$y_axis_selector = $('<select name="y-axis-selector">');
        $selector_container.append(this.$y_axis_selector);

        $doit = $('<div class="hic-chromosome-selector-widget-button">');
        $selector_container.append($doit);

        $doit.on('click', function (e) {
            var chr1,
                chr2;

            chr1 = parseInt(self.$x_axis_selector.find('option:selected').val(), 10);
            chr2 = parseInt(self.$y_axis_selector.find('option:selected').val(), 10);

            self.browser.setChromosomes(chr1, chr2);
        });

        this.dataLoadConfig = {
            receiveEvent: function (event) {
                if (event.type === "MapLoad") {
                    self.respondToDataLoadWithDataset(event.data);
                }
            }
        };
        
        this.browser.eventBus.subscribe("MapLoad", this.dataLoadConfig);

        this.locusChangeConfig = {
            receiveEvent: function (event) {
                if (event.type === "LocusChange") {
                    self.respondToLocusChangeWithState(event.data);
                }
            }
        };
        this.browser.eventBus.subscribe("LocusChange", this.locusChangeConfig);

    };

    hic.ChromosomeSelectorWidget.prototype.respondToDataLoadWithDataset = function (dataset) {

        var elements,
            str,
            foundX,
            foundY;

        this.$x_axis_selector.empty();
        this.$y_axis_selector.empty();

        elements = _.map(dataset.chromosomes, function (chr, index) {
            return '<option value=' + index.toString() + '>' + chr.name + '</option>';
        });

        this.$x_axis_selector.append(elements.join(''));
        this.$y_axis_selector.append(elements.join(''));

        str = 'option[value=' + this.browser.state.chr1.toString() + ']';
        foundX = this.$x_axis_selector.find(str);
        foundX.attr('selected', 'selected');

        str = 'option[value=' + this.browser.state.chr2.toString() + ']';
        foundY = this.$y_axis_selector.find(str);
        foundY.attr('selected', 'selected');
    };

    hic.ChromosomeSelectorWidget.prototype.respondToLocusChangeWithState = function (state) {
        var self = this,
            str,
            findX,
            findY,
            chr1,
            chr2;


        findX = this.$x_axis_selector.find('option');
        findY = this.$y_axis_selector.find('option');

        // this happens when the first dataset is loaded.
        if (0 === _.size(findX) || 0 === _.size(findY)) {
            return;
        }

        findX = this.$x_axis_selector.find('option:selected');
        findY = this.$y_axis_selector.find('option:selected');

        chr1 = parseInt(findX.val(), 10);
        chr2 = parseInt(findY.val(), 10);

        // It is the pair of chromosomes that is important,  1-2 == 2-1,  so update only if the pair does not match

        if (!((chr1 === state.chr1 && chr2 === state.chr2) || (chr1 === state.chr2 && chr2 === state.chr1))) {

            str = 'option[value=' + state.chr1.toString() + ']';
            this.$x_axis_selector.find(str).attr('selected', 'selected');

            str = 'option[value=' + state.chr2.toString() + ']';
            this.$y_axis_selector.find(str).attr('selected', 'selected');

        }

    };

    return hic;

})(hic || {});

