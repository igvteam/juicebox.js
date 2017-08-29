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

function runStrawTests() {


    function createMockObjects() {


    }


    asyncTest("Version 7 file", function () {

        var url = "https://data.broadinstitute.org/igvdata/test/data/hic/inter.hic",
            normalization = "NONE",
            units = "BP",
            binSize = 250000,
            region1 = {
                chr: "1",
                start: 0,
                end: 1000000
            },
            straw;

        straw = new hic.Straw({url: url});

        straw.getContactRecords(normalization,region1, region1, units, binSize)
            .then( function(records) {
                ok(records.length > 0);
                start();
            })
            .catch(function (error) {
                console.error(error);
                start();
            })
    });

    //https://hicfiles.s3.amazonaws.com/hiseq/gm12878/in-situ/combined.hic



}
