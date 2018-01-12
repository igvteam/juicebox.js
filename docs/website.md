[**Back to juicebox.js**](../) // [**Back to Developer Doc**](developers) || 

# Prototype juicebox.js site

The examples/website folder in the [juicebox.js GitHub repository](https://github.com/igvteam/juicebox.js) contains a prototype website hosting a juicebox instance.
To use this code to jumpstart your own page copy the folder, edit the file
`data/mapMenuData.txt` to customize the load menu, and optionally
supply a bitly and/or Google apiKey to support sharable URLs (see below).  For an example of a production instance using
this pattern see http://aidenlab.org/juicebox.

The `config` object used for initialization in the example:

        var config = {
            mapMenu: {
                id: 'dataset_selector',
                items: 'res/mapMenuData.txt'
            },
            trackMenu: {
                id: 'annotation-selector',
                items: 'https://hicfiles.s3.amazonaws.com/internal/tracksMenu_$GENOME_ID.txt'
            },
            trackMenu2D: {
                id: 'annotation-2D-selector',
                items: 'https://hicfiles.s3.amazonaws.com/internal/tracksMenu_2D.$GENOME_ID.txt'
            },

            // URL shortener(s).  Optional.   If developing on localhost use Google,  otherwise Bitly.  Bitly will not shorten localhost
            // If more than 1 shortener is defined the first is used to shorten URLs
            urlShortener: [
                {
                    provider: "bitly",
                    apiKey: "ABCD",        // TODO -- replace with your Bitly access token, or function to fetch token
                    hostname: 'bit.ly'
                },
                {
                    provider: "google",
                    apiKey: "ABCD",        // TODO -- replace with your Google API Key, or function to fetch key
                    hostname: "goo.gl"
                }
            ],

            apiKey: "ABCD",   // Optional.  TODO -- replace with your Google API Key if supporting Google Drive

            embedTarget: "https://igv.org/web/jb/release/1.0.0/site/embed.html"   // "Embed" sharable links will use this url
        };

The `mapMenuData.txt` file is a tab-delimited list of .hic file - menu label tuples.

A Google API key or Bitly oauth token is required to use the `Share` button.   A Google API key is also required to support
GoogleDrive urls.  See the [Google documentation](https://developers.google.com/url-shortener/v1/getting_started#APIKey) for instructions on obtaining an API key.

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
[`oauth.html` in our prototype website](https://github.com/igvteam/juicebox.js/blob/master/examples/website/oAuth.html) 
for an example of sharing URLs using private data on Google Drive.




