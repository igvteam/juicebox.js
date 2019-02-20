/**
 * Created by dat on 5/7/17.
 */

var hic = (function (hic) {

    hic.TrackMenuReplacement = function (browser) {
        this.browser = browser;
    };

    hic.TrackMenuReplacement.prototype.popoverPresentTrackGearMenuReplacement = function (pageX, pageY, trackView) {

        var $container,
            items;

        items = igv.trackMenuItemList(this, trackView);
        if (_.size(items) > 0) {

            this.$popoverContent.empty();
            this.$popoverContent.removeClass("igv-popover-track-popup-content");

            $container = $('<div class="igv-track-menu-container">');
            this.$popoverContent.append($container);

            _.each(items, function(item) {

                if (item.init) {
                    item.init();
                }

                $container.append(item.object);

            });

            this.$popover.css({ left: pageX + 'px', top: pageY + 'px' });
            this.$popover.show();
        }
    };

    hic.TrackMenuReplacement.prototype.trackMenuItemList_Replacement = function (trackRenderer) {

        var menuItems = [];

        menuItems.push(hic.trackRenameMenuItem(trackRenderer));

        if (trackRenderer.track.menuItemList) {
            menuItems = menuItems.concat(trackRenderer.track.menuItemList());
        }

        menuItems.push('<hr/>');
        menuItems.push(hic.trackRemovalMenuItem(trackRenderer));

        return menuItems;
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

    hic.TrackMenuReplacement.prototype.trackMenuItem_Replacement = function (trackRenderer, menuItemLabel, dialogLabelHandler, dialogInputValue, dialogClickHandler) {

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


    return hic;
})(hic || {});

