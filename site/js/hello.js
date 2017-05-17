/**
 * Created by dat on 5/17/17.
 */
var hello = (function (hello) {

    hello.init = function () {

        $('#load-track').on('click', function(e){

            var config,
                configurations = [];

//            config =
//                {
//                    type: 'bed',
//                    url: 'https://www.encodeproject.org/files/ENCFF100GSO/@@download/ENCFF100GSO.bed.gz',
//                    format: 'bed',
//                    name: 'GM12878 CTCF',
//                    color: 'rgb(122,0,200)'
//                };
//            configurations.push(config);

            config =
                {
                    name: 'wgEncodeBroadHistone',
                    url: 'http://hgdownload.cse.ucsc.edu/goldenPath/hg19/encodeDCC/wgEncodeBroadHistone/wgEncodeBroadHistoneGm12878H3k4me3StdSig.bigWig'
                };
            configurations.push(config);

//            config =
//                {
//                    url: '../test/data/snp/gwas_test.snp',
//                    name: 'gwas test',
//                    format: 'gtexGWAS',
//                    featureType: 'gwas',
//                    colorScale: {
//                        thresholds: [],
//                        colors:['rgb(122,179,23)']
//                    },
//
//                    label: 'Test',
//                    maxLogP: 16
//                };
//            configurations.push(config);

//            config =
//                {
//                    url:  '../test/data/wig/pos_neg_10_000_000_to_110_005_000.wig',
//                    name: 'Random - 10,000,000 to 110,005,000',
//                    format: 'wig'
//                };
//            configurations.push(config);

//            config =
//                {
//                    name: "Genes",
//                    searchable: false,
//                    type: "annotation",
//                    format: "gtf",
//                    sourceType: "file",
//                    url: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.annotation.sorted.gtf.gz",
//                    indexURL: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.annotation.sorted.gtf.gz.tbi",
//                    visibilityWindow: 10000000,
//                    order: Number.MAX_VALUE,
//                    displayMode: "COLLAPSED",
//                    color: 'rgb(255,0,0)'
//                };
//            configurations.push(config);

            hic.browser.loadTrackXY(configurations);
        });

        $('#remove-track').on('click', function(e){
            hic.browser.layoutController.removeLastTrackXYPair();
        });

        $('#dataset_selector').on('change', function(e){
            hic.browser.loadHicFile({ url: $(this).val() });
        });

        if (hic.browser.sequence) {

            hic.browser.sequence
                .init()
                .then(function () {
                    igv.browser.genome = new igv.Genome(hic.browser.sequence, undefined, undefined);
                });

        }

    };

    return hello;

}) (hello || {});
