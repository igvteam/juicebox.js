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

var hic = (function (hic) {
    hic.AnnotationWidget = function (browser, $parent, title) {

        var self = this,
            modal_id,
            $container;

        this.browser = browser;

        $container = $("<div>", {class: 'hic-annotation-container'});
        $parent.append($container);

        modal_id = browser.id + '_' + 'modal';

        modalPresentationButton.call(this, modal_id, $container);

        modal.call(this, modal_id, $('body'), title);

        this.$modal.on('show.bs.modal', function () {
            browser.hideMenu();
            self.updateBody(self.browser.tracks2D);
        });

        this.$modal.on('hidden.bs.modal', function () {
            // do stuff
        });

        browser.eventBus.subscribe('TrackLoad2D', this);

    };

    hic.AnnotationWidget.prototype.receiveEvent = function (event) {

        if ('TrackLoad2D' === event.type) {
            this.updateBody(event.data);
        }

    };

    hic.AnnotationWidget.prototype.updateBody = function (tracks2D) {

        var self = this,
            hideShowHandler,
            deleteHandler;

        self.$annotation_modal_container.empty();

        _.each(tracks2D, function (track2D, i) {
            modalBodyRow.call(self, self.$annotation_modal_container, track2D);
        });

    };

    function modalBodyRow($container, track2D, index) {
        var self = this,
            $row,
            $colorPicker,
            $hideShowTrack,
            $deleteTrack,
            $upTrack,
            $downTrack,
            $e,
            hidden_color = '#f7f7f7',
            str;

        $row = $('<div>', {class: 'hic-annotation-modal-row'});
        $container.append($row);

        $row.data('track2D', track2D);

        // track name
        $e = $("<div>");
        $e.text(track2D.config.name);
        $row.append($e);

        // track hide/show
        str = (true === track2D.isVisible) ? 'fa fa-eye fa-lg' : 'fa fa-eye-slash fa-lg';
        $hideShowTrack = $("<i>", {class: str, 'aria-hidden': 'true'});
        $row.append($hideShowTrack);
        $hideShowTrack.on('click', function (e) {
            var track2D;

            track2D = $row.data('track2D');

            if ($hideShowTrack.hasClass('fa-eye')) {
                $hideShowTrack.addClass('fa-eye-slash');
                $hideShowTrack.removeClass('fa-eye');
                track2D.isVisible = false;
            } else {
                $hideShowTrack.addClass('fa-eye');
                $hideShowTrack.removeClass('fa-eye-slash');
                track2D.isVisible = true;
            }

            self.browser.contactMatrixView.clearCaches();
            self.browser.contactMatrixView.update();

        });

        // color


        if (inputTypeColorSupport()) {
            $colorPicker = $("<input type='color' value='" + rgbToHex(track2D.color) + "'/>");
            $colorPicker.on("change", function () {
                var hexColor = $colorPicker.val(),
                    rgb = hexToRgb(hexColor);
                track2D.color = rgb;
                self.browser.eventBus.post(hic.Event("TrackState2D", track2D))
            })
        } else {
            $colorPicker = createGenericColorPicker(track2D.color, function (color) {
                track2D.color = hexToRgb(color);
                self.browser.eventBus.post(hic.Event("TrackState2D", track2D));
            });
        }

        $row.append($colorPicker);


        // track up/down
        $e = $('<div>');
        $row.append($e);

        $upTrack = $("<i>", {class: 'fa fa-arrow-up', 'aria-hidden': 'true'});
        $e.append($upTrack);

        $downTrack = $("<i>", {class: 'fa fa-arrow-down', 'aria-hidden': 'true'});
        $e.append($downTrack);

        if (1 === _.size(self.browser.tracks2D)) {
            $upTrack.css('color', hidden_color);
            $downTrack.css('color', hidden_color);
        } else if (track2D === _.first(self.browser.tracks2D)) {
            $upTrack.css('color', hidden_color);
        } else if (track2D === _.last(self.browser.tracks2D)) {
            $downTrack.css('color', hidden_color);
        }

        $upTrack.on('click', function (e) {
            var track2D,
                indexA,
                indexB;

            indexA = _.indexOf(self.browser.tracks2D, $row.data('track2D'));
            indexB = indexA - 1;

            track2D = self.browser.tracks2D[indexB];
            self.browser.tracks2D[indexB] = self.browser.tracks2D[indexA];
            self.browser.tracks2D[indexA] = track2D;

            self.browser.eventBus.post(hic.Event('TrackState2D', self.browser.tracks2D));
            self.updateBody(self.browser.tracks2D);
        });

        $downTrack.on('click', function (e) {
            var track2D,
                indexA,
                indexB;

            indexA = _.indexOf(self.browser.tracks2D, $row.data('track2D'));
            indexB = indexA + 1;

            track2D = self.browser.tracks2D[indexB];
            self.browser.tracks2D[indexB] = self.browser.tracks2D[indexA];
            self.browser.tracks2D[indexA] = track2D;

            self.browser.eventBus.post(hic.Event('TrackState2D', self.browser.tracks2D));
            self.updateBody(self.browser.tracks2D);
        });


        // track delete
        $deleteTrack = $("<i>", {class: 'fa fa-trash-o fa-lg', 'aria-hidden': 'true'});
        $row.append($deleteTrack);
        $deleteTrack.on('click', function (e) {
            var track2D,
                index;

            track2D = $row.data('track2D');
            index = _.indexOf(self.browser.tracks2D, track2D);

            self.browser.tracks2D.splice(index, 1);

            self.browser.contactMatrixView.clearCaches();
            self.browser.contactMatrixView.update();

            self.browser.eventBus.post(hic.Event('TrackLoad2D', self.browser.tracks2D));
        });

    }

    function modalPresentationButton(modal_id, $parent) {
        var str,
            $e;

        // annotation modal presentation button
        str = '#' + modal_id;
        $e = $('<button>', {type: 'button', class: 'btn btn-default', 'data-toggle': 'modal', 'data-target': str});
        $e.text('2D Annotations');

        $parent.append($e);

    }

    function modal(modal_id, $parent, title) {
        var modal_label,
            $modal,
            $modal_dialog,
            $modal_content,
            $modal_header,
            $modal_title,
            $close,
            $modal_body,
            $modal_footer,
            $e;

        modal_label = modal_id + 'Label';
        // modal
        $modal = $('<div>', {
            class: 'modal fade',
            'id': modal_id,
            tabindex: '-1',
            role: 'dialog',
            'aria-labelledby': modal_label,
            'aria-hidden': 'true'
        });
        $parent.append($modal);

        // modal-dialog
        $modal_dialog = $('<div>', {class: 'modal-dialog modal-lg', role: 'document'});
        $modal.append($modal_dialog);

        // modal-content
        $modal_content = $('<div>', {class: 'modal-content'});
        $modal_dialog.append($modal_content);

        // modal-header
        $modal_header = $('<div>', {class: 'modal-header', id: modal_label});
        $modal_content.append($modal_header);

        // modal-title
        $modal_title = $('<h4>', {class: 'modal-title'});
        $modal_title.text(title);
        $modal_header.append($modal_title);

        // close button
        $close = $('<button>', {type: 'button', class: 'close', 'data-dismiss': 'modal', 'aria-label': 'Close'});
        $e = $('<span>', {'aria-hidden': 'true'});
        $e.html('&times;');
        $close.append($e);
        $modal_header.append($close);

        // modal-body
        $modal_body = $('<div>', {class: 'modal-body'});
        $modal_content.append($modal_body);

        // modal-body - annotation container
        this.$annotation_modal_container = $("<div>", {class: 'hic-annotation-modal-container'});
        $modal_body.append(this.$annotation_modal_container);


        // modal-footer
        $modal_footer = $('<div>', {class: 'modal-footer'});
        $modal_content.append($modal_footer);

        // modal footer - close
        $e = $('<button>', {type: 'button', class: 'btn btn-secondary', 'data-dismiss': 'modal'});
        $e.text('Close');
        $modal_footer.append($e);

        // modal footer - save changes
        // $e = $('<button>', { type:'button', class:'btn btn-primary' });
        // $e.text('Save changes');
        // $modal_footer.append($e);

        this.$modal_body = $modal_body;
        this.$modal = $modal;

    }

    // Some conversion functions for the color input element -- spec says hex must be used
    function rgbToHex(rgb) {
        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
        return (rgb && rgb.length === 4) ? "#" +
        ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
    }

    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return "rgb(" +
            parseInt(result[1], 16) + ", " +
            parseInt(result[2], 16) + ", " +
            parseInt(result[3], 16) + ")";
    }

    function inputTypeColorSupport() {
        if (typeof inputTypeColorSupport._cachedResult === "undefined") {
            var colorInput = $("<input type='color'/>")[0]; // if color element is supported, value will default to not null
            inputTypeColorSupport._cachedResult = colorInput.type === "color" && colorInput.value !== "";
        }
        return inputTypeColorSupport._cachedResult;
    }

    function createGenericColorPicker(color, callback) {

        var $widget, $palletDiv, $buttonContainer, $showButton, $hideButton;

        $widget = $('<div/>')

        // Set position property to "fixed" to take it out of the page flow.  Otherwise it will move controls to the right
        $palletDiv = $('<div style="width: 300px; display:none; border: 2px black; margin: 5px; position: fixed">');

        $buttonContainer = $('<div style="width: 300px; display: flex; flex-wrap: wrap">');
        $palletDiv.append($buttonContainer);

        $buttonContainer.append(createColorRow(color));  // self color, might be duplicated in CSS_NAMES but we don't care

        if(!WEB_SAFE_COLORS) createWebSafeColorArray();

        WEB_SAFE_COLORS.forEach(function (c) {
            $buttonContainer.append(createColorRow(c));
        });

        $hideButton = $('<input/>', {
            type: "button",
            value: "Close",
            style: "margin: 5px, border-radius: 5px"
        });
        $hideButton.click(function () {
            $palletDiv.css("display", "none");
        });
        $palletDiv.append($hideButton);

        $showButton = $('<button/>', {
            style: "width: 20px; height: 20px; background-color: " + color
        });
        $showButton.on("click", function () {
            $palletDiv.css("display", "block");
        });


        $widget.append($showButton);
        $widget.append($palletDiv);
        return $widget;

        function createColorRow(color) {

            var $cell = $('<input>', {
                type: "button",
                style: "width: 20px; background-color:" + color + "; height: 20px",
            })
            $cell.click(function () {
                $showButton.css("background-color", color);
                $palletDiv.css("display", "none");
                callback(color);

            });
            return $cell;
        }

        function createWebSafeColorArray() {

            var safe = new Array('00', '33', '66', '99', 'CC', 'FF'),
                color, r, g, b;

            WEB_SAFE_COLORS = [];
            for (r = 0; r <= 5; r++) {
                for (g = 0; g <= 5; g++) {
                    for (b = 0; b <= 5; b++) {
                        color = "#" + safe[r] + safe[g] + safe[b];
                        WEB_SAFE_COLORS.push(color);
                    }

                }
            }
        }


    }

    var WEB_SAFE_COLORS;

    var CSS_COLOR_NAMES = ["AliceBlue", "AntiqueWhite", "Aqua", "Aquamarine", "Azure", "Beige", "Bisque", "Black",
        "BlanchedAlmond", "Blue", "BlueViolet", "Brown", "BurlyWood", "CadetBlue", "Chartreuse", "Chocolate", "Coral",
        "CornflowerBlue", "Cornsilk", "Crimson", "Cyan", "DarkBlue", "DarkCyan", "DarkGoldenRod", "DarkGray",
        "DarkGrey", "DarkGreen", "DarkKhaki", "DarkMagenta", "DarkOliveGreen", "Darkorange", "DarkOrchid", "DarkRed",
        "DarkSalmon", "DarkSeaGreen", "DarkSlateBlue", "DarkSlateGray", "DarkSlateGrey", "DarkTurquoise", "DarkViolet",
        "DeepPink", "DeepSkyBlue", "DimGray", "DimGrey", "DodgerBlue", "FireBrick", "FloralWhite", "ForestGreen", "Fuchsia",
        "Gainsboro", "GhostWhite", "Gold", "GoldenRod", "Gray", "Grey", "Green", "GreenYellow", "HoneyDew", "HotPink",
        "IndianRed", "Indigo", "Ivory", "Khaki", "Lavender", "LavenderBlush", "LawnGreen", "LemonChiffon", "LightBlue",
        "LightCoral", "LightCyan", "LightGoldenRodYellow", "LightGray", "LightGrey", "LightGreen", "LightPink",
        "LightSalmon", "LightSeaGreen", "LightSkyBlue", "LightSlateGray", "LightSlateGrey", "LightSteelBlue",
        "LightYellow", "Lime", "LimeGreen", "Linen", "Magenta", "Maroon", "MediumAquaMarine", "MediumBlue",
        "MediumOrchid", "MediumPurple", "MediumSeaGreen", "MediumSlateBlue", "MediumSpringGreen", "MediumTurquoise",
        "MediumVioletRed", "MidnightBlue", "MintCream", "MistyRose", "Moccasin", "NavajoWhite", "Navy", "OldLace",
        "Olive", "OliveDrab", "Orange", "OrangeRed", "Orchid", "PaleGoldenRod", "PaleGreen", "PaleTurquoise", "PaleVioletRed",
        "PapayaWhip", "PeachPuff", "Peru", "Pink", "Plum", "PowderBlue", "Purple", "Red", "RosyBrown", "RoyalBlue",
        "SaddleBrown", "Salmon", "SandyBrown", "SeaGreen", "SeaShell", "Sienna", "Silver", "SkyBlue", "SlateBlue",
        "SlateGray", "SlateGrey", "Snow", "SpringGreen", "SteelBlue", "Tan", "Teal", "Thistle", "Tomato", "Turquoise",
        "Violet", "Wheat", "White", "WhiteSmoke", "Yellow", "YellowGreen"];


    return hic;
})(hic || {});

