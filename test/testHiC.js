function runHiCTests() {


    function createMockObjects() {


    }

    asyncTest("Version 8 file", function () {

        var url = "https://s3.amazonaws.com/igv.broadinstitute.org/data/hic/intra_nofrag_30.hic",
            hicReader;

        createMockObjects();

        hicReader = new hic.HiCReader({url: url});
        ok(hicReader);


        hicReader.loadDataset()
            .then(function (dataset) {
                equal("HIC", hicReader.magic);
                equal(hicReader.version, 8);
                ok(hicReader.masterIndex);

                equal(9, dataset.bpResolutions.length);
                equal(2500000, dataset.bpResolutions[0]);
                equal(5000, dataset.bpResolutions[8]);

                readMatrix(hicReader, 1, 1)
                    .then(function (matrix) {
                        equal(1, matrix.chr1);
                        equal(1, matrix.chr2);
                        equal(9, matrix.bpZoomData.length);

                        var zd = matrix.getZoomData({unit: "BP", binSize: 10000});
                        ok(zd);
                        equal(zd.zoom.binSize, 10000);

                        dataset.getNormalizedBlock(zd, 100, "KR")
                            .then(function (block) {
                                equal(100, block.blockNumber);
                                equal(59500, block.records.length);

                                dataset.getNormalizationVector("KR", 1, "BP", 50000)
                                    .then(function (normalizationVector) {
                                        ok(normalizationVector);
                                        equal(4990, normalizationVector.data.length);
                                        start();
                                    })

                                    .catch(function (error) {
                                        console.log(error);
                                        ok(false);
                                        start();
                                    });


                            })
                            .catch(function (error) {
                                console.log(error);
                                ok(false);
                                start();
                            });
                    });
            })
            .catch(function (error) {
                console.log(error);
                ok(false);
                start();
            });

    })


    asyncTest("Version 7 file", function () {

        var url = "https://hicfiles.s3.amazonaws.com/hiseq/gm12878/in-situ/combined.hic",
            hicReader;

        createMockObjects();

        hicReader = new hic.HiCReader({url: url});
        ok(hicReader);

        hicReader.loadDataset()
            .then(function (dataset) {

                equal(hicReader.magic, "HIC");

                equal(dataset.bpResolutions.length, 10);
                equal(2500000, dataset.bpResolutions[0]);
                equal(5000, dataset.bpResolutions[8]);

                readMatrix(hicReader, 1, 1)
                    .then(function (matrix) {
                        equal(1, matrix.chr1);
                        equal(1, matrix.chr2);
                        equal(matrix.bpZoomData.length, 10);

                        var zd = matrix.getZoomData({unit: "BP", binSize: 10000});
                        ok(zd);
                        equal(zd.zoom.binSize, 10000);

                        dataset.getBlock(zd, 100).then(function (block) {
                            equal(100, block.blockNumber);
                            equal(block.records.length, 358397);
                            start();
                        });
                    });
            })
            .catch(function (error) {
                console.log(error);
                ok(false);
                start();
            });
    });

    //https://hicfiles.s3.amazonaws.com/hiseq/gm12878/in-situ/combined.hic


    function readMatrix(hicReader, chr1, chr2) {

        var key = "" + chr1 + "_" + chr2;
        return hicReader.readMatrix(key);
    }


}
