const R = Hawkejs.Parser.Parser.rawString;

/**
 * Some flow keywords
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Subkeyword = Hawkejs.Expression.getClass('Subkeyword');

/**
 * Do the given pieces match this expression?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.1.4
 *
 * @param    {Object}
 */
Subkeyword.setStatic(function matches(options) {

	switch (options.type) {
		case 'multiple':
		case 'default':
		case 'single':
		case 'elseif':
		case 'case':
		case 'none':
		case 'else':
		case 'all':
			return true;
	}

	return false;
});

/**
 * Add builder instructions
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {boolean}
 */
Subkeyword.setStatic(function toBuilder(options) {

	let in_statement = options.current.name,
	    is_nested = false,
	    is_void = false;

	// The "else" & "elseif" subkeyword is void.
	// This means: there is no {% /else %}
	if (in_statement == 'else' || in_statement == 'elseif' || in_statement == 'case' || in_statement == 'default') {
		is_void = true;
	}

	if (in_statement == 'with' || in_statement == 'while') {
		is_nested = true;
	}

	options.builder.addBranch(options.type, {
		args : options.tokens.getExpression(),
		statement_name : in_statement,
		is_nested,
		is_void,
	});

	return true;
});

/**
 * Add builder close instructions
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {boolean}
 */
Subkeyword.setStatic(function toBuilderClose(options) {
	options.builder.closeBranch(options.type);
	return true;
});

/**
 * Return opening code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.1.4
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Subkeyword.setStatic(function toCode(builder, subroutine, entry) {

	if (entry.is_nested) {
		subroutine.append('_$expression');
	} else {
		subroutine.append(')');
	}

	let args = Bound.Array.cast(entry.args);
	let sr_body = builder._createSubroutine(entry.function_body, ['_$expression']);
	builder._compileBody(sr_body, entry.function_body);
	subroutine.requires(sr_body);

	subroutine.appendCall('.branch', [entry.name, entry.args, R(sr_body.name)], false);
});

/**
 * Return closing opening code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.9
 * @version  2.2.0
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Subkeyword.setStatic(function toCloseCode(builder, subroutine, entry) {
	subroutine.append(');');
	subroutine.append('if (_$expression.break) return;');
});