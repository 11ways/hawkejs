## 1.2.2 (WIP)

* Make sure `registerRender` doesn't fail when there is no url
* Fix `Hawkejs.removeClasses` and `Hawkejs.addClasses` so it doesn't crash on a class_name with only whitespace
* Use `decodeURI` when using a `x-history-url` as new url
* Put every class under the `Hawkejs` namespace
* Custom element instances created during a client side render will no longer be re-created when finally inserted into the DOM

## 1.2.1 (2017-08-27)

* Add `Hawkejs.addAttributes(element, attributes)`
* `Scene#fetch` and `Scene#openUrl` will no longer try to parse empty "json" responses. (This happened on Firefox, not on chrome)
* Cookies will use the `secure` flag by default when on a secure page
* Fix memory leak in history implementation
* The 'scene_start' cookie will be set on the url's pathname, not just path (which includes queries)
* `x-history-url` header value will be encoded using `encodeURI`
* The `_initHawkejs` json variable will now escape "</script>" tags

## 1.2.0 (2017-08-11)

* Creating a Helper instance without a view on the server side will no longer throw an error
* `Scene#serverResponse` will now callback with the `ViewRender` instance
* When a dialog is closed by clicking on the wrapper "dialog_close" event will be emitted on the ViewRender instance
* Catch errors made by `Scene#fetch` during `xhr#send`
* `style` calls can now be full urls
* Added `Scene#render` method, which applies the render results to the current scene (`Hawkejs#render` will only render them, without applying)
* Make `js-he-form`s use the `method` attribute, instead of `type`
* The `get` option can now also be a `FormData` instance
* `add_class` calls will now also work in blocks that have been turned into a dialog
* Forms and links with `js-he-close-dialog` as a CSS class will close the parent dialog after their successful request
* `Scene#render` now returns the created ViewRender instance
* Fix: `ViewRender#beginRender` now actually waits for the emitted 'begin' events to finish. This used to cause race conditions.
* Setting a pagetitle can now be done with an object supporting `getContent` and `toHawkejsString`
* Fix `Scene#scrollTo` not working at all
* Don't scroll to anything when an openUrl call results in a dialog being made.
* Add `ViewRender#showDialog` which can add dialogs from the server side
* Call `Scene#ajaxify` after emitting the created events (so clicks can be prevented)
* Strip HTML tags before setting the page title element
* Dialog wrappers will now use z-index of 998, 9000 less than before
* The client-side `doExtensions` method will now also `changeMain` block when extending
* Client-side extensions will now also work when extending a dialog
* Hawkejs elements now can also have a "data-entry-template", indicating which templated was the original entry point
* Bump version to 1.2.0, as there are too many breaking changes
* Also remove `h_diversion` and `htop` from history urls
* When using `Scene#scrollTo` without any parameters, just scroll to the top immediately
* Add `Hawkejs#delayReady` which is intended to be used in "onclick" attributes
* Fix some isVisible handling
* Fix the `Helper#parseURL` method
* Add simple code to get rid of dialogs when using back button (needs rework)
* Added another attempt to fix scrollTo
* The default `scrollTo` duration can be overwritten by exposing `default_scrollto_duration`

## 1.1.3 (2017-04-17)

* Add `Templates#name` property
* Add `assigns` property to `ViewRender#toJson()`
* Add `Hawkejs.removeClasses`
* `className`s set in `assign()` options will remain on the block,
  `className`s set in a `start()` call will be removed when a new `start()` is issued
* `querySelectorAll` results don't have a `forEach` method in Edge, so fix that
* Fix race condition in `Hawkejs#createClientFile`
* Fix `Hawkejs#require` not honouring path property on the client side
* Add dialog css as style element
* Bundle client-side template requests

## 1.1.2 (2017-01-21)

* Added `add_class` method to add CSS classnames to a Hawkejs element
* `Element#reload` will now render the correct theme of template
* Elements with the `data-update-request` attribute will only get the
  click/change listener once
* CustomElements will be registered once all the Hawkejs code has executed
* Fixed calling of `CustomElement#undried`
* Renamed CustomElements `attachments` to `assigned_data`
* `CustomElement#attach` is now `CustomElement#assignData`
* Added `CustomElement#emit` to emit a custom browser event
* Added `CustomElement#connectedCallback` functionality
* Scene view helpers will be created before scripts are requested
* `Scene#appears` now also accepts elements and array of elements
* History url can also be changed on initial page load with exposed `redirected_to`
* Input elements with `data-update-location` will `openUrl` on change
* Make `wheel` and `click` listeners passive

## 1.1.1 (2016-10-04)

* Stylesheet theme support
* Client files: remove code between "//HAWKEJS START CUT" and "//HAWKEJS END CUT"
* Client files can now be non-commonjs formatted (using `is_commonjs` set to false)
* Client files no longer use the entire file path as an identifier

## 1.1.0 (2016-06-27)

* Improve template error reporting
* Integrate custom elements
* Work with HTMLElements

## 1.0.0

* Complete rewrite
* Remove DOM-style rendering from the server
* Live-data binding

## 0.1.1 (2014-06-10)

* Add custom 'x-hawkejs-request' header to GETs and POST requests
* Add Mozilla's localforage library
* Expose the ejs renderer via hawkejs.ejs
* Upgrade the History library to version 4.0.9
* Add LZ-String and use it to compresses History API payloads that are too big
  for certain browsers (IE & Firefox).
  This slows down the browser, an asynchronous web-worker solution should be
  sought after next.
* If it is given, use the 'X-History-Url' response header as the url to
  register with the HTML5 History API.
* Emit viewready event after render or pageload
* Upgrade DOMSpot to 0.1.0
* Don't use the History API on forms that have the 'data-no-history' attribute
* Update History.js to version v4.1.0, fixes some Firefox security errors

## 0.1.0 (2014-03-12)

* Submit POSTs as JSON instead of urlencoded strings
* Use TJ Holowaychuk's querystring code to convert a form to an object.
  This makes it perfectly compatible to express, where the same code is used.

## 0.0.15 (2014-03-11)

* Add events for created 'implementations'. Still need to add them for destroyed
  ones, too.
* Revert to jQuery 1.8 on the server side
* Add DOMSpot for ClientSide usage

## 0.0.14 (2014-02-28)

* Upgrade ejs from 0.8.3 to 0.8.5, an upgrade that needed some tweaking.
* Also upgrade cheerio, entities and jquery

## 0.0.13 (2014-02-18)

* Don't thrown an error when _EjsRender returns an empty string after render,
  sometimes that's just what needs to happen.
* Fix the History API implementation.
  Some functions were modified in a way nothing happened anymore on pressing the
  back & next buttons.
  The 'historyChange' event is also emitted after the state has been applied.

## 0.0.12 (2014-02-16)

* Add getObjectPath function, which takes an object and a string and uses that
  string as a path to look for in the object

## 0.0.11 (2014-02-05)

* Add uneval function. Right now it only correctly uneval's functions,
  but more is to come.
* Script tag names are no longer prefixed with 'hawkejs' because it messed up
  encoding of chars like '<'. To not have the scripts run too soon,
  jQuery's .parseHTML is used.
* Replace hawkejs.µ with hawkejs.utils, as it caused encoding problems.
* Add a new jQuery converter setting for json-dry strings
* Hawkejs event listener now allows you to pass an array of queries or strings
* Add hawkejs.downloadAjax function, which allows the user to POST data to the
  server and download the file, as if via AJAX. Even allows callback functions
  (for when download begins) if the server supports it.
  Inspired by this stackoverflow question:
  http://stackoverflow.com/questions/1106377/detect-when-browser-receives-file-download
* Add formify function, which turns an object into key-value pairs fitted for
  form submission

## 0.0.10 (2014-01-21)

* Many new functions & helpers
* Partial rewrite of the script & asset helpers
* Expose vendor folder for client side
* The expands() helper now accepts an array of string
* Add serial drones
* Allow links to have no content text
* Improve url matching & add greedy matching
* Make sure links created by add_link have unique ids
* Emit events when a script is added
* Make ejsrender return more data if requested
* Add order & treeify functions
* Add json-dry functions (json with support for dates & regexes)
* Add pr() function for debugging

## 0.0.9 (2013-10-15)

* Use cheerio 0.12.2 because of a bug in 0.12.3

## 0.0.2 (2013-01-21)

* client side rendering produces the same html code as the server

## 0.0.1 (2013-01-21)

* first push to npm after +/- 31 hours of development