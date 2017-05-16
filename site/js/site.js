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
 * Created by Jim Robinson on 3/4/17.
 */
var site = (function (site) {

    site.init = function () {

        $('#dataset_selector').on('change', function(e) {
            var str = $(this).val();

            $('#hic-contact-map-select-modal').modal('hide');

            hic.browser.loadHicFile({ url: str });
        });

        $('#hic-load-local-file').on('change',function (e) {

            var file,
                suffix;

            file = _.first($(this).get(0).files);

            suffix = file.name.substr(file.name.lastIndexOf('.') + 1);
            console.log('#hic-load-url ' + suffix);

            if ('hic' === suffix) {
                hic.browser.loadHicFile({ url: file });
            } else {
                hic.browser.loadTrackXY( [ { url: file } ] );
            }


            $(this).val("");
            $('#hic-load-local-file-modal').modal('hide');
        });

        $('#hic-load-url').on('change', function (e) {
            var path,
                suffix;

            path = $(this).val();

            suffix = path.substr(path.lastIndexOf('.') + 1);
            console.log('#hic-load-url ' + suffix);
            if ('hic' === suffix) {
                hic.browser.loadHicFile({ url: path });
            } else {

                hic.browser.loadTrackXY( [ { url: path, name: 'untitled' } ] );
            }

            $(this).val("");
            $('#hic-load-url-modal').modal('hide');

        });

        if (hic.browser.sequence) {

            hic.browser.sequence
                .init()
                .then(function () {
                    igv.browser.genome = new igv.Genome(hic.browser.sequence, undefined, undefined);
                });

        }

    };

    return site;

}) (site || {});

