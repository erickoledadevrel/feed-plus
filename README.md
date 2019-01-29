# DEPRECATED: Feed+

This repo is deprecated and no longer functions. Parse has been shut down and Google+ is scheduled to be as well.

Feed+ is a sample web application, built using Google Apps Script, that allows
users to create RSS feeds from a Google+ profile or search. A hosted version of
this app is
[available here](https://script.google.com/macros/s/AKfycby-KOzuotva72PMUG57zIJl16Sa_iu17GHU6d2VdubRQTxmGGU/exec).
The application is split into two components, each of which is its own Apps
Script project deployed as a web app.

## Frontend

This web application contains the UI, and allows users to create new feeds and
manage their existing feeds. It's runs as the user accessing it, so that each
user sees only the feeds they created.

This script uses the following libraries:

- Underscore: `MGwgKN2Th03tJ5OdmlzB8KPxhMjh3Sh48`
- Feed+ Backend: Use the project ID of the backend scrip described below

This script expected the following script properties to be set:

- `error.log.spreadsheet.id`: The ID of the spreadsheet to log errors to.
- `error.log.sheet.name`: The name of the sheet within the above spreadsheet
  to log errors to.

## Backend

This web application contains the RSS serving, and doesn't contain any user
interface. It runs as the developer that set it up, so that the RSS clients can
access it unauthenticated. It uses the
[Parse Core datasore](https://www.parse.com/products/core) to store feed
information.

This scrupt uses the following libraries:

- Underscore: `MGwgKN2Th03tJ5OdmlzB8KPxhMjh3Sh48`
- [ParseDb](https://github.com/erickoledadevrel/parsedb):
  `MxhsVzdWH6ZQMWWeAA9tObPxhMjh3Sh48`

This script expected the following script properties to be set:

- `api.key`: The API key from the Google Developer Console to use when making
  requests to the Google+ API. Note that the Google+ API must be enabled on the
  project first.
- `error.log.spreadsheet.id`: The ID of the spreadsheet to log errors to.
- `error.log.sheet.name`: The name of the sheet within the above spreadsheet
  to log errors to.
- `parse.application_id`: The application ID of the Parse application.
- `parse.rest_api_key`: The REST API key for the Parse application.
- `self.url`: The URL where the backend is published.
