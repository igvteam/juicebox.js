/**
 * Created by dat on 5/7/17.
 */

import igv from '../node_modules/igv/dist/igv.esm.js'
import $ from "../vendor/jquery-3.3.1.slim.js";

igv.MenuUtils.trackMenuItemList = function (trackRenderer) {

    let menuItems = [];

    menuItems.push(trackRenameMenuItem(trackRenderer));
    menuItems.push(colorPickerMenuItem(trackRenderer));
    menuItems.push(unsetColorMenuItem({trackView: trackRenderer, label: "Unset track color"}));

    if ("annotation" !== trackRenderer.track.type) {
        if (trackRenderer.track.menuItemList) {
            menuItems = menuItems.concat(trackRenderer.track.menuItemList());
        }
    }
    menuItems.push('<hr/>');
    menuItems.push(trackRemovalMenuItem(trackRenderer));
    return menuItems;
}

function colorPickerMenuItem(trackRender) {
    var $e,
        clickHandler;

    $e = $('<div>');
    $e.text('Set track color');

    clickHandler = function () {
        trackRender.colorPicker.show();
    };

    return {object: $e, click: clickHandler};

}

function unsetColorMenuItem({trackView, label}) {

    const $e = $('<div>');
    $e.text(label);

    return {
        object: $e,
        click: () => {
            trackView.track.color = undefined;
            trackView.repaintViews();
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

function trackRemovalMenuItem(trackRenderer) {

    var $e, menuClickHandler;

    $e = $('<div>');
    $e.text('Remove track');

    menuClickHandler = function menuClickHandler() {
        var browser = trackRenderer.browser;
        browser.layoutController.removeTrackRendererPair(trackRenderer.trackRenderPair);
    };

    return {object: $e, click: menuClickHandler};
}




