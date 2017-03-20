/**
 * Created by Jim Robinson on 3/4/17.
 */
var hic = (function (hic) {

    hic.initSite = function () {
        var site =
        {
            receiveEvent: function (event) {
                if (event.type === "DataLoad") {

                    updateDatasetPulldown(event);

                    updateNormalizationPulldown(event);
                }
            }
        }

        hic.GlobalEventBus.subscribe("DataLoad", site);
    }

    function updateDatasetPulldown(event) {

        var hicReader = event.data,
            config = hicReader.config,
            selector = '#dataset_selector option[value="' + config.url + '"]',
            $option = $(selector);

        if ($option) $option.prop('selected', true);


    }

    function updateNormalizationPulldown(event) {

        var hicReader = event.data,
            $normalization_pulldown = $('#normalization_selector'),
            selected = false,
            normalizationTypes = hicReader.normalizationTypes,
            elements;


        elements = _.map(normalizationTypes, function (normalization, index) {
            return '<option' + ' value=' + index + (selected ? ' selected' : '') + '>' + normalization + '</option>';
        });

        $normalization_pulldown.empty();
        $normalization_pulldown.append(elements.join(''));

    }


    return hic;

})
(hic || {});
