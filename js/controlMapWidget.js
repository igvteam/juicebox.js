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
            hash,
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
        this.$img_a = $('<img />', { 'src':'../../img/a-b-map-exchange-a.svg', width:'32px', height:'32px' });
        $exchange_container.append(this.$img_a);

        // b arrow
        this.$img_b = $('<img />', { 'src':'../../img/a-b-map-exchange-b.svg', width:'32px', height:'32px' });
        $exchange_container.append(this.$img_b);

        this.contactMapLUT =
            [
                { title:   'A', value:   'A', '$img': self.$img_a },
                { title:   'B', value:   'B', '$img': self.$img_b },
                { title: 'A/B', value: 'AOB', '$img': self.$img_a },
                { title: 'B/A', value: 'BOA', '$img': self.$img_b }
                //{title: 'A-B', value: 'AMB'}
            ];

        A = { other: 'B', '$hidden': self.$img_b, '$shown': self.$img_a };
        B = { other: 'A', '$hidden': self.$img_a, '$shown': self.$img_b };

        AOB = { other: 'BOA', '$hidden': self.$img_b, '$shown': self.$img_a };
        BOA = { other: 'AOB', '$hidden': self.$img_a, '$shown': self.$img_b };

        hash =
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

            obj = hash[ value ];
            obj.$hidden.hide();
            obj.$shown.show();

            browser.setDisplayMode(value);

            displayMode = browser.getDisplayMode();
            console.log('New Display Mode ' + displayMode);

        });


        $exchange_container.on('click', function (e) {
            let displayMode,
                value,
                str;

            // find new display mode
            displayMode = browser.getDisplayMode();

            // render new display mode
            value = hash[ displayMode ].other;
            browser.setDisplayMode(value);

            // update exchange icon
            hash[ value ].$hidden.hide();
            hash[ value ].$shown.show();

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
            option;

        displayMode = browser.getDisplayMode();

        self.$img_a.hide();
        self.$img_b.hide();

        this.$control_map_selector.empty();
        this.contactMapLUT.forEach(function (item) {

            option = $('<option>').attr('title', item.title).attr('value', item.value).text(item.title);

            if(displayMode === item.value) {
                option.attr('selected', true);
                item.$img.show();
            }

            self.$control_map_selector.append(option);
        });


    }

    return hic;

})
(hic || {});
