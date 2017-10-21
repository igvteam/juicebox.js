The examples/site folder contains a prototype website hosting a juicebox instance.
To use this code to jumpstart your own page copy the folder, edit the file
data/mapMenuData.txt to customize the load menu, and optionally
supply a Google apiKey to support sharable URLs (see below).  For an example of a production instance using
this pattern see http://aidenlab.org/juicebox.

The "config" object used for initialization in the example:

        var config = {
            mapMenu: {
                id: 'dataset_selector',
                items: 'data/mapMenuData.txt'
            },
            apiKey: <your api key>,   //  (required to create sharable URLs)
            embedTarget: "http://aidenlab.org/juicebox/embed/embed.html"   // (optional)
        };

The "mapMenuData.txt" file is a tab-delimited list of .hic file - menu label tuples.

A google api key is required to use the "Share" button.  See https://developers.google.com/url-shortener/v1/getting_started#APIKey  
for instructions on obtaining an API key.

Bootstrap is used for the user controls for loading files and tracks in this prototype site, but Bootstrap is not required
for the juicebox.js component.  You are free to use any library or none at all.   For more details on
juicebox.js dependencies see [embedding](embedding).
