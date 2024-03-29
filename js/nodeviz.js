// Visualization utilities. Browser-only.

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

function elem(tag, attrs=null, children=null) {
  const e = document.createElement(tag);
  if (typeof attrs === 'object' && attrs) {
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

// TODO - add sexp to html converter.

// Displays for modules (tree format).

function dispModule(module) {
  return elem('div', [], module.map(dispNode));
}

function dispNode(node) {
  const head = node[0];
  if (head === 'node') {
    const [_, label, ins, outs, justification, subsVerified, ...conclusion] = node;
    return elem('node', {
      'data-label': label,
    }, [
      text('node '), text(label),
      dispConclusion(conclusion),
      elem('div', {class: 'stmt-group', 'data-io': 'in'}, ins.map(dispStmt)),
      text('→'),
      elem('div', {class: 'stmt-group', 'data-io': 'out'}, outs.map(dispStmt)),
      dispSexp(justification),
      ... subsVerified.map(dispNode),
    ]);
  } else if (head === 'link') {
    const [_, a, b, stmt] = node;
    return elem('div', [], [
      text('link '), text(a), text(' → '), text(b),
    ]);
  } else if (isErr(head)) {
    return dispSexp(node);
  }
}

function dispStmt(stmt) {
  function transformStmt(stmt) {
    if (isList(stmt) && stmt.length === 3) {
      return [transformStmt(stmt[1]), stmt[0], transformStmt(stmt[2])];
    }
    return stmt;
  }

  return elem('stmt', {'data-sexp': str(stmt)}, [dispSexp(transformStmt(stmt))]);
}

function dispConclusion(conclusion) {
  if (conclusion[0] === '#good') {
    return elem('span', {style: 'color:#00ab32;'}, [text('\u2713')]);  // check mark.
  } else {
    return elem('sexp', [], [
      elem('span', {style: 'color:red;'}, [text('\u2717')]),  // cross.
      dispConclusionError(conclusion),
    ]);
  }
}

function dispConclusionError(conclusion) {
  if (conclusion[0] === '#err/unproven-assump') {
    return elem('div', [], [
      elem('div', [], [text('Not yet proven:')]),
      ... conclusion.slice(1).map((item) => elem('div', [], [
        dispSexp(item[0]),
        text(':'),
        ... item[1].map(dispStmt),
      ])),
    ]);
  } else {
    return dispSexp(conclusion);
  }
}
