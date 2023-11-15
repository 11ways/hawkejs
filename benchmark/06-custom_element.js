const main = require('./init.js');

let compiled_render_looper_10 = hawkejs.compile('test_render_looper_10', `
<render-looper element-to-render="my-button" amount="10"></render-looper>
`);

let compiled_render_looper_100 = hawkejs.compile('test_render_looper_100', `
<render-looper element-to-render="my-button" amount="100"></render-looper>
`);

let compiled_render_looper_1000 = hawkejs.compile('test_render_looper_1000', `
<render-looper element-to-render="my-button" amount="1000"></render-looper>
`);

suite('CustomElement', function() {

	bench('rendering 10 nested custom elements', function(done) {
		renderer = hawkejs.createRenderer();
		renderer.renderHTML(compiled_render_looper_10).done(done);
	});

	bench('rendering 100 nested custom elements', function(done) {
		renderer = hawkejs.createRenderer();
		renderer.renderHTML(compiled_render_looper_100).done(done);
	});

	bench('rendering 1000 nested custom elements', function(done) {
		renderer = hawkejs.createRenderer();
		renderer.renderHTML(compiled_render_looper_1000).done(done);
	});
});

