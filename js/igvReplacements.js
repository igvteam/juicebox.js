/**
 * Created by dat on 5/7/17.
 */

var hic = (function (hic) {

    hic.IGVReplacements = function (igv) {

        igv.trackMenuItem = function (trackRenderer, menuItemLabel, dialogLabelHandler, dialogInputValue, dialogClickHandler) {

            var $e,
                clickHandler;

            $e = $('<div>');
            $e.text(menuItemLabel);

            clickHandler = function () {
                igv.inputDialog.configure(dialogLabelHandler, dialogInputValue, dialogClickHandler, undefined, undefined);
                igv.inputDialog.show(trackRenderer.$viewport);
            };

            return { object: $e, click: clickHandler };

        };

        igv.trackMenuItemList = function (trackRenderer) {

            var menuItems = [];

            menuItems.push(hic.colorPickerMenuItem(trackRenderer));

            menuItems.push(hic.trackRenameMenuItem(trackRenderer));

            if (trackRenderer.track.menuItemList) {
                menuItems = menuItems.concat(trackRenderer.track.menuItemList());
            }

            menuItems.push('<hr/>');
            menuItems.push(hic.trackRemovalMenuItem(trackRenderer));

            return menuItems;
        };

    };

    hic.colorPickerMenuItem = function (trackRender) {
        var $e,
            clickHandler;

        $e = $('<div>');
        $e.text('Set track color');

        clickHandler = function () {
            trackRender.colorPicker.$container.show();
        };

        return { object: $e, click: clickHandler };

    };

    hic.trackRenameMenuItem = function (trackRenderer) {

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

        return { object: $e, click: menuClickHandler };
    };

    hic.trackRemovalMenuItem = function (trackRenderer) {

        var $e, menuClickHandler;

        $e = $('<div>');
        $e.text('Remove track');

        menuClickHandler = function menuClickHandler() {
            var browser = trackRenderer.browser;
            browser.layoutController.removeTrackRendererPair(trackRenderer.trackRenderPair);
        };

        return { object: $e, click: menuClickHandler };
    };

    return hic;
})(hic || {});

