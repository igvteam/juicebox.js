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
            $exchange_container,
            A,
            B,
            AOB,
            BOA;

        this.browser = browser;

        // container
        this.$container = $('<div class="hic-control-map-selector-container">');
        this.$container.hide();
        $parent.append(this.$container);

        // select
        this.$control_map_selector = $('<select>');
        this.$control_map_selector.attr('name', 'control_map_selector');
        this.$container.append(this.$control_map_selector);

        // a-b exchange icon
        $exchange_container = $('<div>');
        this.$container.append($exchange_container);

        // a arrow
        this.$img_a = $a_svg();
        $exchange_container.append(this.$img_a);

        // b arrow
        this.$img_b = $b_svg();
        $exchange_container.append(this.$img_b);

        A   = { title: 'A',   value: 'A',   other: 'B',   $hidden: self.$img_b, $shown: self.$img_a };
        B   = { title: 'B',   value: 'B',   other: 'A',   $hidden: self.$img_a, $shown: self.$img_b };
        AOB = { title: 'A/B', value: 'AOB', other: 'BOA', $hidden: self.$img_b, $shown: self.$img_a };
        BOA = { title: 'B/A', value: 'BOA', other: 'AOB', $hidden: self.$img_a, $shown: self.$img_b };

        this.contactMapHash =
            {
                  'A': A,
                  'B': B,
                'AOB': AOB,
                'BOA': BOA,
            };

        this.$control_map_selector.on('change', function (e) {
            let value,
                displayMode,
                obj;

            displayMode = browser.getDisplayMode();
            console.log('Old Display Mode ' + displayMode);

            value = $(this).val();

            obj = self.contactMapHash[ value ];

            if (obj) {

                obj.$hidden.hide();
                obj.$shown.show();

                browser.setDisplayMode(value);

                displayMode = browser.getDisplayMode();
                console.log('New Display Mode ' + displayMode);
            }

        });

        $exchange_container.on('click', function (e) {
            let displayMode,
                value,
                str;

            // find new display mode
            displayMode = browser.getDisplayMode();

            // render new display mode
            value = self.contactMapHash[ displayMode ].other;
            browser.setDisplayMode(value);

            // update exchange icon
            self.contactMapHash[ value ].$hidden.hide();
            self.contactMapHash[ value ].$shown.show();

            // update select element
            str = 'option[value=' + value + ']';
            self.$control_map_selector.find( str ).prop('selected', true);

        });

        browser.eventBus.subscribe("ControlMapLoad", function (event) {
            updateOptions.call(self, browser);
            self.$container.show();
        });

        browser.eventBus.subscribe("MapLoad", function (event) {
            if (!browser.controlDataset) {
                self.$container.hide();
            }
        });

    };

    hic.ControlMapWidget.prototype.didToggleDisplayMode = function (displayMode) {
        var str;
        str = 'option[value' + '=' + displayMode + ']';
        this.$control_map_selector.find(str).prop('selected', true);
    };

    function updateOptions(browser) {

        var self = this,
            displayMode,
            option,
            keys;

        displayMode = browser.getDisplayMode();

        self.$img_a.hide();
        self.$img_b.hide();

        this.$control_map_selector.empty();

        Object.keys(this.contactMapHash).forEach(function (key) {
            let item;

            item = self.contactMapHash [ key ];

            option = $('<option>').attr('title', item.title).attr('value', item.value).text(item.title);

            if(displayMode === item.value) {
                option.attr('selected', true);
                item.$shown.show();
            }

            self.$control_map_selector.append(option);

        });


    }

    function $a_svg() {
        let str,
            a;

        str = '<svg width="34px" height="34px" viewBox="0 0 34 34" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
            '    <!-- Generator: Sketch 50.2 (55047) - http://www.bohemiancoding.com/sketch -->\n' +
            '    <title>Group</title>\n' +
            '    <desc>Created with Sketch.</desc>\n' +
            '    <defs></defs>\n' +
            '    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
            '        <g id="Group" transform="translate(1.000000, 1.000000)">\n' +
            '            <rect id="Rectangle" stroke="#A6A6A6" stroke-width="1.17836594" fill="#F8F8F8" x="0" y="0" width="32" height="32" rx="3.68239356"></rect>\n' +
            '            <g id="arrows" transform="translate(6.149597, 6.591484)" fill-rule="nonzero" stroke="#5F5F5F" stroke-width="0.589182969">\n' +
            '                <path d="M24.4151546,8.24876545 L11.1585378,8.24876545 L11.1585378,6.48121654 C11.1585378,5.69635118 10.2061971,5.29990469 9.64982429,5.85627753 L6.70390944,8.80219238 C6.35879552,9.14734312 6.35879552,9.70691965 6.70390944,10.0520336 L9.64982429,12.9979484 C10.2032144,13.5513017 11.1585378,13.1624409 11.1585378,12.3730462 L11.1585378,10.6054973 L24.4151546,10.6054973 C24.9032558,10.6054973 25.298929,10.2098241 25.298929,9.72172287 L25.298929,9.1325399 C25.298929,8.64443864 24.9032558,8.24876545 24.4151546,8.24876545 Z" id="down-arrow" fill="#F8F8F8" transform="translate(15.872002, 9.426928) rotate(-90.000000) translate(-15.872002, -9.426928) "></path>\n' +
            '                <path d="M12.3737276,8.24876545 L-0.882889175,8.24876545 L-0.882889175,6.48121654 C-0.882889175,5.69635118 -1.8352298,5.29990469 -2.39160264,5.85627753 L-5.33751748,8.80219238 C-5.68263141,9.14734312 -5.68263141,9.70691965 -5.33751748,10.0520336 L-2.39160264,12.9979484 C-1.83821254,13.5513017 -0.882889175,13.1624409 -0.882889175,12.3730462 L-0.882889175,10.6054973 L12.3737276,10.6054973 C12.8618289,10.6054973 13.2575021,10.2098241 13.2575021,9.72172287 L13.2575021,9.1325399 C13.2575021,8.64443864 12.8618289,8.24876545 12.3737276,8.24876545 Z" id="up-arrow" fill="#5F5F5F" transform="translate(3.830575, 9.426928) scale(1, -1) rotate(-90.000000) translate(-3.830575, -9.426928) "></path>\n' +
            '            </g>\n' +
            '        </g>\n' +
            '    </g>\n' +
            '</svg>';

        a = str.split('\n').join(' ');

        return $(a);
    }

    function $b_svg() {
        let str,
            b;

        str = '<svg width="34px" height="34px" viewBox="0 0 34 34" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
            '    <!-- Generator: Sketch 50.2 (55047) - http://www.bohemiancoding.com/sketch -->\n' +
            '    <title>Group</title>\n' +
            '    <desc>Created with Sketch.</desc>\n' +
            '    <defs></defs>\n' +
            '    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
            '        <g id="Group" transform="translate(1.000000, 1.000000)">\n' +
            '            <rect id="Rectangle" stroke="#A6A6A6" stroke-width="1.17836594" fill="#F8F8F8" x="0" y="0" width="32" height="32" rx="3.68239356"></rect>\n' +
            '            <g id="arrows" transform="translate(6.149597, 6.591484)" fill-rule="nonzero" stroke="#5F5F5F" stroke-width="0.589182969">\n' +
            '                <path d="M24.4151546,8.24876545 L11.1585378,8.24876545 L11.1585378,6.48121654 C11.1585378,5.69635118 10.2061971,5.29990469 9.64982429,5.85627753 L6.70390944,8.80219238 C6.35879552,9.14734312 6.35879552,9.70691965 6.70390944,10.0520336 L9.64982429,12.9979484 C10.2032144,13.5513017 11.1585378,13.1624409 11.1585378,12.3730462 L11.1585378,10.6054973 L24.4151546,10.6054973 C24.9032558,10.6054973 25.298929,10.2098241 25.298929,9.72172287 L25.298929,9.1325399 C25.298929,8.64443864 24.9032558,8.24876545 24.4151546,8.24876545 Z" id="down-arrow" fill="#5F5F5F" transform="translate(15.872002, 9.426928) rotate(-90.000000) translate(-15.872002, -9.426928) "></path>\n' +
            '                <path d="M12.3737276,8.24876545 L-0.882889175,8.24876545 L-0.882889175,6.48121654 C-0.882889175,5.69635118 -1.8352298,5.29990469 -2.39160264,5.85627753 L-5.33751748,8.80219238 C-5.68263141,9.14734312 -5.68263141,9.70691965 -5.33751748,10.0520336 L-2.39160264,12.9979484 C-1.83821254,13.5513017 -0.882889175,13.1624409 -0.882889175,12.3730462 L-0.882889175,10.6054973 L12.3737276,10.6054973 C12.8618289,10.6054973 13.2575021,10.2098241 13.2575021,9.72172287 L13.2575021,9.1325399 C13.2575021,8.64443864 12.8618289,8.24876545 12.3737276,8.24876545 Z" id="up-arrow" fill="#F8F8F8" transform="translate(3.830575, 9.426928) scale(1, -1) rotate(-90.000000) translate(-3.830575, -9.426928) "></path>\n' +
            '            </g>\n' +
            '        </g>\n' +
            '    </g>\n' +
            '</svg>';

        b = str.split('\n').join(' ');

        return $(b);
    }

    return hic;

})
(hic || {});
