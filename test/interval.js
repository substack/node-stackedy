var stackedy = require('../');
var test = require('tap').test;

var fs = require('fs');
var src = fs.readFileSync(__dirname + '/sources/interval.js', 'utf8');

test('interval', function (t) {
    t.plan(3);
    var context = { exports : {}, t : t };
    var stack = stackedy(src).run(context);
    
    var x0 = null;
    setTimeout(function () {
        stack.stop();
        x0 = context.exports.times;
        t.ok(x0 >= 200 / 25 - 2 && x0 <= 200 / 25 + 1);
    }, 200);
    
    setTimeout(function () {
        t.equal(context.exports.times, x0);
        t.end();
    }, 400);
});
