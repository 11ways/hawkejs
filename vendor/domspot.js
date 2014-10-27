var DOMSpot;

/**
 * Makes sure every node has a 'matches' method
 *
 * @link https://gist.github.com/jonathantneal/3062955
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
window.Element && function(ElementPrototype) {
	ElementPrototype.matchesSelector = ElementPrototype.matchesSelector || 
	ElementPrototype.mozMatchesSelector ||
	ElementPrototype.msMatchesSelector ||
	ElementPrototype.oMatchesSelector ||
	ElementPrototype.webkitMatchesSelector ||
	function matchesSelectorShim(selector) {

		var node = this,
		    nodes = (node.parentNode || node.document).querySelectorAll(selector), i = -1;

		while (nodes[++i] && nodes[i] != node);

		return !!nodes[i];
	};
}(Element.prototype);

// Make sure we have a MutationObserver available
// MutationObserver-Shim v0.2.8 (http://github.com/megawac/MutationObserver.js)
// Authors: Graeme Yeates (yeatesgraeme@gmail.com) 
/*!
 * Shim for MutationObserver interface
 * Author: Graeme Yeates (github.com/megawac)
 * Repository: https://github.com/megawac/MutationObserver.js
 * License: WTFPL V2, 2004 (wtfpl.net).
 * Though credit and staring the repo will make me feel pretty, you can modify and redistribute as you please.
 * Attempts to follow spec (http://www.w3.org/TR/dom/#mutation-observers) as closely as possible for native javascript
 * See https://github.com/WebKit/webkit/blob/master/Source/WebCore/dom/MutationObserver.cpp for current webkit source c++ implementation
 */

/**
 * prefix bugs:
	-https://bugs.webkit.org/show_bug.cgi?id=85161
	-https://bugzilla.mozilla.org/show_bug.cgi?id=749920
*/
window.MutationObserver = window.MutationObserver || window.WebKitMutationObserver || (function(undefined) {
	"use strict";
	/**
	 * @param {function(Array.<MutationRecord>, MutationObserver)} listener
	 * @constructor
	 */
	function MutationObserver(listener) {
		/**
		 * @type {Array.<Object>}
		 * @private
		 */
		this._watched = [];
		/** @private */
		this._listener = listener;
	}

	/**
	 * Start a recursive timeout function to check all items being observed for mutations
	 * @type {MutationObserver} observer
	 * @private
	 */
	function startMutationChecker(observer) {
		(function check() {
			var mutations = observer.takeRecords();

			if (mutations.length) { //fire away
				//calling the listener with context is not spec but currently consistent with FF and WebKit
				observer._listener(mutations, observer);
			}
			/** @private */
			observer._timeout = setTimeout(check, MutationObserver._period);
		})();
	}

	/**
	 * Period to check for mutations
	 * @type {number}
	 * @expose
	 */
	MutationObserver._period = 900 /*ms+runtime*/ ;

	/**
	 * Exposed API
	 * @expose
	 * @final
	 */
	MutationObserver.prototype = {
		/**
		 * see http://dom.spec.whatwg.org/#dom-mutationobserver-observe
		 * not going to throw here but going to follow the current spec config sets
		 * @param {Node|null} $target
		 * @param {Object|null} config : MutationObserverInit configuration dictionary
		 * @expose
		 * @return undefined
		 */
		observe: function($target, config) {
			/**
			 * Using slightly different names so closure can go ham
			 * @type {!Object} : A custom mutation config
			 */
			var settings = {
				attr: !! (config.attributes || config.attributeFilter || config.attributeOldValue),

				//some browsers are strict in their implementation that config.subtree and childList must be set together. We don't care - spec doesn't specify
				kids: !! config.childList,
				descendents: !! config.subtree,
				charData: !! (config.characterData || config.characterDataOldValue)
			};

			var watched = this._watched;

			//remove already observed target element from pool
			for (var i = 0; i < watched.length; i++) {
				if (watched[i].tar === $target) watched.splice(i, 1);
			}

			if (config.attributeFilter) {
				/**
				 * converts to a {key: true} dict for faster lookup
				 * @type {Object.<String,Boolean>}
				 */
				settings.afilter = reduce(config.attributeFilter, function(a, b) {
					a[b] = true;
					return a;
				}, {});
			}

			watched.push({
				tar: $target,
				fn: createMutationSearcher($target, settings)
			});

			//reconnect if not connected
			if (!this._timeout) {
				startMutationChecker(this);
			}
		},

		/**
		 * Finds mutations since last check and empties the "record queue" i.e. mutations will only be found once
		 * @expose
		 * @return {Array.<MutationRecord>}
		 */
		takeRecords: function() {
			var mutations = [];
			var watched = this._watched;

			for (var i = 0; i < watched.length; i++) {
				watched[i].fn(mutations);
			}

			return mutations;
		},

		/**
		 * @expose
		 * @return undefined
		 */
		disconnect: function() {
			this._watched = []; //clear the stuff being observed
			clearTimeout(this._timeout); //ready for garbage collection
			/** @private */
			this._timeout = null;
		}
	};

	/**
	 * Simple MutationRecord pseudoclass. No longer exposing as its not fully compliant
	 * @param {Object} data
	 * @return {Object} a MutationRecord
	 */
	function MutationRecord(data) {
		var settings = { //technically these should be on proto so hasOwnProperty will return false for non explicitly props
			type: null,
			target: null,
			addedNodes: [],
			removedNodes: [],
			previousSibling: null,
			nextSibling: null,
			attributeName: null,
			attributeNamespace: null,
			oldValue: null
		};
		for (var prop in data) {
			if (has(settings, prop) && data[prop] !== undefined) settings[prop] = data[prop];
		}
		return settings;
	}

	/**
	 * Creates a func to find all the mutations
	 *
	 * @param {Node} $target
	 * @param {!Object} config : A custom mutation config
	 */
	function createMutationSearcher($target, config) {
		/** type {Elestuct} */
		var $oldstate = clone($target, config); //create the cloned datastructure

		/**
		 * consumes array of mutations we can push to
		 *
		 * @param {Array.<MutationRecord>} mutations
		 */
		return function(mutations) {
			var olen = mutations.length;

			//Alright we check base level changes in attributes... easy
			if (config.attr && $oldstate.attr) {
				findAttributeMutations(mutations, $target, $oldstate.attr, config.afilter);
			}

			//check childlist or subtree for mutations
			if (config.kids || config.descendents) {
				searchSubtree(mutations, $target, $oldstate, config);
			}


			//reclone data structure if theres changes
			if (mutations.length !== olen) {
				/** type {Elestuct} */
				$oldstate = clone($target, config);
			}
		};
	}

	/* attributes + attributeFilter helpers */

	/**
	 * fast helper to check to see if attributes object of an element has changed
	 * doesnt handle the textnode case
	 *
	 * @param {Array.<MutationRecord>} mutations
	 * @param {Node} $target
	 * @param {Object.<string, string>} $oldstate : Custom attribute clone data structure from clone
	 * @param {Object} filter
	 */
	function findAttributeMutations(mutations, $target, $oldstate, filter) {
		var checked = {};
		var attributes = $target.attributes;
		var attr;
		var name;
		var i = attributes.length;
		while (i--) {
			attr = attributes[i];
			name = attr.name;
			if (!filter || has(filter, name)) {
				if (attr.value !== $oldstate[name]) {
					//The pushing is redundant but gzips very nicely
					mutations.push(MutationRecord({
						type: "attributes",
						target: $target,
						attributeName: name,
						oldValue: $oldstate[name],
						attributeNamespace: attr.namespaceURI //in ie<8 it incorrectly will return undefined
					}));
				}
				checked[name] = true;
			}
		}
		for (name in $oldstate) {
			if (!(checked[name])) {
				mutations.push(MutationRecord({
					target: $target,
					type: "attributes",
					attributeName: name,
					oldValue: $oldstate[name]
				}));
			}
		}
	}

	/**
	 * searchSubtree: array of mutations so far, element, element clone, bool
	 * synchronous dfs comparision of two nodes
	 * This function is applied to any observed element with childList or subtree specified
	 * Sorry this is kind of confusing as shit, tried to comment it a bit...
	 * codereview.stackexchange.com/questions/38351 discussion of an earlier version of this func
	 *
	 * @param {Array} mutations
	 * @param {Node} $target
	 * @param {!Object} $oldstate : A custom cloned node from clone()
	 * @param {!Object} config : A custom mutation config
	 */
	function searchSubtree(mutations, $target, $oldstate, config) {
		/*
		 * Helper to identify node rearrangment and stuff...
		 * There is no gaurentee that the same node will be identified for both added and removed nodes
		 * if the positions have been shuffled.
		 * conflicts array will be emptied by end of operation
		 */
		function resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes) {
			// the distance between the first conflicting node and the last
			var distance = conflicts.length - 1;
			// prevents same conflict being resolved twice consider when two nodes switch places.
			// only one should be given a mutation event (note -~ is used as a math.ceil shorthand)
			var counter = -~((distance - numAddedNodes) / 2);
			var $cur;
			var oldstruct;
			var conflict;
			while((conflict = conflicts.pop())) {
				$cur = $kids[conflict.i];
				oldstruct = $oldkids[conflict.j];

				//attempt to determine if there was node rearrangement... won't gaurentee all matches
				//also handles case where added/removed nodes cause nodes to be identified as conflicts
				if (config.kids && counter && Math.abs(conflict.i - conflict.j) >= distance) {
					mutations.push(MutationRecord({
						type: "childList",
						target: node,
						addedNodes: [$cur],
						removedNodes: [$cur],
						// haha don't rely on this please
						nextSibling: $cur.nextSibling,
						previousSibling: $cur.previousSibling
					}));
					counter--; //found conflict
				}

				//Alright we found the resorted nodes now check for other types of mutations
				if (config.attr && oldstruct.attr) findAttributeMutations(mutations, $cur, oldstruct.attr, config.afilter);
				if (config.charData && $cur.nodeType === 3 && $cur.nodeValue !== oldstruct.charData) {
					mutations.push(MutationRecord({
						type: "characterData",
						target: $cur,
						oldValue: oldstruct.charData
					}));
				}
				//now look @ subtree
				if (config.descendents) findMutations($cur, oldstruct);
			}
		}

		/**
		 * Main worker. Finds and adds mutations if there are any
		 * @param {Node} node
		 * @param {!Object} old : A cloned data structure using internal clone
		 */
		function findMutations(node, old) {
			var $kids = node.childNodes;
			var $oldkids = old.kids;
			var klen = $kids.length;
			// $oldkids will be undefined for text and comment nodes
			var olen = $oldkids ? $oldkids.length : 0;
			// if (!olen && !klen) return; //both empty; clearly no changes

			//we delay the intialization of these for marginal performance in the expected case (actually quite signficant on large subtrees when these would be otherwise unused)
			//map of checked element of ids to prevent registering the same conflict twice
			var map;
			//array of potential conflicts (ie nodes that may have been re arranged)
			var conflicts;
			var id; //element id from getElementId helper
			var idx; //index of a moved or inserted element

			var oldstruct;
			//current and old nodes
			var $cur;
			var $old;
			//track the number of added nodes so we can resolve conflicts more accurately
			var numAddedNodes = 0;

			//iterate over both old and current child nodes at the same time
			var i = 0, j = 0;
			//while there is still anything left in $kids or $oldkids (same as i < $kids.length || j < $oldkids.length;)
			while( i < klen || j < olen ) {
				//current and old nodes at the indexs
				$cur = $kids[i];
				oldstruct = $oldkids[j];
				$old = oldstruct && oldstruct.node;

				if ($cur === $old) { //expected case - optimized for this case
					//check attributes as specified by config
					if (config.attr && oldstruct.attr) /* oldstruct.attr instead of textnode check */findAttributeMutations(mutations, $cur, oldstruct.attr, config.afilter);
					//check character data if set
					if (config.charData && $cur.nodeType === 3 && $cur.nodeValue !== oldstruct.charData) {
						mutations.push(MutationRecord({
							type: "characterData",
							target: $cur,
							oldValue: oldstruct.charData
						}));
					}

					//resolve conflicts; it will be undefined if there are no conflicts - otherwise an array
					if (conflicts) resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes);

					//recurse on next level of children. Avoids the recursive call when there are no children left to iterate
					if (config.descendents && ($cur.childNodes.length || oldstruct.kids && oldstruct.kids.length)) findMutations($cur, oldstruct);

					i++;
					j++;
				} else { //(uncommon case) lookahead until they are the same again or the end of children
					if(!map) { //delayed initalization (big perf benefit)
						map = {};
						conflicts = [];
					}
					if ($cur) {
						//check id is in the location map otherwise do a indexOf search
						if (!(map[id = getElementId($cur)])) { //to prevent double checking
							//mark id as found
							map[id] = true;
							//custom indexOf using comparitor checking oldkids[i].node === $cur
							if ((idx = indexOfCustomNode($oldkids, $cur, j)) === -1) {
								if (config.kids) {
									mutations.push(MutationRecord({
										type: "childList",
										target: node,
										addedNodes: [$cur], //$cur is a new node
										nextSibling: $cur.nextSibling,
										previousSibling: $cur.previousSibling
									}));
									numAddedNodes++;
								}
							} else {
								conflicts.push({ //add conflict
									i: i,
									j: idx
								});
							}
						}
						i++;
					}

					if ($old &&
					   //special case: the changes may have been resolved: i and j appear congurent so we can continue using the expected case
					   $old !== $kids[i]
					) {
						if (!(map[id = getElementId($old)])) {
							map[id] = true;
							if ((idx = indexOf($kids, $old, i)) === -1) {
								if(config.kids) {
									mutations.push(MutationRecord({
										type: "childList",
										target: old.node,
										removedNodes: [$old],
										nextSibling: $oldkids[j + 1], //praise no indexoutofbounds exception
										previousSibling: $oldkids[j - 1]
									}));
									numAddedNodes--;
								}
							} else {
								conflicts.push({
									i: idx,
									j: j
								});
							}
						}
						j++;
					}
				}//end uncommon case
			}//end loop

			//resolve any remaining conflicts
			if (conflicts) resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes);
		}
		findMutations($target, $oldstate);
	}

	/**
	 * Utility
	 * Cones a element into a custom data structure designed for comparision. https://gist.github.com/megawac/8201012
	 *
	 * @param {Node} $target
	 * @param {!Object} config : A custom mutation config
	 * @return {!Object} : Cloned data structure
	 */
	function clone($target, config) {
		var recurse = true; // set true so childList we'll always check the first level
		return (function copy($target) {
			var isText = $target.nodeType === 3;
			var elestruct = {
				/** @type {Node} */
				node: $target
			};

			//is text or comemnt node
			if (isText || $target.nodeType === 8) {
				if (isText && config.charData) {
					elestruct.charData = $target.nodeValue;
				}
			} else { //its either a element or document node (or something stupid)

				if(config.attr && recurse) { // add attr only if subtree is specified or top level
					/**
					 * clone live attribute list to an object structure {name: val}
					 * @type {Object.<string, string>}
					 */
					elestruct.attr = reduce($target.attributes, function(memo, attr) {
						if (!config.afilter || config.afilter[attr.name]) {
							memo[attr.name] = attr.value;
						}
						return memo;
					}, {});
				}

				// whether we should iterate the children of $target node
				if(recurse && ((config.kids || config.charData) || (config.attr && config.descendents)) ) {
					/** @type {Array.<!Object>} : Array of custom clone */
					elestruct.kids = map($target.childNodes, copy);
				}

				recurse = config.descendents;
			}
			return elestruct;
		})($target);
	}

	/**
	 * indexOf an element in a collection of custom nodes
	 *
	 * @param {NodeList} set
	 * @param {!Object} $node : A custom cloned node
	 * @param {number} idx : index to start the loop
	 * @return {number}
	 */
	function indexOfCustomNode(set, $node, idx) {
		return indexOf(set, $node, idx, JSCompiler_renameProperty("node"));
	}

	//using a non id (eg outerHTML or nodeValue) is extremely naive and will run into issues with nodes that may appear the same like <li></li>
	var counter = 1; //don't use 0 as id (falsy)
	/** @const */
	var expando = "mo_id";

	/**
	 * Attempt to uniquely id an element for hashing. We could optimize this for legacy browsers but it hopefully wont be called enough to be a concern
	 *
	 * @param {Node} $ele
	 * @return {(string|number)}
	 */
	function getElementId($ele) {
		try {
			return $ele.id || ($ele[expando] = $ele[expando] || counter++);
		} catch (o_O) { //ie <8 will throw if you set an unknown property on a text node
			try {
				return $ele.nodeValue; //naive
			} catch (shitie) { //when text node is removed: https://gist.github.com/megawac/8355978 :(
				return counter++;
			}
		}
	}

	/**
	 * **map** Apply a mapping function to each item of a set
	 * @param {Array|NodeList} set
	 * @param {Function} iterator
	 */
	function map(set, iterator) {
		var results = [];
		for (var index = 0; index < set.length; index++) {
			results[index] = iterator(set[index], index, set);
		}
		return results;
	}

	/**
	 * **Reduce** builds up a single result from a list of values
	 * @param {Array|NodeList|NamedNodeMap} set
	 * @param {Function} iterator
	 * @param {*} [memo] Initial value of the memo.
	 */
	function reduce(set, iterator, memo) {
		for (var index = 0; index < set.length; index++) {
			memo = iterator(memo, set[index], index, set);
		}
		return memo;
	}

	/**
	 * **indexOf** find index of item in collection.
	 * @param {Array|NodeList} set
	 * @param {Object} item
	 * @param {number} idx
	 * @param {string} [prop] Property on set item to compare to item
	 */
	function indexOf(set, item, idx, prop) {
		for (/*idx = ~~idx*/; idx < set.length; idx++) {//start idx is always given as this is internal
			if ((prop ? set[idx][prop] : set[idx]) === item) return idx;
		}
		return -1;
	}

	/**
	 * @param {Object} obj
	 * @param {(string|number)} prop
	 * @return {boolean}
	 */
	function has(obj, prop) {
		return obj[prop] !== undefined; //will be nicely inlined by gcc
	}

	// GCC hack see http://stackoverflow.com/a/23202438/1517919
	function JSCompiler_renameProperty(a) {
		return a;
	}

	return MutationObserver;
})(void 0);

DOMSpot = (function DOMSpotCreator(){

var isIE;

if (navigator.appName == 'Microsoft Internet Explorer') {
	isIE = true;
} else if (navigator.userAgent.indexOf('Trident/') > -1) {
	isIE = true;
} else {
	isIE = false;
}

/**
 * The DOMSpot class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.1.0
 */
function DOMSpot() {

	var that       = this,
	    introduced = this._introduced = {};
	    placed     = this._placed = {};
	    taken      = this._taken = {};
	    removed    = this._removed = {};

	// "Appeared" timer
	this.timer = 250;

	// Don't stress IE too much
	if (isIE) {
		this.timer = 1500;
	}

	this._observer = new MutationObserver(function observeMutations(mutations) {

		var introducedResult,
		    removedResult,
		    mutation,
		    result,
		    query,
		    temp,
		    i,
		    j;

		for (i = 0; i < mutations.length; i++) {

			// Create a reference to the mutation
			mutation = mutations[i];

			// If nodes were added, fire the inserted callbacks
			if (mutation.addedNodes.length) {

				// Go over every introduced query we need to look for
				for (query in introduced) {

					// Find the query in the added nodes
					result = that.queryList(query, mutation.addedNodes);

					if (result.length) {

						introducedResult = [];

						// See if any of these elements are new
						for (j = 0; j < result.length; j++) {

							if (!result[j].__domspot_introduced) {
								result[j].__domspot_introduced = {};
							}

							if (!result[j].__domspot_introduced[query]) {

								// Elements without this property are new
								introducedResult.push(result[j]);

								// Set the property to true after all the queries have finished
								result[j].__domspot_introduced[query] = true;
							}
						}

						if (introducedResult.length) {
							for (j = 0; j < introduced[query].length; j++) {
								introduced[query][j](result);
							}
						}
					}
				}

				// Go over every placed query we need to look for
				for (query in that._placed) {

					//console.log(mutation.addedNodes);

					// Find the query in the added nodes
					result = that.queryList(query, mutation.addedNodes);

					if (result.length) {
						for (j = 0; j < that._placed[query].length; j++) {
							that._placed[query][j](result);
						}
					}
				}
			}

			// If nodes were removed, fire the removals callbacks
			if (mutation.removedNodes.length) {

				// Go over every query we need to look for
				for (query in that._taken) {

					// Find the query in the added nodes
					result = that.queryList(query, mutation.removedNodes);

					if (result.length) {
						for (j = 0; j < that._taken[query].length; j++) {
							that._taken[query][j](result);
						}
					}
				}

				// Go over every query we need to look for
				for (query in that._removed) {

					// Find the query in the added nodes
					result = that.queryList(query, mutation.removedNodes);

					if (result.length) {

						removedResult = [];

						// See if any of these elements were removed from the document
						for (j = 0; j < result.length; j++) {
							if (!document.contains(result[j])) {
								removedResult.push(result[j]);

								// Add the property to indicate the amount of
								// times this has been removed
								if (!result[j].__domspot_removed) {
									result[j].__domspot_removed = 0;
								}

								result[j].__domspot_removed++;
							}
						}

						if (removedResult.length) {
							for (j = 0; j < that._removed[query].length; j++) {
								that._removed[query][j](removedResult);
							}
						}
					}
				}
			}
		}
	});

	// Start observing the document body
	this._observer.observe(document, {childList: true, subtree: true });
};

/**
 * Query a nodelist or array
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
DOMSpot.prototype.queryList = function queryList(query, list) {

	var result = [],
	    temp,
	    i,
	    j;

	for (i = 0; i < list.length; i++) {

		if (!list[i].matchesSelector) {
			continue;
		}

		// Search the node for the given query
		if (list[i].matchesSelector(query)) {
			result.push(list[i]);
		}

		// Now look for the query inside the element
		temp = list[i].querySelectorAll(query);

		// Add all the found items to the result
		for (j = 0; j < temp.length; j++) {
			result.push(temp[j]);
		}
	}

	return result;
};

/**
 * Watch for a certain event
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
DOMSpot.prototype._watchType = function _watchType(type, query, includePresent, callback) {

	var presentFound, i;

	if (typeof includePresent == 'function') {
		callback = includePresent;
		includePresent = true;
	}

	// See if this query already exists
	if (!this[type][query]) {
		this[type][query] = [];

		if (includePresent || type == '_introduced') {
			
			// Get all the elements that already apply to this query
			presentFound = document.querySelectorAll(query);

			// Set the introduced property
			if (type == '_introduced') {
				for (i = 0; i < presentFound.length; i++) {
					if (!presentFound[i].__domspot_introduced) {
						presentFound[i].__domspot_introduced = {};
					}

					presentFound[i].__domspot_introduced[query] = true;
				}
			}

			if (includePresent && presentFound.length) {
				callback(presentFound);
			}
		}
	}

	// Add this query to the insertions watchlist
	this[type][query].push(callback);
};

/**
 * Watch for introducations of elements matching the given query.
 * This only fires the first time the element is added to the document.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   query           The CSS query to look for
 * @param    {Boolean}  includePresent  Fire for elements already on the page
 * @param    {Function} callback
 */
DOMSpot.prototype.introduced = function introduced(query, includePresent, callback) {
	this._watchType('_introduced', query, includePresent, callback);
};

/**
 * Watch for placements of elements matching the given query.
 * This will also follow an "introduced" callback
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   query           The CSS query to look for
 * @param    {Boolean}  includePresent  Fire for elements already on the page
 * @param    {Function} callback
 */
DOMSpot.prototype.placed = function placed(query, includePresent, callback) {
	this._watchType('_placed', query, includePresent, callback);
};

/**
 * Watch for taken elements of this query.
 * This will also precede a "removed" callback.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   query           The CSS query to look for
 * @param    {Function} callback
 */
DOMSpot.prototype.taken = function taken(query, callback) {
	this._watchType('_taken', query, false, callback);
};

/**
 * Watch for removed elements of this query.
 * This will fire every time the element is completely removed from the document
 * but it can still be put back (there is no way to detect "destroyed" items)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   query           The CSS query to look for
 * @param    {Function} callback
 */
DOMSpot.prototype.removed = function removed(query, callback) {
	this._watchType('_removed', query, false, callback);
};

/**
 * Watch for elements to appear on screen
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.1
 * @version  0.1.1
 *
 * @param    {String}   query           The CSS query to look for
 * @param    {Object}   options
 * @param    {Function} callback
 */
DOMSpot.prototype.appeared = function appeared(query, options, callback) {

	var that     = this,
	    existing = [],
	    check;

	if (typeof options === 'function') {
		callback = options;
		options = {};
	}

	if (typeof options.topOffset === 'undefined') {
		options.topOffset = 0;
	}

	if (typeof options.leftOffset === 'undefined') {
		options.leftOffset = 0;
	}

	if (!options.interval || typeof options.interval !== 'number') {
		options.interval = this.timer || 250;
	}

	// Get all the already existing items
	existing.push.apply(existing, document.querySelectorAll(query));

	check = function check() {

		var visible,
		    wLeft,
		    wTop,
		    item,
		    iTop,
		    iLeft,
		    i;

		if (!existing.length) {
			return;
		}

		// Use the scrollX property if it's available
		wLeft = window.scrollX;

		// If it has been found, also use the scrollY value
		if (wLeft != null) {
			wTop = window.scrollY;
		} else {
			// Use another method
			wLeft = (window.pageXOffset !== undefined) ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft;
			wTop = (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
		}

		visible = [];

		// Go in reverse so we can splice-remove items
		for (i = existing.length - 1; i >= 0; i--) {

			item = existing[i];

			if (options.parent) {
				item = item.parentElement;
			}

			if (!item || !item.offsetWidth) {
				continue;
			}

			iTop = that.getOffset(item, 'Top');
			iLeft = that.getOffset(item, 'Left');

			// Debug element positioning
			// console.log((iTop + item.offsetHeight), '>=', wTop);
			// console.log((iTop - options.topOffset), '<=', (wTop + window.innerHeight));
			// console.log((iLeft + item.offsetWidth), '>=', wLeft);
			// console.log((iLeft - options.leftOffset), '<=', (wLeft + window.innerWidth));

			if (iTop + item.offsetHeight >= wTop &&
				iTop - options.topOffset <= wTop + window.innerHeight &&
				iLeft + item.offsetWidth >= wLeft &&
				iLeft - options.leftOffset <= wLeft + window.innerWidth
				) {

				// Add it to the visible list
				visible.push(existing[i]);

				// Remove the original item
				existing.splice(i, 1);
			}
		}

		if (visible.length) {
			callback(visible);
		}
	};

	// Add new elements as they're being introduced
	this.introduced(query, false, function(elements) {
		existing.push.apply(existing, elements);
	});

	// Perform the check every given amount of milliseconds
	setInterval(check, options.interval);
};

/**
 * Get the wanted offset relative to the root
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.1
 * @version  0.1.1
 *
 * @param    {Object}   item
 * @param    {String}   type
 *
 * @return   {Number}
 */
DOMSpot.prototype.getOffset = function getOffset(item, type) {

	var result = item['offset' + type],
	    parent = item.offsetParent;

	while (parent) {
		result += parent['offset' + type];
		parent = parent.offsetParent;
	}

	return result;
};

return new DOMSpot();
}());