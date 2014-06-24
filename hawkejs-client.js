window.hawkejs = (function(){

	var ClientSide = true,
	    Hawkejs,
	    clientFiles,
	    instance;

	function require(identifier) {

		if (identifier == 'path' || identifier == 'fs') {
			return {};
		}

		var path = require.resolve(identifier),
		    mod  = require.modules[identifier] || require.modules[path];

		if (!mod) throw new Error('failed to require "' + identifier + '"');

		if (!mod.exports) {
			mod.exports = {};
			mod.call(mod.exports, mod, mod.exports, require.relative(identifier));
		}
		
		return mod.exports;
	}

	require.modules = {};

	require.resolve = function resolve(path, recursive) {

		var orig = path,
		    reg = path + '.js',
		    index = path + '/index.js',
		    result;

		result = require.modules[reg] && reg
			|| require.modules[index] && index;

		if (!result && !recursive) {
			result = resolve('lib/class/' + orig, true);
		}

		return result || orig;
	};

	require.register = function register(path, fn) {
		require.modules[path] = fn;
	};

	require.relative = function relative(parent) {
		return function(p) {
			if ('.' != p.substr(0, 1)) return require(p);
			
			var path = parent.split('/'),
			    segs = p.split('/');

			path.pop();
			
			for (var i = 0; i < segs.length; i++) {
				var seg = segs[i];
				if ('..' == seg) path.pop();
				else if ('.' != seg) path.push(seg);
			}

			return require(path.join('/'));
		};
	};

	
require.register("async", function(module, exports, require){
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
              data = [data];
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

});
require.register("nuclei", function(module, exports, require){
var events       = require('events'),
    eventEmitter = new events.EventEmitter(),
    Classes      = {},
    NucleiBaseConstructor,
    augmentObject,
    designator,
    Nuclei,
    inject;

/**
 * Tell all the methods inside an object where they come from
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @type   {Function}
 *
 * @param    {Object}   object     The object containing the methods (prototype)
 * @param    {String}   ownerName  The name of the owner class
 * @param    {String}   parentName The name of the parent class
 */
designator = function designator(object, ownerName, parentName) {

	var methodName;

	if (typeof object !== 'object') return;

	// Go over every method in the given object
	for (methodName in object) {

		// If the method is a function and doesn't have an owner set yet
		if (typeof object[methodName] === 'function'&& !object[methodName].__ownerClass__) {
			object[methodName].__ownerClass__ = ownerName;
			object[methodName].__parentClass__ = parentName;
		}
	}
};

/**
 * Inject the properties of one or more objects into the target object.
 * The target object is modified in place and also returned.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   target     The object to inject the extension into
 * @param   {Object}   first      The object to inject
 *
 * @returns {Object}   Returns the injected target
 */
inject = function inject(target, first, second) {
	
	var length = arguments.length,
	    extension,
	    argumentNr,
	    propertyNr;
	
	// Go over every argument, other than the first
	for (argumentNr = 1; argumentNr <= length; argumentNr++) {
		extension = arguments[argumentNr];

		// Go over every property of the current object
		for (propertyNr in extension) {
			target[propertyNr] = extension[propertyNr];
		}
	}
	
	return target;
};

/**
 * Augment certain properties into an instance's context,
 * without modifying the original instance.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   original   The original instance/context
 * @param    {Object}   addition   The object to inject into it
 *
 * @return   {Object}
 */
augmentObject = function augment(original, addition) {

	var OriginalContextWrapper, augmentedContext;
	
	// Create a new, empty function
	OriginalContextWrapper = function OriginalContextWrapper(){};

	// Set the original context object as its prototype
	OriginalContextWrapper.prototype = original;

	// Now create a new instance of it
	augmentedContext = new OriginalContextWrapper();

	// If a (valid) addition is given, augment it
	if (typeof addition === 'object') {
		// Now inject the additions into the new context,
		// this will leave the original context untouched
		inject(augmentedContext, addition);

		// Also add the additions one level deeper,
		// that way we can retrieve what was augmented
		inject(augmentedContext, {__augment__: addition});

		// If this instance has an augmented() method, run it
		if (typeof augmentedContext.augmented === 'function') {
			augmentedContext.augmented(addition);
		}
	}

	// Finally return the augmentedContext
	return augmentedContext;
};

/**
 * The NucleiBaseConstructor function
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @type   {Function}
 */
NucleiBaseConstructor = function NucleiBaseConstructor() {};

/**
 * The function that does the extending
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.2.3
 *
 * @type   {Function}
 *
 * @param    {Function}   _extension   The extending class
 * @param    {Object}     _options     Extra options
 * @param    {Object}     _three       Depends on overloading...
 *
 * @returns  {Function}   A new class
 */
NucleiBaseConstructor.extend = function extend(_extension, _options, _three, _callback) {

	var origin    = this,        // The originating class
	    options   = _options,
	    callback  = _callback,
	    extension = _extension,  // The new, extending class
	    new_constructor,
	    also,
	    key;
	
	// Function overloading handler
	if (typeof _options !== 'object') {
		if (typeof _three === 'object') {
			options = _three;
			_three = undefined;
		}
		else options = {};
	}
	
	if (typeof _options === 'function') {
		extension = _options;
		_options = undefined;
	}
	
	if (typeof _extension === 'string') {
		origin = Classes[_extension];
	}

	if (typeof extension !== 'function') {
		if (typeof _three === 'function') {
			extension = _three;
		} else {
			// If there is no extension function, the name has to be inside
			// the options object
			eval('extension = function ' + options.name + '() {};');
		}
	}

	// Register new classes by default
	if (typeof options.register === 'undefined') options.register = true;
	
	if (!options.name) {
		options.name = '';
		if (extension.name) {
			options.name = extension.name;
		} else {
			// If the extending function does not have a name, disable registering
			options.register = false;
		}
	}

	// Create a new instance of the class that is being extended
	// Passing the __extending__ option will make sure
	// the init() method is not called
	var _super = new origin({__extending__: true, __overloading__: options.overloading});

	// Create a temporary instance of the extension class
	// Since no extension has happened yet, no NucleiBaseConstructor magic is inside this
	// class. It won't do anything funky.
	var _child = new extension();

	// Set the method ownership
	designator(_child, options.name, origin.name);

	// Create the first part of the new constructor
	// We apply it later on inside new_constructor, this way we don't have to
	// put everything inside a big string
	var internal_constructor = function internal_constructor() {

		var arg,
		    passArgs,
		    isObject,
		    i;

		// Don't look for anything in the base constructor,
		// it's just an empty function
		if (origin.name !== 'NucleiBaseConstructor') {

			arg = arguments[0];
			isObject = typeof arg === 'object';

			// Only call the parent __ic__ when not extending
			if (!(isObject && arg.__extending__ === true)) {
				this.parent('__ic__', null, {__instancing__: true});
			}
			
			// Only call the init functions when not creating a temporary object
			if (!(isObject && (arg.__extending__ === true || arg.__instancing__ === true))) {

				if (isObject && arg.__passArgs__) {
					passArgs = arg.__passArgs__;
				} else {
					passArgs = arguments;
				}

				if (also && also.length) {
					for (i = 0; i < also.length; i++) {
						also[i].call(this);
					}
				}

				if (typeof this.preInit === 'function') this.preInit.apply(this, passArgs);
				if (typeof this.init === 'function') this.init.apply(this, passArgs);
				if (typeof this.postInit === 'function') this.postInit.apply(this, passArgs);
			}
		}
	};

	// Use eval to create the constructor for our new class,
	// that way we can set the class (function) name (options.name)
	eval('new_constructor = function ' + options.name + '(){\
		if (!(this instanceof ' + options.name + ')) {\
			throw new Error("Constructor called without new operator");\
		}; internal_constructor.apply(this, arguments)}');
	
	// Set the new parent object as the prototype
	new_constructor.prototype = _super;

	new_constructor.prototype.__parentName = origin.name;
	new_constructor.prototype.__parentClass = origin;

	// Check for multiple inheritance
	if (options.also) {

		also = options.also;

		if (!Array.isArray(also)) {
			also = [also];
		}

		for (i = 0; i < also.length; i++) {
			for (key in also[i].prototype) {
				new_constructor.prototype[key] = also[i].prototype[key];
			}
		}
	}

	// Inject the extending object into the prototype
	for (i in _child) new_constructor.prototype[i] = _child[i];

	// Add the internal constructor
	new_constructor.prototype.__ic__ = internal_constructor;

	// Tell all the methods who owns them
	designator(new_constructor.prototype, options.name, this.name);
	
	// Make it inherit all the class methods, too
	for (key in origin) new_constructor[key] = origin[key];
	for (key in extension) new_constructor[key] = extension[key];

	// Make sure the correct function is set as the constructor
	new_constructor.prototype.constructor = extension;
	
	// Set the name in the prototype, so objects will have this set correctly
	// Don't forget: once a function's .name has been set, it can't be changed
	new_constructor.prototype.name = options.name;
	
	// Set the parent class
	new_constructor.parent = origin;
	
	// Register the class if needed
	if (options.register) {
		
		var _doRegister = true;
		
		if (!options.overloading && typeof Classes[options.name] != 'undefined') {
			console.error('You are overloading an object by using the extending function. Use overload instead');
		}
		
		if (_doRegister) Classes[options.name] = new_constructor;
	}
	
	if (typeof origin.prototype.__extended__ === 'function') {
		origin.prototype.__extended__(origin, new_constructor);
	}
	
	// If the extended callback has been set, call it
	if (exports.extended) {
		exports.extended(new_constructor);
	}

	eventEmitter.emit('ClassExtended', new_constructor);
	eventEmitter.emit('ClassExtended-' + options.name);
	
	if (options.overloading) {
		
		if (typeof new_constructor.__overloaded__ == 'function') {
			new_constructor.__overloaded__(origin.name, origin);
		}
		
		eventEmitter.emit('ClassOverloaded-' + options.name);
	}

	return new_constructor;
};

/**
 * Overloading is basically the same as extending a class,
 * but it overwrites the existing class.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Function}   _overload    The extending class
 * @param    {Object}     _extra       Extra options
 *
 * @returns  {Function}   A new class
 */
NucleiBaseConstructor.overload = function overload(_overload, _extra) {

	var className = this.name,
	    overloader;

	if (typeof _overload === 'string') {
		className = _overload;
		_overload = _extra;
	}

	// The actual function that does the overloading
	overloader = function overloader() {
		var NucleiBaseConstructor = Classes[className];
		NucleiBaseConstructor.extend(_overload, {overloading: true});
	}
	
	if (typeof Classes[className] !== 'undefined') {
		overloader();
	} else {
		
		// If the class does not exist yet, wait 'till it does
		eventEmitter.once('ClassExtended-' + className, function() {
			overloader();
		});
	}
};

/**
 * Create the actual Nuclei class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @type   {Function}
 */
Nuclei = NucleiBaseConstructor.extend(function Nuclei() {


	/**
	 * Function that runs when this class is being extended
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @type   {Function}
	 *
	 * @param  {String}    parentClassName
	 */
	//this.__extended__ = function __extended__(parentClassName) {};

	/**
	 * Function that runs when this class is instanced,
	 * before this.init()
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.1
	 * @version  0.1.1
	 *
	 * @type   {Function}
	 */
	//this.preInit = function preInit() {};
	
	/**
	 * Function that runs when this class is instanced
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @type   {Function}
	 */
	//this.init = function init() {};

	/**
	 * Function that runs when this class is instanced,
	 * after this.init()
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.1
	 * @version  0.1.1
	 *
	 * @type   {Function}
	 */
	//this.postInit = function postInit() {};

	/**
	 * Function that runs when an instance of this class has been augmented
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @type   {Function}
	 *
	 * @param  {Object}   addition
	 */
	this.augmented = function augmented(addition) {};

	/**
	 * Augment the current instance of this class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @type   {Function}
	 *
	 * @param  {Object}   addition
	 *
	 * @return {Object}
	 */
	this.augment = function augment(addition) {
		return augmentObject(this, addition);
	};

	/**
	 * Execute a method function from the parent
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @type   {Function}
	 *
	 * @param    {String}   functionname         The name of the wanted property
	 * @param    {Boolean}  useCallingArguments  If true, the arguments from the
	 *                                           calling function will be applied
	 *                                           If an array, these will be applied
	 * @param    {Array}    extraArguments       All other arguments will be applied
	 */
	this.parent = function parent(functionName, useCallingArguments) {
		
		var caller = arguments.callee.caller,
		    searchClass,
		    foundMethod,
		    possibleTarget,
		    parent,
		    args;

		if (typeof useCallingArguments === 'undefined') useCallingArguments = true;
		if (typeof functionName !== 'string') functionName = caller.name;
		
		// If there is no valid functionName, do nothing
		if (!functionName) return;

		// If no parent class is set on the method, it could have been added
		// later through the prototype.
		if (!caller.__parentClass__) {

			// Begin looking for the method in the current class
			searchClass = Classes[this.name];

			// Do this while there is a current class, we'll look through
			// every parent if needed
			while (searchClass) {

				// If the current class has the method inside its prototype,
				// it belongs here
				if (searchClass.prototype.hasOwnProperty(functionName)) {
					foundMethod = searchClass.prototype[functionName];
					break;
				} else {
					// If not, use the parent class as the current class
					searchClass = searchClass.parent;
				}
			}

			// If we've found the method add the appropriate properties,
			// so we won't have to do this again
			if (foundMethod) {
				foundMethod.__ownerClass__ = searchClass.name;
				foundMethod.__parentClass__ = searchClass.parent.name;
			} else {
				return;
			}
		}
		
		// Where to find the parent function or property
		parent = Classes[caller.__parentClass__];

		// If no parent is found, do nothing
		if (!parent) return;

		possibleTarget = parent[functionName];
		
		if (typeof possibleTarget === 'undefined') {
			possibleTarget = parent.prototype[functionName];
		}

		if (typeof possibleTarget === 'function') {

			// Use the arguments from the function that called us
			if (useCallingArguments === true) {
				args = arguments.callee.caller.arguments;
			} else if (useCallingArguments && (useCallingArguments instanceof Array || typeof useCallingArguments.length != 'undefined')) {
				// If it's an array, use those as arguments
				args = useCallingArguments;
			} else {
				// Turn the array-like arguments object into a real array
				// But leave out the function name and useCallingArguments
				args = Array.prototype.slice.call(arguments, 2);
			}
			
			// Execute the parent function with the appropriate arguments
			return possibleTarget.apply(this, args);
		} else if (typeof possibleTarget !== 'undefined') {
			return possibleTarget;
		} else {
			console.warn('Could not find parent property ' + functionName + ' from ' + caller.__ownerClass__ + ' looking in ' + caller.__parentClass__ + ' (Request context: ' + this.name + ')');
		}
	};

});

// Export the Nuclei class
exports.Nuclei = Nuclei;

// Export the collection of classes
exports.Classes = Classes;

// Export the inject function
exports.inject = inject;

// Export the augment function
exports.augment = augmentObject;

// Export the event emitter
exports.events = eventEmitter;

// Export the extended callback property
exports.extended = false;
});
require.register("events", function(module, exports, require){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
	this._events = this._events || {};
	this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
	if (!isNumber(n) || n < 0 || isNaN(n))
		throw TypeError('n must be a positive number');
	this._maxListeners = n;
	return this;
};

EventEmitter.prototype.emit = function(type) {
	var er, handler, len, args, i, listeners;

	if (!this._events)
		this._events = {};

	// If there is no 'error' event listener then throw.
	if (type === 'error') {
		if (!this._events.error ||
				(isObject(this._events.error) && !this._events.error.length)) {
			er = arguments[1];
			if (er instanceof Error) {
				throw er; // Unhandled 'error' event
			} else {
				throw TypeError('Uncaught, unspecified "error" event.');
			}
			return false;
		}
	}

	handler = this._events[type];

	if (isUndefined(handler))
		return false;

	if (isFunction(handler)) {
		switch (arguments.length) {
			// fast cases
			case 1:
				handler.call(this);
				break;
			case 2:
				handler.call(this, arguments[1]);
				break;
			case 3:
				handler.call(this, arguments[1], arguments[2]);
				break;
			// slower
			default:
				len = arguments.length;
				args = new Array(len - 1);
				for (i = 1; i < len; i++)
					args[i - 1] = arguments[i];
				handler.apply(this, args);
		}
	} else if (isObject(handler)) {
		len = arguments.length;
		args = new Array(len - 1);
		for (i = 1; i < len; i++)
			args[i - 1] = arguments[i];

		listeners = handler.slice();
		len = listeners.length;
		for (i = 0; i < len; i++)
			listeners[i].apply(this, args);
	}

	return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
	var m;

	if (!isFunction(listener))
		throw TypeError('listener must be a function');

	if (!this._events)
		this._events = {};

	// To avoid recursion in the case that type === "newListener"! Before
	// adding it to the listeners, first emit "newListener".
	if (this._events.newListener)
		this.emit('newListener', type,
							isFunction(listener.listener) ?
							listener.listener : listener);

	if (!this._events[type])
		// Optimize the case of one listener. Don't need the extra array object.
		this._events[type] = listener;
	else if (isObject(this._events[type]))
		// If we've already got an array, just append.
		this._events[type].push(listener);
	else
		// Adding the second element, need to change to array.
		this._events[type] = [this._events[type], listener];

	// Check for listener leak
	if (isObject(this._events[type]) && !this._events[type].warned) {
		var m;
		if (!isUndefined(this._maxListeners)) {
			m = this._maxListeners;
		} else {
			m = EventEmitter.defaultMaxListeners;
		}

		if (m && m > 0 && this._events[type].length > m) {
			this._events[type].warned = true;
			console.error('(node) warning: possible EventEmitter memory ' +
										'leak detected. %d listeners added. ' +
										'Use emitter.setMaxListeners() to increase limit.',
										this._events[type].length);
			if (typeof console.trace === 'function') {
				// not supported in IE 10
				console.trace();
			}
		}
	}

	return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
	if (!isFunction(listener))
		throw TypeError('listener must be a function');

	var fired = false;

	function g() {
		this.removeListener(type, g);

		if (!fired) {
			fired = true;
			listener.apply(this, arguments);
		}
	}

	g.listener = listener;
	this.on(type, g);

	return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
	var list, position, length, i;

	if (!isFunction(listener))
		throw TypeError('listener must be a function');

	if (!this._events || !this._events[type])
		return this;

	list = this._events[type];
	length = list.length;
	position = -1;

	if (list === listener ||
			(isFunction(list.listener) && list.listener === listener)) {
		delete this._events[type];
		if (this._events.removeListener)
			this.emit('removeListener', type, listener);

	} else if (isObject(list)) {
		for (i = length; i-- > 0;) {
			if (list[i] === listener ||
					(list[i].listener && list[i].listener === listener)) {
				position = i;
				break;
			}
		}

		if (position < 0)
			return this;

		if (list.length === 1) {
			list.length = 0;
			delete this._events[type];
		} else {
			list.splice(position, 1);
		}

		if (this._events.removeListener)
			this.emit('removeListener', type, listener);
	}

	return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
	var key, listeners;

	if (!this._events)
		return this;

	// not listening for removeListener, no need to emit
	if (!this._events.removeListener) {
		if (arguments.length === 0)
			this._events = {};
		else if (this._events[type])
			delete this._events[type];
		return this;
	}

	// emit removeListener for all listeners on all events
	if (arguments.length === 0) {
		for (key in this._events) {
			if (key === 'removeListener') continue;
			this.removeAllListeners(key);
		}
		this.removeAllListeners('removeListener');
		this._events = {};
		return this;
	}

	listeners = this._events[type];

	if (isFunction(listeners)) {
		this.removeListener(type, listeners);
	} else {
		// LIFO order
		while (listeners.length)
			this.removeListener(type, listeners[listeners.length - 1]);
	}
	delete this._events[type];

	return this;
};

EventEmitter.prototype.listeners = function(type) {
	var ret;
	if (!this._events || !this._events[type])
		ret = [];
	else if (isFunction(this._events[type]))
		ret = [this._events[type]];
	else
		ret = this._events[type].slice();
	return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
	var ret;
	if (!emitter._events || !emitter._events[type])
		ret = 0;
	else if (isFunction(emitter._events[type]))
		ret = 1;
	else
		ret = emitter._events[type].length;
	return ret;
};

function isFunction(arg) {
	return typeof arg === 'function';
}

function isNumber(arg) {
	return typeof arg === 'number';
}

function isObject(arg) {
	return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
	return arg === void 0;
}
});
require.register("hawkevents", function(module, exports, require){
/*!
* Hawkevents, a queryable event emitter
* Originally created in Hawkejs
*
* https://github.com/skerit/hawkevents
*
* Copyright (c) 2013-2014 Jelle De Loecker <jelle@codedor.be>
* Licensed under the MIT license.
*/
;!function(undefined) {

	/**
	 * The Hawkevents constructor
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.8
	 * @version  0.1.0
	 */
	function Hawkevents() {

		// Queryable listeners
		this.queue = [];

		// Regular string listeners
		this.listeners = {};

		// Which events have we seen, with emitted objects
		this.seenQueue = [];

		// Which events have we seen?
		this.seenEvents = {};
	};

	/**
	 * Emit an event
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.8
	 * @version  0.1.0
	 *
	 * @param    {Object}   identifier   An object containing identifiers
	 * @param    {Mixed}    data         Data to give to the callbacks
	 * @param    {Function} callback     Function to execute when events have fired
	 */
	Hawkevents.prototype.emit = function emit(identifier, data, callback) {

		var remove,
		    idIsString,
		    idObject,
		    listener,
		    doit,
		    name,
		    ctx,
		    i;

		idIsString = (typeof identifier === 'string');

		if (typeof data === 'function') {
			callback = data;
			data = undefined;
		}

		// Create a context
		ctx = {
			'stop': function() {
				ctx.prevent = true;
			},
			'prevent': false
		};

		remove = [];

		// If the identifier is a simple string
		if (idIsString) {

			this.seenEvents[identifier] = true;

			// See if any listeners are provided
			if (this.listeners[identifier]) {

				for (i = 0; i < this.listeners[identifier].length; i++) {
					listener = this.listeners[identifier][i];

					listener.callback.call(ctx, identifier, data);

					// If the amount to run this event is bigger than 0, do some checks
					if (listener.amount > 0) {

						// Decrease the amount it can run by one
						listener.amount--;

						// If it has hit zero now, remove it later
						if (listener.amount === 0) {
							remove.push(i);
						}
					}
				}

				if (remove.length) {
					remove.reverse();

					for (i = 0; i < remove.length; i++) {
						this.listeners[identifier].splice(remove[i], 1);
					}
				}
			}
		} else {

			this.seenQueue.push(identifier);

			// Go over every listener in the queue
			for (i = 0; i < this.queue.length; i++) {
				listener = this.queue[i];

				// See if this should be done
				doit = this.matchQuery(identifier, listener.query);

				if (doit && !ctx.prevent) {
					listener.callback.call(ctx, identifier, data);

					// If the amount to run this event is bigger than 0, do some checks
					if (listener.amount > 0) {

						// Decrease the amount it can run by one
						listener.amount--;

						// If it has hit zero now, remove it later
						if (listener.amount === 0) {
							remove.push(i);
						}
					}
				}
			}

			// If we've added any listener nrs to be removed
			if (remove.length) {
				// Reverse the remove array
				remove.reverse();

				// Now remove the old entries
				for (i = 0; i < remove.length; i++) {
					this.queue.splice(remove[i], 1);
				}
			}
		}

		if (callback && !ctx.prevent) callback();
	};

	/**
	 * Emit an event if it hasn't been emitted before
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}   identifier   An object containing identifiers
	 * @param    {Mixed}    data         Data to give to the callbacks
	 * @param    {Function} callback     Function to execute when events have fired
	 */
	Hawkevents.prototype.emitOnce = function emitOnce(identifier, data, callback) {

		var idIsString = (typeof identifier === 'string'),
		    match,
		    i;

		if (idIsString) {
			if (this.seenEvents[identifier]) {
				return;
			}
		} else {
			// See if the query matches any emitted events
			for (i = 0; i < this.seenQueue.length; i++) {
				if(this.matchQuery(identifier, this.seenQueue[i])) {
					return;
				}
			}
		}

		// No matches were found, so we can emit it
		this.emit(identifier, data, callback);
	};

	/**
	 * See if the emitted (a) matches the listener (b)
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	Hawkevents.prototype.matchQuery = function matchQuery(a, b) {

		var listener,
		    aString,
		    bString,
		    name;

		// If both are completely equal (as strings should be) it's true
		if (a === b) {
			return true;
		}

		aString = typeof a === 'string';
		bString = typeof b === 'string';

		// If one of them is a string, return false (since it failed the previous test)
		if (aString || bString) {
			return false;
		}

		// All the conditions in the listener must be matched
		for (name in b) {
			if (a[name] != b[name]) {
				return false;
			}
		}

		return true;
	};

	/**
	 * Listen to an event the given amount of times
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.8
	 * @version  0.1.0
	 *
	 * @param    {Object}   query     A query object, with conditions
	 * @param    {Number}   amount    The amount of times this callback can fire
	 * @param    {Function} callback  The function to execute
	 */
	Hawkevents.prototype.listen = function listen(query, amount, callback) {

		var i;

		// If the query isn't array, turn it into one
		if (!Array.isArray(query)) {
			query = [query];
		}

		// Add a listener for every query in the array
		for (i = 0; i < query.length; i++) {

			if (typeof query[i] === 'string') {
				if (!this.listeners[query[i]]) {
					this.listeners[query[i]] = [];
				}

				this.listeners[query[i]].push({amount: amount||-1, callback: callback});
			} else {
				this.queue.push({query: query[i], amount: amount||-1, callback: callback})
			}
		}
	};

	/**
	 * Listen to an event every time
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.8
	 * @version  0.0.8
	 *
	 * @param    {Object}   query     A query object, with conditions
	 * @param    {Function} callback  The function to execute
	 */
	Hawkevents.prototype.on = function on(query, callback) {
		this.listen(query, -1, callback);
	};

	/**
	 * Do an event once
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.8
	 * @version  0.0.8
	 *
	 * @param    {Object}   query     A query object, with conditions
	 * @param    {Function} callback  The function to execute
	 */
	Hawkevents.prototype.once = function once(query, callback) {
		this.listen(query, 1, callback);
	};

	/**
	 * Do something after the given query has fired,
	 * even if that was in the past
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	Hawkevents.prototype.after = function after(query, callback) {

		var emitter,
		    doit,
		    i;

		if (typeof query === 'string') {
			if (this.seenEvents[query]) {
				doit = true;
			}
		} else {
			for (i = 0; i < this.seenQueue.length; i++) {
				emitter = this.seenQueue[i];

				if (this.matchQuery(emitter, query)) {
					doit = true;
					break;
				}
			}
		}

		if (doit) {
			callback();
		} else {
			this.on(query, callback);
		}
	};

	if (typeof define === 'function' && define.amd) {
		 // AMD. Register as an anonymous module
		define(function() {
			return EventEmitter;
		});
	} else if (typeof exports === 'object') {
		// CommonJS
		module.exports = Hawkevents;
	}
	else {
		// Browser global
		window.Hawkevents = Hawkevents;
	}

}();
});
require.register("protoblast", function(module, exports, require){
(function() {

	var useCommon;
	
	function require(p){

		var path = require.resolve(p),
		    mod  = require.modules[path];

		if (!mod) throw new Error('failed to require "' + p + '"');

		if (!mod.exports) {
			mod.exports = {};
			mod.call(mod.exports, mod, mod.exports, require.relative(path));
		}
		
		return mod.exports;
	}

	require.modules = {};

	require.resolve = function (path){
		var orig = path,
		    reg = path + '.js',
		    index = path + '/index.js';

		return require.modules[reg] && reg
			|| require.modules[index] && index
			|| orig;
	};

	require.register = function (path, fn){
		require.modules[path] = fn;
	};

	require.relative = function (parent) {
		return function(p){
			if ('.' != p.substr(0, 1)) return require(p);
			
			var path = parent.split('/'),
			    segs = p.split('/');

			path.pop();
			
			for (var i = 0; i < segs.length; i++) {
				var seg = segs[i];
				if ('..' == seg) path.pop();
				else if ('.' != seg) path.push(seg);
			}

			return require(path.join('/'));
		};
	};

	require.register("init.js", function(module, exports, require){
module.exports = function BlastInit(modifyPrototype) {

	// Create the Blast object
	var Blast = {},
	    Collection,
	    Globals,
	    Names;

	// See if we can modify class prototypes
	if (typeof modifyPrototype === 'undefined') {
		modifyPrototype = true;
	}

	if (typeof window !== 'undefined') {
		Globals = window;
	} else {
		Globals = global;
	}

	Blast.Globals = Globals;

	// Maybe we can return an existing protoblast collection
	if (Globals.__Protoblast) {
		// If we don't have to modify the prototype, or if it's already done, return the existing collection
		if (!modifyPrototype || (modifyPrototype && Globals.__Protoblast.modifyPrototype)) {
			return Globals.__Protoblast;
		}
	}

	Globals.__Protoblast = Blast;

	Names = [
		'Array',
		'Boolean',
		'Date',
		'Error',
		'Function',
		'JSON',
		'Math',
		'Number',
		'Object',
		'RegExp',
		'String'
	];

	Blast.modifyPrototype = modifyPrototype;

	// Class references go here
	Blast.Classes = {
		Object: Object
	};

	// All definitions will also be set on these objects
	Blast.Collection = {
		Object: {}
	};

	Collection = Blast.Collection;

	Blast.Bound = {};

	/**
	 * Add the defineProperty method if it doesn't exist yet,
	 * this will only support .value setters
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.1.0
	 * @version   0.1.0
	 */
	if (!Object.defineProperty || (typeof navigator !== 'undefined' && navigator.appVersion.indexOf('MSIE 8') > -1)) {
		Collection.Object.defineProperty = function defineProperty(obj, name, settings) {
			obj[name] = settings.value;
		};

		if (modifyPrototype) {
			Object.defineProperty = Collection.Object.defineProperty;
		}
	}

	if (!Collection.Object.defineProperty) {
		Collection.Object.defineProperty = Object.defineProperty;
	}

	// Create the property definer
	Blast.defineProperty = function defineProperty(obj, name, settings) {
		return Collection.Object.defineProperty(obj, name, settings);
	};

	/**
	 * Define a non-enumerable property
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.1.0
	 * @version   0.1.0
	 *
	 * @param     {Object}   target   The object to add the property to
	 * @param     {String}   name     The name of the property
	 * @param     {Object}   value    The value of the property
	 */
	Blast.defineProperty(Collection.Object, 'defineValue', {
		value: function defineValue(target, name, value, enumerable) {

			if (typeof enumerable == 'undefined') {
				enumerable = false;
			}

			Object.defineProperty(target, name, {
				value: value,
				enumerable: enumerable,
				configurable: false,
				writeable: false
			});
		}
	});

	Blast.defineValue = Collection.Object.defineValue;

	if (modifyPrototype) {
		Blast.defineValue(Object, 'defineValue', Blast.defineValue);
	}

	/**
	 * Define a prototype value
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.1.0
	 * @version   0.1.0
	 *
	 * @param     {Object}   target   The object to add the property to
	 * @param     {String}   name     The name of the property
	 * @param     {Object}   value    The value of the property
	 * @param     {Boolean}  shim     Only set value if it's not already there
	 */
	Blast.definePrototype = function definePrototype(targetClass, name, value, shim) {

		var objTarget,
		    className;

		if (typeof targetClass == 'string') {

			className = targetClass;

			if (!Collection[className]) {
				Collection[className] = {};
			}

			if (!Blast.Classes[className]) {
				if (!Globals[className]) {
					Globals[className] = {};
				}

				Blast.Classes[className] = Globals[className];
			}

			objTarget = Collection[className];
			targetClass = Blast.Classes[className];
		}

		if (Blast.modifyPrototype) {

			if (!targetClass.prototype) {
				targetClass.prototype = {};
			}

			// Only set if it's not a shim, or if it's not there
			if (!shim || !(targetClass.prototype[name] && targetClass.prototype.hasOwnProperty(name))) {
				Blast.defineValue(targetClass.prototype, name, value);
			}
		}

		if (objTarget) {

			if (!objTarget.prototype) {
				objTarget.prototype = {};
			}

			// If this is only a shim, and it already exists on the real class, use that
			if (shim && targetClass.prototype && targetClass.prototype[name]) {
				Blast.defineValue(objTarget.prototype, name, targetClass.prototype[name], true);
			} else {
				Blast.defineValue(objTarget.prototype, name, value, true);
			}
		}
	};

	/**
	 * Define a class function
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.1.0
	 * @version   0.1.0
	 *
	 * @param     {Object}   target   The object to add the property to
	 * @param     {String}   name     The name of the property
	 * @param     {Object}   value    The value of the property
	 * @param     {Boolean}  shim     Only set value if it's not already there
	 */
	Blast.defineStatic = function definePrototype(targetClass, name, value, shim) {

		var objTarget,
		    className;

		if (typeof targetClass == 'string') {

			className = targetClass;

			if (!Collection[className]) {
				Collection[className] = {};
			}

			if (!Blast.Classes[className]) {
				if (!Globals[className]) {
					Globals[className] = {};
				}

				Blast.Classes[className] = Globals[className];
			}

			objTarget = Collection[className];
			targetClass = Blast.Classes[className];
		}

		if (Blast.modifyPrototype) {
			
			// Only set if it's not a shim, or if it's not there
			if (!shim || !targetClass[name]) {
				Blast.defineValue(targetClass, name, value);
			}
		}

		if (objTarget) {
			// If this is only a shim, and it already exists on the real class, use that
			if (shim && targetClass[name]) {
				Blast.defineValue(objTarget, name, targetClass[name], true);
			} else {
				Blast.defineValue(objTarget, name, value, true);
			}
		}
	};

	/**
	 * Return a string representing the source code of the given variable.
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.1.0
	 * @version   0.1.0
	 *
	 * @param     {Object}           variable   The variable to uneval
	 * @param     {Boolean|Number}   tab        If indent should be used
	 *
	 * @return    {String}
	 */
	Blast.uneval = function uneval(variable, tab) {

		var result,
		    type = typeof variable;

		if (tab === true) {
			tab = 1;
		}

		if (!variable) {
			result = ''+variable;
		} else if (type == 'number') {
			result = ''+variable;
		} else if (!(type == 'string' || type == 'boolean') && variable.toSource) {
			result = variable.toSource(tab);
		} else {
			result = JSON.stringify(variable);
		}

		return result;
	};

	/**
	 * Server side: create client side file
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.1.1
	 * @version   0.1.1
	 *
	 * @return    {String}
	 */
	Blast.getClientPath = function getClientPath(useCommon) {

		var template,
		    result,
		    cpath,
		    files,
		    code,
		    temp,
		    id,
		    fs;

		if (useCommon) {
			if (Blast.clientPathCommon) {
				return Blast.clientPathCommon;
			}

			cpath = __dirname + '/../client-file-common.js';
			Blast.clientPathCommon = cpath;
		} else {
			if (Blast.clientPath) {
				return Blast.clientPath;
			}

			cpath = __dirname + '/../client-file.js';
			Blast.clientPath = cpath;
		}

		// Require fs
		fs = require('fs');

		// Get the main template
		template = fs.readFileSync(__dirname + '/client.js', {encoding: 'utf8'});

		code = '';

		files = ['init', 'inflections', 'diacritics', 'misc'].concat(Names);

		files.forEach(function(name, index) {

			name = name.toLowerCase();

			temp = fs.readFileSync(__dirname + '/' + name + '.js', {encoding: 'utf8'});

			code += 'require.register("' + name + '.js", function(module, exports, require){\n';
			code += temp;
			code += '});\n';

		});

		id = template.indexOf('//_REGISTER_//');

		if (useCommon) {
			code += '\nuseCommon = true;\n';
		}

		template = template.slice(0, id) + code + template.slice(id);

		fs.writeFileSync(cpath, template);

		return cpath;
	};

	// Require the scripts
	Names.forEach(function(name) {
		name = name.toLowerCase();
		require('./' + name + '.js')(Blast, Collection);
	});

	require('./inflections.js')(Blast, Collection);
	require('./diacritics.js')(Blast, Collection);
	require('./misc.js')(Blast, Collection);

	// Now create bound methods, which are about 0,000129 ms slower
	Collection.Object.each(Collection, function(StaticClass, className) {

		// Make sure the bound collection object exists
		if (!Blast.Bound[className]) {
			Blast.Bound[className] = {};
		}

		// Add all the static functions as-is
		Collection.Object.each(StaticClass, function(StaticFunction, functionName) {
			Blast.Bound[className][functionName] = StaticFunction;
		});

		// Add all the prototype functions (if no static version exists already)
		Collection.Object.each(StaticClass.prototype, function(PrototypeFunction, functionName) {
			Blast.Bound[className][functionName] = Collection.Function.prototype.unmethodize.call(PrototypeFunction, functionName);
		});
	});

	return Blast;
};});
require.register("inflections.js", function(module, exports, require){
/**
 * Copyright (c) 2010 Ryan Schuft (ryan.schuft@gmail.com)
 * Modified by Jelle De Loecker for Protoblast (2013)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
module.exports = function BlastInflections(Blast, Collection) {

	var Bound = Blast.Bound,
	    InflectionJS   = {

		// This is a list of nouns that use the same form for both singular and plural.
		// This list should remain entirely in lower case to correctly match Strings.
		uncountable_words: [
			'equipment', 'information', 'rice', 'money', 'species', 'series',
			'fish', 'sheep', 'moose', 'deer', 'news'
		],

		// These rules translate from the singular form of a noun to its plural form.
		plural_rules: [
			[new RegExp('(business)$', 'gi'),            '$1es'],
			[new RegExp('(m)an$', 'gi'),                 '$1en'],
			[new RegExp('(pe)rson$', 'gi'),              '$1ople'],
			[new RegExp('(child)$', 'gi'),               '$1ren'],
			[new RegExp('^(ox)$', 'gi'),                 '$1en'],
			[new RegExp('(ax|test)is$', 'gi'),           '$1es'],
			[new RegExp('(octop|vir)us$', 'gi'),         '$1i'],
			[new RegExp('(alias|status)$', 'gi'),        '$1es'],
			[new RegExp('(bu)s$', 'gi'),                 '$1ses'],
			[new RegExp('(buffal|tomat|potat)o$', 'gi'), '$1oes'],
			[new RegExp('([ti])um$', 'gi'),              '$1a'],
			[new RegExp('sis$', 'gi'),                   'ses'],
			[new RegExp('(?:([^f])fe|([lr])f)$', 'gi'),  '$1$2ves'],
			[new RegExp('(hive)$', 'gi'),                '$1s'],
			[new RegExp('([^aeiouy]|qu)y$', 'gi'),       '$1ies'],
			[new RegExp('(x|ch|ss|sh)$', 'gi'),          '$1es'],
			[new RegExp('(matr|vert|ind)ix|ex$', 'gi'),  '$1ices'],
			[new RegExp('([m|l])ouse$', 'gi'),           '$1ice'],
			[new RegExp('(quiz)$', 'gi'),                '$1zes'],
			[new RegExp('s$', 'gi'),                     's'],
			[new RegExp('$', 'gi'),                      's']
		],

		// These rules translate from the plural form of a noun to its singular form.
		singular_rules: [
			[new RegExp('(m)en$', 'gi'),                                                       '$1an'],
			[new RegExp('(pe)ople$', 'gi'),                                                    '$1rson'],
			[new RegExp('(child)ren$', 'gi'),                                                  '$1'],
			[new RegExp('([ti])a$', 'gi'),                                                     '$1um'],
			[new RegExp('((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$','gi'), '$1$2sis'],
			[new RegExp('(hive)s$', 'gi'),                                                     '$1'],
			[new RegExp('(tive)s$', 'gi'),                                                     '$1'],
			[new RegExp('(curve)s$', 'gi'),                                                    '$1'],
			[new RegExp('([lr])ves$', 'gi'),                                                   '$1f'],
			[new RegExp('([^fo])ves$', 'gi'),                                                  '$1fe'],
			[new RegExp('([^aeiouy]|qu)ies$', 'gi'),                                           '$1y'],
			[new RegExp('(s)eries$', 'gi'),                                                    '$1eries'],
			[new RegExp('(m)ovies$', 'gi'),                                                    '$1ovie'],
			[new RegExp('(b)usiness$', 'gi'),                                                  '$1usiness'],
			[new RegExp('(x|ch|ss|sh)es$', 'gi'),                                              '$1'],
			[new RegExp('([m|l])ice$', 'gi'),                                                  '$1ouse'],
			[new RegExp('(bus)es$', 'gi'),                                                     '$1'],
			[new RegExp('(o)es$', 'gi'),                                                       '$1'],
			[new RegExp('(shoe)s$', 'gi'),                                                     '$1'],
			[new RegExp('(cris|ax|test)es$', 'gi'),                                            '$1is'],
			[new RegExp('(octop|vir)i$', 'gi'),                                                '$1us'],
			[new RegExp('(alias|status|business)es$', 'gi'),                                   '$1'],
			[new RegExp('^(ox)en', 'gi'),                                                      '$1'],
			[new RegExp('(vert|ind)ices$', 'gi'),                                              '$1ex'],
			[new RegExp('(matr)ices$', 'gi'),                                                  '$1ix'],
			[new RegExp('(quiz)zes$', 'gi'),                                                   '$1'],
			[new RegExp('s$', 'gi'),                                                           '']
		],

		// This is a list of words that should not be capitalized for title case
		non_titlecased_words: [
			'and', 'or', 'nor', 'a', 'an', 'the', 'so', 'but', 'to', 'of', 'at',
			'by', 'from', 'into', 'on', 'onto', 'off', 'out', 'in', 'over',
			'with', 'for'
		],

		// These are regular expressions used for converting between String formats
		id_suffix: new RegExp('(_ids|_id)$', 'g'),
		underbar: new RegExp('_', 'g'),
		space_or_underbar: new RegExp('[\ _]', 'g'),
		uppercase: new RegExp('([A-Z])', 'g'),
		underbar_prefix: new RegExp('^_'),
		
		/*
			This is a helper method that applies rules based replacement to a String
			Signature:
				InflectionJS.apply_rules(str, rules, skip, override) == String
			Arguments:
				str - String - String to modify and return based on the passed rules
				rules - Array: [RegExp, String] - Regexp to match paired with String to use for replacement
				skip - Array: [String] - Strings to skip if they match
				override - String (optional) - String to return as though this method succeeded (used to conform to APIs)
			Returns:
				String - passed String modified by passed rules
			Examples:
				InflectionJS.apply_rules("cows", InflectionJs.singular_rules) === 'cow'
		*/
		apply_rules: function(str, rules, skip, override) {
			if (override) {
				str = override;
			} else {
				
				var ignore = (skip.indexOf(str.toLowerCase()) > -1);
				
				// Have we found a replacement?
				//var success = false;
				
				if (!ignore) {
					for (var x = 0; x < rules.length; x++) {
						if (str.match(rules[x][0])) {
							str = str.replace(rules[x][0], rules[x][1]);
							//success = true;
							break;
						}
					}
					
					// Make sure we return a useable string
					//if (!success) str = '' + str;
				}
			}

			// Make sure we return a useable string
			return '' + str;
		}
	};

	/**
	 * Pluralize a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {String}   plural   Overrides normal output with said String
	 *
	 * @return   {String}   Singular English language nouns are returned in plural form
	 */
	Blast.definePrototype('String', 'pluralize', function pluralize(plural) {
		return InflectionJS.apply_rules(
				this,
				InflectionJS.plural_rules,
				InflectionJS.uncountable_words,
				plural
		);
	});

	/**
	 * Singularize a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   singular   Overrides normal output with said String
	 *
	 * @return   {String}   Plural English language nouns are returned in singular form
	 */
	Blast.definePrototype('String', 'singularize', function singularize(singular) {
		return InflectionJS.apply_rules(
				this,
				InflectionJS.singular_rules,
				InflectionJS.uncountable_words,
				singular
		);
	});

	/**
	 * Turn a string into a model name
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {String}   postfix   The string to postfix to the name
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'modelName', function modelName(postfix) {

		var str = this,
		    underscores,
		    capitals;
		
		if (str.toLowerCase() == 'app') return 'App';
		if (postfix === true) postfix = 'Model';
		
		capitals = !!Bound.String.capitals(str);
		underscores = !!(str.indexOf('_') > -1);
		
		// If there already are capitals, underscore the string
		if (capitals) {
			str = Bound.String.underscore(str);
			underscores = true;
		}
		
		// If there still are underscores, or there are no capitals,
		// we need to camelize the string
		if (underscores || !capitals) {
			str = Bound.String.camelize(str);
		}
		
		str = Bound.String.singularize(str);
		
		// Append the postfix
		if (postfix) {
			str = Bound.String.postfix(str, postfix);
		} else {
			// Do we need to strip "Model" away?
			if (Bound.String.endsWith(str, 'Model')) {
				str = str.slice(0, str.length-5);
			}
		}
		
		return str;
	});

	/**
	 * Turn a string into a controller name
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {String}   postfix   The string to postfix to the name
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'controllerName', function controllerName(postfix) {

		var str = this,
		    underscores,
		    capitals,
		    lower;

		lower = str.toLowerCase();
		
		if (lower === 'app') return 'App';
		else if (lower === 'static') return 'Static';

		if (postfix === true) postfix = 'Controller';
		
		capitals = !!Bound.String.capitals(str);
		underscores = !!(str.indexOf('_') > -1);
		
		// If there already are capitals, underscore the string
		if (capitals) {
			str = Bound.String.underscore(str);
			underscores = true;
		}
		
		// If there still are underscores, or there are no capitals,
		// we need to camelize the string
		if (underscores || !capitals) {
			str = Bound.String.camelize(str);
		}

		// Do not pluralize 'static'
		if (!str.endsWith('Static')) {
			str = Bound.String.pluralize(str);
		}
		
		// Append the postfix
		str = Bound.String.postfix(str, postfix);
		
		return str;
	});

	/**
	 * Camelize a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Boolean}  lowFirstLetter   The first char is lowercased if true
	 *
	 * @return   {String}   Lower case underscored words will be returned in camel
	 *                      case. Additionally '/' is translated to '::'
	 */
	Blast.definePrototype('String', 'camelize', function camelize(lowFirstLetter) {

		var str = this,
		    str_path,
		    str_arr,
		    initX,
		    i,
		    x;

		// If there are capitals, underscore this first
		if (Bound.String.capitals(str)) str = Bound.String.underscore(str);

		str_path = str.split('/');

		for (i = 0; i < str_path.length; i++) {

			str_arr = str_path[i].split('_');
			initX = ((lowFirstLetter && i + 1 === str_path.length) ? (1) : (0));

			for (x = initX; x < str_arr.length; x++) {
				str_arr[x] = str_arr[x].charAt(0).toUpperCase() + str_arr[x].substring(1);
			}

			str_path[i] = str_arr.join('');
		}

		str = str_path.join('::');

		return str;
	});

	/**
	 * Underscore a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'underscore', function underscore() {
		
		var str = this,
		    str_path,
		    i;

		str_path = str.split('::');

		for (i = 0; i < str_path.length; i++) {
			str_path[i] = str_path[i].replace(InflectionJS.uppercase, '_$1');
			str_path[i] = str_path[i].replace(InflectionJS.underbar_prefix, '');
		}

		str = str_path.join('/').toLowerCase();

		// Replace strings with underscores
		str = str.replace(/ /g, '_');

		return str;
	});

	/**
	 * Make a string readable for humans
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {Boolean}  lowFirstLetter   The first char is lowercased if true
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'humanize', function humanize(lowFirstLetter) {

		var str = Bound.String.underscore(this),
		    ori = str;

		// Remove the trailing _id suffix
		str = str.replace(InflectionJS.id_suffix, '');

		// If the string is empty now, put it back
		if (!str) {
			str = ori;
		}

		str = str.replace(InflectionJS.underbar, ' ').trim();

		if (!lowFirstLetter) {
			str = Bound.String.capitalize(str);
		}

		return str;
	});

	/**
	 * Return the string with only the first letter being uppercased
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'capitalize', function capitalize() {

		// Lowercase the complete string
		var str = this.toLowerCase();

		// Only uppercase the first char
		str = str.substring(0, 1).toUpperCase() + str.substring(1);

		return str;
	});

	/**
	 * Replace spaces or underscores with dashes
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'dasherize', function dasherize() {
		var str = this;
		str = str.replace(InflectionJS.space_or_underbar, '-');
		return str;
	});

	/**
	 * Capitalizes words as you would for a book title
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'titleize', function titleize() {

		// Underscore the string
		var str = Bound.String.underscore(this),
		    str_arr,
		    d,
		    i,
		    x;

		// Turn the underscores into spaces
		str = str.replace(InflectionJS.underbar, ' ');

		// Split the string
		str_arr = str.split(' ');

		for (x = 0; x < str_arr.length; x++) {

			d = str_arr[x].split('-');
			
			for (i = 0; i < d.length; i++) {
				if (InflectionJS.non_titlecased_words.indexOf(d[i].toLowerCase()) < 0) {
					d[i] = d[i].capitalize();
				}
			}

			str_arr[x] = d.join('-');
		}

		str = str_arr.join(' ');
		str = str.substring(0, 1).toUpperCase() + str.substring(1);

		return str;
	});

	/**
	 * Removes module names leaving only class names (Ruby style)
	 * Example: "Message::Bus::Properties".demodulize() == "Properties"
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'demodulize', function demodulize() {

		var str     = this,
		    str_arr = str.split('::');

		str = str_arr[str_arr.length - 1];

		return str;
	});

	/**
	 * Renders strings into their underscored plural form
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'tableize', function tableize() {
		var str = Bound.String.underscore(this);
		str = Bound.String.pluralize(str);
		return str;
	});

	/**
	 * Turn strings into their camel cased singular form
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'classify', function classify() {
		var str = Bound.String.camelize(this);
		str = Bound.String.singularize(str);
		return str;
	});

	/**
	 * Turn a strings into an underscored foreign key
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {Boolean}   dropIdUbar   Remove the underscore before the id postfix
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'foreign_key', function foreign_key(dropIdUbar) {
		var str = Bound.String.demodulize(this);
		str = Bound.String.underscore(str);
		str += ((dropIdUbar) ? ('') : ('_')) + 'id';
		return str;
	});

	/**
	 * Renders all found numbers their sequence like "22nd"
	 * Example: "the 1 pitch".ordinalize() == "the 1st pitch"
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'ordinalize', function ordinalize() {

		var str     = this,
		    str_arr = str.split(' '),
		    suf,
		    ltd,
		    ld,
		    x,
		    i;

		for (x = 0; x < str_arr.length; x++) {

			i = parseInt(str_arr[x]);

			if (!isNaN(i)) {

				ltd = str_arr[x].substring(str_arr[x].length - 2);
				ld = str_arr[x].substring(str_arr[x].length - 1);

				suf = 'th';

				if (ltd != '11' && ltd != '12' && ltd != '13') {
					if (ld === '1') {
						suf = 'st';
					} else if (ld === '2') {
						suf = 'nd';
					} else if (ld === '3') {
						suf = 'rd';
					}
				}

				str_arr[x] += suf;
			}
		}

		str = str_arr.join(' ');

		return str;
	});

	/**
	 * De-pluginify a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @return   {Boolean}
	 */
	Blast.definePrototype('String', 'deplugin', function deplugin(str) {

		var s   = this.split('.'),
		    any = false;
		    obj = {plugin: '', item: '', model: '', field: '', name: ''};

		if (typeof s[1] != 'undefined') {
			obj.plugin = obj.model = obj.name = s[0];
			obj.item = obj.field = s[1];
		} else {
			obj.item = obj.field = s[0];
		}

		return obj;
	});

};});
require.register("diacritics.js", function(module, exports, require){
module.exports = function BlastDiacritics(Blast, Collection) {

	var baseDiacriticsMap,
	    allCombiningMarks,
	    diacriticsMap = {},
	    japaneseList,
	    japaneseMap,
	    diacritics,
	    hebrewList,
	    sortList,
	    Bound = Blast.Bound,
	    base,
	    i;

	/**
	 * A sort function for language map arrays
	 */
	sortList = function sortList(a, b) {
		return b.original.length - a.original.length;
	}

	/**
	 * A map of all letters and their possible accented counterparts
	 *
	 * @link http://stackoverflow.com/questions/990904/javascript-remove-accents-in-strings
	 *
	 * @type   {Object}
	 */
	baseDiacriticsMap = {
		A: '\u24B6\uFF21\xC0\xC1\xC2\u1EA6\u1EA4\u1EAA\u1EA8\xC3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\xC4\u01DE\u1EA2\xC5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F',
		AA: '\uA732',
		AE: '\xC6\u01FC\u01E2',
		AO: '\uA734',
		AU: '\uA736',
		AV: '\uA738\uA73A',
		AY: '\uA73C',
		B: '\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181',
		C: 'C\u24B8\uFF23\u0106\u0108\u010A\u010C\xC7\u1E08\u0187\u023B\uA73E',
		D: 'D\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779',
		DZ: '\u01F1\u01C4',
		Dz: '\u01F2\u01C5',
		E: '\u24BA\uFF25\xC8\xC9\xCA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\xCB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E',
		F: '\u24BB\uFF26\u1E1E\u0191\uA77B',
		G: '\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E',
		H: '\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D',
		I: '\u24BE\uFF29\xCC\xCD\xCE\u0128\u012A\u012C\u0130\xCF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197',
		J: '\u24BF\uFF2A\u0134\u0248',
		K: '\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2',
		L: '\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780',
		LJ: '\u01C7',
		Lj: '\u01C8',
		M: '\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C',
		N: '\u24C3\uFF2E\u01F8\u0143\xD1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4',
		NJ: '\u01CA',
		Nj: '\u01CB',
		O: '\u24C4\uFF2F\xD2\xD3\xD4\u1ED2\u1ED0\u1ED6\u1ED4\xD5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\xD6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\xD8\u01FE\u0186\u019F\uA74A\uA74C',
		OI: '\u01A2',
		OO: '\uA74E',
		OU: '\u0222',
		P: '\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754',
		Q: '\u24C6\uFF31\uA756\uA758\u024A',
		R: '\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782',
		S: '\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784',
		T: '\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786',
		TZ: '\uA728',
		U: '\u24CA\uFF35\xD9\xDA\xDB\u0168\u1E78\u016A\u1E7A\u016C\xDC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244',
		V: '\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245',
		VY: '\uA760',
		W: '\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72',
		X: '\u24CD\uFF38\u1E8A\u1E8C',
		Y: '\u24CE\uFF39\u1EF2\xDD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE',
		Z: '\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762',
		a: '\u24D0\uFF41\u1E9A\xE0\xE1\xE2\u1EA7\u1EA5\u1EAB\u1EA9\xE3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\xE4\u01DF\u1EA3\xE5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250\xAA\u1D2C\u1D43\u2090\u2100\u2101\u213B\u249C\u3371\u3374\u3380\u3384\u33A9\u33AF\u33C2\u33CA\u33DF\u33FF',
		aa: '\uA733',
		ae: '\xE6\u01FD\u01E3',
		ao: '\uA735',
		au: '\uA737',
		av: '\uA739\uA73B',
		ay: '\uA73D',
		b: '\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253\u1D2E\u1D47\u212C\u249D\u3374\u3385\u3387\u33C3\u33C8\u33D4\u33DD',
		c: '\u24D2\uFF43\u0107\u0109\u010B\u010D\xE7\u1E09\u0188\u023C\uA73F\u2184\u1D9C\u2100\u2102\u2103\u2105\u2106\u212D\u216D\u217D\u249E\u3376\u339D\u33A0\u33A4\u33C4\u33C7',
		cal: '\u3388',
		d: '\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A\u01C4\u01C6\u01F1\u01F3\u1D30\u1D48\u2145\u2146\u216E\u217E\u249F\u32CF\u3372\u3377\u3379\u3397\u33AD\u33AF\u33C5\u33C8',
		dz: '\u01F3\u01C6',
		e: '\u24D4\uFF45\xE8\xE9\xEA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\xEB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD\u1D31\u1D49\u2091\u2121\u212F\u2130\u2147\u24A0\u3250\u32CD\u32CE',
		f: '\u24D5\uFF46\u1E1F\u0192\uA77C\u1DA0\u2109\u2131\u213B\u24A1\u338A\u338C\u3399\uFB00\uFB04',
		g: '\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F\u1D33\u1D4D\u210A\u24A2\u32CC\u32CD\u3387\u338D\u338F\u3393\u33AC\u33C6\u33C9\u33D2\u33FF',
		h: '\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265\u02B0\u1D34\u210B\u210E\u24A3\u32CC\u3371\u3390\u3394\u33CA\u33CB\u33D7',
		hv: '\u0195',
		i: '\u24D8\uFF49\xEC\xED\xEE\u0129\u012B\u012D\xEF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131\u0132\u0133\u1D35\u1D62\u2071\u2110\u2111\u2139\u2148\u2160\u2163\u2165\u2168\u216A\u216B\u2170\u2173\u2175\u2178\u217A\u217B\u24A4\u337A\u33CC\u33D5\uFB01\uFB03',
		j: '\u24D9\uFF4A\u0135\u01F0\u0249\u0132\u01C7\u01CC\u02B2\u1D36\u2149\u24A5\u2C7C',
		k: '\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3\u1D37\u1D4F\u212A\u24A6\u3384\u3385\u338F\u3391\u3398\u339E\u33A2\u33A6\u33AA\u33B8\u33BE\u33C0\u33C6\u33CD\u33CF',
		kcal: '\u3389',
		l: '\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747\u01C7\u01C9\u02E1\u1D38\u2112\u2113\u2121\u216C\u217C\u24A7\u32CF\u33D0\u33D3\u33D5\u33D6\u33FF\uFB02\uFB04',
		lj: '\u01C9',
		m: '\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F\u1D39\u1D50\u2120\u2122\u2133\u216F\u217F\u24A8\u3377\u3379\u3383\u3386\u338E\u3392\u3396\u3399\u33A8\u33AB\u33B3\u33B7\u33B9\u33BD\u33BF\u33C1\u33C2\u33CE\u33D0\u33D4\u33D6\u33D8\u33D9\u33DE\u33DF',
		n: '\u24DD\uFF4E\u01F9\u0144\xF1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5\u01CA\u01CC\u1D3A\u207F\u2115\u2116\u24A9\u3381\u338B\u339A\u33B1\u33B5\u33BB\u33CC\u33D1',
		nj: '\u01CC',
		o: '\u24DE\uFF4F\xF2\xF3\xF4\u1ED3\u1ED1\u1ED7\u1ED5\xF5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\xF6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\xF8\u01FF\u0254\uA74B\uA74D\u0275\xBA\u1D3C\u1D52\u2092\u2105\u2116\u2134\u24AA\u3375\u33C7\u33D2\u33D6',
		oi: '\u01A3',
		ou: '\u0223',
		oo: '\uA74F',
		p: '\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755\u1D3E\u1D56\u2119\u24AB\u3250\u3371\u3376\u3380\u338A\u33A9\u33AC\u33B0\u33B4\u33BA\u33CB\u33D7\u33DA',
		q: '\u24E0\uFF51\u024B\uA757\uA759\u211A\u24AC\u33C3',
		r: '\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783\u02B3\u1D3F\u1D63\u20A8\u211B\u211D\u24AD\u32CD\u3374\u33AD\u33AF\u33DA\u33DB',
		s: '\u24E2\uFF53\xDF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B\u017F\u02E2\u20A8\u2101\u2120\u24AE\u33A7\u33A8\u33AE\u33B3\u33DB\u33DC\uFB06',
		t: '\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787\u1D40\u1D57\u2121\u2122\u24AF\u3250\u32CF\u3394\u33CF\uFB05\uFB06',
		tz: '\uA729',
		u: '\u24E4\uFF55\xF9\xFA\xFB\u0169\u1E79\u016B\u1E7B\u016D\xFC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289\u1D41\u1D58\u1D64\u2106\u24B0\u3373\u337A',
		v: '\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C\u1D5B\u1D65\u2163\u2167\u2173\u2177\u24B1\u2C7D\u32CE\u3375\u33B4\u33B9\u33DC\u33DE',
		vy: '\uA761',
		w: '\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73\u02B7\u1D42\u24B2\u33BA\u33BF\u33DD',
		x: '\u24E7\uFF58\u1E8B\u1E8D\u02E3\u2093\u213B\u2168\u216B\u2178\u217B\u24B3\u33D3',
		y: '\u24E8\uFF59\u1EF3\xFD\u0177\u1EF9\u0233\u1E8F\xFF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF\u02B8\u24B4\u33C9',
		z: '\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763\u01F1\u01F3\u1DBB\u2124\u2128\u24B5\u3390\u3394',
	};

	/**
	 * A map of all japanese hiragana characters
	 *
	 * @author SirCmpwn
	 * @link   https://github.com/SirCmpwn/hiragana.js
	 */
	japaneseMap = {
		'a': 'あ',
		'i': 'い',
		'u': 'う',
		'e': 'え',
		'o': 'お',
		'ka': 'か',
		'ki': 'き',
		'ku': 'く',
		'ke': 'け',
		'ko': 'こ',
		'sa': 'さ',
		'shi': 'し',
		'su': 'す',
		'se': 'せ',
		'so': 'そ',
		'ta': 'た',
		'chi': 'ち',
		'tsu': 'つ',
		'te': 'て',
		'to': 'と',
		'na': 'な',
		'ni': 'に',
		'nu': 'ぬ',
		'ne': 'ね',
		'no': 'の',
		'ha': 'は',
		'hi': 'ひ',
		'fu': 'ふ',
		'he': 'へ',
		'ho': 'ほ',
		'ma': 'ま',
		'mi': 'み',
		'mu': 'む',
		'me': 'め',
		'mo': 'も',
		'ya': 'や',
		'yu': 'ゆ',
		'yo': 'よ',
		'ra': 'ら',
		'ri': 'り',
		'ru': 'る',
		're': 'れ',
		'ro': 'ろ',
		'wa': 'わ',
		'wo': 'を',
		'ga': 'が',
		'gi': 'ぎ',
		'gu': 'ぐ',
		'ge': 'げ',
		'go': 'ご',
		'za': 'ざ',
		'ji': 'じ',
		'zu': 'ず',
		'ze': 'ぜ',
		'zo': 'ぞ',
		'da': 'だ',
		'de': 'で',
		'do': 'ど',
		'ba': 'ば',
		'bi': 'び',
		'bu': 'ぶ',
		'be': 'べ',
		'bo': 'ぼ',
		'pa': 'ぱ',
		'pi': 'ぴ',
		'pu': 'ぷ',
		'pe': 'ぺ',
		'po': 'ぽ',
		'hu': 'ふ',
		'tu': 'つ',
		'si': 'し',
		'ti': 'ち',
		'kya': 'きゃ',
		'kyu': 'きゅ',
		'kyo': 'きょ',
		'sha': 'しゃ',
		'shu': 'しゅ',
		'sho': 'しょ',
		'cha': 'ちゃ',
		'chu': 'ちゅ',
		'cho': 'ちょ',
		'nya': 'にゃ',
		'nyu': 'にゅ',
		'nyo': 'にょ',
		'hya': 'ひゃ',
		'hyu': 'ひゅ',
		'hyo': 'ひょ',
		'mya': 'みゃ',
		'myu': 'みゅ',
		'myo': 'みょ',
		'rya': 'りゃ',
		'ryu': 'りゅ',
		'ryo': 'りょ',
		'gya': 'ぎゃ',
		'gyu': 'ぎゅ',
		'gyo': 'ぎょ',
		'ja': 'じゃ',
		'ju': 'じゅ',
		'jo': 'じょ',
		'bya': 'びゃ',
		'byu': 'びゅ',
		'byo': 'びょ',
		'pya': 'ぴゃ',
		'pyu': 'ぴゅ',
		'pyo': 'ぴょ',
		'xyu': 'ゅ',
		'xyo': 'ょ',
		'xya': 'ゃ',
		'xtsu': 'っ',
		'xtu': 'っ',
		'xa': 'ぁ',
		'xi': 'ぃ',
		'xu': 'ぅ',
		'xe': 'ぇ',
		'xo': 'ぉ',
		'lyu': 'ゅ',
		'lyo': 'ょ',
		'lya': 'ゃ',
		'ltsu': 'っ',
		'ltu': 'っ',
		'la': 'ぁ',
		'li': 'ぃ',
		'lu': 'ぅ',
		'le': 'ぇ',
		'lo': 'ぉ',
		'rr': 'っr',
		'tt': 'っt',
		'kk': 'っk',
		'cc': 'っc',
		'pp': 'っp',
		'ss': 'っs',
		'ww': 'っw',
		'ss': 'っy',
		'dd': 'っd',
		'ff': 'っf',
		'gg': 'っg',
		'hh': 'っh',
		'jj': 'っj',
		'zz': 'っz',
		'xx': 'っx',
		'vv': 'っv',
		'bb': 'っb',
		'mm': 'っm',
		'nn': 'ん'
	};

	var hebrewMap = {
		// Consonants
		'\''      : ['\u05D0', '\u05E2'],
		'v'       : ['\u05D1', '\u05D5', '\u05D5\u05BC'],
		'b'       : '\u05D1\u05BC',
		'g'       : ['\u05D2', '\u05D2\u05BC'],
		'j'       : '\u05D2\u05F3',
		'd'       : ['\u05D3', '\u05D3\u05BC'],
		'dh'      : '\u05D3\u05F3',
		'h'       : ['\u05D4', '\u05D4\u05BC'],
		'z'       : ['\u05D6', '\u05D6\u05BC'],
		'zh'      : '\u05D6\u05F3',
		'\u1E96'  : '\u05D7',
		't'       : ['\u05D8', '\u05D8\u05BC'],
		'y'       : ['\u05D9', '\u05D9\u05BC'],
		'kh'      : ['\u05DA', '\u05DB'],
		'k'       : ['\u05DA\u05BC', '\u05DB\u05BC'],
		'l'       : ['\u05DC', '\u05DC\u05BC'],
		'm'       : ['\u05DD', '\u05DE', '\u05DE\u05BC'],
		'n'       : ['\u05DF', '\u05E0', '\u05E0\u05BC'],
		's'       : ['\u05E1', '\u05E1\u05BC', '\u05E9\u05C2', '\u05E9\u05BC\u05C2'],
		'f'       : ['\u05E3', '\u05E4'],
		'p'       : ['\u05E3\u05BC', '\u05E4\u05BC'],
		'ts'      : ['\u05E5', '\u05E6', '\u05E6\u05BC'],
		'tsh'     : ['\u05E5\u05F3', '\u05E6\u05F3'],
		'k'       : ['\u05E7', '\u05E7\u05BC'],
		'r'       : ['\u05E8', '\u05E8\u05BC'],
		'sh'      : ['\u05E9\u05C1', '\u05E9\u05BC\u05C1'],
		't'       : ['\u05EA', '\u05EA\u05BC'],
		'th'      : '\u05EA\u05F3',

		// Vowels
		'e'   : ['\u05D8\u05B0', '\u05D7\u05B1', '\u05D8\u05B5', '\u05D8\u05B5\u05D9', '\u05D8\u05B6', '\u05D8\u05B6\u05D9'],
		'a'   : ['\u05D7\u05B2', '\u05D8\u05B7'],
		'o'   : ['\u05D7\u05B3', '\u05D8\u05B8', '\u05D8\u05B9'],
		'i'   : '\u05D8\u05B4',
		'u'   : ['\u05D8\u05BB', '\u05D8\u05D5\u05BC'],

		// Israeli Diphthongs
		'ay'  : ['\u05D8\u05B7\u05D9', '\u05D8\u05B7\u05D9\u05B0', '\u05D8\u05B8\u05D9', '\u05D8\u05B8\u05D9\u05B0'],
		'oy'  : ['\u05D8\u05B9\u05D9', '\u05D8\u05B9\u05D9\u05B0'],
		'uy'  : ['\u05D8\u05BB\u05D9', '\u05D8\u05BB\u05D9\u05B0', '\u05D8\u05D5\u05BC\u05D9', '\u05D8\u05D5\u05BC\u05D9\u05B0']
	};

	hebrewList = [];

	// Convert the hebrew map to an ordered list
	for (base in hebrewMap) {
		if (Array.isArray(hebrewMap[base])) {
			for (i = 0; i < hebrewMap[base].length; i++) {
				hebrewList.push({roman: base, original: hebrewMap[base][i]});
			}
		} else {
			hebrewList.push({roman: base, original: hebrewMap[base]});
		}
	}

	// Sort the hebrewlist
	hebrewList.sort(sortList);

	japaneseList = [];

	for (base in baseDiacriticsMap) {

		// Get all the possible diacritics for this base
		diacritics = baseDiacriticsMap[base].split('');

		// Create a reversed map: all diacritics to their base letters
		diacritics.forEach(function(diacritic) {
			diacriticsMap[diacritic] = base;
		});
	}

	// Convert the japanese map to an ordered list
	for (base in japaneseMap) {
		japaneseList.push({roman: base, original: japaneseMap[base]});
	}

	// Sort the japaneselist
	japaneseList.sort(sortList);

	/**
	 * A regex for finding all combining marks
	 *
	 * @author  mathiasbynens
	 * @link    https://github.com/mathiasbynens
	 */
	allCombiningMarks = /[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF]|[\u0370-\u1DBF\u1E00-\u20CF\u2100-\uD7FF\uDC00-\uFE1F\uFE30-\uFFFF]/g;

	/**
	 * Remove all combining marks from a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	Blast.definePrototype('String', 'removeCombiningMarks', function removeCombiningMarks() {
		return this.replace(allCombiningMarks, '');
	});

	/**
	 * Remove special characters from a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 */
	Blast.definePrototype('String', 'romanize', function romanize() {

		var length,
		    result  = '',
		    str,
		    i;

		// Romanize possible japanese signs
		str = Bound.String.romanizeJapanese(this);

		// Romanize possible hebrew signs
		str = Bound.String.romanizeHebrew(str);

		// Remove any other combining marks
		str = Bound.String.removeCombiningMarks(str);

		length = str.length;

		for (i = 0; i < length; i++) {
			result += diacriticsMap[str[i]] || str[i];
		}

		return result;
	});

	/**
	 * Turn japanese characters into their romanized forms
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Boolean}   skipCheck   Don't check for characters first
	 */
	Blast.definePrototype('String', 'romanizeJapanese', function romanizeJapanese(skipCheck) {

		var str,
		    entry,
		    i;

		// Don't do anything if the string doesn't actually contain hebrew marks
		if (!skipCheck && !Bound.String.containsJapanese(this)) {
			return this;
		}

		str = this;

		for (i = 0; i < japaneseList.length; i++) {
			entry = japaneseList[i];

			if (!entry.regex) {
				entry.regex = new RegExp(entry.original, 'g');
			}

			str = str.replace(entry.regex, entry.roman);
		}

		return str;
	});

	/**
	 * Turn hebrew characters into their romanized forms
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Boolean}   skipCheck   Don't check for characters first
	 */
	Blast.definePrototype('String', 'romanizeHebrew', function romanizeHebrew(skipCheck) {

		var str,
		    entry,
		    i;

		// Don't do anything if the string doesn't actually contain hebrew marks
		if (!skipCheck && !Bound.String.containsHebrew(this)) {
			return this;
		}

		str = this;

		for (i = 0; i < hebrewList.length; i++) {
			entry = hebrewList[i];

			if (!entry.regex) {
				entry.regex = new RegExp(entry.original, 'g');
			}

			str = str.replace(entry.regex, entry.roman);
		}

		return str;
	});

	/**
	 * Replace the given character, but remain case sensitive
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 */
	function replaceSensitive(chr) {

		if (typeof baseDiacriticsMap[chr] === 'undefined') {
			return chr;
		}

		return '[' + chr + (baseDiacriticsMap[chr]) + ']';
	};

	/**
	 * Replace the given character without caring about the case
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 */
	function replaceInsensitive(chr) {

		var lower = chr.toLowerCase(),
		    upper = chr.toUpperCase();

		if (lower == upper) {
			return chr;
		}

		return '[' + lower + upper + (baseDiacriticsMap[chr]||'') + ']';
	};

	var metaRegex     = /([|()[{.+*?^$\\])/g,
	    whiteRegex    = /\s+/,
	    ungroupRegex  = /\[\\\]\[/g,
	    hebrewRegex   = /[\u0590-\u05FF]/,
	    japaneseRegex = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;

	/**
	 * Determine if a string contains hebrew signs
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {Boolean}
	 */
	Blast.definePrototype('String', 'containsHebrew', function containsHebrew() {
		return (this.search(hebrewRegex) > -1);
	});

	/**
	 * Determine if a string contains japanese signs
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {Boolean}
	 */
	Blast.definePrototype('String', 'containsJapanese', function containsJapanese() {
		return (this.search(japaneseRegex) > -1);
	});

	/**
	 * Create a regex pattern string that will ignore accents
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Boolean}   insensitive   Create a case insensitive regex
	 * @param    {Boolean}   any           Look for any word
	 *
	 * @return   {String}    Pattern that can be used to construct a regex
	 */
	Blast.definePrototype('String', 'diacriticPattern', function diacriticPattern(insensitive, any) {

		var replacer,
		    pattern,
		    words,
		    text,
		    join,
		    i;

		if (insensitive) {
			replacer = replaceInsensitive;
		} else {
			replacer = replaceSensitive;
		}

		if (any) {
			join = '|'
		} else {
			join = '\\s+';
		}

		// Escape meta characters
		text = this.replace(metaRegex, '\\$1');

		// Split into words
		words = text.split(whiteRegex);

		// Replace characters by their compositors
		for (i = 0; i < words.length; i++) {
			words[i] = words[i].replace(/\S/g,replacer);
		}

		// Join as alternatives
		pattern = words.join(join);

		// Ungroup escaped characters
		pattern = pattern.replace(ungroupRegex, '[\\');

		return pattern;
	});

	/**
	 * Create a regex that will ignore accents
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Boolean}   insensitive   Create a case insensitive regex
	 * @param    {Boolean}   any           Look for any word
	 *
	 * @return   {RegExp}
	 */
	Blast.definePrototype('String', 'diacriticRegex', function diacriticRegex(insensitive, any) {

		var pattern = Bound.String.diacriticPattern(this, insensitive, any),
		    regex;

		if (insensitive) {
			regex = new RegExp(pattern, 'gi');
		} else {
			regex = new RegExp(pattern, 'g');
		}

		return regex;
	});
};});
require.register("misc.js", function(module, exports, require){
module.exports = function BlastMisc(Blast, Collection) {

	/**
	 * Return a string representing the source code of the object.
	 * Overwrites existing method in Firefox.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('Uint8Array', 'toSource', function toSource() {
		return '(new Uint8Array([' + Array.prototype.join.call(this) + ']))';
	});

	/**
	 * Return a string representing the source code of the object.
	 * Overwrites existing method in Firefox.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('Uint16Array', 'toSource', function toSource() {
		return '(new Uint16Array([' + Array.prototype.join.call(this) + ']))';
	});

	/**
	 * Return a string representing the source code of the object.
	 * Overwrites existing method in Firefox.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('Uint32Array', 'toSource', function toSource() {
		return '(new Uint32Array([' + Array.prototype.join.call(this) + ']))';
	});

	/**
	 * Return a string representing the source code of the object.
	 * Overwrites existing method in Firefox.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('Uint8ClampedArray', 'toSource', function toSource() {
		return '(new Uint8ClampedArray([' + Array.prototype.join.call(this) + ']))';
	});

};});
require.register("array.js", function(module, exports, require){
module.exports = function BlastArray(Blast, Collection) {

	/**
	 * Cast a variable to an array.
	 * Also turns array-like objects into real arrays, except String objects.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {Mixed}   variable
	 *
	 * @return   {Array}
	 */
	Blast.defineStatic('Array', 'cast', function cast(variable) {

		var type;

		// Return the variable unmodified if it's already an array
		if (Array.isArray(variable)) {
			return variable;
		}

		type = typeof variable;

		// Convert array-like objects to regular arrays
		if (variable && type == 'object') {

			// If the variable has a 'length' property, it could be array-like
			if (variable.length || 'length' in variable) {

				// Skip it if it's a String object (not a string primitive)
				if (variable.constructor.name !== 'String') {
					return Array.prototype.slice.call(variable, 0);
				}
			}
		} else if (type == 'undefined') {
			return [];
		}

		// Return the variable wrapped in an array otherwise
		return [variable];
	});

	/**
	 * Return a string representing the source code of the array.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Boolean|Number}   tab   If indent should be used
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('Array', 'toSource', function toSource(tab) {

		var result,
		    passtab,
		    i;

		if (tab === true) {
			tab = 1;
		}

		if (tab > 0) {
			passtab = tab + 1;
		} else {
			passtab = tab;
			tab = 0;
		}


		for (i = 0; i < this.length; i++) {
			if (!result) {
				result = '[';
			} else {
				result += ',';
			}

			if (tab) {
				result += '\n' + Blast.Bound.String.multiply('\t', tab);
			}

			result += Blast.uneval(this[i], passtab);
		}

		if (!result) {
			result = '[';
		} else if (tab) {
			result += '\n' + Blast.Bound.String.multiply('\t', tab-1);
		}

		result += ']';

		return result;
	}, true);

	/**
	 * Get the first value of an array
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	Blast.definePrototype('Array', 'first', function first() {
		return this[0];
	});

	/**
	 * Get the last value of an array
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	Blast.definePrototype('Array', 'last', function last() {
		return this[this.length-1];
	});

	/**
	 * Insert item at the given index,
	 * modifies the array in-place
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.2
	 * @version  0.1.2
	 *
	 * @param    {Number}   index   Where to insert the values
	 * @param    {Mixed}    value
	 *
	 * @return   {Array}    The same array
	 */
	Blast.definePrototype('Array', 'insert', function insert(index, value) {

		if (this.length < (index-1)) {
			this.length = index-1;
		}

		this.splice.apply(this, [index, 0].concat(
			Array.prototype.slice.call(arguments, 1))
		);

		return this;
	});

	/**
	 * Get the shared value between the 2 arrays
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Array}     arr            The array to test agains
	 * @param    {Function}  CastFunction   Function to use to cast values
	 *
	 * @return   {Array}
	 */
	Blast.definePrototype('Array', 'shared', function shared(arr, CastFunction) {

		// Make sure the given value to match against is an array
		if (!Array.isArray(arr)) {
			arr = [arr];
		}
		
		// Go over every item in the array, and return the ones they have in common
		return this.filter(function(value) {

			var test, i;

			// Cast the value if a cast function is given
			value = CastFunction ? CastFunction(value) : value;

			// Go over every item in the second array
			for (i = 0; i < arr.length; i++) {

				// Also cast that value
				test = CastFunction ? CastFunction(arr[i]) : arr[i];

				// If the values match, add this value to the array
				if (value == test) {
					return true;
				}
			}

			return false;
		});
	});

	/**
	 * Get the values from the first array that are not in the second array,
	 * basically: remove all the values in the second array from the first one
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Array}     arr            The array to test agains
	 * @param    {Function}  CastFunction   Function to use to cast values
	 *
	 * @return   {Array}
	 */
	Blast.definePrototype('Array', 'subtract', function subtract(arr, CastFunction) {

		// Make sure the given value to match against is an array
		if (!Array.isArray(arr)) {
			arr = [arr];
		}
		
		// Go over every item in the array,
		// and return the ones that are not in the second array
		return this.filter(function(value, index) {

			var test, i;

			// Cast the value if a cast function is given
			value = CastFunction ? CastFunction(value) : value;

			// Go over every item in the second array
			for (i = 0; i < arr.length; i++) {

				// Also cast that value
				test = CastFunction ? CastFunction(arr[i]) : arr[i];

				// If the values match, we should NOT add this
				if (value == test) {
					return false;
				}
			}

			return true;
		});
	});

	/**
	 * Get all the values that are either in the first or in the second array,
	 * but not in both
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {Array}     arr            The array to test agains
	 * @param    {Function}  CastFunction   Function to use to cast values
	 *
	 * @return   {Array}
	 */
	Blast.definePrototype('Array', 'exclusive', function exclusive(arr, CastFunction) {

		// Get all the shared values
		var shared = this.shared(arr);

		// Return the merged differences between the 2
		return Collection.Array.prototype.subtract.call(this, shared).concat(arr.subtract(shared));
	});

	/**
	 * Remove certain elements from an array
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 */
	Blast.definePrototype('Array', 'clean', function clean(deleteValue) {
		for (var i = 0; i < this.length; i++) {
			if (this[i] === deleteValue) {
				this.splice(i, 1);
				i--;
			}
		}
		return this;
	});

};});
require.register("boolean.js", function(module, exports, require){
module.exports = function BlastBoolean(Blast, Collection) {

	/**
	 * Return a string representing the source code of the boolean.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('Boolean', 'toSource', function toSource() {
		return '(new Boolean(' + this + '))';
	}, true);

};});
require.register("date.js", function(module, exports, require){
module.exports = function BlastDate(Blast, Collection) {

	/**
	 * Create a new date object
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	Blast.defineStatic('Date', 'create', function create() {
		return new Date();
	});

	/**
	 * Return a string representing the source code of the date.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('Date', 'toSource', function toSource() {
		return '(new Date(' + Date.prototype.valueOf.call(this) + '))';
	}, true);

};});
require.register("error.js", function(module, exports, require){
module.exports = function BlastError(Blast, Collection) {

	/**
	 * Return a string representing the source code of the error.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('Error', 'toSource', function toSource() {

		var name     = this.name,
		    message  = JSON.stringify(this.message),
		    fileName = JSON.stringify(this.fileName),
		    lineno   = this.lineNumber;

		lineno = (lineno === 0 ? '' : ', ' + lineno);

		return '(new ' + name + '(' + message + ', ' + fileName + lineno + '))';
	}, true);

};});
require.register("function.js", function(module, exports, require){
module.exports = function BlastFunction(Blast, Collection) {

	/**
	 * Create a function with the given variable as name
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {String}    name    The name of the function
	 * @param    {Function}  fnc     The function body
	 *
	 * @return   {Function}
	 */
	Blast.defineStatic('Function', 'create', function create(name, fnc) {

		var result;

		eval('result = function ' + name + '(){return fnc.apply(this, arguments);}');

		return result;
	}, true);

	/**
	 * Return a string representing the source code of the function.
	 * Also attempts to return native code references,
	 * or at least non-error causing functions.
	 *
	 * Overwrites existing method in Firefox.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('Function', 'toSource', function toSource() {

		// Get a string representation of the function
		var str = this.toString();

		// If this is native code, just return the name
		if (str.slice(-17) == '{ [native code] }') {
			if (Blast.Globals[this.name] === this) {
				return this.name;
			} else {
				return '(function ' + this.name + '(){throw new Error("Could not uneval native code!")})';
			}
		}

		return '(' + str + ')';
	});

	/**
	 * Create a function that will call the given function with 'this'
	 * as the first argument.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Function}  fnc     The function body
	 * @param    {String}    name    The name to use for the wrapper
	 *
	 * @return   {Function}
	 */
	Blast.definePrototype('Function', 'methodize', function methodize(name) {

		var fnc, method, sourcecode;

		if (this._methodized) return this._methodized;

		fnc = this;

		method = function() {
			
			var args = [this],
			    len = arguments.length,
			    i;

			// Push all the arguments the old fashioned way,
			// this is the fastest method
			for (i = 0; i < len; i++) {
				args.push(arguments[i]);
			}
			
			return fnc.apply(this, args);
		};

		if (typeof name == 'undefined') {
			name = fnc.name;
		}

		// Get the sourcecode
		sourcecode = 'function ' + name + String(method).slice(9);

		eval('this._methodized = ' + sourcecode);

		// Make sure a methodized function doesn't get methodized
		this._methodized._methodized = this._methodized;

		// Add the unmethodized function
		this._unmethodized = fnc;

		return this._methodized;
	});

	/**
	 * Create a function that will call the given function with
	 * the first argument as the context
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Function}  fnc     The function body
	 * @param    {String}    name    The name to use for the wrapper
	 *
	 * @return   {Function}
	 */
	Blast.definePrototype('Function', 'unmethodize', function unmethodize(name) {

		var fnc, unmethod, sourcecode;

		if (this._unmethodized) return this._unmethodized;

		fnc = this;

		unmethod = function() {

			var args = [],
			    i;

			for (i = 1; i < arguments.length; i++) {
				args.push(arguments[i]);
			}

			return fnc.apply(arguments[0], args);
		};

		if (typeof name == 'undefined') {
			name = fnc.name;
		}

		// Get the sourcecode
		sourcecode = 'function ' + name + String(unmethod).slice(9);

		eval('this._unmethodized = ' + sourcecode);

		// Make sure a methodized function doesn't get methodized
		this._unmethodized._unmethodized = this._unmethodized;

		// Add the unmethodized function
		this._methodized = fnc;

		return this._unmethodized;
	});

};});
require.register("json.js", function(module, exports, require){
module.exports = function BlastJSON(Blast, Collection) {

	/**
	 * Return a string representing the source code of the object.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.defineStatic('JSON', 'toSource', function toSource() {
		return 'JSON';
	}, true);

};});
require.register("math.js", function(module, exports, require){
module.exports = function BlastMath(Blast, Collection) {

	/**
	 * Return a string representing the source code of the object.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.defineStatic('Math', 'toSource', function toSource() {
		return 'Math';
	}, true);

};});
require.register("number.js", function(module, exports, require){
module.exports = function BlastNumber(Blast, Collection) {

	/**
	 * Return a string representing the source code of the number.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('Number', 'toSource', function toSource() {
		return '(new Number(' + this + '))';
	}, true);

	/**
	 * Returns the number as a string with leading zeros to get the
	 * desired length
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Number}   length    The minimum length for the result
	 * @param    {Number}   radix     The radix for the string representation
	 *
	 * @return   {String}   The number as a string with padded zeroes
	 */
	Blast.definePrototype('Number', 'toPaddedString', function toPaddedString(length, radix) {
		var str = this.toString(radix || 10);
		return '0'.multiply(length - str.length) + str;
	});

};});
require.register("object.js", function(module, exports, require){
module.exports = function BlastObject(Blast, Collection) {

	/**
	 * Return a string representing the source code of the object.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Boolean|Number}   tab   If indent should be used
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('Object', 'toSource', function toSource(tab) {

		var result = '',
		    passtab,
		    type,
		    key;

		if (tab === true) {
			tab = 1;
		}

		if (tab > 0) {
			passtab = tab + 1;
		} else {
			passtab = tab;
			tab = 0;
		}

		for (key in this) {
			if (this.hasOwnProperty(key)) {

				type = typeof this[key];

				if (!result) {
					result = '({';
				} else {
					result += ',';
				}

				if (tab) {
					result += '\n';
				}

				result += Blast.Bound.String.multiply('\t', tab) + JSON.stringify(key) + ': ';
				result += Blast.uneval(this[key], passtab);
			}
		}

		if (!result) {
			result = '({';
		} else {
			if (tab) {
				result += '\n' + Blast.Bound.String.multiply('\t', tab-1);
			}
		}

		result += '})';

		return result;
	}, true);

	/**
	 * Create a new object for every key-value and wrap them in an array
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}    obj            The object to arrayify
	 *
	 * @return   {Array}
	 */
	Blast.defineStatic('Object', 'divide', function divide(obj) {

		var list = [],
		    temp,
		    key;

		for (key in obj) {
			temp = {};
			temp[key] = obj[key];

			list[list.length] = temp;
		}

		return list;
	});

	/**
	 * Get the value of the given property path
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   obj
	 * @param    {String}   path   The dot notation path
	 *
	 * @return   {Mixed}
	 */
	Blast.defineStatic('Object', 'path', function path(obj, path) {

		var pieces,
		    result,
		    here,
		    key,
		    end,
		    i;

		if (typeof path !== 'string') {
			return;
		}

		pieces = path.split('.');

		here = obj;

		// Go over every piece in the path
		for (i = 0; i < pieces.length; i++) {

			// Get the current key
			key = pieces[i];

			if (here !== null && here !== undefined) {
				here = here[key];

				// Is this the final piece?
				end = ((i+1) == pieces.length);

				if (end) {
					result = here;
				}
			}
		}

		return result;
	});

	/**
	 * See if the given path exists inside an object,
	 * even if that value is undefined
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   obj
	 * @param    {String}   path   The dot notation path
	 *
	 * @return   {Mixed}
	 */
	Blast.defineStatic('Object', 'exists', function exists(obj, path) {

		var pieces = path.split('.'),
		    result = false,
		    hereType,
		    here,
		    key,
		    end,
		    i;

		// Set the object as the current position
		here = obj;

		// Go over every piece in the path
		for (i = 0; i < pieces.length; i++) {

			// Get the current key
			key = pieces[i];
			hereType = typeof here;

			if (here === null || here === undefined) {
				return false;
			}

			if (here !== null && here !== undefined) {
				
				// Is this the final piece?
				end = ((i+1) == pieces.length);

				if (end) {
					if (here[key] || ((hereType == 'object' || hereType == 'function') && key in here)) {
						result = true;
					}
					break;
				}

				here = here[key];
			}
		}

		return result;
	});

	/**
	 * Determine if the object is empty
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   obj
	 * @param    {Boolean}  includePrototype   If true, prototypal properties also count
	 *
	 * @return   {Boolean}
	 */
	Blast.defineStatic('Object', 'isEmpty', function isEmpty(obj, includePrototype) {

		var key;

		if (!obj) {
			return true;
		}

		for(key in obj) {
			if (includePrototype || obj.hasOwnProperty(key)) {
				return false;
			}
		}

		return true;
	});

	/**
	 * Get an array of the object values
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}   obj
	 * @param    {Boolean}  includePrototype   If true, prototypal properties also count
	 *
	 * @return   {Array}
	 */
	Blast.defineStatic('Object', 'values', function isEmpty(obj, includePrototype) {

		var result = [],
		    key;

		if (!obj) {
			return result;
		}

		for(key in obj) {
			if (includePrototype || obj.hasOwnProperty(key)) {
				result[result.length] = obj[key];
			}
		}

		return result;
	}, true);

	/**
	 * Inject the properties of one object into another target object
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param   {Object}   target     The object to inject the extension into
	 * @param   {Object}   extension  The object to inject
	 *
	 * @returns {Object}   Returns the injected target (which it also modifies byref)
	 */
	Blast.defineStatic('Object', 'assign', function assign(target, first, second) {
		
		var length = arguments.length, extension, key, i;
		
		// Go over every argument, other than the first
		for (i = 1; i <= length; i++) {
			extension = arguments[i];

			// If the given extension isn't valid, continue
			if (!extension) continue;
			
			// Go over every property of the current object
			for (key in extension) {
				target[key] = extension[key];
			}
		}
		
		return target;
	}, true);

	/**
	 * Convert an array to an object
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Mixed}   source
	 * @param    {Boolean} recursive
	 * @param    {Mixed}   value
	 *
	 * @return   {Object}
	 */
	Blast.defineStatic('Object', 'objectify', function objectify(source, recursive, value) {

		var result = {},
		    temp,
		    type,
		    key,
		    i;

		if (typeof value == 'undefined') {
			value = true;
		}

		if (Array.isArray(source)) {
			for (i = 0; i < source.length; i++) {

				if (typeof source[i] !== 'object') {
					result[source[i]] = value;
				} else if (Array.isArray(source[i])) {
					Collection.Object.assign(result, Object.objectify(source[i], recursive, value));
				} else {
					Collection.Object.assign(result, source[i]);
				}
			}
		} else {
			Collection.Object.assign(result, source);
		}

		for (key in result) {
			type = typeof result[key];

			if (type == 'object') {
				if (recursive) {
					result[key] = Collection.Object.objectify(result[key], true, value);
				}
			}
		}

		return result;
	});

	/**
	 * Iterate over an object's properties
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}     obj
	 * @param    {Function}   fnc
	 */
	Blast.defineStatic('Object', 'each', function each(obj, fnc) {

		var key;

		for (key in obj) {
			fnc(obj[key], key, obj);
		}
	});

	/**
	 * Map an object
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}     obj
	 * @param    {Function}   fnc
	 *
	 * @return   {Object}
	 */
	Blast.defineStatic('Object', 'map', function map(obj, fnc) {

		var mapped = {};

		Collection.Object.each(obj, function mapEach(value, key) {
			mapped[key] = fnc(value, key, obj);
		});

		return mapped;
	});

	/**
	 * Get the key of a value in an array or object.
	 * If the value is not found a false is returned (not -1 for arrays)
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.1.0
	 * @version   0.1.0
	 *
	 * @param     {Object|Array}   target   The object to search in
	 * @param     {Object}         value    The value to look for
	 *
	 * @return    {String|Number|Boolean}
	 */
	Blast.defineStatic('Object', 'getValueKey', function getValueKey(target, value) {

		var result, key;

		if (target) {

			if (Array.isArray(target)) {
				result = target.indexOf(value);

				if (result > -1) {
					return result;
				}
			} else {
				for (key in target) {
					if (target[key] == value) {
						return key;
					}
				}
			}
		}

		return false;
	});

	/**
	 * See if a key exists in an object or array
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.1.0
	 * @version   0.1.0
	 *
	 * @param     {Object|Array}   target      The object to search in
	 * @param     {String}          property   The key to look for
	 *
	 * @return    {Boolean}
	 */
	Blast.defineStatic('Object', 'hasProperty', function hasProperty(target, property) {

		if (target && (typeof target[property] !== 'undefined' || property in target)) {
			return true;
		}

		return false;
	});

	/**
	 * Look for a value in an object or array
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.1.0
	 * @version   0.1.0
	 *
	 * @param     {Object|Array}   target   The object to search in
	 * @param     {Object}         value    The value to look for
	 *
	 * @return    {Boolean}
	 */
	Blast.defineStatic('Object', 'hasValue', function hasValue(target, value) {
		return !(Collection.Object.getValueKey(target, value) === false);
	});

	/**
	 * Uneval
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.1.0
	 * @version   0.1.0
	 *
	 * @param     {Object}   obj
	 *
	 * @return    {String}
	 */
	Blast.defineStatic('Object', 'uneval', Blast.uneval);

};});
require.register("regexp.js", function(module, exports, require){
module.exports = function BlastRegExp(Blast, Collection) {

	/**
	 * Escape a string so it can be used inside a regular expression.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {String}   str
	 *
	 * @return   {String}
	 */
	Blast.defineStatic('RegExp', 'escape', function escape(str) {
		return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
	});

	/**
	 * Return a string representing the source code of the regular expression.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('RegExp', 'toSource', function toSource() {
		return this.toString();
	}, true);

};});
require.register("string.js", function(module, exports, require){
module.exports = function BlastString(Blast, Collection) {

	var hashLengths = {
		'md5': 32,
		'sha1': 40
	};

	/**
	 * Return a string representing the source code of the object.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'toSource', function toSource() {
		return '(new String(' + JSON.stringify(this) + '))';
	}, true);

	/**
	 * Count the number of capital letters in the string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @return   {Number}   The number of capitals in the string
	 */
	Blast.definePrototype('String', 'capitals', function capitals() {
		return this.replace(/[^A-Z]/g, '').length;
	});

	/**
	 * Count the given word in the string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @return   {Number}   The number of times the string appears
	 */
	Blast.definePrototype('String', 'count', function count(word) {

		var result = this.match(RegExp(word, 'g'));

		if (!result) {
			return 0;
		} else {
			return result.length;
		}
	});

	/**
	 * See if a string starts with the given word
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   str
	 *
	 * @return   {Boolean}
	 */
	Blast.definePrototype('String', 'startsWith', function startsWith(str) {
		return this.slice(0, str.length) == str;
	});

	/**
	 * See if a string ends with the given word
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   str
	 *
	 * @return   {Boolean}
	 */
	Blast.definePrototype('String', 'endsWith', function endsWith(str) {
		return this.slice(-str.length) == str;
	});

	/**
	 * Add a postfix to a string if it isn't present yet
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {String}   postfix   The string to append
	 *
	 * @return   {String}   The string with the postfix added to it
	 */
	Blast.definePrototype('String', 'postfix', function postfix(postfix) {
		
		var str = ''+this;
		
		// If the given postfix isn't a string, return
		if (typeof postfix != 'string') return str;
		
		// Append the postfix if it isn't present yet
		if (!str.endsWith(postfix)) str += postfix;
		
		return str;
	});

	/**
	 * See if a string is a valid hexadecimal number
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {Boolean}
	 */
	Blast.definePrototype('String', 'isHex', function isHex() {
		return !isNaN(Number('0x'+this));
	});

	/**
	 * Replace all spaces with underscores
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'despace', function despace() {
		return this.replace(/ /g, '_');
	});

	/**
	 * Multiply a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {Number}   number   The amount of times to multiply the string
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'multiply', function multiply(number) {

		var str = '',
		    self = ''+this,
		    i;

		if (!number) {
			number = 0;
		}

		for (i = 0; i < number; i++) {
			str += self;
		}

		return str;
	});

	/**
	 * Determine if the string can be a valid ObjectId
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {Boolean}
	 */
	Blast.definePrototype('String', 'isObjectId', function isObjectId() {
		return this.length == 24 && Blast.Bound.String.isHex(this);
	});

	/**
	 * See if a string is a valid hash
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   hashType
	 *
	 * @return   {Boolean}
	 */
	Blast.definePrototype('String', 'isHash', function isHash(hashType) {

		var isHex = Blast.Bound.String.isHex(this);

		if (!hashType) {
			return isHex;
		} else {
			return isHex && this.length == hashLengths[hashType];
		}
	});

	// Generate the crc32 table
	var crc32table = (function() {
		var value, pos, i;
		var table = [];

		for (pos = 0; pos < 256; ++pos) {
			value = pos;
			for (i = 0; i < 8; ++i) {
				value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
			}
			table[pos] = value >>> 0;
		}

		return table;
	})();

	/**
	 * Hash a (small) string very fast
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @return   {Number}
	 */
	Blast.definePrototype('String', 'numberHash', function hash() {

		var str = this,
		    res = 0,
		    len = str.length,
		    i   = -1;

		while (++i < len) {
			res = res * 31 + str.charCodeAt(i);
		}

		return res;
	});

	/**
	 * Generate a checksum (crc32 hash)
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'checksum', function checksum() {

		var str = this,
		    crc = 0 ^ (-1),
		    i;

		for (i = 0; i < str.length; i++ ) {
			crc = (crc >>> 8) ^ crc32table[(crc ^ str.charCodeAt(i)) & 0xFF];
		}

		return (crc ^ (-1)) >>> 0;
	});

	/**
	 * Get all the placeholders inside a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @return   {Array}
	 */
	Blast.definePrototype('String', 'placeholders', function placeholders() {

		var regex  = /:(\w*)/g,
		    result = [],
		    match;

		while (match = regex.exec(this)) {
			if (typeof match[1] !== 'undefined') {
				result.push(match[1]);
			}
		}

		return result;
	});

	/**
	 * Replace all the placeholders inside a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   values
	 *
	 * @return   {String}
	 */
	Blast.definePrototype('String', 'fillPlaceholders', function fillPlaceholders(values) {

		var result = ''+this,
		    params,
		    value,
		    regex,
		    match,
		    repl,
		    ori,
		    i;

		if (values && typeof values == 'object') {
			params = this.placeholders();

			for (i = 0; i < params.length; i++) {

				regex = new RegExp('(:' + params[i] + ')(?:\\W|$)', 'g');
				
				value = Blast.Bound.Object.path(values, params[i]);

				if (value || value === 0) {

					while (match = regex.exec(result)) {

						// Get the original value
						ori = match[0];

						// Generate the replacement
						repl = ori.replace(match[1], value);

						// Replace the original with the replacement in the string
						result = result.replace(ori, repl);
					}
				}
			}
		}

		return result;
	});

	/*!
	 * string_score.js: String Scoring Algorithm 0.1.20 
	 *
	 * http://joshaven.com/string_score
	 * https://github.com/joshaven/string_score
	 *
	 * Copyright (C) 2009-2011 Joshaven Potter <yourtech@gmail.com>
	 * Special thanks to all of the contributors listed here https://github.com/joshaven/string_score
	 * MIT license: http://www.opensource.org/licenses/mit-license.php
	 *
	 * Date: Tue Mar 1 2011
	 * Updated: Tue Jun 11 2013
	*/

	/**
	 * Scores a string against another string.
	 *  'Hello World'.score('he');     //=> 0.5931818181818181
	 *  'Hello World'.score('Hello');  //=> 0.7318181818181818
	 */
	Blast.definePrototype('String', 'score', function score(word, fuzziness) {

		// If the string is equal to the word, perfect match.
		if (this == word) return 1;

		//if it's not a perfect match and is empty return 0
		if (word == '') return 0;

		var runningScore = 0,
		    charScore,
		    finalScore,
		    string = this,
		    lString = string.toLowerCase(),
		    strLength = string.length,
		    lWord = word.toLowerCase(),
		    wordLength = word.length,
		    idxOf,
		    startAt = 0,
		    fuzzies = 1,
		    fuzzyFactor;
		
		// Cache fuzzyFactor for speed increase
		if (fuzziness) fuzzyFactor = 1 - fuzziness;

		// Walk through word and add up scores.
		// Code duplication occurs to prevent checking fuzziness inside for loop
		if (fuzziness) {
			for (var i = 0; i < wordLength; ++i) {

				// Find next first case-insensitive match of a character.
				idxOf = lString.indexOf(lWord[i], startAt);
				
				if (-1 === idxOf) {
					fuzzies += fuzzyFactor;
					continue;
				} else if (startAt === idxOf) {
					// Consecutive letter & start-of-string Bonus
					charScore = 0.7;
				} else {
					charScore = 0.1;

					// Acronym Bonus
					// Weighing Logic: Typing the first character of an acronym is as if you
					// preceded it with two perfect character matches.
					if (string[idxOf - 1] === ' ') charScore += 0.8;
				}
				
				// Same case bonus.
				if (string[idxOf] === word[i]) charScore += 0.1; 
				
				// Update scores and startAt position for next round of indexOf
				runningScore += charScore;
				startAt = idxOf + 1;
			}
		} else {
			for (var i = 0; i < wordLength; ++i) {
			
				idxOf = lString.indexOf(lWord[i], startAt);
				
				if (-1 === idxOf) {
					return 0;
				} else if (startAt === idxOf) {
					charScore = 0.7;
				} else {
					charScore = 0.1;
					if (string[idxOf - 1] === ' ') charScore += 0.8;
				}

				if (string[idxOf] === word[i]) charScore += 0.1; 
				
				runningScore += charScore;
				startAt = idxOf + 1;
			}
		}

		// Reduce penalty for longer strings.
		finalScore = 0.5 * (runningScore / strLength  + runningScore / wordLength) / fuzzies;
		
		if ((lWord[0] === lString[0]) && (finalScore < 0.85)) {
			finalScore += 0.15;
		}
		
		return finalScore;
	});

};});

useCommon = true;
//_REGISTER_//

	if (useCommon) {
		module.exports = require('init.js');
	} else {
		window.Protoblast = require('init.js')();
	}

}());
});
require.register("hawkejs", function(module, exports, require){
var async  = require('async'),
    Nuclei = require('nuclei').Nuclei,
    Hawkevents = require('hawkevents'),
    Blast      = require('protoblast')(false),
    Utils      = Blast.Bound,
    HawkejsClass,
    Hawkejs;

/**
 * The Hawkejs class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
HawkejsClass = Hawkejs = Nuclei.extend(function Hawkejs() {

	// Store protoblast object in here
	this.Blast = Blast;

	// Store utils in here
	this.Utils = Blast.Bound;

	// Default tags
	this.open = '<%';
	this.close = '%>';

	// Where to look for templates
	this.templateDir = '';

	// The server root path
	this.root = '/';

	// Relative path to the client file
	this.clientPath = 'hawkejs/hawkejs-client.js';

	// jQuery fallback
	this.jqueryPath = '';

	// Use render context with with by default
	this.withRenderContext = true;

	this.files = {};
	this.commands = {};
	this.helpers = {};

	/**
	 * The Hawkejs instance constructor
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	this.init = function init() {
		// Compiled templates go here
		this.templates = {};

		// Source templates to here
		this.source = {};
	};

	/**
	 * Load a scene on the client side
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	this.loadScene = function loadScene(settings, scene) {

		// Insert the settings
		Blast.Object.assign(this, settings);

		// Create a new scene
		this.scene = scene;

		scene.hawkejs = this;
	};

	/**
	 * Compile a source to an executable function
	 * and store in in the templates object.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 * @param    {String}   source
	 *
	 * @return   {Function}
	 */
	this.compile = function compile(name, source) {

		var compiled,
		    strName,
		    lines,
		    split,
		    line,
		    code,
		    temp,
		    tab,
		    cmd,
		    arg,
		    i;

		// Convert the template name to a JSON string we can use for eval
		strName = JSON.stringify(name);

		// Set the beginning tab indent
		tab = '\t';

		code = 'compiled = function compiledView(vars, helper){\n';

		code += tab + 'this.timeStart(' + strName + ');\n';

		if (this.withRenderContext) {
			// Use with to inject the context into the scope
			code += tab + 'with (this) {\n';
			tab += '\t';
		}

		// Use with to inject variables into the scope
		code += tab + 'with (vars) {\n';

		tab += '\t';

		lines = HawkejsClass.dissect(source, this.open, this.close);

		for (i = 0; i < lines.length; i++) {
			line = lines[i];

			if (line.type == 'inside') {

				// Error reporting
				//code += 'this.errLine = ' + line.lineStart + ';this.errName = ' + JSON.stringify(name) + ';';
				code += tab + 'this.setErr(' + strName + ',' + line.lineStart + ');\n';

				// Trim the right spaces
				temp = line.content.trimRight();

				// Split by spaces
				split = temp.split(' ');

				// Get the cmd keyword
				cmd = split[0];

				if (this.commands[cmd]) {
					split.shift();
					code += tab + 'this.command(' + JSON.stringify(cmd) + ', [' + split.join(' ') + ']);\n';
				} else {
					code += tab + temp.trimLeft() + ';\n';
				}

			} else {
				code += tab + 'this.print(' + JSON.stringify(line.content) + ');\n';
			}
		}

		if (this.withRenderContext) {

			// Remove 1 tab
			tab = tab.slice(0,tab.length-1);

			code += tab +'}\n'; // End of 'this' with
		}

		// Remove 1 tab
		tab = tab.slice(0,tab.length-1);

		code += tab + '}\n'; // End of 'vars' with

		code += tab + 'this.timeEnd(' + strName + ');\n';

		code += '}'; // End of the function

		try {
			eval(code);
		} catch(err) {
			console.log(err);
		}

		this.templates[name] = compiled;
		this.source[name] = source;

		return compiled;
	};

	/**
	 * Handle render errors by showing where the error occured
	 * inside the original template file
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   templateName
	 * @param    {Number}   lineNr
	 * @param    {Error}    error
	 */
	this.handleError = function handleError(templateName, lineNr, error) {

		var message,
		    source,
		    start,
		    stop,
		    i;

		if (!templateName) {
			return console.log(error);
		}

		message = '\nError inside »' + templateName + '« template\n' + error + '\n';
		source = this.source[templateName].split('\n');

		start = lineNr - 3;
		stop = lineNr + 4;

		if (lineNr < 0) {
			linrNr = 0;
		}

		if (stop > source.length) {
			stop = source.length;
		}

		message += '----------------------------------------------\n';

		for (i = start; i < stop; i++) {

			if (i == lineNr) {
				message += ' »»»';
			} else {
				message += '    ';
			}

			if (i < 10) {
				message += '   ' + i;
			} else if (i < 100) {
				message += '  ' + i;
			} else {
				message += ' ' + i;
			}

			message += ' | ' + source[i] + '\n';
		}

		console.log(message);
	};

	/**
	 * Get the compiled template function
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}    templateName
	 * @param    {Function}  callback
	 */
	this.getCompiled = function getCompiled(templateName, callback) {

		var that = this;

		if (this.templates[templateName]) {
			return callback(null, this.templates[templateName]);
		}

		this.getSource(templateName, function(err, source) {

			if (err) {
				return callback(err);
			}

			var compiled = that.compile(templateName, source);
			that.templates[templateName] = compiled;

			callback(null, compiled);
		});
	};

	/**
	 * Render the wanted template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}    templateName
	 * @param    {Object}    variables
	 * @param    {Function}  callback
	 *
	 * @return   {ViewRender}
	 */
	this.render = function render(templateName, variables, callback) {

		if (typeof variables == 'function') {
			callback = variables;
			variables = {};
		}

		// Create a new ViewRender object
		var viewRender = new HawkejsClass.ViewRender(this),
		    that = this;

		// Make sure the template has been downloaded
		async.series([function ensureSource(next) {

			if (!that.templates[templateName]) {

				that.getCompiled(templateName, function(err) {

					if (err) {
						return next(err);
					}

					next();
				});
			} else {
				next();
			}
		}], function(err, result) {

			if (err) {
				if (callback) {
					callback(err, '');
				}

				return;
			}

			// Start executing the template code
			viewRender.execute(templateName, variables, true);

			// If a callback has been given, make sure it gets the html
			if (callback) {
				viewRender.finish(callback);
			}
		});

		return viewRender;
	};
});

Hawkejs.async = async;

/**
 * Create classes using Nuclei
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Function}   fnc
 */
Hawkejs.create = function create(fnc) {
	return Nuclei.extend(fnc);
};

/**
 * Register commands.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}    name
 * @param    {Function}  fnc
 */
Hawkejs.registerCommand = function registerCommand(name, fnc) {
	Hawkejs.prototype.commands[name] = fnc;
};

/**
 * Register helper class.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}    name
 * @param    {Function}  fnc
 */
Hawkejs.registerHelper = function registerHelper(name, fnc) {
	Hawkejs.prototype.helpers[name] = fnc;
};

/**
 * The basic echo command
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Hawkejs.registerCommand('=', function echo(message) {
	this.print(message);
});

/**
 * Dissect a string into parts inside the given delimiters
 * and outside of it
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   str    The string to dissect
 * @param    {String}   open   The open tag
 * @param    {String}   close  The close tag
 *
 * @return   {Array}    An array of objects
 */
Hawkejs.dissect = function dissect(str, open, close) {

	var closeLen = close.length,
	    openLen = open.length,
	    result = [],
	    lineCount = 0,
	    isOpen,
	    obj,
	    cur,
	    i;

	for (i = 0; i < str.length; i++) {

		cur = str[i];

		if (cur == '\n') {
			lineCount++;
		}

		// If the tag is open
		if (isOpen) {
			if (str.substr(i, closeLen) == close) {
				i += (closeLen - 1);
				isOpen = false;
				obj.lineEnd = lineCount;
			} else {
				obj.content += cur;
			}

			continue;
		}

		// See if a tag is being opened
		if (str.substr(i, openLen) == open) {

			if (obj && obj.type == 'normal') {
				obj.lineEnd = lineCount;
			}

			obj = {type: 'inside', lineStart: lineCount, lineEnd: undefined, content: ''};
			result.push(obj);

			isOpen = true;
			i += (openLen - 1);

			continue;
		}

		// No tag is open, no tag is being opened
		if (!obj || obj.type != 'normal') {
			obj = {type: 'normal', lineStart: lineCount, lineEnd: undefined, content: ''};
			result.push(obj);
		}

		obj.content += cur;
	}

	obj.lineEnd = lineCount;

	return result;
};

/**
 * Load a script for use with Hawkejs
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Hawkejs.load = function load(filePath, options) {

	var location = filePath;

	if (!options || typeof options != 'object') {
		options = {};
	}

	if (typeof options.server == 'undefined') {
		options.server = true;
	}

	if (typeof options.browser == 'undefined') {
		options.browser = true;
	}

	if (location[0] !== '/') {
		location = __dirname + '/../../' + location;
	}

	if (!Hawkejs.prototype.files[filePath]) {
		Hawkejs.prototype.files[filePath] = options;
		require(location)(Hawkejs);
	}
};

Hawkejs.Hawkevents = Hawkevents;
Hawkejs.Blast = Blast;
Hawkejs.Utils = Blast.Bound;

module.exports = Hawkejs;
});
require.register("lib/class/hashmap.js", function(module, exports, require){
module.exports = function(Hawkejs) {

	/**
	 * Sort function
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var sorter = function sorter(a, b) {
		if (a.weight < b.weight) {
			return 1;
		} else if (a.weight > b.weight) {
			return -1;
		} else {
			// Smaller ids get preference here
			if (a.id < b.id) {
				return -1;
			} else if (a.id > b.id) {
				return 1;
			} else {
				return 0;
			}
		}
	};

	/**
	 * The Hashmap class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Hashmap = Hawkejs.create(function Hashmap() {

		this.init = function init() {
			this.insertCount = 0;
			this.dict = {};
		};

		/**
		 * Get the source code representation of this object
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.toSource = function toSource() {

			var src = '(function(){';
			src += 'var a = new Hawkejs.Hashmap();';
			src += 'a.insertCount=' + JSON.stringify(this.insertCount) + ';';
			src += 'a.dict=' + JSON.stringify(this.dict) + ';';
			src += 'return a;'
			src += '}())';

			return src;
		};

		/**
		 * Get the value of the wanted key
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.get = function get(key) {

			if (this.dict[key]) {
				return this.dict[key].value;
			}
		};

		/**
		 * Add a key-value pair with an optional order
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.push = function push(key, value, weight) {

			var item = this.dict[key];

			if (!item) {
				item = {
					id: ++this.insertCount
				};
			}

			if (typeof weight !== 'number') {
				weight = 100;
			}

			item.key = key;
			item.value = value;
			item.weight = weight;

			this.dict[key] = item;

			return item.id;
		};

		/**
		 * Iterate over the items in the dictionary
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {Function}   fnc
		 */
		this.forEach = function forEach(fnc) {

			var values = Hawkejs.Utils.Object.values(this.dict);

			// Sort by weight and id
			values.sort(sorter);

			values.forEach(function(item, index) {
				fnc(item.value, item.key, index, item);
			});
		};

	});

	Hawkejs.Hashmap = Hashmap;
};
});
require.register("lib/class/helper.js", function(module, exports, require){
module.exports = function(Hawkejs) {

	var Helper = Hawkejs.create(function Helper() {

		/**
		 * Instantiate a newly created Chimera after this class has been extended
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {Function}   parent   The parent class
		 * @param    {Function}   child    The (extended) child class
		 */
		this.__extended__ = function __extended__(parent, child) {
			Hawkejs.registerHelper(child.prototype.name, child);
		};

		/**
		 * Set the render object upon init
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {ViewRender}   view
		 */
		this.init = function init(view) {
			this.view = view;
		};

	});

	Hawkejs.Helper = Helper;
};
});
require.register("lib/class/placeholder.js", function(module, exports, require){
module.exports = function(Hawkejs) {

	/**
	 * Placeholders allow us to asynchronously insert content into a render
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Placeholder = Hawkejs.create(function Placeholder() {

		/**
		 * Create a new placeholder, with a function to execute
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {ViewRender} parent
		 * @param    {Function}   fnc
		 */
		this.init = function init(parent, fnc) {

			// The ViewRender instance
			this.parent = parent;

			// We've jsut created it, so it's not finished
			this.finished = false;

			// Store all the callbacks that want content here
			this.callbacks = [];

			// The result is empty at first
			this.result = '';

			// The err is null
			this.err = null;

			// Get current error information
			this.errLine = parent.errLine;
			this.errName = parent.errName;

			// A function to run when getContent is called?
			this.onGetContent = false;

			// Has onGetContent been called?
			this.onGetContentCalled = false;

			// Start the main function if one is already provided
			if (fnc) fnc(this.callback.bind(this));
		};

		/**
		 * The result will be returned through this callback
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {Object}   err
		 * @param    {String}   result
		 */
		this.callback = function callback(err, result) {

			var i;

			this.finished = true;

			if (err) {
				result = ''; // Maybe set an error message here?
				this.err = err;
			}

			this.result = result;

			for (i = 0; i < this.callbacks.length; i++) {
				this.callbacks[i](err, result);
			}

			this.callbacks.length = 0;
		};

		/**
		 * Execute the given function only when getContent is called
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.setGetContent = function setGetContent(fnc) {
			this.onGetContent = fnc;
		};

		/**
		 * Retrieve the content of this placeholder through this function
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.getContent = function getContent(callback) {

			if (this.finished) {
				return callback(this.err, this.result);
			}

			this.callbacks.push(callback);

			if (typeof this.onGetContent == 'function' && !this.onGetContentCalled) {
				this.onGetContentCalled = true;
				this.onGetContent(this.callback.bind(this));
			}
		};

		/**
		 * Return the result
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.getResult = function getResult() {
			return this.result;
		};

	});

	/**
	 * The placeholder for blocks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var BlockPlaceholder = Placeholder.extend(function BlockPlaceholder() {

		/**
		 * Initialize the placeholder
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {String}   blockName    The blockName
		 */
		this.init = function init(parent, blockName) {

			this.name = blockName;

			this.parent('init', null, parent, function(next) {
				parent.finish(blockName, function(err, result) {

					result = '<x-hawkejs data-type="block" data-name="' + blockName + '">' + (result||'') + '</x-hawkejs>';

					next(err, result);
				});
			});
		};

	});

	Hawkejs.Placeholder = Placeholder;
	Hawkejs.BlockPlaceholder = BlockPlaceholder;
};
});
require.register("lib/class/scene.js", function(module, exports, require){
module.exports = function(Hawkejs) {

	/**
	 * The Scene class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Scene = Hawkejs.create(function Scene() {

		this.init = function init(parent) {
			// The parent Hawkeye instance
			this.hawkejs = parent;

			// The loaded scripts
			this.scripts = new Hawkejs.Hashmap();
			this.styles = {};
		};

		/**
		 * Get the source code representation of this object
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.toSource = function toSource() {

			var src = '(function(){';
			src += 'var a = new Hawkejs.Scene();';
			src += 'a.scripts = ' + this.scripts.toSource() + ';';
			src += 'return a;';
			src += '}())';

			return src;
		};

		/**
		 * Load a script in the current scene
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.addScript = function addScript(path, options) {

			if (!options || typeof options !== 'object') {
				options = {};
			}

			if (!options.id) {
				options.id = path;
			}

			if (!options.path) {
				options.path = path;
			}

			this.scripts.push(options.id, options, options.weight);
		};
	});

	Hawkejs.Scene = Scene;
};
});
require.register("lib/class/view_render.js", function(module, exports, require){
module.exports = function(Hawkejs) {

	var async = Hawkejs.async;

	/**
	 * The ViewRender class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	function ViewRender(parent, scene) {

		// Call event emitter constructor
		Hawkejs.Hawkevents.call(this);

		// The parent hawkejs instance
		this.hawkejs = parent;

		// Blocks
		this.blocks = {};

		// Blockchain
		this.chain = [];

		// Current block
		this.currentBlock = '';

		// The block to use as a main block
		this.mainBlock = '';

		// Wanted extensions
		this.extensions = [];

		// Is any io running?
		this.running = 0;

		// Template times
		this.times = {};

		// Script blocks
		this.scriptBlocks = [];

		// Style blocks
		this.styleBlocks = [];

		// Script files
		this.scripts = [];

		// Style files
		this.styles = [];

		if (scene) {
			this.scene = scene;
		} else {
			this.scene = new Hawkejs.Scene(parent);
		}
	};

	/**
	 * Execute a command
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   cmd
	 * @param    {Array}    args
	 */
	ViewRender.prototype.command = function command(cmd, args) {
		if (this.hawkejs.commands[cmd]) {
			this.hawkejs.commands[cmd].apply(this, args);
		}
	};

	/**
	 * Start a block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName
	 */
	ViewRender.prototype.start = function start(blockName) {
		this.currentBlock = blockName;
		this.chain.push(blockName);
	};

	/**
	 * End a block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName
	 */
	ViewRender.prototype.end = function end(blockName) {

		var index;

		if (blockName) {

			index = this.chain.lastIndexOf(blockName);

			if (index > -1) {
				// If the block was found, remove it and everything after
				this.chain.splice(index);
			} else {
				// If the block wasn't found, just remove the last block
				this.chain.pop();
			}

		} else {
			this.chain.pop();
		}

		this.currentBlock = this.chain[this.chain.length-1];
	};

	/**
	 * Start execute the code of a template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name        The template name to render
	 * @param    {Object}   variables   The veriables to pass to the template
	 * @param    {Boolean}  main        Is this the main template?
	 * @param    {Function} callback    Optional callback to run after execution
	 */
	ViewRender.prototype.execute = function execute(name, variables, main, callback) {

		var blockName = name + '__main__',
		    helpers   = {},
		    that      = this,
		    tasks     = [],
		    key,
		    i;

		this.running++;

		if (typeof variables === 'function') {
			callback = variables;
			variables = {};
		}

		if (typeof main === 'function') {
			callback = main;
			main = false;
		}

		if (typeof variables === 'boolean') {
			main = variables;
			variables = {};
		}

		for (key in this.hawkejs.helpers) {
			helpers[key] = new this.hawkejs.helpers[key](this);
		}

		if (main && !this.variables) {
			this.variables = variables;
		}

		this.hawkejs.getCompiled(name, function(err, fnc) {

			that.start(blockName);

			// Execute the compiled template
			if (fnc) {
				try {
					fnc.call(that, variables, helpers);
				} catch (err) {
					that.hawkejs.handleError(that.errName, that.errLine, err);
				}
			}

			that.end(blockName);

			that.mainBlock = blockName;

			if (main) {
				that.extensions.forEach(function(extension) {
					tasks[tasks.length] = function(next) {
						that.execute(extension, variables, false, function() {
							next();
						});
					};
				});
			}

			async.parallel(tasks, function(err) {

				that.running--;

				if (callback) {
					callback();
				}

				that.checkFinish();
			});
		});
	};

	/**
	 * Set the start time for the given template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name    The template name that has started rendering
	 */
	ViewRender.prototype.timeStart = function timeStart(name) {

		if (!this.times[name]) {
			this.times[name] = {};
		}

		// Set the start time
		this.times[name].start = process.hrtime();
	};

	/**
	 * Set the end time for the given template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name    The template name that has ended rendering
	 */
	ViewRender.prototype.timeEnd = function timeEnd(name) {

		var end;

		if (!this.times[name]) {
			throw new Error('Illegal timeEnd call for template ' + name);
		}

		// Get the end time
		end = process.hrtime(this.times[name].start);

		// Calculate the duration in nanoseconds
		this.times[name].duration = end[0] * 1e9 + end[1];

		console.log("Compiled execution of " + name + " took %d milliseconds", ~~(this.times[name].duration/1000)/1000);
	};

	/**
	 * Set error information
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name    The template being rendered
	 * @param    {Number}   line    The line nr in the original ejs file
	 */
	ViewRender.prototype.setErr = function setErr(name, line) {
		this.errLine = line;
		this.errName = name;
	};

	/**
	 * See if any IO is still running.
	 * If there is not, do the finish callbacks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.prototype.checkFinish = function checkFinish() {

		var args;

		if (this.running) {
			return;
		}

		this.emitOnce('ioDone');
	};

	/**
	 * Finish the wanted block and pass the rendered content to the callback
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName    The blockName to finish (default mainBlock)
	 * @param    {Function} callback
	 */
	ViewRender.prototype.finish = function finish(blockName, callback) {

		var tasks = [],
		    that  = this,
		    block,
		    line,
		    i;

		// Don't do anything while IO is still running
		if (this.running) {

			this.after('ioDone', function() {
				that.finish(blockName, callback);
			});

			return;
		}


		if (typeof blockName === 'function') {
			callback = blockName;
			blockName = undefined;
		}

		if (!blockName) {
			blockName = this.mainBlock;
		}

		// Get the block to finish
		block = this.blocks[blockName];

		if (String(callback).indexOf('»»') > -1) {
			var debug = true;
		}

		if (!block) {
			return callback(new Error('Could not find block "' + blockName + '"'));
		}

		// Iterate over the lines to find any placeholders
		for (i = 0; i < block.length; i++) {
			line = block[i];

			if (line instanceof Hawkejs.Placeholder) {
				(function(line) {
					tasks[tasks.length] = function waitForPlaceholder(next) {

						line.getContent(function(err, result) {

							if (err) {
								that.hawkejs.handleError(line.errName, line.errLine, err);
							}

							next();
						});
					};
				}(line));
			}
		}

		// Now execute the tasks, where all the placeholder content will be fetched
		async.parallel(tasks, function(err) {

			var html = '',
			    length = block.length;

			if (err) {
				return callback(err);
			}

			// Join the block array entries into a single string
			for (i = 0; i < length; i++) {
				if (typeof block[i] === 'string') {
					html += block[i];
				} else {
					if (block[i] instanceof Hawkejs.Placeholder) {
						html += block[i].getResult();
					} else {
						html += block[i];
					}
				}
			}

			callback(null, html);
		});
	};

	/**
	 * Extend another template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   layout
	 */
	ViewRender.prototype.extend = function extend(layout) {
		this.extensions.push(layout);
	};

	/**
	 * Put the hawkejs client foundation here
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.prototype.foundation = function foundation() {

		var that = this,
		    placeholder = new Hawkejs.Placeholder(this);

		placeholder.setGetContent(function(done) {

			var settings,
			    html;

			settings = {
				open: that.hawkejs.open,
				close: that.hawkejs.close,
				root: that.hawkejs.root,
				withRenderContext: that.hawkejs.withRenderContext
			};

			// Load jQuery first
			html = '<script src="//code.jquery.com/jquery-1.11.0.min.js"></script>\n';

			// See if a fallback is present
			if (that.hawkejs.jqueryPath) {
				html += '<script>window.jQuery || document.write(\'<script src="' + that.hawkejs.jqueryPath + '">\x3C/script>\')</script>\n';
			}

			// Load the hawkejs client file
			html += '<script src="' + that.hawkejs.root + that.hawkejs.clientPath + '"></script>\n';

			// Load the scene
			html += '<script>hawkejs.loadScene(' + JSON.stringify(settings) + ', ' + that.scene.toSource() + ');</script>\n';

			done(null, html);
		});

		this.print(placeholder);
	};

	/**
	 * Print content to the given block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   content
	 */
	ViewRender.prototype.print = function print(content, block) {

		if (!block) {
			block = this.currentBlock || '__main__';
		}

		if (!this.blocks[block]) {
			this.blocks[block] = [];
		}

		this.blocks[block].push(content);
	};

	/**
	 * Assign a block here,
	 * also used for 'script' and 'style' blocks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 */
	ViewRender.prototype.assign = function assign(name, extra) {
		this.print(new Hawkejs.BlockPlaceholder(this, name));
	};

	/**
	 * Render an element and print it out
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   elementName    The element to render
	 * @param    {Object}   variables
	 */
	ViewRender.prototype.implement = function implement(elementName, variables) {

		var that = this,
		    placeholder,
		    subRender;

		placeholder = new Hawkejs.Placeholder(this);

		subRender = new ViewRender(that.hawkejs);
		subRender.implement = true;
		subRender.execute(elementName, variables || that.variables, true);

		// Only finish this block when getContent is called
		placeholder.setGetContent(function(next) {
			subRender.finish(function(err, result) {
				next(err, result);
			});
		});

		that.print(placeholder);
	};

	/**
	 * Execute asynchronous code
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   elementName    The element to render
	 * @param    {Object}   variables
	 */
	ViewRender.prototype.async = function async(fnc) {

		var that = this,
		    placeholder;

		placeholder = new Hawkejs.Placeholder(this, function(next) {
			fnc(function getResult(err, result) {
				next(err, result);
			});
		});

		that.print(placeholder);
	};

	ViewRender.prototype.script = function script(path, options) {
		this.scene.addScript(path, options);
	};

	// Inherit Hawkevents
	for (var key in Hawkejs.Hawkevents.prototype) {
		ViewRender.prototype[key] = Hawkejs.Hawkevents.prototype[key];
	}

	Hawkejs.ViewRender = ViewRender;
};
});
require.register("lib/class/hashmap.js", function(module, exports, require){
module.exports = function(Hawkejs) {

	/**
	 * Sort function
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var sorter = function sorter(a, b) {
		if (a.weight < b.weight) {
			return 1;
		} else if (a.weight > b.weight) {
			return -1;
		} else {
			// Smaller ids get preference here
			if (a.id < b.id) {
				return -1;
			} else if (a.id > b.id) {
				return 1;
			} else {
				return 0;
			}
		}
	};

	/**
	 * The Hashmap class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Hashmap = Hawkejs.create(function Hashmap() {

		this.init = function init() {
			this.insertCount = 0;
			this.dict = {};
		};

		/**
		 * Get the source code representation of this object
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.toSource = function toSource() {

			var src = '(function(){';
			src += 'var a = new Hawkejs.Hashmap();';
			src += 'a.insertCount=' + JSON.stringify(this.insertCount) + ';';
			src += 'a.dict=' + JSON.stringify(this.dict) + ';';
			src += 'return a;'
			src += '}())';

			return src;
		};

		/**
		 * Get the value of the wanted key
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.get = function get(key) {

			if (this.dict[key]) {
				return this.dict[key].value;
			}
		};

		/**
		 * Add a key-value pair with an optional order
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.push = function push(key, value, weight) {

			var item = this.dict[key];

			if (!item) {
				item = {
					id: ++this.insertCount
				};
			}

			if (typeof weight !== 'number') {
				weight = 100;
			}

			item.key = key;
			item.value = value;
			item.weight = weight;

			this.dict[key] = item;

			return item.id;
		};

		/**
		 * Iterate over the items in the dictionary
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {Function}   fnc
		 */
		this.forEach = function forEach(fnc) {

			var values = Hawkejs.Utils.Object.values(this.dict);

			// Sort by weight and id
			values.sort(sorter);

			values.forEach(function(item, index) {
				fnc(item.value, item.key, index, item);
			});
		};

	});

	Hawkejs.Hashmap = Hashmap;
};
});
require.register("lib/class/helper.js", function(module, exports, require){
module.exports = function(Hawkejs) {

	var Helper = Hawkejs.create(function Helper() {

		/**
		 * Instantiate a newly created Chimera after this class has been extended
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {Function}   parent   The parent class
		 * @param    {Function}   child    The (extended) child class
		 */
		this.__extended__ = function __extended__(parent, child) {
			Hawkejs.registerHelper(child.prototype.name, child);
		};

		/**
		 * Set the render object upon init
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {ViewRender}   view
		 */
		this.init = function init(view) {
			this.view = view;
		};

	});

	Hawkejs.Helper = Helper;
};
});
require.register("lib/class/placeholder.js", function(module, exports, require){
module.exports = function(Hawkejs) {

	/**
	 * Placeholders allow us to asynchronously insert content into a render
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Placeholder = Hawkejs.create(function Placeholder() {

		/**
		 * Create a new placeholder, with a function to execute
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {ViewRender} parent
		 * @param    {Function}   fnc
		 */
		this.init = function init(parent, fnc) {

			// The ViewRender instance
			this.parent = parent;

			// We've jsut created it, so it's not finished
			this.finished = false;

			// Store all the callbacks that want content here
			this.callbacks = [];

			// The result is empty at first
			this.result = '';

			// The err is null
			this.err = null;

			// Get current error information
			this.errLine = parent.errLine;
			this.errName = parent.errName;

			// A function to run when getContent is called?
			this.onGetContent = false;

			// Has onGetContent been called?
			this.onGetContentCalled = false;

			// Start the main function if one is already provided
			if (fnc) fnc(this.callback.bind(this));
		};

		/**
		 * The result will be returned through this callback
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {Object}   err
		 * @param    {String}   result
		 */
		this.callback = function callback(err, result) {

			var i;

			this.finished = true;

			if (err) {
				result = ''; // Maybe set an error message here?
				this.err = err;
			}

			this.result = result;

			for (i = 0; i < this.callbacks.length; i++) {
				this.callbacks[i](err, result);
			}

			this.callbacks.length = 0;
		};

		/**
		 * Execute the given function only when getContent is called
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.setGetContent = function setGetContent(fnc) {
			this.onGetContent = fnc;
		};

		/**
		 * Retrieve the content of this placeholder through this function
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.getContent = function getContent(callback) {

			if (this.finished) {
				return callback(this.err, this.result);
			}

			this.callbacks.push(callback);

			if (typeof this.onGetContent == 'function' && !this.onGetContentCalled) {
				this.onGetContentCalled = true;
				this.onGetContent(this.callback.bind(this));
			}
		};

		/**
		 * Return the result
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.getResult = function getResult() {
			return this.result;
		};

	});

	/**
	 * The placeholder for blocks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var BlockPlaceholder = Placeholder.extend(function BlockPlaceholder() {

		/**
		 * Initialize the placeholder
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {String}   blockName    The blockName
		 */
		this.init = function init(parent, blockName) {

			this.name = blockName;

			this.parent('init', null, parent, function(next) {
				parent.finish(blockName, function(err, result) {

					result = '<x-hawkejs data-type="block" data-name="' + blockName + '">' + (result||'') + '</x-hawkejs>';

					next(err, result);
				});
			});
		};

	});

	Hawkejs.Placeholder = Placeholder;
	Hawkejs.BlockPlaceholder = BlockPlaceholder;
};
});
require.register("lib/class/scene.js", function(module, exports, require){
module.exports = function(Hawkejs) {

	/**
	 * The Scene class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Scene = Hawkejs.create(function Scene() {

		this.init = function init(parent) {
			// The parent Hawkeye instance
			this.hawkejs = parent;

			// The loaded scripts
			this.scripts = new Hawkejs.Hashmap();
			this.styles = {};
		};

		/**
		 * Get the source code representation of this object
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.toSource = function toSource() {

			var src = '(function(){';
			src += 'var a = new Hawkejs.Scene();';
			src += 'a.scripts = ' + this.scripts.toSource() + ';';
			src += 'return a;';
			src += '}())';

			return src;
		};

		/**
		 * Load a script in the current scene
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.addScript = function addScript(path, options) {

			if (!options || typeof options !== 'object') {
				options = {};
			}

			if (!options.id) {
				options.id = path;
			}

			if (!options.path) {
				options.path = path;
			}

			this.scripts.push(options.id, options, options.weight);
		};
	});

	Hawkejs.Scene = Scene;
};
});
require.register("lib/class/view_render.js", function(module, exports, require){
module.exports = function(Hawkejs) {

	var async = Hawkejs.async;

	/**
	 * The ViewRender class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	function ViewRender(parent, scene) {

		// Call event emitter constructor
		Hawkejs.Hawkevents.call(this);

		// The parent hawkejs instance
		this.hawkejs = parent;

		// Blocks
		this.blocks = {};

		// Blockchain
		this.chain = [];

		// Current block
		this.currentBlock = '';

		// The block to use as a main block
		this.mainBlock = '';

		// Wanted extensions
		this.extensions = [];

		// Is any io running?
		this.running = 0;

		// Template times
		this.times = {};

		// Script blocks
		this.scriptBlocks = [];

		// Style blocks
		this.styleBlocks = [];

		// Script files
		this.scripts = [];

		// Style files
		this.styles = [];

		if (scene) {
			this.scene = scene;
		} else {
			this.scene = new Hawkejs.Scene(parent);
		}
	};

	/**
	 * Execute a command
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   cmd
	 * @param    {Array}    args
	 */
	ViewRender.prototype.command = function command(cmd, args) {
		if (this.hawkejs.commands[cmd]) {
			this.hawkejs.commands[cmd].apply(this, args);
		}
	};

	/**
	 * Start a block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName
	 */
	ViewRender.prototype.start = function start(blockName) {
		this.currentBlock = blockName;
		this.chain.push(blockName);
	};

	/**
	 * End a block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName
	 */
	ViewRender.prototype.end = function end(blockName) {

		var index;

		if (blockName) {

			index = this.chain.lastIndexOf(blockName);

			if (index > -1) {
				// If the block was found, remove it and everything after
				this.chain.splice(index);
			} else {
				// If the block wasn't found, just remove the last block
				this.chain.pop();
			}

		} else {
			this.chain.pop();
		}

		this.currentBlock = this.chain[this.chain.length-1];
	};

	/**
	 * Start execute the code of a template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name        The template name to render
	 * @param    {Object}   variables   The veriables to pass to the template
	 * @param    {Boolean}  main        Is this the main template?
	 * @param    {Function} callback    Optional callback to run after execution
	 */
	ViewRender.prototype.execute = function execute(name, variables, main, callback) {

		var blockName = name + '__main__',
		    helpers   = {},
		    that      = this,
		    tasks     = [],
		    key,
		    i;

		this.running++;

		if (typeof variables === 'function') {
			callback = variables;
			variables = {};
		}

		if (typeof main === 'function') {
			callback = main;
			main = false;
		}

		if (typeof variables === 'boolean') {
			main = variables;
			variables = {};
		}

		for (key in this.hawkejs.helpers) {
			helpers[key] = new this.hawkejs.helpers[key](this);
		}

		if (main && !this.variables) {
			this.variables = variables;
		}

		this.hawkejs.getCompiled(name, function(err, fnc) {

			that.start(blockName);

			// Execute the compiled template
			if (fnc) {
				try {
					fnc.call(that, variables, helpers);
				} catch (err) {
					that.hawkejs.handleError(that.errName, that.errLine, err);
				}
			}

			that.end(blockName);

			that.mainBlock = blockName;

			if (main) {
				that.extensions.forEach(function(extension) {
					tasks[tasks.length] = function(next) {
						that.execute(extension, variables, false, function() {
							next();
						});
					};
				});
			}

			async.parallel(tasks, function(err) {

				that.running--;

				if (callback) {
					callback();
				}

				that.checkFinish();
			});
		});
	};

	/**
	 * Set the start time for the given template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name    The template name that has started rendering
	 */
	ViewRender.prototype.timeStart = function timeStart(name) {

		if (!this.times[name]) {
			this.times[name] = {};
		}

		// Set the start time
		this.times[name].start = process.hrtime();
	};

	/**
	 * Set the end time for the given template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name    The template name that has ended rendering
	 */
	ViewRender.prototype.timeEnd = function timeEnd(name) {

		var end;

		if (!this.times[name]) {
			throw new Error('Illegal timeEnd call for template ' + name);
		}

		// Get the end time
		end = process.hrtime(this.times[name].start);

		// Calculate the duration in nanoseconds
		this.times[name].duration = end[0] * 1e9 + end[1];

		console.log("Compiled execution of " + name + " took %d milliseconds", ~~(this.times[name].duration/1000)/1000);
	};

	/**
	 * Set error information
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name    The template being rendered
	 * @param    {Number}   line    The line nr in the original ejs file
	 */
	ViewRender.prototype.setErr = function setErr(name, line) {
		this.errLine = line;
		this.errName = name;
	};

	/**
	 * See if any IO is still running.
	 * If there is not, do the finish callbacks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.prototype.checkFinish = function checkFinish() {

		var args;

		if (this.running) {
			return;
		}

		this.emitOnce('ioDone');
	};

	/**
	 * Finish the wanted block and pass the rendered content to the callback
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName    The blockName to finish (default mainBlock)
	 * @param    {Function} callback
	 */
	ViewRender.prototype.finish = function finish(blockName, callback) {

		var tasks = [],
		    that  = this,
		    block,
		    line,
		    i;

		// Don't do anything while IO is still running
		if (this.running) {

			this.after('ioDone', function() {
				that.finish(blockName, callback);
			});

			return;
		}


		if (typeof blockName === 'function') {
			callback = blockName;
			blockName = undefined;
		}

		if (!blockName) {
			blockName = this.mainBlock;
		}

		// Get the block to finish
		block = this.blocks[blockName];

		if (String(callback).indexOf('»»') > -1) {
			var debug = true;
		}

		if (!block) {
			return callback(new Error('Could not find block "' + blockName + '"'));
		}

		// Iterate over the lines to find any placeholders
		for (i = 0; i < block.length; i++) {
			line = block[i];

			if (line instanceof Hawkejs.Placeholder) {
				(function(line) {
					tasks[tasks.length] = function waitForPlaceholder(next) {

						line.getContent(function(err, result) {

							if (err) {
								that.hawkejs.handleError(line.errName, line.errLine, err);
							}

							next();
						});
					};
				}(line));
			}
		}

		// Now execute the tasks, where all the placeholder content will be fetched
		async.parallel(tasks, function(err) {

			var html = '',
			    length = block.length;

			if (err) {
				return callback(err);
			}

			// Join the block array entries into a single string
			for (i = 0; i < length; i++) {
				if (typeof block[i] === 'string') {
					html += block[i];
				} else {
					if (block[i] instanceof Hawkejs.Placeholder) {
						html += block[i].getResult();
					} else {
						html += block[i];
					}
				}
			}

			callback(null, html);
		});
	};

	/**
	 * Extend another template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   layout
	 */
	ViewRender.prototype.extend = function extend(layout) {
		this.extensions.push(layout);
	};

	/**
	 * Put the hawkejs client foundation here
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.prototype.foundation = function foundation() {

		var that = this,
		    placeholder = new Hawkejs.Placeholder(this);

		placeholder.setGetContent(function(done) {

			var settings,
			    html;

			settings = {
				open: that.hawkejs.open,
				close: that.hawkejs.close,
				root: that.hawkejs.root,
				withRenderContext: that.hawkejs.withRenderContext
			};

			// Load jQuery first
			html = '<script src="//code.jquery.com/jquery-1.11.0.min.js"></script>\n';

			// See if a fallback is present
			if (that.hawkejs.jqueryPath) {
				html += '<script>window.jQuery || document.write(\'<script src="' + that.hawkejs.jqueryPath + '">\x3C/script>\')</script>\n';
			}

			// Load the hawkejs client file
			html += '<script src="' + that.hawkejs.root + that.hawkejs.clientPath + '"></script>\n';

			// Load the scene
			html += '<script>hawkejs.loadScene(' + JSON.stringify(settings) + ', ' + that.scene.toSource() + ');</script>\n';

			done(null, html);
		});

		this.print(placeholder);
	};

	/**
	 * Print content to the given block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   content
	 */
	ViewRender.prototype.print = function print(content, block) {

		if (!block) {
			block = this.currentBlock || '__main__';
		}

		if (!this.blocks[block]) {
			this.blocks[block] = [];
		}

		this.blocks[block].push(content);
	};

	/**
	 * Assign a block here,
	 * also used for 'script' and 'style' blocks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 */
	ViewRender.prototype.assign = function assign(name, extra) {
		this.print(new Hawkejs.BlockPlaceholder(this, name));
	};

	/**
	 * Render an element and print it out
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   elementName    The element to render
	 * @param    {Object}   variables
	 */
	ViewRender.prototype.implement = function implement(elementName, variables) {

		var that = this,
		    placeholder,
		    subRender;

		placeholder = new Hawkejs.Placeholder(this);

		subRender = new ViewRender(that.hawkejs);
		subRender.implement = true;
		subRender.execute(elementName, variables || that.variables, true);

		// Only finish this block when getContent is called
		placeholder.setGetContent(function(next) {
			subRender.finish(function(err, result) {
				next(err, result);
			});
		});

		that.print(placeholder);
	};

	/**
	 * Execute asynchronous code
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   elementName    The element to render
	 * @param    {Object}   variables
	 */
	ViewRender.prototype.async = function async(fnc) {

		var that = this,
		    placeholder;

		placeholder = new Hawkejs.Placeholder(this, function(next) {
			fnc(function getResult(err, result) {
				next(err, result);
			});
		});

		that.print(placeholder);
	};

	ViewRender.prototype.script = function script(path, options) {
		this.scene.addScript(path, options);
	};

	// Inherit Hawkevents
	for (var key in Hawkejs.Hawkevents.prototype) {
		ViewRender.prototype[key] = Hawkejs.Hawkevents.prototype[key];
	}

	Hawkejs.ViewRender = ViewRender;
};
});
clientFiles = ["lib/class/hashmap.js","lib/class/helper.js","lib/class/placeholder.js","lib/class/scene.js","lib/class/view_render.js","lib/class/hashmap.js","lib/class/helper.js","lib/class/placeholder.js","lib/class/scene.js","lib/class/view_render.js"];
//_REGISTER_//

	Hawkejs = require('hawkejs');
	
	clientFiles.forEach(function(name) {
		require(name)(Hawkejs);
	});

	instance = new Hawkejs();

	return instance;
}());