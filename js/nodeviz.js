// TODO - visualization of a node, a theory

// import * as lang from './lang.js';

const $ = (x) => document.getElementById(x);
// const elem = (x) => document.createElement(x);

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

// Sync with visual.js (with dispCons removed)

// Visualization of data structures.

function text(t) {
  return document.createTextNode(t);
}

function elem(tag, attrs, children) {
  const e = document.createElement(tag);
  if (typeof attrs === 'object') {
    for (const k of (Object.keys(attrs) || [])) {
      e.setAttribute(k, attrs[k]);
    }
  }
  for (const child of (children || [])) {
      if (child instanceof Node) {
        e.appendChild(child);
      } else if (typeof child === 'string') {
        e.appendChild(text(child));
      }
  }
  return e;
}

function dispStack (stack) {
  return elem('div', [], stack.map(dispFrame));
}

function dispFrame(frame) {
  var ans;
  if (isCompoundFrame(frame)) {
    ans = elem('div', {class: 'frame'}, [frame.type, ' ',  dispSexp(frame.form), ' ', dispMap(frame.env), ' ', dispNum(frame.subindex)]);
  } else {
    ans = dispSexp(frame);
  }
  return ans;
}

function dispNum(number) {
  if ((number ?? 'x') === 'x') return elem('span', {class: 'null'}, ['—']);
  return elem('span', {class: 'index'}, [number.toString()]);
}

function dispSexp(obj) {
  const type = valType(obj);
  /*
  if (obj instanceof Cons) {
    return dispCons(obj);
  }
  */
  if (type === 'special') {
      return elem('span', {class: obj === null ? 'null' : 'bool'}, [`${obj}`]);
  }
  if (type === 'bigint') return elem('span', {class: 'number'}, [obj.toString()]);
  if (type === 'atom') return elem('span', {class: 'atom'}, [obj]);
  if (type === 'list') return elem('div', {class: 'list'}, obj.map(dispSexp));
  if (type === 'cons' && obj.kind === 'list') return elem('div', {class: 'list'}, obj.obj.map(dispSexp));
  if (type === 'map') return dispMap(obj);
  if (isCompoundFrame(obj)) return dispFrame(obj);
}

function dispMap(map) {
  if (! (map instanceof Map)) return dispSexp(map);
  if (map.size === 0) return elem('span', {class: 'null'}, ['empty']);
  return elem('table', {class: 'map'}, [...map.entries()].map(
    (entr) => elem('tr', {}, [elem('td', {}, [text(`${entr[0]}`)]),     elem('td', {}, [dispSexp(entr[1])])])
  ));
}
