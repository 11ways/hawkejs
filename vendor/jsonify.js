/**
 * jQuery serializeObject
 * @copyright 2014, macek <paulmacek@gmail.com>
 * @link https://github.com/macek/jquery-serialize-object
 * @license BSD
 * @version 2.1.0
 */
(function(root, factory) {

	// AMD
	if (typeof define === "function" && define.amd) {
		define(["jquery", "exports"], function($, exports) {
			factory(root, exports, $);
		});
	}

	// CommonJS
	else if (typeof exports !== "undefined") {
		var $ = require("jquery");
		factory(root, exports, $);
	}

	// Browser
	else {
		root.FormSerializer = factory(root, {}, (root.jQuery || root.Zepto || root.ender || root.$));
	}

}(this, function(root, exports, $) {

	var FormSerializer = exports.FormSerializer = function FormSerializer(helper) {
		this._helper    = helper;
		this._object    = {};
		this._pushes    = {};
		this._patterns  = {
			validate: /^[a-z][a-z0-9_]*(?:\[(?:\d*|[a-z0-9_]+)\])*$/i,
			key:      /[a-z0-9_]+|(?=\[\])/gi,
			push:     /^$/,
			fixed:    /^\d+$/,
			named:    /^[a-z0-9_]+$/i
		};
	};

	FormSerializer.prototype._build = function _build(base, key, value) {
		base[key] = value;
		return base;
	};

	FormSerializer.prototype._makeObject = function _nest(root, value) {

		var keys = root.match(this._patterns.key), k;

		// nest, nest, ..., nest
		while ((k = keys.pop()) !== undefined) {
			// foo[]
			if (this._patterns.push.test(k)) {
				var idx = this._incrementPush(root.replace(/\[\]$/, ''));
				value = this._build([], idx, value);
			}

			// foo[n]
			else if (this._patterns.fixed.test(k)) {
				value = this._build([], k, value);
			}

			// foo; foo[bar]
			else if (this._patterns.named.test(k)) {
				value = this._build({}, k, value);
			}
		}

		return value;
	};

	FormSerializer.prototype._incrementPush = function _incrementPush(key) {
		if (this._pushes[key] === undefined) {
			this._pushes[key] = 0;
		}
		return this._pushes[key]++;
	};

	FormSerializer.prototype.addPair = function addPair(pair) {
		if (!this._patterns.validate.test(pair.name)) return this;
		var obj = this._makeObject(pair.name, pair.value);
		this._object = this._helper.extend(true, this._object, obj);
		return this;
	};

	FormSerializer.prototype.addPairs = function addPairs(pairs) {
		if (!this._helper.isArray(pairs)) {
			throw new Error("formSerializer.addPairs expects an Array");
		}
		for (var i=0, len=pairs.length; i<len; i++) {
			this.addPair(pairs[i]);
		}
		return this;
	};

	FormSerializer.prototype.serialize = function serialize() {
		return this._object
	};

	FormSerializer.prototype.serializeJSON = function serializeJSON() {
		return JSON.stringify(this.serialize());
	};

	FormSerializer.serializeObject = function serializeObject() {
		if (this.length > 1) {
			return new Error("jquery-serialize-object can only serialize one form at a time");
		}

		return new FormSerializer($).
			addPairs(this.serializeArray()).
			serialize();
	};

	FormSerializer.serializeJSON = function serializeJSON() {
		if (this.length > 1) {
			return new Error("jquery-serialize-object can only serialize one form at a time");
		}

		return new FormSerializer($).
			addPairs(this.serializeArray()).
			serializeJSON();
	};

	if (typeof $.fn !== "undefined") {
		$.fn.serializeObject = FormSerializer.serializeObject;
		$.fn.serializeJSON   = FormSerializer.serializeJSON;
		$.fn.jsonify         = FormSerializer.serializeObject;
	}

	return FormSerializer;
}));