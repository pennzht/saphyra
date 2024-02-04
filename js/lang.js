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
function isValidStep (rule, ins, outs, subs = null) {
    const i = ins, o = outs;
    if (rule === 'and-intro') {
        return i.length === 2 && eq (o, [['and', ...i]]);
    } else if (rule === 'and-elim') {
        return o.length === 2 && eq (i, [['and', ...o]]);
    } else if (rule === 'or-intro-1') {
        return i.length === 1 && o.length === 1 &&
            o[0][0] === 'or' && eq(o[0][1], i[0]);
    } else if (rule === 'or-intro-2') {
        return i.length === 1 && o.length === 1 &&
            o[0][0] === 'or' && eq(o[0][2], i[0]);
    } else if (rule === 'or-elim') {
        return i.length === 3 && o.length === 1 &&
            i[0][0] === 'or' && i[1][0] === '->' && i[2][0] === '->' &&
            eq(i[0][1], i[1][1]) && eq(i[0][2], i[2][1]) &&
            eq(i[1][2], i[2][2]) && eq(i[1][2], o[0]);
    } else if (rule === 'false-elim') {
        return eq (i, ['false']);
    } else if (rule === 'true-intro') {
        return eq (o, ['true']);
    } else if (rule === 'mp') {
        return i.length === 2 && o.length === 1 &&
            eq(i[0], i[1][1]) && i[1][0] === '->' &&
            eq(i[1][2], o[0]);
    } else if (rule === 'tnd') {
        const a = o[0][1];
        return eq (o, [['or', a, ['->', a, 'false']]]);
    } else if (rule === 'impl-intro') {
        return true;  // TODO - judge
    } else if (rule === 'join') {
        return true;  // TODO - judge
    } else {
        return false;  // Unrecognized rule.
    }
}

/// Temporary function for isvalidstep for any rule.
function isValidStepInAnyRule (ins, outs, subs = null) {
    return ['and-intro', 'and-elim', 'or-intro-1', 'or-intro-2', 'or-elim',
            'false-elim', 'true-intro', 'mp', 'tnd', 'impl-intro', 'join'].some ((rule) => isValidStep (rule, ins, outs, subs));
}

/// If a sequence of items (in correct order) is a valid derivation.
/// Applies to a system.
function isValidDeriv (lines) {
    const nodes = new Map();
    const descs = new Map();  // Descendants
    const ances = new Map();  // Ancestors
    const reasons = new Map();  // Reasons for each step

    const ans = {};  // Stores the judgment

    for (const line of lines) {
        if (line.length === 0) continue;
        if (line[0] === 'comment') continue;

        if (line[0] === 'node') {
            // TODO
        } else if (line[0] === 'derive') {
            // TODO
        } else if (line[0] === 'link') {
            // TODO
        }
    }
}

/// If two sexps are equal.
function eq (a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

