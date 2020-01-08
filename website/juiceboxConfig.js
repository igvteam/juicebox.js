/*
 * @author Jim Robinson Nov-2019
 */

export default {
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

    // List of URL shorteners.  First in the list is the default and will be used for shortening URLs
    // Others potentiall used for expanding short URLs.  At least 1 shortener is required for the
    // "Share" button.
    // NOTE: you must provide an API key (Google) or access token (Bitly) to use these services on your site
    urlShortener: [
        {
            provider: 'tinyURL'
        }
    ]
}
