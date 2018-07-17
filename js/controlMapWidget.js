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

    hic.ControlMapWidget = function (browser, $parent) {

        var self = this,
            $toggle_container,
            $cycle_container;

        this.browser = browser;

        // container
        this.$container = $('<div class="hic-control-map-selector-container">');
        this.$container.hide();
        $parent.append(this.$container);

        // select
        this.$select = $('<select>');
        this.$select.attr('name', 'control_map_selector');
        this.$container.append(this.$select);

        // a-b exchange icon
        $toggle_container = $('<div>');
        this.$container.append($toggle_container);

        // cycle button
        $cycle_container = $('<div>');
        this.$container.append($cycle_container);


        // cycle outline
        this.$cycle_outline = cycle_outline();
        $cycle_container.append(this.$cycle_outline);

        // cycle solid
        this.$cycle_solid = cycle_solid();
        $cycle_container.append(this.$cycle_solid);
        this.$cycle_solid.hide();

        $cycle_container.on('click', function () {

            if (self.cycleID) {

                window.clearInterval(self.cycleID);
                self.cycleID = undefined;

                self.$cycle_solid.hide();
                self.$cycle_outline.show();
            } else {

                self.cycleID = window.setInterval(function () {
                    console.log('cycle maps');
                    self.controlMapHash.toggleDisplayMode();
                }, 2500);

                self.$cycle_solid.show();
                self.$cycle_outline.hide();
            }
        });

        $cycle_container.hide();

        this.controlMapHash = new hic.ControlMapHash(browser, this.$select, $toggle_container, $cycle_container, toggle_arrows_up(), toggle_arrows_down());

        browser.eventBus.subscribe("ControlMapLoad", function (event) {
            let displayMode;

            displayMode = browser.getDisplayMode();
            self.controlMapHash.updateOptions( browser.getDisplayMode() );
            self.$container.show();
        });

        browser.eventBus.subscribe("MapLoad", function (event) {
            if (!browser.controlDataset) {
                self.$container.hide();
            }
        });

    };

    hic.ControlMapHash = function (browser, $select, $toggle, $cycle, $img_a, $img_b) {

        let self = this,
            A,
            B,
            Cycle,
            AOB,
            BOA;

        this.browser = browser;
        this.$select = $select;
        this.$toggle = $toggle;
        this.$cycle = $cycle;

        // a arrow
        this.$img_a = $img_a;
        this.$toggle.append(this.$img_a);

        // b arrow
        this.$img_b = $img_b;
        this.$toggle.append(this.$img_b);

        A   = { title: 'A',   value: 'A',   other: 'B',   $hidden: $img_b, $shown: $img_a };
        B   = { title: 'B',   value: 'B',   other: 'A',   $hidden: $img_a, $shown: $img_b };
        Cycle   = { title: 'Cycle',   value: 'Cycle',   other: 'Cycle',   $hidden: $img_a, $shown: $img_b };
        AOB = { title: 'A/B', value: 'AOB', other: 'BOA', $hidden: $img_b, $shown: $img_a };
        BOA = { title: 'B/A', value: 'BOA', other: 'AOB', $hidden: $img_a, $shown: $img_b };

        this.hash =
            {
                'A': A,
                'B': B,
                // 'Cycle': Cycle,
                'AOB': AOB,
                'BOA': BOA,
            };

        this.$select.on('change', function (e) {
            let value;
            value = $(this).val();
            self.setDisplayMode( value );
        });

        this.$toggle.on('click', function (e) {
            self.toggleDisplayMode();
        });

    };

    hic.ControlMapHash.prototype.toggleDisplayMode = function () {

        let displayModeOld,
            displayModeNew,
            str;

        displayModeOld = this.browser.getDisplayMode();

        // render new display mode
        displayModeNew = this.hash[ displayModeOld ].other;
        this.browser.setDisplayMode(displayModeNew);

        // update exchange icon
        this.hash[ displayModeNew ].$hidden.hide();
        this.hash[ displayModeNew ].$shown.show();

        // update select element
        str = 'option[value=' + displayModeNew + ']';

        this.$select.find( str ).prop('selected', true);

    };

    hic.ControlMapHash.prototype.setDisplayMode = function (displayMode) {

        this.hash[ displayMode ].$hidden.hide();
        this.hash[ displayMode ].$shown.show();

        if ('A' === displayMode || 'B' === displayMode) {
            this.$cycle.show();
        } else {
            this.$cycle.hide();
        }

        this.browser.setDisplayMode(displayMode);
    };

    hic.ControlMapHash.prototype.updateOptions = function (displayMode) {
        let self = this;

        this.$img_a.hide();
        this.$img_b.hide();

        this.$select.empty();

        Object.keys(this.hash).forEach(function (key) {
            let item,
                option;

            item = self.hash[ key ];

            option = $('<option>').attr('title', item.title).attr('value', item.value).text(item.title);

            if(displayMode === item.value) {

                option.attr('selected', true);
                item.$shown.show();

                if ('A' === displayMode || 'B' === displayMode) {
                    self.$cycle.show();
                } else {
                    self.$cycle.hide();
                }

            }

            self.$select.append(option);

        });

    };

    function toggle_arrows_up() {
        let str,
            a;

        str = '<svg width="34px" height="34px" viewBox="0 0 34 34" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
            '    <!-- Generator: Sketch 51 (57462) - http://www.bohemiancoding.com/sketch -->\n' +
            '    <title>Group</title>\n' +
            '    <desc>Created with Sketch.</desc>\n' +
            '    <defs></defs>\n' +
            '    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
            '        <g id="Group">\n' +
            '            <rect id="Rectangle" stroke="#A6A6A6" stroke-width="1.25201381" fill="#F8F8F8" x="0.626006904" y="0.626006904" width="32.7479862" height="32.7479862" rx="3.91254315"></rect>\n' +
            '            <g id="arrows" transform="translate(6.533947, 7.003452)" fill-rule="nonzero" stroke="#5F5F5F" stroke-width="0.626006904">\n' +
            '                <path d="M25.9411017,8.76431329 L11.8559464,8.76431329 L11.8559464,6.88629258 C11.8559464,6.05237313 10.8440845,5.63114873 10.2529383,6.22229488 L7.12290378,9.3523294 C6.75622024,9.71905207 6.75622024,10.3136021 7.12290378,10.6802857 L10.2529383,13.8103202 C10.8409153,14.3982581 11.8559464,13.9850935 11.8559464,13.1463616 L11.8559464,11.2683409 L25.9411017,11.2683409 C26.4597093,11.2683409 26.8801121,10.8479381 26.8801121,10.3293306 L26.8801121,9.70332365 C26.8801121,9.18471605 26.4597093,8.76431329 25.9411017,8.76431329 Z" id="down-arrow" fill="#F8F8F8" transform="translate(16.864002, 10.016110) rotate(-90.000000) translate(-16.864002, -10.016110) "></path>\n' +
            '                <path d="M13.1470856,8.76431329 L-0.938069748,8.76431329 L-0.938069748,6.88629258 C-0.938069748,6.05237313 -1.94993166,5.63114873 -2.5410778,6.22229488 L-5.67111233,9.3523294 C-6.03779587,9.71905207 -6.03779587,10.3136021 -5.67111233,10.6802857 L-2.5410778,13.8103202 C-1.95310082,14.3982581 -0.938069748,13.9850935 -0.938069748,13.1463616 L-0.938069748,11.2683409 L13.1470856,11.2683409 C13.6656932,11.2683409 14.086096,10.8479381 14.086096,10.3293306 L14.086096,9.70332365 C14.086096,9.18471605 13.6656932,8.76431329 13.1470856,8.76431329 Z" id="up-arrow" fill="#5F5F5F" transform="translate(4.069985, 10.016110) scale(1, -1) rotate(-90.000000) translate(-4.069985, -10.016110) "></path>\n' +
            '            </g>\n' +
            '        </g>\n' +
            '    </g>\n' +
            '</svg>';

        a = str.split('\n').join(' ');

        return $(a);
    }

    function toggle_arrows_down() {
        let str,
            b;

        str = '<svg width="34px" height="34px" viewBox="0 0 34 34" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
            '    <!-- Generator: Sketch 51 (57462) - http://www.bohemiancoding.com/sketch -->\n' +
            '    <title>Group</title>\n' +
            '    <desc>Created with Sketch.</desc>\n' +
            '    <defs></defs>\n' +
            '    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
            '        <g id="Group">\n' +
            '            <rect id="Rectangle" stroke="#A6A6A6" stroke-width="1.25201381" fill="#F8F8F8" x="0.626006904" y="0.626006904" width="32.7479862" height="32.7479862" rx="3.91254315"></rect>\n' +
            '            <g id="arrows" transform="translate(6.533947, 7.003452)" fill-rule="nonzero" stroke="#5F5F5F" stroke-width="0.626006904">\n' +
            '                <path d="M25.9411017,8.76431329 L11.8559464,8.76431329 L11.8559464,6.88629258 C11.8559464,6.05237313 10.8440845,5.63114873 10.2529383,6.22229488 L7.12290378,9.3523294 C6.75622024,9.71905207 6.75622024,10.3136021 7.12290378,10.6802857 L10.2529383,13.8103202 C10.8409153,14.3982581 11.8559464,13.9850935 11.8559464,13.1463616 L11.8559464,11.2683409 L25.9411017,11.2683409 C26.4597093,11.2683409 26.8801121,10.8479381 26.8801121,10.3293306 L26.8801121,9.70332365 C26.8801121,9.18471605 26.4597093,8.76431329 25.9411017,8.76431329 Z" id="down-arrow" fill="#5F5F5F" transform="translate(16.864002, 10.016110) rotate(-90.000000) translate(-16.864002, -10.016110) "></path>\n' +
            '                <path d="M13.1470856,8.76431329 L-0.938069748,8.76431329 L-0.938069748,6.88629258 C-0.938069748,6.05237313 -1.94993166,5.63114873 -2.5410778,6.22229488 L-5.67111233,9.3523294 C-6.03779587,9.71905207 -6.03779587,10.3136021 -5.67111233,10.6802857 L-2.5410778,13.8103202 C-1.95310082,14.3982581 -0.938069748,13.9850935 -0.938069748,13.1463616 L-0.938069748,11.2683409 L13.1470856,11.2683409 C13.6656932,11.2683409 14.086096,10.8479381 14.086096,10.3293306 L14.086096,9.70332365 C14.086096,9.18471605 13.6656932,8.76431329 13.1470856,8.76431329 Z" id="up-arrow" fill="#F8F8F8" transform="translate(4.069985, 10.016110) scale(1, -1) rotate(-90.000000) translate(-4.069985, -10.016110) "></path>\n' +
            '            </g>\n' +
            '        </g>\n' +
            '    </g>\n' +
            '</svg>';

        b = str.split('\n').join(' ');

        return $(b);
    }

    function cycle_outline() {
        let str,
            b;

        str = '<svg width="34px" height="34px" viewBox="0 0 34 34" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
            '    <!-- Generator: Sketch 51 (57462) - http://www.bohemiancoding.com/sketch -->\n' +
            '    <title>Group</title>\n' +
            '    <desc>Created with Sketch.</desc>\n' +
            '    <defs></defs>\n' +
            '    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
            '        <g id="Group">\n' +
            '            <rect id="Rectangle" stroke="#A6A6A6" stroke-width="1.25201381" fill="#F8F8F8" x="0.626006904" y="0.626006904" width="32.7479862" height="32.7479862" rx="3.91254315"></rect>\n' +
            '            <path d="M18.7511901,5.09576003 L18.7511901,5.99682387 C18.7511901,6.58119831 19.1451864,7.08719821 19.7082316,7.24443409 C23.9029587,8.41561696 26.9763574,12.2604589 26.9763574,16.8299815 C26.9763574,22.3302084 22.5231328,26.7823044 17.0195759,26.7823044 C11.5168849,26.7823044 7.06279444,22.3310739 7.06279444,16.8299815 C7.06279444,12.261108 10.135652,8.41572514 14.330812,7.24443409 C14.8939654,7.08719821 15.2879617,6.58109014 15.2879617,5.99666161 L15.2879617,5.09619274 C15.2879617,4.24651317 14.4852504,3.62752196 13.6620843,3.83949562 C7.85300574,5.33515667 3.56677365,10.6209219 3.59972844,16.9020276 C3.63868976,24.3149937 9.63207696,30.2595595 17.0484722,30.2439278 C24.4468479,30.2283503 30.4395857,24.2286681 30.4395857,16.8299815 C30.4395857,10.5755415 26.1570874,5.32103951 20.3631605,3.83592576 C19.5454599,3.626332 18.7511901,4.25197613 18.7511901,5.09576003 Z" id="circle-notch---outline" stroke="#5F5F5F" stroke-width="0.626006904" fill-rule="nonzero"></path>\n' +
            '        </g>\n' +
            '    </g>\n' +
            '</svg>';

        b = str.split('\n').join(' ');

        return $(b);

    }

    function cycle_solid() {
        let str,
            b;

        str = '<svg width="34px" height="34px" viewBox="0 0 34 34" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
            '    <!-- Generator: Sketch 51 (57462) - http://www.bohemiancoding.com/sketch -->\n' +
            '    <title>Group</title>\n' +
            '    <desc>Created with Sketch.</desc>\n' +
            '    <defs></defs>\n' +
            '    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
            '        <g id="Group">\n' +
            '            <rect id="Rectangle" stroke="#A6A6A6" stroke-width="1.25201381" fill="#F8F8F8" x="0.626006904" y="0.626006904" width="32.7479862" height="32.7479862" rx="3.91254315"></rect>\n' +
            '            <path d="M18.7511901,5.09576003 L18.7511901,5.99682387 C18.7511901,6.58119831 19.1451864,7.08719821 19.7082316,7.24443409 C23.9029587,8.41561696 26.9763574,12.2604589 26.9763574,16.8299815 C26.9763574,22.3302084 22.5231328,26.7823044 17.0195759,26.7823044 C11.5168849,26.7823044 7.06279444,22.3310739 7.06279444,16.8299815 C7.06279444,12.261108 10.135652,8.41572514 14.330812,7.24443409 C14.8939654,7.08719821 15.2879617,6.58109014 15.2879617,5.99666161 L15.2879617,5.09619274 C15.2879617,4.24651317 14.4852504,3.62752196 13.6620843,3.83949562 C7.85300574,5.33515667 3.56677365,10.6209219 3.59972844,16.9020276 C3.63868976,24.3149937 9.63207696,30.2595595 17.0484722,30.2439278 C24.4468479,30.2283503 30.4395857,24.2286681 30.4395857,16.8299815 C30.4395857,10.5755415 26.1570874,5.32103951 20.3631605,3.83592576 C19.5454599,3.626332 18.7511901,4.25197613 18.7511901,5.09576003 Z" id="circle-notch---outline" stroke="#5F5F5F" stroke-width="0.626006904" fill="#5F5F5F" fill-rule="nonzero"></path>\n' +
            '        </g>\n' +
            '    </g>\n' +
            '</svg>';

        b = str.split('\n').join(' ');

        return $(b);

    }

    return hic;

})
(hic || {});
