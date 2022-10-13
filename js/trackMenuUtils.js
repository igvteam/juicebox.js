import $ from "../vendor/jquery-3.3.1.slim.js";
import {createCheckbox} from "./igv-icons.js"

/**
 * Configure item list for track "gear" menu.
 * @param trackRenderer
 */
const MenuUtils = {

    trackMenuItemList: function (trackPair) {

        const menuItems = []

        menuItems.push(trackReorderMenuItem(trackPair))
        menuItems.push("<hr/>")

        menuItems.push(trackRenameMenuItem(trackPair))
        menuItems.push("<hr/>")

        menuItems.push(colorPickerMenuItem({ trackPair, label: "Set color", option: "color" }))
        menuItems.push(unsetColorMenuItem({ trackPair, label: "Unset color" }))

        const trackMenuItems = trackPair.track.menuItemList();
        if(trackMenuItems && trackMenuItems.length > 0) {
            menuItems.push('<hr/>');
            menuItems.push.apply(menuItems, trackMenuItems);
        }

        if (trackPair.track.removable !== false) {
            menuItems.push('<hr/>');
            menuItems.push(trackRemovalMenuItem(trackPair))
        }

        return menuItems
    },

    numericDataMenuItems: function (trackPair) {

        const menuItems = [];

        // Data range
        const $e = $('<div>');

        $e.text('Set data range');
        const clickHandler = function () {
            const currentDataRange = trackPair.track.dataRange;
            trackPair.dataRangeDialog.show({
                min: currentDataRange.min || 0,
                max: currentDataRange.max,
            })
        }

        menuItems.push({object: $e, click: clickHandler});

        if (trackPair.track.logScale !== undefined) {
            menuItems.push({
                    object: createCheckbox("Log scale", trackPair.track.logScale),
                    click: () => {
                        trackPair.track.logScale = !trackPair.track.logScale;
                        trackPair.repaintViews();
                    }
                }
            )
        }

        menuItems.push({
                object: createCheckbox("Autoscale", trackPair.track.autoscale),
                click: () => {
                    trackPair.track.autoscale = !trackPair.track.autoscale;
                    trackPair.repaintViews();
                }
            }
        )

        return menuItems;
    }

}

function trackReorderMenuItem(trackPair) {

    const object = $('<div>')
    object.text('Reorder track')

    const click = () => console.log('reorder track')

    return { object, click }


}

function trackRemovalMenuItem(trackPair) {

    const object = $('<div>')
    object.text('Remove track')

    const click = () => trackPair.browser.layoutController.removeTrackXYPair(trackPair)

    return { object, click }

}

function colorPickerMenuItem({ trackPair, label, option }) {

    const object = $('<div>')
    object.text(label)

    const click = () => trackPair.colorPicker.show()

    return { object, click }
}

function unsetColorMenuItem({trackPair, label}) {

    const object = $('<div>')
    object.text(label)

    const click = () => {
        trackPair.track.color = undefined
        trackPair.repaintViews()
    }

    return { object, click }
}

function trackRenameMenuItem(trackPair) {

    const object = $('<div>')
    object.text('Set track name')

    const click = e => {

        const callback = value => {
            value = value.trim()
            value = ('' === value || undefined === value) ? 'untitled' : value
            trackPair.setTrackName(value)
        }

        trackPair.browser.inputDialog.present({label: 'Track Name', value: trackPair.track.name, callback }, e)
    }

    return { object, click }
}

export default MenuUtils
