var stackedy = require('../');
var test = require('tap').test;

var src = {
    defun : '(' + function () {
        function plusTen () { return x + 10 };
        t.equal(
            plusTen.toString().replace(/\s+/g, ''),
            'function plusTen () { return x + 10 }'.replace(/\s+/g, '')
        );
    } + ')()',
    fn : '(' + function () {
        t.equal(
            (function () { return x + 10 }).toString().replace(/\s+/g, ''),
            'function () { return x + 10 }'.replace(/\s+/g, '')
        );
    } + ')()',
};

test('defun toString()', function (t) {
    t.plan(1);
    var stack = stackedy(src.defun).run({ t : t });
    
    stack.on('error', function (err, c) {
        stack.stop();
        t.fail(err);
    });
});

test('fn toString()', function (t) {
    t.plan(1);
    var stack = stackedy(src.fn).run({ t : t });
    
    stack.on('error', function (err, c) {
        stack.stop();
        t.fail(err);
    });
});
