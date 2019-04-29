/**
 * Created by dat on 5/3/17.
 */
import $ from "../vendor/jquery-1.12.4.js"

const TrackLabel = function ($track) {

    var $container;

    this.$track = $track;

    $('.clickedit')
        .hide()
        .focusout(endEdit)
        .keyup(function (e) {
            if ((e.which && 13 === e.which) || (e.keyCode && 13 === e.keyCode)) {
                endEdit(e);
                return false;
            } else {
                return true;
            }
        })
        .prev()
        .click(function () {
            $(this).hide();
            $(this)
                .next()
                .show()
                .focus();
        });

    function endEdit(e) {
        var input,
            label,
            str;

        input = $(e.target);
        str = ('' === input.val()) ? hic.TrackLabel.defaultText() : input.val();

        label = input && input.prev();
        label.text(str);

        input.hide();
        label.show();
    }

};

TrackLabel.defaultText = function () {
    return 'Untitled';
};

export default TrackLabel






