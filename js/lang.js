// Parsing a sexp, using only square brackets

function parseSexp (input) {
    input = input.replaceAll ('(', ' [ ');
    input = input.replaceAll (')', ' ] ');
    input = input.replaceAll ('[', ' [ ');
    input = input.replaceAll (']', ' ] ');
    input = input.trim();
    if (input.length === 0) return [];
    input = input.split(/[ \t\n]+/);
    input = input.map((token) => (
        token === '[' ? token :
            token === ']' ? token + ',' :
            '"' + token + '",'))
        .join(' ');
    input = '[' + input + ']';
    input = input.replaceAll (/, *\]/g, ' ]');
    return JSON.parse (input);
}

function display (sexp) {
    if (typeof sexp === 'string') {
        return sexp;
    } else {
        parts = sexp.map (display);
        return '<sexp> ' + parts.join(' ')  + '</sexp>';
    }
}

/// If it is a valid derivation from [ins] to [outs] via [rule].
/// Applies to one rule only.
function isValidStep (rule, ins, outs) {
    const i = ins, o = outs;
    if (rule === 'and-intro') {
        return i.length === 2 && equal (o, [['and', ...i]]);
    } else if (rule === 'and-elim') {
        return o.length === 2 && equal (i, [['and', ...o]]);
    } else if (rule === 'or-intro-1') {
        return i.length === 1 && o.length === 1 &&
            o[0][0] === 'or' && equal(o[0][1], i[0]);
    } else if (rule === 'or-intro-2') {
        return i.length === 1 && o.length === 1 &&
            o[0][0] === 'or' && equal(o[0][2], i[0]);
    } else if (rule === 'or-elim') {
        return i.length === 3 && o.length === 1 &&
            i[0][0] === 'or' && i[1][0] === '->' && i[2][0] === '->' &&
            equal(i[0][1], i[1][1]) && equal(i[0][2], i[2][1]) &&
            equal(i[1][2], i[2][2]) && equal(i[1][2], o[0]);
    } else if (rule === 'false-elim') {
        return equal (i, ['false']);
    } else if (rule === 'true-intro') {
        return equal (o, ['true']);
    } else if (rule === 'mp') {
        return i.length === 2 && o.length === 1 &&
            equal(i[0], i[1][1]) && i[1][0] === '->' &&
            equal(i[1][2], o[0]);
    } else if (rule === 'tnd') {
        const a = o[0][1];
        return equal (o, [['or', a, ['->', a, 'false']]]);
    } else {
        return false;  // Unrecognized rule.
    }
}

/// If a sequence of items (in correct order) is a valid derivation.
/// Applies to a system.
function isValidDeriv (lines) {
    /// TODO: fill in
}

/// If two sexps are equal.
function equal (a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

