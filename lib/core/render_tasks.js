/**
 * The RenderTasks class collects several optional tasks
 * for lines of a renderer
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.1
 * @version  2.3.1
 *
 * @param    {*}   parent
 */
const RenderTasks = Fn.inherits(null, 'Hawkejs', function RenderTasks(parent) {

	// Remember the parent/line
	this.parent = parent;

	// Any pre-tasks will be added here
	this.pre_tasks = [];

	// There is no pre_assemble by default
	this.pre_assembler = null;

	// And so no pre-assemble result
	this.pre_assemble_result = null;

	Hawkejs.markBranchAsDirty(parent);

	// Attach this to the parent
	parent[Hawkejs.RENDER_TASKS] = this;
});

/**
 * Add a pre-task
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.1
 * @version  2.3.1
 *
 * @param    {Function}   fnc
 */
RenderTasks.setMethod(function addPreTask(fnc) {
	this.pre_tasks.push(fnc);
});

/**
 * Set the pre-assembler
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.1
 * @version  2.3.1
 *
 * @param    {Function}   fnc
 */
RenderTasks.setMethod(function setPreAssembler(fnc) {
	this.pre_assembler = fnc;
});

/**
 * Get the pre-assembler result
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.1
 * @version  2.3.1
 *
 * @param    {Renderer}   renderer
 */
RenderTasks.setMethod(function getPreAssemblerResult(renderer) {

	if (this.pre_assembler == null) {
		return;
	}

	if (this.pre_assemble_result == null) {
		this.pre_assemble_result = this.pre_assembler.call(this.parent, renderer);
	}

	return this.pre_assemble_result;
});

/**
 * Drain the pre-tasks into the queue
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.1
 * @version  2.3.15
 *
 * @param    {Array}   pre_queue
 */
RenderTasks.setMethod(function drainPreTasks(pre_queue, renderer) {

	let line = this.parent;

	while (this.pre_tasks.length) {
		let task = this.pre_tasks.shift();

		if (typeof task == 'function') {
			pre_queue.push(function doPreTask(next) {
				let result = task.call(line, renderer);
				Hawkejs.doNextSync(result, next);
			});
		} else {
			pre_queue.push(task);
		}
	}

});

/**
 * Drain the pre-tasks into the queue.
 * If there are tasks, this method will return false,
 * indicating to `recurseLineTasks` to not run any other render methods.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.1
 * @version  2.3.15
 *
 * @param    {Array}   pre_queue
 * @param    {Array}   queue
 */
RenderTasks.setMethod(function doRenderMethods(pre_queue, queue, renderer) {

	let line = this.parent;

	if (this.pre_assembler) {

		pre_queue.push((next) => {
			let result = this.getPreAssemblerResult(renderer);
			Hawkejs.doNextSync(result, next);
		});

		return false;
	}

	return true;
});