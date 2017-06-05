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

    site.init = function (browser) {

        $('#dataset_selector').on('change', function (e) {
            var $selected,
                url,
                name;

            $('#hic-contact-map-select-modal').modal('hide');

            url = $(this).val();

            $selected = $(this).find('option:selected');
            $('#hic-current-contact-map').text($selected.text());

            browser.loadHicFile({url: url, name: $selected.text()});
        });

        $('#hic-load-local-file').on('change', function (e) {

            var file,
                suffix;

            file = _.first($(this).get(0).files);

            suffix = file.name.substr(file.name.lastIndexOf('.') + 1);

            if ('hic' === suffix) {
                $('#hic-current-contact-map').text(file.name);
                browser.loadHicFile({url: file});
            } else {
                browser.loadTrackXY([{url: file}]);
            }


            $(this).val("");
            $('#hic-load-local-file-modal').modal('hide');
        });

        $('#hic-load-url').on('change', function (e) {
            var path,
                suffix;

            path = $(this).val();

            suffix = path.substr(path.lastIndexOf('.') + 1);

            if ('hic' === suffix) {
                $('#hic-current-contact-map').text(path);
                browser.loadHicFile({url: path});
            } else {

                browser.loadTrackXY([{url: path, name: 'untitled'}]);
            }

            $(this).val("");
            $('#hic-load-url-modal').modal('hide');

        });

        $('.selectpicker').selectpicker();

        if (browser.config.name) {
            $('#hic-current-contact-map').text(browser.config.name);
        } else if (browser.config.url) {
            $('#hic-current-contact-map').text(browser.config.url);
        }


        $('#annotation-selector').on('change', function (e) {
            var path,
                name;

            $('#hic-annotation-select-modal').modal('hide');

            path = $(this).val();
            name = $(this).find('option:selected').text();

            // deselect all
            $(this).find('option').removeAttr("selected");

            browser.loadTrackXY([{url: path, name: name}]);
        });


        hic.GlobalEventBus.subscribe("MapLoad", {

            receiveEvent: function (event) {

                var $select,
                    elements,
                    $e;

                $select = $("#annotation-selector");

                if ($select) {

                    var genomeId = browser.dataset.genomeId;

                    $select.empty();

                    elements = [];
                    elements.push('<option value=' + '-' + '>' + '-' + '</option>');

                    if ('hg19' === genomeId) {
                        elements.push('<option value=' + 'https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.collapsed.bed.gz' + '>' + 'Genes' + '</option>');
                        $select.append(elements.join(''));

                    } else if ('hg38' === genomeId) {
                        elements.push('<option value=' + 'https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg38/genes/refGene_hg38_collapsed.refgene.gz' + '>' + 'Genes' + '</option>');
                        $select.append(elements.join(''));
                    }
                }


                $e = $('#encodeModalBody');

                // If the encode button exists,  and the encode table is undefined OR is for another assembly load or reload it
                if (1 === _.size($e) && (browser.encodeTable === undefined || (browser.dataset.genomeId != browser.encodeTable.genomeID))) {

                    if (browser.encodeTable) {

                        browser.encodeTable.unbindAllMouseHandlers();

                        $e.empty();
                        browser.encodeTable = undefined;
                    }

                    browser.encodeTable = new encode.EncodeTable($e, browser, browser.dataset.genomeId, browser.loadTrackXY);
                }

            }

        });

    };


    return site;

})(site || {});

