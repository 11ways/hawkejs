/**
 * The markdown rule
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
const Rule = Fn.inherits(null, 'Hawkejs.Markdown', function Rule(config) {
	Rule.super.call(this, config);
});

/**
 * Get or create a certain markdown rule class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Rule.setStatic(function getRule(parent, name) {

	if (arguments.length == 1) {
		name = parent;
		parent = 'Hawkejs.Markdown.Rule';
	} else {
		parent = 'Hawkejs.Markdown.' + parent;
	}

	if (!Hawkejs.Markdown[name]) {
		Fn.inherits(parent, Fn.create(name, function RuleConstructor(view) {
			RuleConstructor.wrapper.super.call(this, view);
		}));
	}

	console.log('Returning', Hawkejs.Markdown)

	return Hawkejs.Markdown[name];
});


/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
* @param    {Hawkejs.Parser.Markdown}   parser
 *
 * @return   {Boolean|Object}
 */
Rule.setStatic(function parse(parser) {

	if (!this.matches(parser)) {
		return false;
	}

	let result = this._parse(parser);
	result.rule = this.name;

	return result;
});

const Heading = Rule.getRule('Heading');

/**
 * Does the current position of the parser match this rule?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Parser.Markdown}   parser
 *
 * @return   {Boolean}
 */
Heading.setStatic(function matches(parser) {

	if (parser.start_of_line && parser.current == '#') {

		let count = 1,
		    char;

		while (!parser.is_eof) {
			char = parser.peekNext(count);

			if (char == '#') {
				count++;
			} else if (char && !char.trim()) {
				return true;
			}

			if (count > 6) {
				return false;
			}
		}
	}

	return false;
});

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Parser.Markdown}   parser
 *
 * @return   {Boolean|Object}
 */
Heading.setStatic(function _parse(parser) {

	let result = {
		level : 0
	};

	while (parser.current == '#') {
		result.level++;
		parser.next();
	}

	return result;
});