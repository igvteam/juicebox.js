import hic from '../dist/js/juicebox.esm.js'
document.addEventListener("DOMContentLoaded", async () => await main(document.getElementById('app-container')));

const main = async container => {

    const config =
        {
            "url": "https://hicfiles.s3.amazonaws.com/hiseq/nhek/dilution/HIC068.hic",
            "name": "HIC068",
            "state": "2,2,3,272.4469827809971,405.6313616363572,1.1037330448463756,NONE",
            "selectedGene": "egfr",
            "nvi": "2713318801,36479",
            // "controlUrl": "https://www.encodeproject.org/files/ENCFF929RPW/@@download/ENCFF929RPW.hic",
            // "controlName": "K562 in situ Hi-C experiment",
            // "displayMode": "AOB",
            // "controlNvi": "1974260276,36479"
        };

    await hic.createBrowser(container, config)

}