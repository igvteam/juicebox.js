/**
 * Created by Jim Robinson on 3/4/17.
 */
var hic = (function (hic) {

    hic.initSite = function () {
        var site =
        {
            receiveEvent: function (event) {
                if (event.type === "DataLoad") {
                    updateDatasetPulldown(event.data);
                }
            }
        };

        hic.GlobalEventBus.subscribe("DataLoad", site);
    };

    function updateDatasetPulldown(dataset) {

        var selector = '#dataset_selector option[value="' + dataset.url + '"]',
            $option = $(selector);

        if ($option) $option.prop('selected', true);

    }

    return hic;

})
(hic || {});
