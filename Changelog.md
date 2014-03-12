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