import hic from '../dist/juicebox.esm.js'

document.addEventListener("DOMContentLoaded", async (event) => {
    await main(document.getElementById('app-container'));
});

const main = async container => {

    const config =
        {
            "url": "https://hicfiles.s3.amazonaws.com/hiseq/imr90/in-situ/HIC052.hic",
            "name": "HIC052",
            "state": "3,3,2,0,0,1.454380698186564,NONE",
            "colorScale": "28,0,140,255",
            "selectedGene": "myc",
            "nvi": "929756278,36479",
            "tracks": [
                {
                    "url": "https://www.encodeproject.org/files/ENCFF652IWX/@@download/ENCFF652IWX.bigWig",
                    "name": " RNA-seq 2:2_1 minus strand signal of all reads ENCSR580GSX",
                    "min": 0,
                    "max": 17.8509269753886,
                    "color": "#ff2987"
                },
                {
                    "url": "https://www.encodeproject.org/files/ENCFF053YNV/@@download/ENCFF053YNV.bigBed",
                    "name": " CEBPB  1,2:1_1,2_1 conservative IDR thresholded peaks ENCSR000DYI",
                    "min": null,
                    "max": null,
                    "color": "#68f96e"
                }
            ]
        }

    await hic.createBrowser(container, config)

}
