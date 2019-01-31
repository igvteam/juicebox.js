
This folder contains prototype webpages hosting juicebox.js instances.

## Notes

If not using oAuth a google api key is required to use the "Share" button. The key should be set in the config object of juicebox.html.
In addition, to support the "EMBED" option set the embedTarget

        var config = {
            mapMenu: {
                id: 'dataset_selector',
                items: 'res/mapMenuData.txt'        // TODO edit
            },
            apiKey: <your api key>,      // TODO replace (optional, to support Share button)
            embedTarget: "http://<YOUR WEBSITE>/embed/embed.html"   // TODO edit (optional)
        };

See https://developers.google.com/url-shortener/v1/getting_started#APIKey  for instructions on obtaining an API key.
If not API key is supplied the "Share" button will be hidden.

The "dev" pages (juicebox-dev.html and oauth-dev.html) are intended for development and depend
on files in the source repository.

## Examples


### juicebox.html

Example webpage with an embedded juicebox.js instance.  For an example of a production instance using this pattern see http://aidenlab.org/juicebox.

### oauth.html

Uses oAuth to provide restricted access to map and track files hosted on
Google Drive.

This file is deployed at http://igv.org/web/jb/test/oAuth.html.  To host
on your own server you must obtain a client ID from Google.
See https://developers.google.com/identity/sign-in/web/devconsole-project
and https://support.google.com/googleapi/answer/6158862?hl=en.   After
obtaining set the parameter  "client_id" in oauth.html.

To request access to the data files for testing purposes
send email to igv-team@broadinstitute.org


