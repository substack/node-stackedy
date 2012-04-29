var stackedy = require('../');
var test = require('tap').test;

test('defun toString()', function (t) {
    t.plan(1);
    var src = '(' + function () {
        function plusTen () { return x + 10 };
        t.equal(
            plusTen.toString()
                .replace(/\s+/g, ''),
            'function plusTen () { return x + 10 }'
                .replace(/\s+/g, '')
        );
    } + ')()';
    
    var stack = stackedy(src).run({ t : t });
    stack.on('error', function (err, c) {
        stack.stop();
        t.fail(err);
    });
});

test('fn toString()', function (t) {
    t.plan(1);
    var src = '(' + function () {
        t.equal(
            (function () { return x + 10 }).toString()
                .replace(/\s+/g, ''),
            'function () { return x + 10 }'
                .replace(/\s+/g, '')
        );
    } + ')()';
    
    var stack = stackedy(src).run({ t : t });
    stack.on('error', function (err, c) {
        stack.stop();
        t.fail(err);
    });
});

test('expr fn toString()', function (t) {
    t.plan(1);
    
    var src = '(' + function () {
        log((function (win) {
            console.log('window!')
        }).toString());
    } + ')()';
    
    var stack = stackedy(src).run({
        log : function (msg) {
            t.equal(msg, "function(win){console.log('window')}");
        }
    });
    stack.on('error', function (err, c) {
        stack.stop();
        t.fail(err);
    });
});
