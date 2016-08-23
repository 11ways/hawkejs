var Hawkejs = require('./index'),
    hawkejs = new Hawkejs(),
    Fn = __Protoblast.Bound.Function;

// Prepare an extensive HAWKEJS test
// We don't test IO
var HAWKEJSbase = "\n<div>\n  <% assign('main') %>\n</div>\n";
var HAWKEJSmain = "\n<% expands('base') %>\n<% start('main') %>\n\t<% implement('topbar') %>\n\t<div class=\"container-fluid\">\n\t\t<% assign('container-fluid') %>\n\t</div>\n<% end('main') %>\n";
var HAWKEJStopbar = "\n<div class=\"navbar navbar-inverse navbar-fixed-top\">\n\t<div class=\"navbar-inner\">\n\t\t<div class=\"container-fluid\">\n\t\t\t<a class=\"btn btn-navbar\" data-toggle=\"collapse\" data-target=\".nav-collapse\">\n\t\t\t\t<span class=\"icon-bar\"></span>\n\t\t\t\t<span class=\"icon-bar\"></span>\n\t\t\t\t<span class=\"icon-bar\"></span>\n\t\t\t</a>\n\t\t\t<a class=\"brand\" href=\"/\">Elric</a>\n\t\t\t<div class=\"nav-collapse collapse\">\n\t\t\t\t<p class=\"navbar-text pull-right\">\n\t\t\t\t\tLogged in as <a href=\"#\" class=\"navbar-link\"><%= username %></a>\n\t\t\t\t</p>\n\t\t\t\t<ul class=\"nav\">\n\t\t\t\t\t<li><% add_link('/', {title: 'Home'}) %></li>\n\t\t\t\t</ul>\n\t\t\t</div><!--/.nav-collapse -->\n\t\t</div>\n\t</div>\n</div>\n";
var HAWKEJSindex = "\n<% expands('main') %>\n<% start('container-fluid') %>\n<p>Welcome on the index page!</p>\nTimestamp: <b><%= timestamp %></b>\n<% end('container-fluid') %>\n";
var HAWKEJSlink = "<li><% add_link('/admin', {title: 'Dashboard', matchref: {class: 'active'}}) %></li>";

hawkejs.compile({template_name: 'base', template: HAWKEJSbase});
hawkejs.compile({template_name: 'main', template: HAWKEJSmain});
hawkejs.compile({template_name: 'topbar', template: HAWKEJStopbar});
hawkejs.compile({template_name: 'index', template: HAWKEJSindex});
hawkejs.compile({template_name: 'link', template: HAWKEJSlink});

var timestamp = new Date().getTime();
var username = 'Skerit';

// 1291/s on 2016-08-23
Fn.benchmark(function render_template(next) {
	hawkejs.render('index', {username: username, timestamp: timestamp}, next);
});