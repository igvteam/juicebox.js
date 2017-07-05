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
 * Created by dat on 3/4/17.
 */

var hic = (function (hic) {

    hic.ResolutionSelector = function (browser) {
        var self = this,
            $locked,
            $label,
            $label_container,
            $e;

        this.browser = browser;

        // label container
        $label_container = $('<div id="hic-resolution-label-container">');

        // locked
        $locked = $('<i id="hic-resolution-lock" class="fa fa-lock fa-lg" aria-hidden="true">');
        $locked.hide();

        $label_container.append($locked);

        // Resolution (kb)
        $label = $('<div>');
        $label.text('Resolution (kb)');
        $label_container.append($label);

        $label_container.on('click', function (e) {
            $locked.toggle();
            if ($locked.is(":visible")) {
                self.$resolution_selector.prop('disabled', 'disabled');
                self.browser.resolutionLocked = true;
            } else {
                self.$resolution_selector.prop('disabled', false);
                self.browser.resolutionLocked = false;
            }
        });


        this.$resolution_selector = $('<select name="select">');
        this.$resolution_selector.attr('name', 'resolution_selector');

        this.$resolution_selector.on('change', function (e) {
            var zoomIndex = parseInt($(this).val());
            self.browser.setZoom(zoomIndex);
        });

        this.$container = $('<div class="hic-resolution-selector-container">');
        //
        this.$container.append($label_container);
        //
        this.$container.append(this.$resolution_selector);

        this.browser.eventBus.subscribe("LocusChange", this);
        this.browser.eventBus.subscribe("MapLoad", this);
    };

    hic.ResolutionSelector.prototype.receiveEvent = function (event) {

        if (event.type === "LocusChange") {
            var state = event.data.state,
                resolutionChanged = event.data.resolutionChanged;

            this.$resolution_selector
                .find('option')
                .filter(function (index) {
                    return index === state.zoom;
                })
                .prop('selected', true);
        } else if (event.type === "MapLoad") {

            var zoom =  this.browser.state.zoom;

            var elements = _.map(this.browser.dataset.bpResolutions, function (resolution, index) {
                var selected = zoom === index;

                return '<option' + ' value=' + index +  (selected ? ' selected': '') + '>' + igv.numberFormatter(Math.floor(resolution / 1e3)) + '</option>';
            });




            this.$resolution_selector.empty();
            this.$resolution_selector.append(elements.join(''));

        }

    };

    return hic;

})
(hic || {});
