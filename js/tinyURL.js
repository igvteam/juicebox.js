
class TinyURL {

    constructor({endpoint}) {
        this.endpoint = endpoint || "https://2et6uxfezb.execute-api.us-east-1.amazonaws.com/dev/tinyurl/"
    }

    async shortenURL(url) {
        const enc = encodeURIComponent(url);
        const response = await fetch(`${this.endpoint}${enc}`);
        if(response.ok) {
            return response.text();
        }
        else {
            throw new Error(response.statusText);
        }
    }
}


export default TinyURL;