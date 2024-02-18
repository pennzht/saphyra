// TODO - visualization of a node, a theory

const $ = (x) => document.getElementById(x);
const elem = (x) => document.createElement(x);

/// Displays a node `nodeName` within the module `module`.
export function displayNode (module, nodeName) {
    const subNames = module.ances.get(nodeName);
    const subs = subNames.map ((name) => display(module, name))
          .join('');

    const ins = module.nodes.get(nodeName).ins;
    const outs = module.nodes.get(nodeName).outs;

    return `<div>` +
        `<div>${nodeName}</div>` +
        `<div>${subs}</div>` +
        `${display(ins)}${display(outs)}` +
        `</div>`;
}

export function display (sexp) {
    if (typeof sexp === 'string') {
        return sexp;
    } else {
        const parts = sexp.map (display);
        return '<sexp> ' + parts.join(' ')  + '</sexp>';
    }
}

export function displayHuman (sexp) {
    if (typeof sexp === 'string') {
        return sexp;
    } else {
        const parts = sexp.map (displayHuman);
        if (parts.length === 3 && ['->', 'and', 'or'].includes (parts[0])) {
            return '<sexp> ' + [parts[1], parts[0], parts[2]].join(' ')  + '</sexp>';
        }
        return '<sexp> ' + parts.join(' ')  + '</sexp>';
    }
}

export function displayInRows (sexpList) {
    return sexpList.map ((x) => `<div>${display(x)}</div>`).join('');
}

export function displayInRowsHuman (sexpList) {
    return sexpList.map ((x) => `<div>${displayHuman(x)}</div>`).join('');
}

