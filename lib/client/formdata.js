;
(function() {
	var f, l = "function" == typeof Object.defineProperties ? Object.defineProperty : function(b, a, d) {
			b != Array.prototype && b != Object.prototype && (b[a] = d.value)
		},
		m = "undefined" != typeof window && window === this ? this : "undefined" != typeof global && null != global ? global : this;

	function n() {
		n = function() {};
		m.Symbol || (m.Symbol = p)
	}
	var p = function() {
		var b = 0;
		return function(a) {
			return "jscomp_symbol_" + (a || "") + b++
		}
	}();

	function q() {
		n();
		var b = m.Symbol.iterator;
		b || (b = m.Symbol.iterator = m.Symbol("iterator"));
		"function" != typeof Array.prototype[b] && l(Array.prototype, b, {
			configurable: !0,
			writable: !0,
			value: function() {
				return t(this)
			}
		});
		q = function() {}
	}

	function t(b) {
		var a = 0;
		return u(function() {
			return a < b.length ? {
				done: !1,
				value: b[a++]
			} : {
				done: !0
			}
		})
	}

	function u(b) {
		q();
		b = {
			next: b
		};
		b[m.Symbol.iterator] = function() {
			return this
		};
		return b
	}

	function v(b) {
		q();
		n();
		q();
		var a = b[Symbol.iterator];
		return a ? a.call(b) : t(b)
	}

	function w(b) {
		for (var a, d = []; !(a = b.next()).done;) d.push(a.value);
		return d
	}
	if (!window.FormData || !window.FormData.prototype.keys) {
		var y = function(b, a, d) {
				if (2 > arguments.length) throw new TypeError("2 arguments required, but only " + arguments.length + " present.");
				return a instanceof Blob ? [b + "", a, void 0 !== d ? d + "" : "File" === Object.prototype.toString.call(a).slice(8, -1) ? a.name : "Blob"] : [b + "", a + ""]
			},
			A = function(b) {
				if (!arguments.length) throw new TypeError("1 argument required, but only 0 present.");
				return [b + ""]
			},
			B = function(b) {
				var a = v(b);
				b = a.next().value;
				a = a.next().value;
				b instanceof Blob && (b = new File([b], a, {
					type: b.type,
					lastModified: b.lastModified
				}));
				return b
			},
			C = window.FormData,
			D = window.XMLHttpRequest.prototype.send,
			E = window.Request && window.fetch;
		n();
		var F = window.Symbol && Symbol.toStringTag,
			G = new WeakMap,
			H = Array.from || function(b) {
				return [].slice.call(b)
			};
		F && (Blob.prototype[F] || (Blob.prototype[F] = "Blob"), "File" in window && !File.prototype[F] && (File.prototype[F] = "File"));
		try {
			new File([], "")
		} catch (b) {
			window.File = function File(a, d, c) {
				a = new Blob(a, c);
				c = c && void 0 !== c.lastModified ? new Date(c.lastModified) : new Date;
				Object.defineProperties(a, {
					name: {
						value: d
					},
					lastModifiedDate: {
						value: c
					},
					lastModified: {
						value: +c
					},
					toString: {
						value: function() {
							return "[object File]"
						}
					}
				});
				F && Object.defineProperty(a, F, {
					value: "File"
				});
				return a
			}
		}

		var I = function FormData(b) {
			G.set(this, Object.create(null));
			if (!b) return this;
			b = v(H(b.elements));
			for (var a = b.next(); !a.done; a = b.next()) {
				var d = a.value;
				a = d.name;
				var c = d.type,
					e = d.value,
					g = d.files,
					k = d.checked;
				d = d.selectedOptions;
				if (a)
					if ("file" === c)
						for (c = v(g), e = c.next(); !e.done; e = c.next()) this.append(a, e.value);
					else if ("select-multiple" === c || "select-one" === c)
					for (c = v(H(d)), e = c.next(); !e.done; e = c.next()) this.append(a, e.value.value);
				else "checkbox" === c || "radio" === c ? k && this.append(a, e) : this.append(a, e)
			}
		};
		f = I.prototype;
		f.append = function(b, a, d) {
			var c = G.get(this);
			c[b] || (c[b] = []);
			c[b].push([a, d])
		};
		f["delete"] = function(b) {
			delete G.get(this)[b]
		};
		f.entries = function() {
			function b(b, x) {
				for (;;) switch (a) {
					case 0:
						z = G.get(O);
						h = [];
						k = z;
						for (g in k) h.push(g);
						r = 0;
					case 1:
						if (!(r < h.length)) {
							a = 3;
							break
						}
						g = h[r];
						if (g in k) {
							a = 4;
							break
						}
						a = 2;
						break;
					case 4:
						e = v(z[g]), c = e.next();
					case 5:
						if (c.done) {
							a = 7;
							break
						}
						d = c.value;
						a = 8;
						return {
							value: [g, B(d)],
							done: !1
						};
					case 8:
						if (1 != b) {
							a = 9;
							break
						}
						a = -1;
						throw x;
					case 9:
					case 6:
						c = e.next();
						a = 5;
						break;
					case 7:
					case 2:
						r++;
						a = 1;
						break;
					case 3:
						a = -1;
					default:
						return {
							value: void 0,
							done: !0
						}
				}
			}
			var a = 0,
				d, c, e, g, k, r, h, z, O = this,
				x = {
					next: function() {
						return b(0, void 0)
					},
					"throw": function(a) {
						return b(1, a)
					},
					"return": function() {
						throw Error("Not yet implemented");
					}
				};
			q();
			x[Symbol.iterator] = function() {
				return this
			};
			return x
		};
		f.forEach = function(b, a) {
			for (var d = v(this), c = d.next(); !c.done; c = d.next()) {
				var e = v(c.value);
				c = e.next().value;
				e = e.next().value;
				b.call(a, e, c, this)
			}
		};
		f.get = function(b) {
			var a = G.get(this);
			return a[b] ? B(a[b][0]) : null
		};
		f.getAll = function(b) {
			return (G.get(this)[b] || []).map(B)
		};
		f.has = function(b) {
			return b in G.get(this)
		};
		f.keys = function() {
			function b(b, h) {
				for (;;) switch (a) {
					case 0:
						k = v(r), g = k.next();
					case 1:
						if (g.done) {
							a = 3;
							break
						}
						e = g.value;
						c = v(e);
						d = c.next().value;
						a = 4;
						return {
							value: d,
							done: !1
						};
					case 4:
						if (1 != b) {
							a = 5;
							break
						}
						a = -1;
						throw h;
					case 5:
					case 2:
						g = k.next();
						a = 1;
						break;
					case 3:
						a = -1;
					default:
						return {
							value: void 0,
							done: !0
						}
				}
			}
			var a = 0,
				d, c, e, g, k, r = this,
				h = {
					next: function() {
						return b(0, void 0)
					},
					"throw": function(a) {
						return b(1, a)
					},
					"return": function() {
						throw Error("Not yet implemented");
					}
				};
			q();
			h[Symbol.iterator] = function() {
				return this
			};
			return h
		};
		f.set = function(b, a, d) {
			G.get(this)[b] = [
				[a, d]
			]
		};
		f.values = function() {
			function b(b, h) {
				for (;;) switch (a) {
					case 0:
						k = v(r), g = k.next();
					case 1:
						if (g.done) {
							a = 3;
							break
						}
						e = g.value;
						c = v(e);
						c.next();
						d = c.next().value;
						a = 4;
						return {
							value: d,
							done: !1
						};
					case 4:
						if (1 != b) {
							a = 5;
							break
						}
						a = -1;
						throw h;
					case 5:
					case 2:
						g = k.next();
						a = 1;
						break;
					case 3:
						a = -1;
					default:
						return {
							value: void 0,
							done: !0
						}
				}
			}
			var a = 0,
				d, c, e, g, k, r = this,
				h = {
					next: function() {
						return b(0, void 0)
					},
					"throw": function(a) {
						return b(1, a)
					},
					"return": function() {
						throw Error("Not yet implemented");
					}
				};
			q();
			h[Symbol.iterator] = function() {
				return this
			};
			return h
		};
		f.stream = function() {
			try {
				return this._blob().stream()
			} catch (b) {
				throw Error("Include https://github.com/jimmywarting/Screw-FileReader for streaming support");
			}
		};
		I.prototype._asNative = function() {
			for (var b = new C, a = v(this), d = a.next(); !d.done; d = a.next()) {
				var c = v(d.value);
				d = c.next().value;
				c = c.next().value;
				b.append(d, c)
			}
			return b
		};
		I.prototype._blob = function() {
			for (var b = "----formdata-polyfill-" + Math.random(), a = [], d = v(this), c = d.next(); !c.done; c = d.next()) {
				var e = v(c.value);
				c = e.next().value;
				e = e.next().value;
				a.push("--" + b + "\r\n");
				e instanceof Blob ? a.push('Content-Disposition: form-data; name="' + c + '"; filename="' + e.name + '"\r\n', "Content-Type: " + (e.type || "application/octet-stream") + "\r\n\r\n", e, "\r\n") : a.push('Content-Disposition: form-data; name="' + c + '"\r\n\r\n' + e + "\r\n")
			}
			a.push("--" + b + "--");
			return new Blob(a, {
				type: "multipart/form-data; boundary=" + b
			})
		};
		n();
		q();
		I.prototype[Symbol.iterator] = function() {
			return this.entries()
		};
		I.prototype.toString = function() {
			return "[object FormData]"
		};
		F && (I.prototype[F] = "FormData");
		for (var J = {}, K = v([
				["append", y],
				["delete", A],
				["get", A],
				["getAll", A],
				["has", A],
				["set", y]
			]), L = K.next(); !L.done; J = {
				b: J.b,
				a: J.a
			}, L = K.next()) {
			var M = v(L.value),
				N = M.next().value;
			J.a = M.next().value;
			J.b = I.prototype[N];
			I.prototype[N] = function(b) {
				return function() {
					return b.b.apply(this, b.a.apply(null, [].concat(arguments instanceof Array ? arguments : w(v(arguments)))))
				}
			}(J)
		}
		XMLHttpRequest.prototype.send = function(b) {
			D.call(this, b instanceof I ? b._blob() : b)
		};
		if (E) {
			var P = window.fetch;
			window.fetch = function(b, a) {
				a && a.body && a.body instanceof I && (a.body = a.body._blob());
				return P(b, a)
			}
		}

		window.FormData = I
	};
}());