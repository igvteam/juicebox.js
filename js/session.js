import {getAllBrowsers} from "./createBrowser.js"
import {Globals} from "./globals.js"
import {createBrowser, deleteAllBrowsers, syncBrowsers} from "./createBrowser.js"

function toJSON() {
    const jsonOBJ = {};
    const browserJson = [];
    const allBrowsers = getAllBrowsers();
    for (let browser of allBrowsers) {
        browserJson.push(browser.toJSON());
    }
    jsonOBJ.browsers = browserJson;

     if (Globals.selectedGene) {
         jsonOBJ["selectedGene"] = Globals.selectedGene;
     }

    const captionDiv = document.getElementById('hic-caption');
    if (captionDiv) {
        var captionText = captionDiv.textContent;
        if (captionText) {
            captionText = captionText.trim();
            if (captionText) {
                jsonOBJ.caption = captionText;
            }
        }
    }

    return jsonOBJ;
}

async function restoreSession(container, session) {

    deleteAllBrowsers();

    if (session.hasOwnProperty("selectedGene")) {
        Globals.selectedGene = session.selectedGene;
    }
    if (session.hasOwnProperty("caption")) {
        const captionText = session.caption;
        var captionDiv = document.getElementById("hic-caption");
        if (captionDiv) {
            captionDiv.textContent = captionText;
        }
    }


    // Browser config.  Session json could be multi-browser, or a single browser
    const configList =  session.browsers || [session];

    const promises = [];
    for (let config of configList) {
        promises.push(createBrowser(container, config));
    }
    await Promise.all(promises);
    syncBrowsers();

}


export {toJSON, restoreSession}