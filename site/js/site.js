/**
 * Created by dat on 3/6/17.
 */

var site = (function (site) {

    site.init = function (app, $app_container) {
        this.app = app;
        this.$app_container = $app_container;
    };

    site.launch = function (config) {

        this.app
            .createBrowser(this.$app_container, config)
            .then(function (browser) {
                browser.setState(4, 4, 0, 0, 0, 2);

            })
            .catch(function (error) {
                console.error(error);
            })

    };


    return site;

}) (site || {});

