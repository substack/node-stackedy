setTimeout(function () {
    assert.fail('should have stopped already');
}, 1000);

setTimeout(function () {
    clearTimeout(time);
}, 50);

exports.foo = function (x) {
    return x * 10;
};

exports.bar = function (x) {
    return x + 33;
};