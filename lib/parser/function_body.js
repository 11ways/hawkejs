const R = Hawkejs.Parser.Parser.rawString;

/**
 * The FunctionBody class holds information for creating a Subroutine
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {Hawkejs.Parser.Builder}      builder
 * @param    {string}                      type
 * @param    {number}                      id
 * @param    {Hakejs.Parser.FunctionBody}  parent
 * @param    {string}                      info
 */
const FunctionBody = Fn.inherits(null, 'Hawkejs.Parser', function FunctionBody(builder, type, id, parent, info) {

	// The builder instance
	this.builder = builder;

	// The ID of this body
	this.id = id;

	// The parent body
	this.parent = parent;

	// The content
	this.content = [];

	// The type of body
	this.type = type;

	// Any extra info
	this.info = info || null;

	// The generated name
	this.name = null;

	// The amount of references in this body
	this.reference_count = 0;

	// References
	this.references = null;

	if (type == 'root') {
		this.name = 'compiledView';
	} else {
		let name = ['cpv']

		if (Blast.isDevelopment) {
			name.push(type);

			if (info) {
				name.push(Bound.String.slug(info, '_'));
			}
		}
		
		name.push(this.id);
		this.name = name.join('_');
	}
});

/**
 * Indicate a reference has been seen in this body
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {Array}   path
 */
FunctionBody.setMethod(function containsReference(path) {

	if (!path?.length) {
		return;
	}

	if (!this.references) {
		this.references = [];
	}

	// For now, only the first piece of a path can be a reference.
	// In the future, something like `self.&prop` could be allowed
	let piece = path[0];

	this.references.push(piece);
	this.reference_count++;
	this.entry.create_separate_subroutine = true;

});

/**
 * Return the source code of this body
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @return   {string}
 */
FunctionBody.setMethod(function getSourceCode() {

	let result = '',
	    entry;
	
	for (entry of this.content) {

		if (entry.source) {
			result += entry.source;

			if (!entry.function_body) {
				continue;
			}
		}

		if (entry.function_body) {
			result += entry.function_body.getSourceCode();
			continue;
		}

		if (!entry.source && entry.type == 'close_tag') {
			result += '</' + entry.name.toLowerCase() + '>';
		}
	}

	return result;
});