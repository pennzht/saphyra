Q = (...args) => document.querySelectorAll(...args);

function _makeConsts(expr) {
    if (typeof (expr) === 'string' && expr.match(/^[0-9]+$/g)) {
        return parseInt (expr);
    }
    if (typeof (expr) === 'string') return expr;
    return expr.map (_makeConsts);
}

function infixParseWConsts (expr) { return _makeConsts (infixParse (expr)); }

$('text').oninput = (e) => {
    $('display').innerHTML = '';
    $('display').appendChild (infixFormat (infixParseWConsts (
        e.target.value
    )));
}

/*
General format;
expr = [+ term1 ... termN]
term = [* coeff(nat) [^ base1 exp1] [^ base2 exp2] ... [^ baseN expN]]
base, exp : expr

sum normalization: combine like terms
term normalization: combine like powers
exponentiation normalization: move powers as high as possible; split out constant exponents
    (a b) ^ n ⇒ a^n b^n
    (a ^ n) ^ m ⇒ a ^ (nm)
    a ^ n · a ^ m ⇒ a ^ (n+m)
    a ^ (n+K) ⇒ a ^ n · a ^ K
    expand (a + b) ^ K
*/

