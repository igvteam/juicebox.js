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

    hic.createEncodeTable = function (browser, $container, genomeId) {

        var columnWidths,
            encodeTableFormat,
            encodeDataSource;

        if (undefined === hic.Browser.getCurrentBrowser()) {
            igv.presentAlert('ERROR: you must select a map panel.');
            return;
        }

        if (hic.encodeTable && genomeId === hic.encodeTable.genomeID()) {
            // do nothing
            console.log('nuthin');
        } else {

            if (hic.encodeTable) {
                hic.Browser.discardEncodeTable();
            }

            columnWidths =
                {
                    'Assembly': '10%',
                    'Cell Type': '10%',
                    'Target': '10%',
                    'Assay Type': '20%',
                    'Output Type': '20%',
                    'Lab': '20%'
                };

            encodeTableFormat = new encode.EncodeTableFormat({ columnWidths: columnWidths });

            encodeDataSource = new encode.EncodeDataSource({ genomeID: genomeId }, encodeTableFormat);

            hic.encodeTable = new igv.IGVModalTable($container, browser, 'loadTrack', encodeDataSource);
        }

    };

    hic.discardEncodeTable = function () {
        hic.encodeTable.unbindAllMouseHandlers();
        $('#encodeModalBody').empty();
        hic.encodeTable = undefined;
    };

    hic.loadAnnotationSelector = function ($container, genomeId) {

        var elements;

        if (undefined === hic.Browser.getCurrentBrowser()) {
            igv.presentAlert('ERROR: you must select a map panel.');
            return;
        }

        $container.empty();

        elements = [];
        elements.push('<option value=' + '-' + '>' + '-' + '</option>');

        if ('hg19' === genomeId) {

            igvxhr
                .loadString("https://hicfiles.s3.amazonaws.com/internal/tracksMenu_hg19.txt")
                .then(function (data) {
                    var lines = data ? data.splitLines() : [];
                    lines.forEach(function (line) {
                        var tokens = line.split('\t');
                        if (tokens.length > 1 && hic.igvSupports(tokens[1])) {
                            elements.push('<option value=' + tokens[1] + '>' + tokens[0] + '</option>');
                        }
                    });
                    $container.append(elements.join(''));

                })
                .catch(function (error) {
                    console.log("Error loading track menu: " + error);
                    elements.push('<option value=' + '-' + '>' + '-' + '</option>');
                    elements.push('<option value=' + 'https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.collapsed.bed.gz' + '>' + 'Genes' + '</option>');
                    $container.append(elements.join(''));
                })

        } else if ('hg38' === genomeId) {
            elements.push('<option value=' + 'https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg38/genes/refGene_hg38_collapsed.refgene.gz' + '>' + 'Genes' + '</option>');
            $container.append(elements.join(''));
        }

    };

    return hic;

})(hic || {});
