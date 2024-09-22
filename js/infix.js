/**
    Infix notation.
    ref: simple_typing.js, nodeviz.js::"Special formatting"
**/

PRECEDENCE = new Map([
    ['()', 9999999999999999],
    ['S', 100],
    ['^', 90],
    ['*', 80],
    ['+', 70],
    ['=', 60],
    ['and', 50],
    ['or', 40],
    ['->', 30],
    [':', 25],
    ['forall', 20],
    ['exists', 20],
]);

function get_associativity (operator) {
    if (['^', 'forall', 'exists', ':', '->'].includes(operator)) return 'R';
    return 'L';
}

function infix_parse (string) {
    // TODO0923
}

function infix_format (expr) {
    return _infix_format_p (expr, /*parent*/ '()');
}

function _infix_format_p (expr, parent) {
    // TODO0923
}
