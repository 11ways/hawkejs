var Benchmark = require('benchmark');
var suite = new Benchmark.Suite;
var hawkejs = require('./lib/hawkejs');

// Prepare an extensive HAWKEJS test
// We don't test IO
var HAWKEJSbase = "\n<div>\n  <% assign('main') %>\n</div>\n";
var HAWKEJSmain = "\n<% expands('base') %>\n<% start('main') %>\n\t<% implement('topbar') %>\n\t<div class=\"container-fluid\">\n\t\t<% assign('container-fluid') %>\n\t</div>\n<% end('main') %>\n";
var HAWKEJStopbar = "\n<div class=\"navbar navbar-inverse navbar-fixed-top\">\n\t<div class=\"navbar-inner\">\n\t\t<div class=\"container-fluid\">\n\t\t\t<a class=\"btn btn-navbar\" data-toggle=\"collapse\" data-target=\".nav-collapse\">\n\t\t\t\t<span class=\"icon-bar\"></span>\n\t\t\t\t<span class=\"icon-bar\"></span>\n\t\t\t\t<span class=\"icon-bar\"></span>\n\t\t\t</a>\n\t\t\t<a class=\"brand\" href=\"/\">Elric</a>\n\t\t\t<div class=\"nav-collapse collapse\">\n\t\t\t\t<p class=\"navbar-text pull-right\">\n\t\t\t\t\tLogged in as <a href=\"#\" class=\"navbar-link\"><%= username %></a>\n\t\t\t\t</p>\n\t\t\t\t<ul class=\"nav\">\n\t\t\t\t\t<li><% add_link('/', {title: 'Home'}) %></li>\n\t\t\t\t</ul>\n\t\t\t</div><!--/.nav-collapse -->\n\t\t</div>\n\t</div>\n</div>\n";
var HAWKEJSindex = "\n<% expands('main') %>\n<% start('container-fluid') %>\n<p>Welcome on the index page!</p>\nTimestamp: <b><%= timestamp %></b>\n<% end('container-fluid') %>\n";
var HAWKEJSlink = "<li><% add_link('/admin', {title: 'Dashboard', matchref: {class: 'active'}}) %></li>";

hawkejs.storeTemplate("base", HAWKEJSbase);
hawkejs.storeTemplate("main", HAWKEJSmain);
hawkejs.storeTemplate("topbar", HAWKEJStopbar);
hawkejs.storeTemplate("index", HAWKEJSindex);
hawkejs.storeTemplate("link", HAWKEJSlink);

var timestamp = new Date().getTime();
var username = "Skerit";

// add tests
suite.add('Hawkejs (big template)', function() {
  
	hawkejs.render('index',
	               {username: username,
								  timestamp: timestamp},
									false, function($result, ne, payload) {
		// Receive the result object
	});
})
.add('Hawkejs#add_link', function() {
  hawkejs.render('link',
	               {username: username,
								  timestamp: timestamp},
									false, function($result, ne, payload) {
		// Receive the result object
	});
})
/*.add('String#match', function() {
  !!'Hello World!'.match(/o/);
})*/
// add listeners
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  //console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
// run async
.run({ 'async': true });