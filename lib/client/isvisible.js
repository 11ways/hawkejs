/**
 * Author: Jason Farrell
 * Author URI: http://useallfive.com/
 *
 * Modified by Jelle De Loecker for Hawkejs
 *
 * Description: Checks if a DOM element is truly visible.
 * Package URL: https://github.com/UseAllFive/true-visibility
 */
module.exports = function hawkejsElementVisible(Hawkejs, Blast) {

	'use strict';

	var elementInDocument,
	    _isVisible,
	    isVisible,
	    getStyle;

	isVisible = function isVisible(padding) {
		return _isVisible(this, padding || 2)
	};

	/**
	 * Checks if a DOM element is visible. Takes into
	 * consideration its parents and overflow.
	 *
	 * @param (el)      the DOM element to check if is visible
	 *
	 * These params are optional that are sent in recursively,
	 * you typically won't use these:
	 *
	 * @param (t)       Top corner position number
	 * @param (r)       Right corner position number
	 * @param (b)       Bottom corner position number
	 * @param (l)       Left corner position number
	 * @param (w)       Element width number
	 * @param (h)       Element height number
	 */
	_isVisible = function _isVisible(el, VISIBLE_PADDING, t, r, b, l, w, h) {

		var p;

		p = el.parentNode;

		if ( !elementInDocument(el) ) {
			return false;
		}

		//-- Return true for document node
		if ( 9 === p.nodeType ) {
			return true;
		}

		//-- Return false if our element is invisible
		if (
			 '0' === getStyle(el, 'opacity') ||
			 'none' === getStyle(el, 'display') ||
			 'hidden' === getStyle(el, 'visibility')
		) {
			return false;
		}

		if (
			'undefined' === typeof t ||
			'undefined' === typeof r ||
			'undefined' === typeof b ||
			'undefined' === typeof l ||
			'undefined' === typeof w ||
			'undefined' === typeof h
		) {
			t = el.offsetTop;
			l = el.offsetLeft;
			b = t + el.offsetHeight;
			r = l + el.offsetWidth;
			w = el.offsetWidth;
			h = el.offsetHeight;
		}
		//-- If we have a parent, let's continue:
		if ( p ) {
			//-- Check if the parent can hide its children.
			if ( ('hidden' === getStyle(p, 'overflow') || 'scroll' === getStyle(p, 'overflow')) ) {
				//-- Only check if the offset is different for the parent
				if (
					//-- If the target element is to the right of the parent elm
					l - VISIBLE_PADDING > p.offsetWidth + p.scrollLeft ||
					//-- If the target element is to the left of the parent elm
					l + w + VISIBLE_PADDING < p.scrollLeft ||
					//-- If the target element is under the parent elm
					t - VISIBLE_PADDING > p.offsetHeight + p.scrollTop ||
					//-- If the target element is above the parent elm
					t + h + VISIBLE_PADDING < p.scrollTop
				) {
					//-- Our target element is out of bounds:
					return false;
				}
			}
			//-- Add the offset parent's left/top coords to our element's offset:
			if ( el.offsetParent === p ) {
				l += p.offsetLeft;
				t += p.offsetTop;
			}
			//-- Let's recursively check upwards:
			return _isVisible(p, VISIBLE_PADDING, t, r, b, l, w, h);
		}
		return true;
	};

	//-- Cross browser method to get style properties:
	if (window.getComputedStyle) {
		getStyle = function getStyle(el, property) {
			return document.defaultView.getComputedStyle(el,null)[property];
		};
	} else {
		getStyle = function getStyle(el, property) {
			if (el.currentStyle) {
				return el.currentStyle[property];
			}
		};
	}

	elementInDocument = function elementInDocument(element) {
		while (element = element.parentNode) {
			if (element == document) {
					return true;
			}
		}
		return false;
	};

	// Set the 'isVisible' method on the element prototype
	Blast.definePrototype('Element', 'isVisible', isVisible, true);
};