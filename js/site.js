/**
 * Created by dat on 3/6/17.
 */

var site = (function (site) {

    site.init = function (app, $app_container) {

        var self = this;

        this.app = app;
        this.$app_container = $app_container;

        $('#dataset_selector').on('change', function(e){
            self.launch({ url: $(this).val() });
        });

    };

    site.launch = function (config) {

        this.app
            .createBrowser(this.$app_container, config)
            .then(function (browser) {
                var chromosome_index_x,
                    chromosome_index_y,
                    zoom_index,
                    x_bin,
                    y_bin,
                    pixel_size;

                chromosome_index_x = 4;
                chromosome_index_y = 4;

                zoom_index = 6;

                x_bin = 128;
                y_bin = 0;

                pixel_size = 1;

                browser.setState(chromosome_index_x, chromosome_index_y, zoom_index, x_bin, y_bin, pixel_size);
            })
            .catch(function (error) {
                console.error(error);
            })

    };


    return site;

}) (site || {});

