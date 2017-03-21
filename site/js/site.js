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

                    updateNormalizationPulldown(event.data);
                }
            }
        }

        hic.GlobalEventBus.subscribe("DataLoad", site);
    }

    function updateDatasetPulldown(dataset) {

        var selector = '#dataset_selector option[value="' + dataset.url + '"]',
            $option = $(selector);

        if ($option) $option.prop('selected', true);


    }

    function updateNormalizationPulldown(dataset) {

        var $normalization_pulldown = $('#normalization_selector'),
            selected = false,
            normalizationTypes = dataset.normalizationTypes,
            elements;


        elements = _.map(normalizationTypes, function (normalization, index) {
            return '<option' + ' value=' + normalization + (selected ? ' selected' : '') + '>' + normalization + '</option>';
        });

        $normalization_pulldown.empty();
        $normalization_pulldown.append(elements.join(''));

    }


    return hic;

})
(hic || {});
