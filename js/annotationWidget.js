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

    hic.AnnotationWidget = function (browser, $parent, title, trackRetrievalCallback) {

        var self = this,
            modal_id,
            $container;

        this.browser = browser;
        this.trackRetrievalCallback = trackRetrievalCallback;

        $container = $("<div>", { class: 'hic-annotation-container' });
        $parent.append($container);

        modal_id = browser.id + '_' + _.uniqueId('annotation_modal_');

        modalPresentationButton.call(this, modal_id, $container, title);

        modal.call(this, modal_id, $('body'), title);

        this.$modal.on('show.bs.modal', function () {
            browser.hideMenu();
            self.updateBody(trackRetrievalCallback());
        });

    };

    hic.AnnotationWidget.prototype.updateBody = function (tracks) {

        var self = this,
            zi;

        self.$annotation_modal_container.empty();

        // Reverse list to present layers in "z" order.
        for(zi = tracks.length - 1; zi >= 0; zi--) {
            modalBodyRow.call(self, self.$annotation_modal_container, tracks[ zi ]);
        }

    };

    function modalBodyRow($container, track) {
        var self = this,
            $row_container,
            $row,
            $hideShowTrack,
            $deleteTrack,
            $upTrack,
            $downTrack,
            $e,
            hidden_color = '#f7f7f7',
            str,
            isTrack2D;


        isTrack2D = (track instanceof hic.Track2D);

        // row container
        $row_container = $('<div>', {class: 'hic-annotation-row-container'});
        $container.append($row_container);

        // one row
        $row = $('<div>', {class: 'hic-annotation-modal-row'});
        $row_container.append($row);

        // track reference
        $row.data('track', track);


        // track name
        $e = $("<div>");
        $e.text(track.config.name);
        $row.append($e);


        // track hide/show
        if (isTrack2D) {

            str = (true === track.isVisible) ? 'fa fa-eye fa-lg' : 'fa fa-eye-slash fa-lg';
            $hideShowTrack = $("<i>", {class: str, 'aria-hidden': 'true'});
            $row.append($hideShowTrack);
            $hideShowTrack.on('click', function (e) {
                var track;

                track = $row.data('track');

                if ($hideShowTrack.hasClass('fa-eye')) {
                    $hideShowTrack.addClass('fa-eye-slash');
                    $hideShowTrack.removeClass('fa-eye');
                    track.isVisible = false;
                } else {
                    $hideShowTrack.addClass('fa-eye');
                    $hideShowTrack.removeClass('fa-eye-slash');
                    track.isVisible = true;
                }

                self.browser.contactMatrixView.clearCaches();
                self.browser.contactMatrixView.update();

            });

        }


        // color swatch selector button
        $e = hic.colorSwatch(track.color);
        $row.append($e);
        $e.on('click', function (e) {
            $row.next('.hic-color-swatch-container').toggle();
        });

        // color swatch selector
        $e = $('<div>', { class: 'hic-color-swatch-container' });
        $row_container.append($e);

        hic.createColorSwatchSelector($e, function (color) {
            var $swatch;

            $swatch = $row.find('.fa-square');
            $swatch.css({color: color});

            if (isTrack2D) {
                track.color = color;
                self.browser.eventBus.post(hic.Event('TrackState2D', track));
            } else {
                track.trackView.setColor(color);
            }

        }, function () {
            $row.next('.hic-color-swatch-container').toggle();
        });
        $e.hide();



        if (isTrack2D) {
            // track up/down
            $e = $('<div>', {class: 'up-down-arrow-container'});
            $row.append($e);

            $upTrack = $("<i>", {class: 'fa fa-arrow-up', 'aria-hidden': 'true'});
            $e.append($upTrack);

            $downTrack = $("<i>", {class: 'fa fa-arrow-down', 'aria-hidden': 'true'});
            $e.append($downTrack);

            if (1 === _.size(self.browser.tracks2D)) {
                $upTrack.css('color', hidden_color);
                $downTrack.css('color', hidden_color);
            } else if (track === _.first(self.browser.tracks2D)) {
                $downTrack.css('color', hidden_color);
            } else if (track === _.last(self.browser.tracks2D)) {
                $upTrack.css('color', hidden_color);
            }

            $upTrack.on('click', function (e) {
                var track,
                    indexA,
                    indexB;

                indexA = _.indexOf(self.browser.tracks2D, $row.data('track'));
                indexB = indexA + 1;

                track = self.browser.tracks2D[indexB];
                self.browser.tracks2D[indexB] = self.browser.tracks2D[indexA];
                self.browser.tracks2D[indexA] = track;

                self.browser.eventBus.post(hic.Event('TrackState2D', self.browser.tracks2D));
                self.updateBody(self.browser.tracks2D);
            });

            $downTrack.on('click', function (e) {
                var track,
                    indexA,
                    indexB;

                indexA = _.indexOf(self.browser.tracks2D, $row.data('track'));
                indexB = indexA - 1;

                track = self.browser.tracks2D[indexB];
                self.browser.tracks2D[indexB] = self.browser.tracks2D[indexA];
                self.browser.tracks2D[indexA] = track;

                self.browser.eventBus.post(hic.Event('TrackState2D', self.browser.tracks2D));
                self.updateBody(self.browser.tracks2D);
            });
        }


        // track delete
        $deleteTrack = $("<i>", {class: 'fa fa-trash-o fa-lg', 'aria-hidden': 'true'});
        $row.append($deleteTrack);
        $deleteTrack.on('click', function (e) {
            var index;

            if (isTrack2D) {

                index = _.indexOf(self.browser.tracks2D, track);

                self.browser.tracks2D.splice(index, 1);

                self.browser.contactMatrixView.clearCaches();
                self.browser.contactMatrixView.update();

                self.browser.eventBus.post(hic.Event('TrackLoad2D', self.trackRetrievalCallback()));
            } else {
                self.browser.layoutController.removeTrackRendererPair(track.trackView.trackRenderPair);
            }

            self.updateBody(self.trackRetrievalCallback());
        });

    }

    function modalPresentationButton(modal_id, $parent, title) {
        var str,
            $e;

        str = '#' + modal_id;
        $e = $('<button>', {type: 'button', class: 'btn btn-default', 'data-toggle': 'modal', 'data-target': str});
        $e.text(title);

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

    return hic;
})(hic || {});

