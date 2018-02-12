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
            optionStrings,
            $options;

        this.browser = browser;

        // container
        this.$container = $('<div class="hic-control-map-selector-container">');
        $parent.append(this.$container);

        // select
        this.$control_map_selector = $('<select>');
        this.$control_map_selector.attr('name', 'control_map_selector');
        this.$control_map_selector.on('change', function (e) {
            var value;

            value = $(this).val();
            console.log('Control Map select - ' + value);
        });
        this.$container.append(this.$control_map_selector);
        optionStrings =
            [
                { title:'Observed', value:'observed' },
                { title:'Control', value:'control' },
                { title:'Observed/Control', value:'observed-over-control' },
                { title:'Observed-Control', value:'observed-minus-control' }
            ];

        optionStrings.forEach(function (o) {
            self.$control_map_selector.append($('<option>').attr('title', o.title).attr('value', o.value).text(o.title));
        });

    };

    return hic;

})
(hic || {});
