## 0.0.11 (WIP)

* Add uneval function. Right now it only correctly uneval's functions,
  but more is to come.
* Script tag names are no longer prefixed with 'hawkejs' because it messed up
  encoding of chars like '<'. To not have the scripts run too soon,
  jQuery's .parseHTML is used.

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