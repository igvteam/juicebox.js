import $ from "../vendor/jquery-3.3.1.slim.js";
import {createCheckbox} from "./igv-icons.js"

/**
 * Configure item list for track "gear" menu.
 * @param trackRenderer
 */
const MenuUtils = {

    trackMenuItemList: function (trackRenderer) {


        let menuItems = [];

        menuItems.push(trackRenameMenuItem(trackRenderer));
        menuItems.push("<hr/>");
        menuItems.push(colorPickerMenuItem({trackRenderer, label: "Set color", option: "color"}));
        menuItems.push(colorPickerMenuItem({trackRenderer, label: "Set alt color", option: "altColor"}));
        menuItems.push(unsetColorMenuItem({trackRenderer, label: "Unset color"}));
        menuItems.push("<hr/>");

        if (trackRenderer.track.menuItemList) {
            menuItems = menuItems.concat(trackRenderer.track.menuItemList());
        }

        // const vizWindowTypes = new Set(['alignment', 'annotation', 'variant', 'eqtl', 'snp']);
        // const hasVizWindow = trackRenderer.track.config && trackRenderer.track.config.visibilityWindow !== undefined;
        // if (hasVizWindow || vizWindowTypes.has(trackRenderer.track.config.type)) {
        //     menuItems.push('<hr/>');
        //     menuItems.push(visibilityWindowMenuItem(trackRenderer));
        // }

        if (trackRenderer.track.removable !== false) {
            menuItems.push('<hr/>');
            menuItems.push(trackRemovalMenuItem(trackRenderer));
        }

        return menuItems;
    },

    numericDataMenuItems: function (trackView) {

        const menuItems = [];

        // Data range
        const $e = $('<div>');
        $e.text('Set data range');
        const clickHandler = function () {
            trackView.browser.dataRangeDialog.configure({trackView: trackView});
            trackView.browser.dataRangeDialog.present($(trackView.trackDiv));
        };
        menuItems.push({object: $e, click: clickHandler});

        if (trackView.track.logScale !== undefined) {
            menuItems.push({
                    object: createCheckbox("Log scale", trackView.track.logScale),
                    click: () => {
                        trackView.track.logScale = !trackView.track.logScale;
                        trackView.repaintViews();
                    }
                }
            )
        }

        menuItems.push({
                object: createCheckbox("Autoscale", trackView.track.autoscale),
                click: () => {
                    trackView.track.autoscale = !trackView.track.autoscale;
                    trackView.repaintViews();
                }
            }
        )


        return menuItems;
    }

}


function trackRemovalMenuItem(trackRenderer) {

    var $e, menuClickHandler;
    $e = $('<div>');
    $e.text('Remove track');

    menuClickHandler = function menuClickHandler() {
        var browser = trackRenderer.browser;
        browser.layoutController.removeTrackXYPair(trackRenderer);
    };

    return {object: $e, click: menuClickHandler};

}

function colorPickerMenuItem({trackRenderer, label, option}) {
    var $e,
        clickHandler;

    $e = $('<div>');
    $e.text(label);

    clickHandler = function () {
        trackRenderer.colorPicker.show();
    };

    return {object: $e, click: clickHandler};
}

function unsetColorMenuItem({trackRenderer, label}) {

    const $e = $('<div>');
    $e.text(label);

    return {
        object: $e,
        click: () => {
            trackRenderer.track.color = undefined;
            trackRenderer.repaintViews();
        }
    }
}

function trackRenameMenuItem(trackRenderer) {
    const click = e => {
        const callback = (value) => {
            value = value.trim();
            value = ('' === value || undefined === value) ? 'untitled' : value;
            trackRenderer.setTrackName(value);
        };
        trackRenderer.browser.inputDialog.present({label: 'Track Name', value: trackRenderer.track.name, callback}, e);
    };
    const object = $('<div>');
    object.text('Set track name');
    return {object, click};
}

// function visibilityWindowMenuItem(trackRenderer) {
//
//     const click = e => {
//
//         const callback = () => {
//
//             let value = trackRenderer.browser.inputDialog.input.value
//             value = '' === value || undefined === value ? -1 : value.trim()
//
//             trackRenderer.track.visibilityWindow = Number.parseInt(value);
//             trackRenderer.track.config.visibilityWindow = Number.parseInt(value);
//
//             trackRenderer.updateViews();
//         }
//
//         const config =
//             {
//                 label: 'Visibility Window',
//                 value: (trackRenderer.track.visibilityWindow),
//                 callback
//             }
//         trackRenderer.browser.inputDialog.present(config, e);
//
//     };
//
//     const object = $('<div>');
//     object.text('Set visibility window');
//     return {object, click};
//
// }



export default MenuUtils;
