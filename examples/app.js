import hic from '../dist/js/juicebox.esm.js'
document.addEventListener("DOMContentLoaded", async (event) => {
    await main(document.getElementById('app-container'));
});

const main = async container => {

    const config =
        {
            "url": "https://hicfiles.s3.amazonaws.com/hiseq/nhek/dilution/HIC068.hic",
            "name": "HIC068",
            "state": "2,2,3,272.4469827809971,405.6313616363572,1.1037330448463756,NONE",
            // "colorScale": "R:5:1.6094379124341003,137,49,255:1.6094379124341003,255,206,110",
            "selectedGene": "egfr",
            "nvi": "2713318801,36479",
            "controlUrl": "https://www.encodeproject.org/files/ENCFF929RPW/@@download/ENCFF929RPW.hic",
            "controlName": "K562 in situ Hi-C experiment",
            "displayMode": "AOB",
            "controlNvi": "1974260276,36479",
            // "tracks": [
            //     {
            //         "url": "https://www.encodeproject.org/files/ENCFF652IWX/@@download/ENCFF652IWX.bigWig",
            //         "name": " RNA-seq 2:2_1 minus strand signal of all reads ENCSR580GSX",
            //         "min": 0,
            //         "max": 17.8509269753886,
            //         "color": "#ff2987"
            //     },
            //     {
            //         "url": "https://www.encodeproject.org/files/ENCFF053YNV/@@download/ENCFF053YNV.bigBed",
            //         "name": " CEBPB  1,2:1_1,2_1 conservative IDR thresholded peaks ENCSR000DYI",
            //         "min": null,
            //         "max": null,
            //         "color": "#68f96e"
            //     }
            // ]
        };

    await hic.createBrowser(container, config)

}
