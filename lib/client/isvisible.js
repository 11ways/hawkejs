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
	 * @param (ctx)     Context element
	 */
	_isVisible = function _isVisible(el, VISIBLE_PADDING, t, r, b, l, w, h, ctx) {

		var inner_height,
		    inner_width,
		    overflowx,
		    overflowy,
		    overflow,
		    styles,
		    parent,
		    rect;

		if (!ctx) {
			ctx = el;
		}

		// Check if this element is in the document, but only on the first call
		if (t == null && !elementInDocument(el)) {
			return false;
		}

		parent = el.parentNode;

		// Return true for document node
		if (parent == document.body || parent.nodeType === 9 || (parent.nodeType == 1 && parent.nodeName == 'HTML')) {

			// Let's see if the original element is somewhere on-screen
			if (ctx) {
				rect = ctx.getBoundingClientRect();

				inner_height = window.innerHeight;
				inner_width = window.innerWidth;

				if (VISIBLE_PADDING) {
					inner_height += VISIBLE_PADDING;
					inner_width += VISIBLE_PADDING;
				}

				if (inner_height < rect.top || inner_width < rect.left) {
					return false;
				}
			}


			return true;
		}

		// Get the computed styles of the element
		styles = getStyle(el);

		//-- Return false if our element is invisible
		if (styles.opacity === '0'
			|| styles.display === 'none'
			|| styles.visibility === 'hidden') {
			return false;
		}

		if (t == null) {
			t = el.offsetTop;
			l = el.offsetLeft;
			b = t + el.offsetHeight;
			r = l + el.offsetWidth;
			w = el.offsetWidth;
			h = el.offsetHeight;
		}

		// If we have a parent, let's continue:
		if (parent) {

			// Get the computed styles of this parent element
			styles = getStyle(parent);

			overflow = styles.overflow;
			overflowx = styles['overflow-x'];
			overflowy = styles['overflow-y'];

			// Check if the parent can hide its children.
			if ((  'hidden' === overflow  || 'scroll' === overflow
				|| 'hidden' === overflowx || 'scroll' === overflowx
				|| 'hidden' === overflowy || 'scroll' === overflowy)) {

				// It can, so now we check if it is in the viewport or not
				// It can still be occluded, but it's better than nothing
				rect = el.getBoundingClientRect();

				// Totally underneath the viewport
				if (rect.top - VISIBLE_PADDING > document.documentElement.clientHeight) {
					return false;
				}

				// Totally above the viewport
				if (rect.bottom + VISIBLE_PADDING < 0) {
					return false;
				}

				// Totally left of the viewport
				if (rect.right + VISIBLE_PADDING < 0) {
					return false;
				}

				// Totally right of the viewport
				if (rect.left - VISIBLE_PADDING > document.documentElement.clientWidth) {
					return false;
				}

				// Change the context to this scrollable-element
				// because the element we want might be visible,
				// it's parent might not be
				ctx = parent;
			}

			// Add the offset parent's left/top coords to our element's offset:
			if (el.offsetParent === parent) {
				l += parent.offsetLeft;
				t += parent.offsetTop;
			}

			// Let's recursively check upwards:
			return _isVisible(parent, VISIBLE_PADDING, t, r, b, l, w, h, ctx);
		}

		return true;
	};

	// Cross browser method to get style properties:
	if (window.getComputedStyle) {
		getStyle = function getStyle(el) {
			return document.defaultView.getComputedStyle(el,null);
		};
	} else {
		getStyle = function getStyle(el) {
			return el.currentStyle || {};
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