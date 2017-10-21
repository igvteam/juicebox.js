The examples/site folder contains a prototype website hosting a juicebox instance.
To use this code to jumpstart your own page simply copy, edit the file
data/mapMenuData.txt to list your maps, and optionally
supply a Google apiKey (see below).  For an example of a production instance using
this pattern see http://aidenlab.org/juicebox.

        var config = {
            mapMenu: {
                id: 'dataset_selector',
                items: 'data/mapMenuData.txt'
            },
            apiKey: <your api key>,   //  (required to create sharable URLs)
            embedTarget: "http://aidenlab.org/juicebox/embed/embed.html"   // (optional)
        };

The "mapMenuData.txt" file is a tab-delimited list of .hic file - menu label tuples.

A google api key is required to use the "Share" button. The key should be set in the config object of juicebox.html.
In addition, to support the "EMBED" option set the embedTarget.  See https://developers.google.com/url-shortener/v1/getting_started#APIKey  for instructions on obtaining an API key.

Bootstrap is used for the user controls for loading files and tracks in this prototype site, but Bootstrap is not required
for the juicebox.js component.  You are free to use any library or none at all.   For more details on
juicebox.js dependencies see [embedding](embedding).
