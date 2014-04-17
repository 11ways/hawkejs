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
// MutationObserver-Shim v0.2.1 (http://github.com/megawac/MutationObserver.js)
// Authors: Graeme Yeates (yeatesgraeme@gmail.com) 
window.MutationObserver=function(z,s){var e=z.MutationObserver||z.WebKitMutationObserver;if(!e){var D=Array.prototype.indexOf,E=Array.prototype.map,F=Array.prototype.reduce,t=function(b){var a={type:null,target:null,addedNodes:[],removedNodes:[],attributeName:null,attributeNamespace:null,oldValue:null},c;for(c in b)a[c]!==s&&(a[c]=b[c]);return a},A=function(b,a){function c(b,p){var m=3===b.nodeType,q={j:b};a.a&&!m&&(p||a.d)&&(q.a=F.call(b.attributes,function(b,c){if(!a.e||a.e[c.name])b[c.name]=c.value;
return b},{}));a.b&&m&&(q.b=b.nodeValue);if((a.c||a.b)&&(p||a.d)||a.a&&a.d)q.c=E.call(b.childNodes,function(a){return c(a,!1)});return q}return c(b,!0)},y=function(b,a,c,d){for(var p={},m=a.attributes,q,n,r=m.length;r--;)q=m[r],n=q.name,d&&d[n]===s||(q.value!==c[n]&&b.push(t({type:"attributes",target:a,attributeName:n,oldValue:c[n],attributeNamespace:q.namespaceURI})),p[n]=!0);for(n in c)p[n]||b.push(t({target:a,type:"attributes",attributeName:n,oldValue:c[n]}))},B=1,C=function(b){try{return b.id||
(b.mo_id=b.mo_id||B++)}catch(a){try{return b.nodeValue}catch(c){return B++}}},H=function(b,a,c,d){function p(a,c){for(var r=a.childNodes,e=c.c,G=r.length,x=e.length,g,h,f,l,k,u,v=0,w=0;v<G||w<x;)if(k=r[v],u=(f=e[w])&&f.j,k===u)d.a&&f.a&&y(b,k,f.a,d.e),d.b&&3===k.nodeType&&k.nodeValue!==f.b&&b.push(t({type:"characterData",target:k,oldValue:f.b})),h&&m(h,a,r,e),d.d&&(k.firstChild||f.c.length)&&p(k,f),v++,w++;else{g||(g={},h=[]);if(k){l=f=C(k);if(g[l]===s){a:{for(l=w;l<e.length;l++)if(e[l].j===k)break a;
l=-1}-1===l?d.c&&b.push(t({type:"childList",target:a,addedNodes:[k]})):(g[f]=!0,h.push({h:v,i:l}))}v++}if(u){k=f=C(u);if(g[k]===s)if(-1===(l=D.call(r,u,v)))d.c&&b.push(t({type:"childList",target:c.j,removedNodes:[u]}));else if(0===l)continue;else g[f]=!0,h.push({h:l,i:w});w++}}h&&m(h,a,r,e)}function m(a,c,e,m){for(var s=a.length-1,x=-~(s/2),g,h,f;f=a.pop();)g=e[f.h],h=m[f.i],d.c&&x&&Math.abs(f.h-f.i)>=s&&(b.push(t({type:"childList",target:c,addedNodes:[g],removedNodes:[g]})),x--),d.a&&h.a&&y(b,g,
h.a,d.e),d.b&&3===g.nodeType&&g.nodeValue!==h.b&&b.push(t({type:"characterData",target:g,oldValue:h.b})),d.d&&p(g,h)}p(a,c)},I=function(b,a){var c=A(b,a);return function(d){var e=d.length;a.a&&c.a&&y(d,b,c.a,a.e);(a.c||a.d)&&H(d,b,c,a);d.length!==e&&(c=A(b,a))}},e=function(b){var a=this;a.g=[];a.k=function(){var c=a.takeRecords();c.length&&b.call(a,c,a);a.f=setTimeout(a.k,e._period)}};e._period=30;e.prototype.observe=function(b,a){for(var c=this.g,d=0;d<c.length;d++)if(c[d].m===b){c.splice(d,1);break}d=
{a:!!(a.attributes||a.attributeFilter||a.attributeOldValue),c:!!a.childList,d:!!a.subtree,b:!(!a.characterData&&!a.characterDataOldValue)};a.attributeFilter&&(d.e=a.attributeFilter.reduce(function(a,b){a[b]=!0;return a},{}));c.push({m:b,l:I(b,d)});this.f||this.k()};e.prototype.takeRecords=function(){for(var b=[],a=this.g,c=0;c<a.length;c++)a[c].l(b);return b};e.prototype.disconnect=function(){this.g.length=0;clearTimeout(this.f);this.f=null}}return e}(window);


DOMSpot = (function DOMSpotCreator(){

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
		options.interval = 250;
	}

	// Get all the already existing items
	existing.push.apply(existing, document.querySelectorAll(query));

	check = function check() {

		var visible,
		    wLeft,
		    wTop,
		    item,
		    i;

		if (!existing.length) {
			return;
		}

		wLeft = window.scrollX;
		wTop = window.scrollY;

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

			if (item.offsetTop + item.offsetHeight >= wTop &&
				item.offsetTop - options.topOffset <= wTop + window.innerHeight &&
				item.offsetLeft + item.offsetWidth >= wLeft &&
				item.offsetLeft - options.leftOffset <= wLeft + window.innerWidth
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

return new DOMSpot();
}());