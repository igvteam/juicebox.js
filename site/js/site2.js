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
                    updateModalChromosome(event.data);
                }
            }
        };

        hic.GlobalEventBus.subscribe("DataLoad", site);
    };

    function updateDatasetPulldown(dataset) {

        var selector = '#dataset_selector option[value="' + dataset.url + '"]',
            $option = $(selector);

        if ($option) $option.prop('selected', true);
        $("#dataset_selector").trigger("chosen:updated");
        $("#myBtn").removeAttr('disabled');

    }

    function updateModalChromosome(dataset) {

        chromosomes = dataset.chromosomes;
        elements = _.map(chromosomes, function (chr, index) {
        if (index == 1) {
           return '<input type="radio" id="grp1-radio' + index + '" name="chr-group1" value="' + chr.name + '" checked><label for="grp1-radio' + index + '">' + chr.name + '</label><br>';

        }
        else {
           return '<input type="radio" id="grp1-radio' + index + '" name="chr-group1" value="' + chr.name + '"><label for="grp1-radio' + index + '">' + chr.name + '</label><br>';
              }
        });
        $('#xaxis').append(elements.join(''));

         elements = _.map(chromosomes, function (chr, index) {
         if (index == 1) {
            return '<input type="radio" id="grp2-radio' + index + '" name="chr-group2" value="' + chr.name + '" checked><label for="grp2-radio' + index + '">' + chr.name + '</label><br>';

         }
         else {
            return '<input type="radio" id="grp2-radio' + index + '" name="chr-group2" value="' + chr.name + '"><label for="grp2-radio' + index + '">' + chr.name + '</label><br>';
         }
        });
        $('#yaxis').append(elements.join(''));

    }

    return hic;

})
(hic || {});
