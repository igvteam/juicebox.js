[**Back to juicebox.js**](../) || [**Back to developer doc**](developers)  


# OAuth

OAuth is an industry standard framework that enables secure access to
protected resources without exposing the users credentials to third
party applications, such as juicebox.  To access protected resources
the user first authenticates by signing into an OAuth provider, such
as Google, Dropbox, or a private OAuth server, and grants the application
(e.g. juicebox) permission to access resources the user has been
granted permission to access.  This permission is granted via an
encrypted access token returned to the calling application.   This token
is then added to an _Authorization: bearer header_ for all requests for the protected resource, and used by
the server to check permissions.

juicebox.js supports the OAuth II standard,  used by many public
cloud providers such as Google and Dropbox as well as private
intranets.   User authentication is typically supported by adding
a sign-in button for the OAuth provider (e.g. Google)  to the website
hosting juicebox,  then using one of the options below to pass
the access token to juicebox.js

## Function

Set the oauthToken parameter of the file config object to a function.  The function will be called whenever
the token is needed.

```js
juicebox.browser.loadHicFile(
   {
     "name": "HCT-116 Cohesin Loss",
     "url": "https://drive.google.com/open?id=1U3jILxkRH4EC_TzJ4H8jbU6o36eUfMoa",
     "oauthToken": getOautToken
   }
```

## Value

Set the oauthToken parameter of the file config object to the access token value.  

```js
juicebox.browser.loadHicFile(
   {
     "name": "HCT-116 Cohesin Loss",
     "url": "https://drive.google.com/open?id=1U3jILxkRH4EC_TzJ4H8jbU6o36eUfMoa",
     "oauthToken": "F0jh9korTyzd9kaZqZ0SzjKZuS3ut0i4P46Lc52m2JYHiLIcqzFAumpyxshU9mMQ13gJHtxD2fy"
   }
```


For more information on oAuth support in juicebox see

https://github.com/igvteam/igv.js/wiki/OAuth-Support

For an example webpage implementing oAuth support for Google Drive storage see [examples/website/oAuth.html](https://github.com/igvteam/juicebox.js/blob/master/examples/website/oAuth.html).



