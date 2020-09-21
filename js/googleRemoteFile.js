import { Alert } from '../node_modules/igv-ui/dist/igv-ui.js'
import igv from '../node_modules/igv/dist/igv.esm.js'

const google = igv.google;
const oauth = igv.oauth;

class GoogleRemoteFile {

    constructor(args) {
        this.config = args
        this.url = args.path || args.url
    }


    async read(position, length, retry) {

        const headers = this.config.headers || {}
        const rangeString = "bytes=" + position + "-" + (position + length - 1)
        headers['Range'] = rangeString

        let url = this.url.slice()    // slice => copy

        const accessToken =
            this.config.oauthToken ||
            await getGoogleAccessToken();

        if (accessToken) {
            const token = await resolveToken(accessToken)
            headers['Authorization'] = `Bearer ${token}`
        }

        if (google.apiKey) {
            url = addParameter(url, "key", google.apiKey)
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            redirect: 'follow',
            mode: 'cors',

        })

        const status = response.status

        // For small files a range starting at 0 can return the whole file => 200, otherwise status==200 is an error
        if (status >= 200 && status < 300) {
            if (position > 0 && status !== 206) {
                throw Error("ERROR: range-byte header was ignored for url: " + url)
            }
        } else if ((status === 404 || status === 401) && typeof gapi !== "undefined" && !retry) {
            const accessToken = await getGoogleAccessToken();
            this.config.oauthToken = accessToken;
            return this.read(position, length, true);
        } else if (status === 403) {
            throw Error("Access forbidden")
        } else if (status === 416) {
            //  Tried to read off the end of the file.   This shouldn't happen.
            throw Error("Unsatisfiable range");
        } else if (status >= 400) {
            const err = Error(response.statusText)
            err.code = status
            throw err
        }

        return response.arrayBuffer();


        /**
         * token can be a string, a function that returns a string, or a function that returns a Promise for a string
         * @param token
         * @returns {Promise<*>}
         */
        async function resolveToken(token) {
            if (typeof token === 'function') {
                return await Promise.resolve(token())    // Normalize the result to a promise, since we don't know what the function returns
            } else {
                return token
            }
        }

    }
}

function addParameter(url, name, value) {
    const paramSeparator = url.includes("?") ? "&" : "?";
    return url + paramSeparator + name + "=" + value;
}

/**
 * There can be only 1 oAuth promise executing at a time.
 */
let oauthPromise;

async function getGoogleAccessToken() {

    if (oauth.google.access_token) {
        return Promise.resolve(oauth.google.access_token);
    }
    if (oauthPromise) {
        return oauthPromise;
    }

    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance) {
        Alert.presentAlert("Authorization is required, but Google oAuth has not been initalized.  Contact your site administrator for assistance.")
        return undefined;
    }

    // TODO -- get scope from config
    const scope = "https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly";
    const options = new gapi.auth2.SigninOptionsBuilder();
    options.setPrompt('select_account');
    options.setScope(scope);
    oauthPromise = new Promise(function (resolve, reject) {
        Alert.presentAlert("Google Login required", function () {
            gapi.auth2.getAuthInstance().signIn(options)
                .then(function (user) {
                    const authResponse = user.getAuthResponse();
                    oauth.google.setToken(authResponse["access_token"]);
                    resolve(authResponse["access_token"]);
                    oauthPromise = undefined;
                })
                .catch(function (err) {
                    oauthPromise = undefined;
                    reject(err);
                });
        });
    });

    return oauthPromise;
}


export default GoogleRemoteFile;
