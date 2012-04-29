var stackedy = require('../');
var test = require('tap').test;

var fs = require('fs');
var src = '(' + function () {
    function plusTen () { return x + 10 };
    t.equal(plusTen.toString(), 'function plusTen() { return x + 10 }');
} + ')()';

test('fn.toString()', function (t) {
    t.plan(1);
    var stack = stackedy(src).run({ t : t });
    
    stack.on('error', function (err, c) {
        stack.stop();
        t.fail(err);
    });
});
