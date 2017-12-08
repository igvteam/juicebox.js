[**Back to juicebox.js**](../) // [**Back to Developer Doc**](developers) || 

# Prototype juicebox.js site

The examples/site folder in the [juicebox.js GitHub repository](https://github.com/igvteam/juicebox.js) contains a prototype website hosting a juicebox instance.
To use this code to jumpstart your own page copy the folder, edit the file
`data/mapMenuData.txt` to customize the load menu, and optionally
supply a Google apiKey to support sharable URLs (see below).  For an example of a production instance using
this pattern see http://aidenlab.org/juicebox.

The `config` object used for initialization in the example:

        var config = {
            mapMenu: {
                id: 'dataset_selector',
                items: 'data/mapMenuData.txt'
            },
            apiKey: <your api key>,   //  (required to create sharable URLs)
            embedTarget: "http://aidenlab.org/juicebox/embed/embed.html"   // (optional)
        };

The `mapMenuData.txt` file is a tab-delimited list of .hic file - menu label tuples.

A Google API key is required to use the `Share` button.  See the [Google documentation](https://developers.google.com/url-shortener/v1/getting_started#APIKey) for instructions on obtaining an API key.

Bootstrap is used for the user controls for loading files and tracks in this prototype site, but Bootstrap is not required
for the juicebox.js component.  You are free to use any framework or none at all.   For more details on
juicebox.js dependencies see [the page on embedding](embedding).


## Shareable URLs

The prototype site includes the ability to create shareable URLs.  These URLs encapsulate the current state of the
juicebox instance.   Thes URLs do not expire, and remain valid as long as the underlying
website and data are available.

Resources referenced in the URLs can be public or private, and can be protected with
oAuth credentials.  In the case of private data the receiver of the shareable URL
must have access to the resources referenced.   If the resources are
protected the user must be prompted on the hosting website to sign in
with the approriate oAuth provider before the encapsualeted data can
be loaded and viewed.   Details will vary by provider and website, but see the file
[`oauth.html`](https://github.com/igvteam/juicebox.js/blob/master/examples/website/oAuth.html) in our prototype website
for an example of sharing URLs using private data on Google Drive.




