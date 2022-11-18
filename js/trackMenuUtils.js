import $ from "../vendor/jquery-3.3.1.slim.js";
import {createCheckbox} from "./igv-icons.js"

/**
 * Configure item list for track "gear" menu.
 * @param trackRenderer
 */
const MenuUtils = {

    trackMenuItemList: trackPair => {

        const menuItems = []

        menuItems.push(trackRenameMenuItem(trackPair))
        menuItems.push("<hr/>")

        menuItems.push(colorPickerMenuItem({ trackPair, label: "Set color", option: "color" }))
        menuItems.push(unsetColorMenuItem({ trackPair, label: "Unset color" }))

        if (trackPair.track.removable !== false) {
            menuItems.push('<hr/>');
            menuItems.push(trackRemovalMenuItem(trackPair))
        }

        return menuItems
    },

    numericDataMenuItems: trackPair => {

        const menuItems = []

        // Data range
        const object = $('<div>')
        object.text('Set data range')

        const click = () => {
            const { min, max } = trackPair.track.dataRange;
            trackPair.dataRangeDialog.show({ min: min || 0, max })
        }

        menuItems.push({ object, click })

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
    },

    nucleotideColorChartMenuItems: trackPair => {

        const menuItems = []
        menuItems.push('<hr/>')

        const html =
            `<div class="jb-igv-menu-popup-chart">
                <div>A</div>
                <div>C</div>
                <div>T</div>
                <div>G</div>
            </div>`

        const click = e => {
            e.preventDefault()
            e.stopPropagation()
        }

        menuItems.push({ object: $(html), click })

        return menuItems

    }

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
            '' === value || undefined === value ? trackPair.setTrackName('') : trackPair.setTrackName(value.trim())
        }

        trackPair.browser.inputDialog.present({label: 'Track Name', value: trackPair.track.name || '', callback }, e)
    }

    return { object, click }
}

export default MenuUtils
