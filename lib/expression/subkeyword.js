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
 * @version  2.0.0
 *
 * @param    {Object}
 */
Subkeyword.setStatic(function matches(options) {

	switch (options.type) {
		case 'multiple':
		case 'single':
		case 'elseif':
		case 'none':
		case 'else':
		case 'all':
			return true;
	}

	return false;
});

/**
 * Return opening code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Subkeyword.setStatic(function toCode(options) {

	var is_branch = true,
	    is_void = false,
	    result,
	    pieces,
	    name,
	    code;

	name = options.type;

	// The "else" subkeyword is void.
	// This means: there is no {% /else %}
	if (name == 'else') {
		is_void = true;
	}

	if (options.current.name == 'with' || options.current.name == 'while') {
		code = '<% _$expression';
	} else {
		code = '<% })';
	}

	if (options.type == 'elseif') {
		pieces = JSON.stringify(options.tokens.getExpression());
	} else {
		pieces = 'null';
	}


	code += '.branch("' + options.type + '", ' + pieces + ', function subtemplate(vars) {';

	code += ' -%>';

	result = {
		name      : name,
		code      : code,
		void      : is_void,
		is_branch : is_branch // These all create a branch (not really used)
	};

	return result;
});

/**
 * Return closing opening code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Subkeyword.setStatic(function toCloseCode(options) {
	var code = '<% }) /* /' + options.type + ' */ ';

	code += '; if (_$expression.break) return; -%>'

	return code;
});