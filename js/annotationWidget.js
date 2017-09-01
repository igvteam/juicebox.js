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

        $container = $("<div>", { class:'hic-annotation-container' });
        $parent.append($container);

        modal_id = browser.id + '_' + 'modal';

        modalPresentationButton.call(this, modal_id, $container);

        modal.call(this, modal_id, $('body'), title);

        this.$modal.on('show.bs.modal', function () {
            // do stuff
        });

        this.$modal.on('hidden.bs.modal', function () {
            // do stuff
        });

        browser.eventBus.subscribe('TrackLoad2D', this);

    };

    hic.AnnotationWidget.prototype.receiveEvent = function(event) {

        if ('TrackLoad2D' === event.type) {
            this.updateBody(event.data);
        }

    };

    hic.AnnotationWidget.prototype.updateBody = function (tracks2D) {

        var self = this;

        self.$annotation_modal_container.empty();

        _.each(tracks2D, function (track) {
            modalBodyRow.call(self, self.$annotation_modal_container, track.config.name);
        });

    };

    function modalBodyRow($container, string) {
        var self = this,
            $row,
            $e;

        $row = $("<div>", { class:'hic-annotation-modal-row' });
        $container.append($row);

        // track name
        $e = $("<div>");
        $e.text(string);
        $row.append($e);

        // track hide/show
        $e = $("<i>", { class:'fa fa-eye fa-lg', 'aria-hidden':'true' });
        $e.on('click', function (e) {
            console.log('hide/show track');
            if ($(this).hasClass('fa-eye')) {
                $(this).addClass('fa-eye-slash');
                $(this).removeClass('fa-eye');
            } else {
                $(this).addClass('fa-eye');
                $(this).removeClass('fa-eye-slash');
            }
        });
        $row.append($e);

        // track delete
        $e = $("<i>", { class:'fa fa-trash-o fa-lg', 'aria-hidden':'true' });
        $e.on('click', function (e) {
            console.log('delete track');
            // self.browser.tracks2D;
        });
        $row.append($e);

    }

    function modalPresentationButton(modal_id, $parent) {
        var str,
            $e;

        // annotation modal presentation button
        str = '#' + modal_id;
        $e = $('<button>', { type:'button', class:'btn btn-default', 'data-toggle':'modal', 'data-target':str });
        $e.text('Annotations');

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
        $modal = $('<div>', { class:'modal fade', 'id':modal_id, tabindex:'-1', role:'dialog', 'aria-labelledby':modal_label, 'aria-hidden':'true' });
        $parent.append($modal);

        // modal-dialog
        $modal_dialog = $('<div>', { class:'modal-dialog modal-lg', role:'document' });
        $modal.append($modal_dialog);

        // modal-content
        $modal_content = $('<div>', { class:'modal-content' });
        $modal_dialog.append($modal_content);

        // modal-header
        $modal_header = $('<div>', { class:'modal-header', id:modal_label });
        $modal_content.append($modal_header);

        // modal-title
        $modal_title = $('<h4>', { class:'modal-title' });
        $modal_title.text(title);
        $modal_header.append($modal_title);

        // close button
        $close = $('<button>', { type:'button', class:'close', 'data-dismiss':'modal', 'aria-label':'Close' });
        $e = $('<span>', { 'aria-hidden':'true'});
        $e.html('&times;');
        $close.append($e);
        $modal_header.append($close);

        // modal-body
        $modal_body = $('<div>', { class:'modal-body'});
        $modal_content.append($modal_body);

        // modal-body - annotation container
        this.$annotation_modal_container = $("<div>", { class:'hic-annotation-modal-container' });
        $modal_body.append(this.$annotation_modal_container);


        // modal-footer
        $modal_footer = $('<div>', { class:'modal-footer'});
        $modal_content.append($modal_footer);

        // modal footer - close
        $e = $('<button>', { type:'button', class:'btn btn-secondary', 'data-dismiss':'modal' });
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

