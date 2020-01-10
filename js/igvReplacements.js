/**
 * Created by dat on 5/7/17.
 */
import $ from "../vendor/jquery-3.3.1.slim.js"

const igvReplacements = function (igv) {

    igv.MenuUtils.trackMenuItemList = function (trackRenderer) {

        var menuItems = [];

        menuItems.push(colorPickerMenuItem(trackRenderer));
        menuItems.push(trackRenameMenuItem(trackRenderer));
        if("annotation" !== trackRenderer.track.type) {
            if (trackRenderer.track.menuItemList) {
                menuItems = menuItems.concat(trackRenderer.track.menuItemList());
            }
        }
        menuItems.push('<hr/>');
        menuItems.push(trackRemovalMenuItem(trackRenderer));
        return menuItems;
    };
};

function colorPickerMenuItem(trackRender) {
    var $e,
        clickHandler;

    $e = $('<div>');
    $e.text('Set track color');

    clickHandler = function () {
        trackRender.colorPicker.$container.show();
    };

    return {object: $e, click: clickHandler};

};

function trackRenameMenuItem(trackRenderer) {

    var $e, menuClickHandler;

    $e = $('<div>');
    $e.text('Set track name');

    menuClickHandler = function menuClickHandler() {

        var dialogClickHandler;

        dialogClickHandler = function dialogClickHandler() {
            var value = trackRenderer.browser.inputDialog.$input.val().trim();
            value = ('' === value || undefined === value) ? 'untitled' : value;
            trackRenderer.setTrackName(value);
        };

        trackRenderer.browser.inputDialog.configure({
            label: 'Track Name',
            input: trackRenderer.track.name,
            click: dialogClickHandler
        });
        trackRenderer.browser.inputDialog.present($(trackRenderer.trackDiv));
    };

    return {object: $e, click: menuClickHandler};
};

function trackRemovalMenuItem(trackRenderer) {

    var $e, menuClickHandler;

    $e = $('<div>');
    $e.text('Remove track');

    menuClickHandler = function menuClickHandler() {
        var browser = trackRenderer.browser;
        browser.layoutController.removeTrackRendererPair(trackRenderer.trackRenderPair);
    };

    return {object: $e, click: menuClickHandler};
};


export default igvReplacements
