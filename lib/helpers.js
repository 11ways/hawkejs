module.exports = function helpers (hawkejs) {
	
	// Helpers & drones link
	var helpers = hawkejs.helpers,
	    drones  = hawkejs.drones;

	/**
	 * This is an example of a drone.
	 * It will be removed in later versions.
	 *
	 * It sets a timeout, changes some text, and then calls back
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.8
	 * @version  0.0.8
	 */
	hawkejs.drones.flowExample = function(done, $result) {
		setTimeout(function() {

			// Do nothing if there is no result
			if(!$result) {
				done();
				return;
			}

			var $s = hawkejs.µ.select($result, 'hawkejs[data-type="droneExample"]');
			$s.replaceWith('DONE');
			done();
		}, 100);
	};

	/**
	 * This is an example of a helper that will call on the help of a drone
	 * It will be removed in later versions.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.8
	 * @version  0.0.8
	 */
	helpers.flowtest = function(text) {
		// Indicate we want the flowExample drone to run later
		this.request.drones['flowExample'] = true;
		this.scope.buf.push('<hawkejs data-type="droneExample">' + text + '</hawkejs>');
	};

	/**
	 * Expose the encode function in the helpers object
	 */
	helpers.encode = hawkejs.µ.encode;
	
	/**
	 * Expose the clone function
	 */
	helpers.clone = hawkejs.µ.cloneobject;


	/**
	 * Echo a message by pushing it to the current buffer line
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.10
	 * @version  0.0.10
	 */
	helpers.echo = function echo(message, options) {

		// Escape the given text if wanted
		if (options && options.escape) {
			message = hawkejs.µ.encode(message);
		}

		this.print(message);
	};

	/**
	 * Prepare some scope entries before rendering starts
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.17
	 * @version  0.0.7
	 */
	helpers.render_start = function (buf, stack) {
		this.prive.buflink = buf;
		this.prive.stack = stack;
	}
	
	/**
	 * The render has ended, finalise some things
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.17
	 * @version  2013.01.21
	 */
	helpers.render_end = function(buf) {
	
		var ta = this.prive.assign;
	
		// Make sure all assigns are closed
		for (var blockname in ta) {
			
			var tab = ta[blockname];
			
			// If this assign wasn't finished
			if (!tab.finished) {
				
				// Get the parent block
				if (tab.parent == '_') {
					var pblock = this.scope.buf;
				} else {
					var pblock = this.request.blocks[tab.parent].buf;
				}
				
				// Prepare the closing tag
				var closing = '</hawkejs>';
				
				// Add comments if allowed
				if (this.hawkejs.comments) {
					closing += '<!-- end block ' + blockname + ' (RE) -->'
				}
				
				// Add the closing tag to the buffer
				pblock[tab.beginline] += closing;
				tab.finished = true;
			}
		}
	
		// Write the buffer back
		this.prive.buflink = this.scope.buf;
	}

	/**
	 * Create a place where we can store a block in later on
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.17
	 * @version  2013.01.20
	 *
	 * @param    {string}   blockname   The name of the block that should come here
	 * @param    {object}   options
	 */
	helpers.assign = function assign (blockname, options) {
		
		if (options === undefined) options = {};
		
		// Create an alias
		var ta = this.prive.assign;
		
		// Create an entry for this block
		if (ta[blockname] === undefined) {
			ta[blockname] = {
				name: false,
				beginline: false,
				finished: false,
				parent: this.prive.chain[0]
			};
		}
		
		var tab = ta[blockname];
		
		// If we're already working on the assign, do nothing
		if (tab.name) {
			
		} else {
			
			tab.name = blockname;
			
			// Do not use forward slash in attributes
			blockname = blockname.replace(/\//g, '__');
			
			if (options.removewrapper === undefined) options.removewrapper = false;
		
			var div = '';
			
			if (this.hawkejs.comments) {
				div += '<!-- begin block ' + blockname + ' -->';
			}
		
			div += '<hawkejs id="hawkejs-space-' + blockname + '" '
							+ 'data-hawkejs-space="' + blockname + '" '
							+ 'data-remove="' + options.removewrapper + '" '
							+ 'data-hawkejs="true">';
			
			var newLength = this.scope.buf.push(div);
			
			tab.beginline = newLength - 1;
		}
		
	}
	
	/**
	 * Optional assign_end function.
	 * When not used, the assign will be put on 1 single line
	 * If used, the part between assign() & assign_end() will
	 * be the "standard" text, in case nothing else is filled in
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.19
	 * @version  2013.01.20
	 *
	 * @param    {string}   blockname   The name of the block/space container to end
	 * @param    {object}   options
	 */
	helpers.assign_end = function assign_end (blockname, options) {
		
		if (options === undefined) options = {};
		
		// Create an alias
		var ta = this.prive.assign;
		
		if (ta[blockname] && !ta[blockname].finished) {
			this.scope.buf.push('</hawkejs>');
			if (this.hawkejs.comments) {
				this.scope.buf.push('<!-- end block ' + blockname + ' (AE) -->');
			}
			ta[blockname].finished = true;
		}
		
	}
	
	/**
	 * Start a block
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.18
	 * @version  2013.01.21
	 *
	 * @param    {string}   blockname   The name of the block we are creating
	 * @param    {object}   options
	 */
	helpers.start = function start (blockname, options) {
		
		if (options === undefined) options = {};
		
		// Get the block we're currently working on
		var parentblockname = this.prive.chain[0];
	
		this.request.blocks[blockname] = {
			start: true,
			end: false,
			parent: parentblockname,
			template: this.prive.template,
			buf: []
		};
		
		// Clone the original buffer
		this.prive.blocks[parentblockname] = this.scope.buf.slice(0);
		
		// Reset the buf
		this.scope.buf.length = 0;
		
		// Add this block to the chain
		this.prive.chain.unshift(blockname);
	}
	
	/**
	 * End a block
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.18
	 * @version  2013.01.20
	 * 
	 * @param    {string}   blockname   The name of the block we are finishing
	 * @param    {object}   options
	 */
	helpers.end = function end (blockname, options) {
		
		if (options === undefined) options = {};
		
		// Remove an item from the block chain
		var shift = this.prive.chain.shift();
		
		// Don't remove the starting block
		if (shift == '_') this.prive.chain.unshift('_');
		
		if (blockname === undefined) blockname = shift;
		
		if (blockname != shift) {
			log('We are trying to end a different block than ' + shift, false, 'error');
		}
		
		blockname = shift;
		
		// Return nothing if there was no opening tag
		if (this.request.blocks[blockname] === undefined) {
			return;
		}
		
		this.request.blocks[blockname].end = true;
			
		// Store this buffer in the payload block
		this.request.blocks[blockname].buf = this.scope.buf.slice(0);
		
		var previousblock = this.prive.chain[0];
	
		this.scope.buf.length = 0;
		
		for (var i in this.prive.blocks[previousblock]) {
			var item = this.prive.blocks[previousblock][i];
			
			this.scope.buf.push(item);
		}
		
	}
	
	/**
	 * Print out a block right now
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.18
	 * @version  2013.01.20
	 *
	 * @param   {string}   blockname   The name of the block to print out
	 * @param   {object}   options
	 */
	helpers.print_block = function print_block (blockname, options) {
		
		if (options === undefined) options = {};
		
		if (this.request.blocks[blockname] === undefined) {
			log(blockname + ' not found', false, 'info');
			return;
		}
		
		var buf = this.request.blocks[blockname].buf;
		
		// Push every entry from the wanted block buffer to the current buffer
		for (var i in buf) {
			this.scope.buf.push(buf[i]);
		}
		
	}
	
	/**
	 * Print out an element right now.
	 * The element is recursively rendered first.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.18
	 * @version  2013.02.09
	 *
	 * @param    {string}   elementname   The name of the element to print out
	 * @param    {object}   options
	 */
	helpers.print_element = function print_element (elementname, options) {
		
		if (options === undefined) options = {};
		
		var payload = this;
		
		var savebuf = this.scope.buf;
		
		this.scope.buf = [];

		// Have we given specific variables?
		if (options.variables !== undefined) payload = hawkejs.$.extend({}, payload, options.variables);
		
		// How deep (extend/implement) does it have to go?
		if (options.deep === undefined) options.deep = 0;
		
		// Do we want a full render, or just ejs?
		if (options.fullrender === undefined) options.fullrender = false;
		
		if (options.fullrender) {
			var html = hawkejs.render(elementname, options.variables);
		} else {
			var result = hawkejs._EjsRender(elementname, payload,
			                                {deep: options.deep, forcerender: true});
			var html = result.html;
		}
		
		savebuf.push(html);
		
		this.scope.buf = savebuf;
	}
	
	/**
	 * Indicate this request needs a script, and add it to it if needed
	 *
	 * options:
	 * - destination  {string}
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.10
	 *
	 * @param    {String}   scriptpath   The path of the script to add
	 * @param    {Object}   options
	 */
	helpers.script = function script(scriptpath, options) {

		// Get the seenscripts (which default to an empty object)
		var seenScripts = this.store({}, 'seenScripts'),
		    tags        = this.request.tags,
		    order,
		    path,
		    i;
		
		if (typeof options === 'undefined') options = {};

		// The default order is 10
		order = options.order || 10;

		// Output an empty script element if we're creating a position block
		if (typeof scriptpath === 'object' && !Array.isArray(scriptpath)) {
			if (scriptpath.block) {
				this.echo('<script data-block="'+scriptpath.block+'"></script>');
				return;
			}
		}

		// Turn the scriptpath into an array if it isn't one already
		if (!Array.isArray(scriptpath)) {
			scriptpath = [scriptpath];
		}

		for (i = 0; i < scriptpath.length; i++) {
			path = scriptpath[i];

			// Make sure each script gets added only once during every render
			if (typeof seenScripts[path] !== 'undefined') continue;
			this.request.files[path] = true;
			seenScripts[path] = true;

			// If no block is given, output it immediately
			if (!options.block) {
				this.echo('<script src="' + path + '"></script>');
				continue;
			}

			if (typeof tags[path] === 'undefined') {
				tags[path] = {
					type: 'script',
					path: path,
					block: options.block,
					order: order,
					suborder: i
				};
			}
		}
	};
	
	/**
	 * Indicate this request needs a stylesheet, and add it to it if needed
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.8
	 *
	 * @param    {String}   stylepath    The path of the style to add
	 * @param    {Object}   options
	 */
	helpers.style = function style (stylepath, options) {

		// Get the seenscripts (which default to an empty object)
		var seenStyles  = this.store({}, 'seenStyles'),
		    tags        = this.request.tags,
		    attributes,
		    order,
		    path,
		    i;
		
		if (typeof options === 'undefined') options = {};

		// The default order is 10
		order = options.order || 10;

		// Output an empty script element if we're creating a position block
		if (typeof stylepath === 'object' && !Array.isArray(stylepath)) {
			if (stylepath.block) {
				this.echo('<script data-block="'+stylepath.block+'"></script>');
				return;
			}
		}

		// Turn the stylepath into an array if it isn't one already
		if (!Array.isArray(stylepath)) {
			stylepath = [stylepath];
		}

		for (i = 0; i < stylepath.length; i++) {
			path = stylepath[i];

			// Make sure each script gets added only once during every render
			if (typeof seenStyles[path] !== 'undefined') continue;
			this.request.files[path] = true;
			seenStyles[path] = true;

			// If no block is given, output it immediately
			if (!options.block) {
				attributes = hawkejs.param(options.attributes);
				this.echo('<link type="text/css" rel="stylesheet" href="' + path + '" ' + attributes + '/>');
				continue;
			}

			if (typeof tags[path] === 'undefined') {
				tags[path] = {
					type: 'style',
					path: path,
					attributes: options.attributes,
					block: options.block,
					order: order,
					suborder: i
				};
			}
		}
	};
	
	/**
	 * Simply print out what we are given
	 * This adds the variable to the current buffer line
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.19
	 * @version  2013.02.04
	 *
	 * @param    {string}   variable   The variable to print
	 */
	helpers.print = function print (variable) {

		var l = this.scope.buf.length;
		
		// Decrease the length by 1 if it is positive
		if (l) l -= 1;
		
		this.scope.buf[l] += variable;
	}
	
	/**
	 * Indicate this element is an expansion
	 * of another, given element
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.10
	 *
	 * @param    {Array}    elementname   An array of elements to expand into
	 *                                    Only the first one is created when
	 *                                    none of the others are found.
	 * @param    {Object}   options
	 */
	helpers.expands = function expands(elementname, options) {
		
		// Make sure the "deep" option allows this
		if (this.prive.options.deep == 0) return;
		
		if (options === undefined) options = {};

		// Turn the element into an array
		if (!Array.isArray(elementname)) {
			elementname = [elementname];
		}
		
		// Add these elements to the expansion array
		// The current element should "expand" into one of them
		this.request.expand.push(elementname);
		
		// Add it to the local instructions
		// These will be returned when ejs has finished rendering this element
		// And (only the first one) will in turn be rendered, too
		this.prive.instructions.push(elementname);
	}
	
	/**
	 * Implement another element inside this one
	 * Contrary to print_element(), this will hapen later but in this scope
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.20
	 * @version  2013.01.26
	 *
	 * @param    {string}   elementname   The element to print
	 * @param    {object}   options
	 */
	helpers.implement = function implement (elementname, options) {
		
		// Make sure the "deep" option allows this
		if (this.prive.options.deep == 0) return;
		
		if (options === undefined) options = {};
		
		if (options.removewrapper === undefined) options.removewrapper = false;
		
		// Parse the element
		this.parse_element(elementname, {type: 'implement'});
		
		// Do not use forward slash in attributes
		elementname = elementname.replace(/\//g, '__');
		
		// Add an object we can put this element in later
		var div = '<hawkejs id="hawkejs-implement-' + elementname + '" '
							+ 'data-hawkejs-implement="' + elementname + '" '
							+ 'data-hawkejs-template="' + elementname + '" '
							+ 'data-hawkejs-from-template="' + elementname + '" '
							+ 'data-remove="' + options.removewrapper + '" '
							+ 'data-hawkejs="true"></hawkejs>';
			
		this.scope.buf.push(div);
	}
	
	/**
	 * Parse another element in the current scope
	 *
	 * options:
	 * - type    {string}    The type of the parse (implement, parse, ..)
	 * - deep    {boolean    How deep to parse other parse, expansions, ...
	 *            integer}   Setting it to false basically only loads blocks
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.20
	 * @version  2013.01.26
	 *
	 * @param    {string}   elementname   The element to parse
	 * @param    {object}   options
	 */
	helpers.parse_element = function parse_element (elementname, options) {
	
		// Make sure the "deep" option allows this
		if (this.prive.options.deep == 0) return;
		
		if (options === undefined) options = {};
		
		// Set the type of parse
		if (options.type === undefined) options.type = 'parse';
		
		// Parse implements & expansions, too
		if (options.deep === undefined) options.deep = true;
		
		options.elementname = elementname;
		
		this.request.implement.push(options);
		
		// Up the implement counter
		this.__Wait.implement++;

		// Add it to the local instructions.
		// These will be returned when ejs has finished rendering this element
		// And will in turn be rendered, too
		//this.prive.instructions.push(options);
		
	}
	
	/**
	 * Set a block in only a single line
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.01
	 * @version  2013.02.01
	 *
	 * @param    {string}   name       Block name
	 * @param    {string}   value      Value
	 */
	helpers.set_block = function set_block (name, value) {
		
		// Get the block we're currently working on
		var parentblockname = this.prive.chain[0];
	
		this.request.blocks[name] = {
			start: true,
			end: true,
			parent: parentblockname,
			template: this.prive.template,
			buf: [value]
		};

	}
	
	/**
	 * Set the page title
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.01
	 * @version  2013.02.01
	 *
	 * @param    {string}   title      The page title
	 */
	helpers.set_title = function set_title (title) {
		
		// Create an alias to the scripts object
		var s = this.request.tags;

		if (s['script-title'] === undefined) {
			s['script-title'] = {
				type: 'script',
				path: false,
				code: "document.getElementsByTagName('title')[0].innerHTML = " + JSON.stringify(title) + ";",
				destination: 'anywhere'
			};
		}
	}
	
	
	/**
	 * Events that need to happen to a DOM object when the given href
	 * matches the location of the current page
	 *
	 * These events are added to the payload.
	 *
	 * instructions:
	 * - sourceHref    {string}   The href to match against (full or with :vars)
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.24
	 * @version  2013.01.27
	 *
	 * @param    {string}   elementid   The name of the element to update
	 * @param    {object}   options     The options object
	 */
	helpers._add_match_options = function _add_match_options (elementid, instructions) {
	
		// Get the sourceHref we want to match against
		var href = instructions.sourceHref;
		delete instructions.sourceHref;
		
		// If the parent entry isn't an object, delete it!
		if (instructions.parent && typeof instructions.parent != "object") {
			delete instructions.parent;
		}
		
		// Also add the source id to the object
		instructions.sourceId = elementid;
	
		// Create the match entry if it doesn't exist
		if (this.request.match[href] === undefined) {
			this.request.match[href] = {};
		}
		
		this.request.match[href][elementid] = instructions;
	}
	
	/**
	 * Add an anchor tag to the buffer
	 *
	 * options:
	 * - name    {string}   The text inside the anchor tag. Uses the href if absent
	 * - title   {string}   The title (hover) text. Uses name if absent
	 * - id      {string}   The id of the tag. If absent an id is composed.
	 * - class   {string}   The classes of the tag. Empty if absent
	 * - match   {object}   CSS attributes to apply when the url matches the href
	 * - return  {string}   What this function should return. Defaults to 'print'
	 * 
	 * -- print   = The function will add the html to the buffer and return nothing
	 * 
	 * -- options = The function will return the options array WITH a new html
	 *              property with the resultand WILL NOT add anything to the buffer.
	 *              This is useful for building other helpers on top of this one.
	 *
	 * -- string  = The function will return the html and print out nothing.
	 *
	 * -- all     = The function will add the html & return the options
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.10
	 *
	 * @param    {string}   href      The link
	 * @param    {object}   options
	 *
	 * @returns  {object|string}   The options object with the result,
	 *                             the html string, or nothing.
	 */
	helpers.add_link = function add_link (href, options) {

		if (!href) href = '';

		// Store the original href
		var sourceHref = href;
		
		if (options === undefined) options = {};
		
		if (!options.name) options.name = options.title ? options.title : href;
		if (!options.title) options.title = options.name;
		if (!options.class) options.class = '';
		if (!options.return) options.return = 'print';
		if (!options.urlvars) options.urlvars = {};
		
		// Implement variables in urls
		for (var varName in options.urlvars) {
			href = href.replace(':' + varName, options.urlvars[varName]);
		}
		
		// Always add an id!
		if (!options.id) {
			options.id = 'hawkejs-link-' + this.filename.replace(/\//g, '-') + '-' + href.replace(/[^a-z0-9]/gi,'');
		}
		
		// Name is actually content of the element
		if (!options.content) options.content = options.name;
		
		// Do not write back to options.content, because sometimes this is byref!
		var content = options.content;
		
		// Prepend html stuff to the content
		if (options.prepend) {
			
			var prepend = '';
			
			if (typeof options.prepend == 'array' || typeof options.prepend == 'object') {
				for (var i in options.prepend) {
					prepend += options.prepend[i];
				}
			} else {
				prepend = options.prepend;
			}
			
			content = prepend + content;
		}
		
		// Escape the content if needed
		if (options.escape) content = helpers.encode(content);
		
		if (options.match) {
			
			// Add the source href
			options.match.sourceHref = sourceHref;
			
			if (options.match.fullHref) {
				delete options.match.fullHref;
				options.match.sourceHref = href;
			}
			
			this._add_match_options(options.id, options.match);
		}
		
		var a = '<a id="' + options.id + '" href="' + href + '" '
						+ 'title="' + helpers.encode(options.title) + '" '
						+ 'data-hawkejs="link" ';


		if (options.class) a += 'class="' + options.class + ' ';
		if (options.attributes && options.attributes['class']) {
			a += options.attributes['class'];
			delete options.attributes['class'];
		}
		a += '" ';

		a += this.serialize(options.attributes);
		
		// Add the text between the anchor, and close the tag
		a += '>' + content + '</a>';
		
		// Add the result to the options
		options.html = a;
		
		if (options.return == 'print') this.print(a);
		else if (options.return == 'options') return options;
		else if (options.return == 'string') return a;
		else if (options.return == 'all') {
			this.print(a);
			return options;
		}
	}

	/**
	 * Serialize an object so you can use it as attributes inside an element
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.8
	 * @version  0.0.8
	 *
	 * @param    {Object}   attributes   An object containing the attributes
	 *
	 * @return   {String}
	 */
	helpers.serialize = function serialize(attributes) {

		var attrName, result = '';

		if (typeof attributes === 'object') {
			for (attrName in attributes) {
				result += attrName + '="' + encodeURIComponent(attributes[attrName]) + '" ';
			}
		}

		return result;
	};

	/**
	 * Emit an event when the render is done
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.8
	 * @version  0.0.8
	 */
	helpers.emit = function emit(identifier, payload) {
		this.request.events.push([identifier, payload]);
	};
	
	/**
	 * Execute something on the client side when certain things have happened
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.04
	 * @version  2013.02.04
	 *
	 * @param    {String}   code        The code to execute
	 * @param    {Object}   options     The options object
	 */
	helpers.exec = function exec (code, options) {
		
		if (options === undefined) options = {};
		
		options.id = this.prive.stack.filename + '_' + this.prive.stack.lineno;
		
		// Create a link to the used object
		var u = this.request.used;
		var v = false;
		
		// Get the current names
		var currentblock = this.prive.chain[0];
		var currenttemplate = this.prive.template;
		
		// Prepare the options
		options.code = code;
		
		// When do we execute this?
		if (!options.when) options.when = 'once';
		
		// Determine on what element to execute this code
		if (!options.on) {
			if (currentblock != '_') {
				options.on = 'block';
			} else {
				options.on = 'implement';
			}
		}
		
		// On what block or template?
		if (!options.where) {
			if (options.on == 'block') {
				options.where = currentblock;
			} else {
				options.where = currenttemplate;
			}
		}
		
		// Store the origin
		options.block = currentblock;
		options.template = currenttemplate;
		
		// If this isn't in a block, store it under the template
		if (options.on == 'block') {
			v = u.blocks;
		} else {
			v = u.implementations
		}
		
		// Create the template entry if it doesn't exist
		if (v[options.where] === undefined) {
			v[options.where] = {};
		}
		
		// Push the code to the destination
		v[options.where][options.id] = options;
	};

	/**
	 * Put the "done" callback and the $result document in the async object.
	 * The cleaner will also be called once, in case all the callbacks have
	 * already finished
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.9
	 * @version  0.0.9
	 */
	hawkejs.drones.async = function asyncDrone(done, $result) {
		this.request.drones.async.done = done;
		this.request.drones.async.$result = $result;

		// Fire the cleaner
		this.request.drones.async.cleaner();
	};

	/**
	 * Put a placeholder in the template that will be filled in with the
	 * value passed to the given function.
	 *
	 * These functions will be fired immediately.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.9
	 * @version  0.0.10
	 *
	 * @param    {Function}   fnc   The function that will be called back with the result
	 */
	helpers.async = function async(fnc, options) {

		var asyncId, waiter, async, html;

		if (typeof options === 'undefined') {
			options = {};
		}

		// Create the async array if it doesn't exist yet
		if (!this.request.drones['async']) {
			this.request.drones['async'] = {
				counter: 0,      // The amount of functions to wait for
				called : 0,      // The amount of functions that are done
				results: {},     // The results
				done   : false,  // The final callback (drone will insert it)
				$result: false,  // The result (drone will insert it)
				cleaner: false
			};
		}

		// Create a reference
		async = this.request.drones['async'];

		// Create the cleaner if it doesn't exist yet
		if (!async.cleaner) {
			async.cleaner = function asyncCleaner() {

				var $s, replacement, asyncId;

				// If the async drone has run (it gives us the done fnc)
				// and everything has called back, replace everything
				if (async.done && async.called === async.counter) {
					for (asyncId in async.results) {
						replacement = async.results[asyncId] || '';
						$s = hawkejs.µ.select(async.$result, 'hawkejs[data-async-id="'+asyncId+'"]');
						$s.replaceWith(replacement);
					}

					// And finally: call the done callback
					async.done();
				}
			}
		}

		// Increase the counter by one
		this.request.drones['async'].counter++;

		// Get the entry number (1-based)
		asyncId = 'async-' + this.request.drones['async'].counter;

		/**
		 * The waiter callback
		 *
		 * @param   {String}    result   The string to replace the placeholder
		 */
		waiter = function asyncWaiter(result) {

			// Indicate one has called back
			async.called++;

			// Store the result
			async.results[asyncId] = result;

			// Fire the cleaner
			async.cleaner();
		};

		// Create an entry in the results array
		this.request.drones['async'].results[asyncId] = null;

		html = '<hawkejs data-type="async" data-async-id="' + asyncId + '"></hawkejs>';

		// Add the placeholder to the document
		if (!options['return']) {
			this.echo(html);
		}

		// Fire the function
		fnc(waiter);

		if (options['return']) {
			return html;
		}
	};

	/**
	 * Get/set a variable from the storage
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.10
	 * @version  0.0.10
	 *
	 * @param    {Mixed}    defaultValue   The optional default value
	 * @param    {String}   name           The name of the variable
	 * @param    {Mixed}    value          The optional value to set
	 */
	helpers.store = function store(defaultValue, name, value) {

		var retval;

		if (typeof name === 'undefined') {
			name = defaultValue;
			defaultValue = undefined;
		}

		// Set the value if needed, and return nothing
		if (typeof value !== 'undefined') {
			if (this.ClientSide) {
				window.hawkejs.storage[name] = value;
			} else {
				this.__storageVars[name] = value;
			}

			return;
		}

		// Return the value
		if (this.ClientSide) {
			if (name in this.__storageVars) {
				retval = this.__storageVars[name];
			} else {
				retval = window.hawkejs.storage[name];
			}

			// If the value isn't set, but a default value has been given,
			// set and return that
			if (typeof retval === 'undefined' && typeof defaultValue !== 'undefined') {
				window.hawkejs.storage[name] = defaultValue;
				return defaultValue;
			} else {
				return retval;
			}
		} else {
			retval = this.__storageVars[name];

			if (typeof retval === 'undefined' && typeof defaultValue !== 'undefined') {
				this.__storageVars[name] = defaultValue;
				return defaultValue;
			} else {
				return retval;
			}
		}
	};

}