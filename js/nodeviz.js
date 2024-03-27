// TODO - visualization of a node, a theory

// import * as lang from './lang.js';

const $ = (x) => document.getElementById(x);
const elem = (x) => document.createElement(x);

/// Displays a node `nodeName` within the module `module`.
function displayNode (module, nodeName) {
    const derivation = module.derives?.get(nodeName)?.rule ?? '(?)';

    const subNamesUnsorted = (module.ances.get(nodeName) ?? []).filter ((x) => module.uplink.get(x) === nodeName);
    // sort according to order
    const subNames = module.order.filter ((x) => subNamesUnsorted.includes (x));

    const subs = subNames.map ((name) => displayNode(module, name))
          .join('');

    const ins = module.nodes.get(nodeName).ins.map (
        (x, i) => `<sexp class="shade" data-pos="${nodeName}-in-${i}">${str(x)}</sexp>`
    ).join('');
    const outs = module.nodes.get(nodeName).outs.map (
        (x, i) => `<sexp class="shade" data-pos="${nodeName}-out-${i}">${str(x)}</sexp>`
    ).join('');

    return `<node>` +
        `<div>${nodeName}: ${derivation}</div>` +
        `<div>${subs}</div>` +
        `${ins}&rarr;${outs}` +
        `</node>`;
}

function displayModule (module) {
    const roots = module.order.filter ((x) => ! module.uplink.has(x));
    return roots.map ((n) => displayNode(module, n)).join('');
}

function display (sexp) {
    if (typeof sexp === 'string') {
        return sexp;
    } else {
        const parts = sexp.map (display);
        return '<sexp> ' + parts.join(' ')  + '</sexp>';
    }
}

function displayHuman (sexp) {
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

function displayInRows (sexpList) {
    return sexpList.map ((x) => `<div>${display(x)}</div>`).join('');
}

function displayInRowsHuman (sexpList) {
    return sexpList.map ((x) => `<div>${displayHuman(x)}</div>`).join('');
}

function visualizer (key, value) {
    return (typeof value === 'bigint' ? 'bigint:'+value.toString() :
            value instanceof Map ? 'map:'+JSON.stringify([...value], visualizer) :
            value);
}
