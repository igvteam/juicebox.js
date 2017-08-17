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

        $('#dataset_selector').on('change', function (e) {
            var $selected,
                url,
                name;

            $('#hic-contact-map-select-modal').modal('hide');

            url = $(this).val();

            $selected = $(this).find('option:selected');

            hic.Browser.getCurrentBrowser().loadHicFile({ url: url, name: $selected.text() });
        });

        $('#hic-load-local-file').on('change', function (e) {

            var file,
                suffix;

            file = _.first($(this).get(0).files);

            suffix = file.name.substr(file.name.lastIndexOf('.') + 1);

            if ('hic' === suffix) {
                hic.Browser.getCurrentBrowser().loadHicFile({ url: file, name: file.name });
            } else {
                hic.Browser.getCurrentBrowser().loadTrack([{ url: file, name: file.name }]);
            }


            $(this).val("");
            $('#hic-load-local-file-modal').modal('hide');
        });

        $('#hic-load-url').on('change', function (e) {
            var url,
                suffix,
                paramIdx,
                path;

            url = $(this).val();

            paramIdx = url.indexOf("?");
            path = paramIdx > 0 ? url.substring(0, paramIdx) : url;

            suffix = path.substr(path.lastIndexOf('.') + 1);

            if ('hic' === suffix) {
                hic.Browser.getCurrentBrowser().loadHicFile({ url: url, name: hic.extractFilename(path) });
            } else {
                hic.Browser.getCurrentBrowser().loadTrack([{url: url, name: hic.extractFilename(path)}]);
            }

            $(this).val("");
            $('#hic-load-url-modal').modal('hide');

        });

        $('.selectpicker').selectpicker();

        $('#annotation-selector').on('change', function (e) {
            var path,
                name;

            $('#hic-annotation-select-modal').modal('hide');

            path = $(this).val();
            name = $(this).find('option:selected').text();

            // deselect all
            $(this).find('option').removeAttr("selected");

            hic.Browser.getCurrentBrowser().loadTrack([{url: path, name: name}]);
        });

        $('.juicebox-app-clone-button').find('i.fa-plus-circle').on('click', function (e) {
            var dev_null,
                dimension = hic.Browser.defaultDimension;

            dev_null = hic.createBrowser($('.juicebox-app-clone-container'), {
                width: dimension,
                height: dimension,
                updateHref: false
            });

            hic.syncBrowsers(hic.allBrowsers);

        });

    };

    return site;

})(site || {});

