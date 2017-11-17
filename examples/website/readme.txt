This folder contains prototype of a website hosting a juicebox instance.  For an
example of a production instance using this pattern see http://aidenlab.org/juicebox.

A google api key is required to use the "Share" button. The key should be set in the config object of juicebox.html.
In addition, to support the "EMBED" option set the embedTarget

        var config = {
            mapMenu: {
                id: 'dataset_selector',
                items: 'data/mapMenuData.txt'        // TODO edit
            },
            apiKey: <your api key>,      // TODO replace (optional, to support Share button)
            embedTarget: "http://aidenlab.org/juicebox/embed/embed.html"   // TODO edit (optional)
        };

See https://developers.google.com/url-shortener/v1/getting_started#APIKey  for instructions on obtaining an API key.
If not API key is supplied the "Share" button will be hidden.

Bootstrap is used for the user controls for loading files and tracks in this example, but Bootstrap is not required
for the juicebox.js component.  You are free to use any library or none at all.   For more details on
juicebox.js dependencies see the developer documentation at https://igvteam.github.io/juicebox.js/

