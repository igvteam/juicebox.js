import hic from '../dist/js/juicebox.esm.js'
document.addEventListener("DOMContentLoaded", async () => await main(document.getElementById('app-container')));

const main = async container => {

    const config =
        {
            "backgroundColor": "255,206,110",
            "url": "https://s3.amazonaws.com/hicfiles/hiseq/degron/time_course/untreated/Rao-2017-HIC060.hic",
            "name": "Time Course, Untreated, HIC060",
            "state": "2,2,3,56.34306461670519,43.54741859321953,1.0792832622073734,NONE",
            "colorScale": "R:5:1.6094379124341003,5,248,2:1.6094379124341003,0,74,136",
            "nvi": "326681741,36479",
            "controlUrl": "https://s3.amazonaws.com/hicfiles/hiseq/degron/time_course/Auxin_treated_360min/Rao-2017-HIC062.hic",
            "controlName": "Auxin treated (360 min), HIC062",
            "displayMode": "AOB",
            "controlNvi": "320261375,36479"
        };

    hic.igv.Alert.init(container)
    hic.Alert.init(container)

    await hic.createBrowser(container, config)

}
