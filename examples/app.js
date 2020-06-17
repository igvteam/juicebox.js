import hic from '../dist/js/juicebox.esm.js'
document.addEventListener("DOMContentLoaded", async () => await main(document.getElementById('app-container')));

const main = async container => {

    const config =
        {
            "backgroundColor": "137,17,0",
            "url": "https://hicfiles.s3.amazonaws.com/hiseq/nhek/dilution/HIC068.hic",
            "name": "HIC068",
            "state": "2,2,3,272.4469827809971,405.6313616363572,1.1037330448463756,NONE",
            "colorScale": "R:5:1.6094379124341003,137,49,255:1.6094379124341003,255,206,110",
            "selectedGene": "egfr",
            "nvi": "2713318801,36479",
            "controlUrl": "https://www.encodeproject.org/files/ENCFF929RPW/@@download/ENCFF929RPW.hic",
            "controlName": "K562 in situ Hi-C experiment",
            "displayMode": "AOB",
            "controlNvi": "1974260276,36479",
            "tracks": [
                {
                    "url": "https://www.encodeproject.org/files/ENCFF768ZWJ/@@download/ENCFF768ZWJ.bigBed",
                    "name": "A549 POLR2AphosphoS2 ",
                    "min": null,
                    "max": null,
                    "color": "rgb(22, 129, 198)"
                },
                {
                    "url": "https://www.encodeproject.org/files/ENCFF221LAR/@@download/ENCFF221LAR.bigBed",
                    "name": "A549 treated with 5 nM dexamethasone for 1 hour NR3C1 ",
                    "min": null,
                    "max": null,
                    "color": "rgb(22, 129, 198)"
                },
                {
                    "url": "https://www.encodeproject.org/files/ENCFF637ZLS/@@download/ENCFF637ZLS.bigWig",
                    "name": "trophoblast cell originated from H1 H3K18ac ",
                    "min": 0,
                    "max": 4.138028390066964,
                    "color": "rgb(150,150,150)"
                },
                {
                    "url": "https://www.encodeproject.org/files/ENCFF970DOB/@@download/ENCFF970DOB.bigWig",
                    "name": "WI38 CTCF ",
                    "min": 0,
                    "max": 2.031183075486568,
                    "color": "rgb(150,150,150)"
                }
            ]
        };

    hic.igv.Alert.init(container)
    hic.Alert.init(container)

    await hic.createBrowser(container, config)

}
