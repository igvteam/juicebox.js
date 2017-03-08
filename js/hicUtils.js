/**
 * Created by dat on 3/8/17.
 */
var hic = (function (hic) {

    hic.throttle = function (fn, threshhold, scope) {
        var last,
            deferTimer;

        threshhold || (threshhold = 200);

        return function () {
            var context,
                now,
                args;

            context = scope || this;
            now = +new Date;
            args = arguments;

            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        }
    };

    return hic;

}) (hic || {});
