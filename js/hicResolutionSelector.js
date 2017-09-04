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

    hic.ResolutionSelector = function (browser, $parent) {
        var self = this,
            $label,
            $label_container;

        this.browser = browser;

        // label container
        $label_container = $('<div id="hic-resolution-label-container">');

        // Resolution (kb)
        $label = $('<div>');
        $label.text('Resolution (kb)');
        $label_container.append($label);

        // lock/unlock
        this.$resolution_lock = $('<i id="hic-resolution-lock" class="fa fa-unlock" aria-hidden="true">');
        $label_container.append(this.$resolution_lock);

        $label_container.on('click', function (e) {
            self.browser.resolutionLocked = !(self.browser.resolutionLocked);
            self.setResolutionLock(self.browser.resolutionLocked);
        });

        this.$resolution_selector = $('<select name="select">');
        this.$resolution_selector.attr('name', 'resolution_selector');

        this.$resolution_selector.on('change', function (e) {
            var zoomIndex = parseInt($(this).val());
            self.browser.setZoom(zoomIndex);
        });

        this.$container = $('<div class="hic-resolution-selector-container">');
        $parent.append(this.$container);

        //
        this.$container.append($label_container);
        //
        this.$container.append(this.$resolution_selector);

        this.browser.eventBus.subscribe("LocusChange", this);
        this.browser.eventBus.subscribe("MapLoad", this);
    };

    hic.ResolutionSelector.prototype.setResolutionLock = function (resolutionLocked) {
        this.$resolution_lock.removeClass( (true === resolutionLocked) ? 'fa-unlock' : 'fa-lock');
        this.$resolution_lock.addClass(    (true === resolutionLocked) ? 'fa-lock' : 'fa-unlock');
    };

    hic.ResolutionSelector.prototype.receiveEvent = function (event) {

        var self = this;

        if (event.type === "LocusChange") {

            if (true === event.data.resolutionChanged) {
                this.browser.resolutionLocked = false;
                self.setResolutionLock(this.browser.resolutionLocked);
            }

            this.$resolution_selector
                .find('option')
                .filter(function (index) {
                    return index === event.data.state.zoom;
                })
                .prop('selected', true);

        } else if (event.type === "MapLoad") {

            var elements;

            this.browser.resolutionLocked = false;
            this.setResolutionLock(this.browser.resolutionLocked);

            elements = _.map(this.browser.dataset.bpResolutions, function (resolution, index) {
                var selected = self.browser.state.zoom === index;
                return '<option' + ' value=' + index +  (selected ? ' selected': '') + '>' + igv.numberFormatter(Math.floor(resolution / 1e3)) + '</option>';
            });

            this.$resolution_selector.empty();
            this.$resolution_selector.append(elements.join(''));

        }

    };

    return hic;

})
(hic || {});
