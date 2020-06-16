import hic from '../dist/js/juicebox.esm.js'
document.addEventListener("DOMContentLoaded", async () => await main(document.getElementById('app-container')));

const main = async container => {

    const config =
        {
            "url": "https://hicfiles.s3.amazonaws.com/hiseq/huvec/in-situ/HIC081.hic",
            "name": "HIC081",
            "state": "9,9,4,521.3059357955065,531.3082133216093,1.2699810287760684,NONE",
            "colorScale": "R:5:1.6094379124341003,106,207,255:1.6094379124341003,137,22,72",
            "nvi": "3489767688,35891",
            "controlUrl": "https://www.encodeproject.org/files/ENCFF706SFK/@@download/ENCFF706SFK.hic",
            "controlName": "HMEC dilution Hi-C",
            "displayMode": "BOA",
            "controlNvi": "3271831702,36479",
            "tracks": [
                {
                    "url": "https://www.googleapis.com/drive/v3/files/1rM76O3OHnM7WhRNDfTQOYVyx86D1hhmD?alt=media&supportsTeamDrives=true",
                    "name": "ENCFF001EQU.bigWig",
                    "min": 0,
                    "max": 21.330122029543993,
                    "color": "#ff2987"
                }
            ]
        };

    hic.Alert.init(container)
    await hic.createBrowser(container, config)

}
