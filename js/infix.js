/**
    Infix notation.
    ref: simple_typing.js, nodeviz.js::"Special formatting"
**/

PRECEDENCE = new Map([
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

function infix_parse (string) {
    // TODO0923
}

function infix_format (expr) {
    // TODO0923
}

