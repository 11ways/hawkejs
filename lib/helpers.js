module.exports = function helpers (hawkejs) {
	
	// Helpers link
	var helpers = hawkejs.helpers;

	/**
	 * Expose the encode function in the helpers object
	 */
	helpers.encode = hawkejs.µ.encode;
	
	// Function to run when the render starts
	helpers.render_start = function (buf) {
		this.prive.buflink = buf;
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
			blockname = blockname.replace('/', '__');
			
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
	 * @version  2013.01.29
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
			var result = hawkejs._EjsRender(elementname, payload, {deep: options.deep});
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
	 * @since    2013.01.19
	 * @version  2013.01.20
	 *
	 * @param    {string}   scriptpath   The path of the script to add
	 * @param    {object}   options
	 */
	helpers.script = function script (scriptpath, options) {
		
		if (options === undefined) options = {};
		
		// Create an alias to the scripts object
		var s = this.request.tags;
		
		if (options.destination === undefined) options.destination = 'anywhere';
		
		if (s[scriptpath] === undefined) {
			s[scriptpath] = {
				type: 'script',
				path: scriptpath,
				destination: options.destination
			}
		}
	}
	
	/**
	 * Indicate this request needs a stylesheet, and add it to it if needed
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.19
	 * @version  2013.01.20
	 *
	 * @param    {string}   scriptpath   The path of the script to add
	 * @param    {object}   options
	 */
	helpers.style = function style (stylepath, options) {
		
		if (options === undefined) options = {};
		
		// Create an alias to the scripts object
		var s = this.request.tags;
		
		if (options.destination === undefined) options.destination = 'anywhere';
		
		if (s[stylepath] === undefined) {
			s[stylepath] = {
				type: 'style',
				path: stylepath,
				attributes: options.attributes,
				destination: options.destination
			}
		}
	}
	
	/**
	 * Simply print out what we are given
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.19
	 * @version  2013.01.20
	 *
	 * @param    {string}   variable   The variable to print
	 */
	helpers.print = function print (variable) {
		this.scope.buf.push(variable);
	}
	
	/**
	 * Indicate this element is an expansion
	 * of another, given element
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.17
	 * @version  2013.01.26
	 *
	 * @param    {string}   elementname   The element we want to expand into
	 * @param    {object}   options
	 */
	helpers.expands = function expands (elementname, options) {
		
		// Make sure the "deep" option allows this
		if (this.prive.options.deep == 0) return;
		
		if (options === undefined) options = {};
		
		// Add this elementname to the expansion array
		// The current element should "expand" this element
		this.request.expand.push(elementname);
		
		// Add it to the local instructions
		// These will be returned when ejs has finished rendering this element
		// And will in turn be rendered, too
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
		elementname = elementname.replace('/', '__');
		
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
			}
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
	 * @since    2013.01.20
	 * @version  2013.02.03
	 *
	 * @param    {string}   href      The link
	 * @param    {object}   options
	 *
	 * @returns  {object|string}   The options object with the result,
	 *                             the html string, or nothing.
	 */
	helpers.add_link = function add_link (href, options) {
	
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
			options.id = 'hawkejs-link-' + this.filename.replace('/', '-') + '-' + href.replace(/[^a-z0-9]/gi,'');
		}
		
		// Name is actually content of the element
		if (!options.content) options.content = options.name;
		
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
			
			options.content = prepend + options.content;
		}
		
		// Escape the content if needed
		if (options.escape) options.content = helpers.encode(options.content);
		
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
		
		if (options.class) a += 'class="' + options.class + '" ';
		
		// Add the text between the anchor, and close the tag
		a += '>' + options.content + '</a>';
		
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
}