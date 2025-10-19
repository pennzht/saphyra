// A sword is an extension of your body.
// #keep open
// This is a JS file that can speed up a lot of things I make.

function $ (x) { return document.getElementById(x) }
function Q (x) { return document.querySelector(x) }
function Qa (x) { return document.querySelectorAll(x) }

function T (t) { return document.createTextNode(t) }

function EwithNS (options) {
  const tag = options.tag;
  const attrs = (options.attrs && typeof options.attrs === 'object') ? options.attrs : ({});
  const children = (Array.isArray (options.children)) ? options.children : [];
  let e;
  if (options.ns) e = document.createElementNS(options.ns, tag);
  else e = document.createElement(tag);
  for (const k of Object.keys(attrs)) {
    e.setAttribute(k, attrs[k]);
  }
  for (const child of children) {
    if (child instanceof Node) {
      e.appendChild(child);
    } else if (typeof child === 'string') {
      e.appendChild(T(child));
    }
  }
  return e;
}

function E (tag, attrs=null, children=null) {
  return EwithNS ({tag, attrs, children});
}

// SVG element
function Es (tag, attrs=null, children=null) {
  return EwithNS ({tag, attrs, children, ns: 'http://www.w3.org/2000/svg'});
}

if (globalThis.Node) {
  // Push element
  Node.prototype.clear = function() {
    this.innerHTML = '';
  }

  Node.prototype.add = function(...children) {
    for (const child of children) {
      this.appendChild(child);
    }
  }

  Node.prototype.setAttr = function(obj) {
    for (const k of Object.keys(obj)) this.setAttribute (k, obj[k]);
  }

  Node.prototype.setCh = function(...children) {
    this.clear(); this.add(...children);
  }
}

function pprint(obj) {
  return JSON.stringify(obj, null, 2)
}

function isAtom (obj) { return typeof obj === 'string'; }

function isList (obj) { return obj instanceof Array; }

function isMap (obj) { return obj instanceof Map; }

function mod (a, b) { return (a % b + b) % b }
function modAt (a, b, offset) {
  return mod (a - offset, b) + offset;
}

function stepRange (a, b, s) {
    const ans = [];
    for (let i = a; i < b; i += s) ans.push(i);
    return ans;
}

function range (a, b) {
    return stepRange (a, b, 1);
}

function rangeto (b) {
    return stepRange (0, b, 1);
}

function random (n) {
    return Math.min(n-1, Math.floor(Math.random() * n))
}

function randint (a, b) {
    return random (b-a) + a
}

function randreal (a, b) {
    return a + (b-a) * Math.random()
}

// Array helpers
Array.prototype.range = function() {
    return rangeto (this.length);
}

Array.prototype.enum = function() {
    const ans = [];
    for (let i = 0; i < this.length; i++) ans.push ([i, this[i]]);
    return ans;
}

Array.prototype.truthy = function() { return this.length > 0 }

Array.prototype.modat = function(n) {
    return this.truthy() ? this[mod(n, this.length)] : undefined;
}

Array.prototype.clear = function() { this.length = 0; }

// Simple map/filter/reduce/..., forcing 1-variable
Array.prototype.qmap = function(fn) {
    return this.map ((x) => fn (x))
}

Array.prototype.qfilter = function(fn) {
    return this.filter ((x) => fn (x))
}

Array.prototype.qreduce = function(fn) {
    return this.reduce ((x,y) => fn (x,y))
}

Array.prototype.qevery = function(fn) {
    return this.every ((x) => fn (x))
}

Array.prototype.qsome = function(fn) {
    return this.some ((x) => fn (x))
}

// Sorting arrays
Array.prototype.sortnum = function() {
    this.sort ((a,b) => a-b);
}

Array.prototype.sortord = function() {
    this.sort ((a,b) => (a<b) ? -1 : (a>b) ? 1 : 0);
}

Array.prototype.sortby = function(fn) {
    this.sort ((a,b) => {
        const fna = fn(a), fnb = fn(b);
        return fna < fnb ? -1 : fna > fnb ? 1 : 0;
    });
}

/// Toposort.

/**
   nodes: list of atoms
   edges: list of pairs of atoms
**/

function toposort (nodes, edges) {
  // Initialize.
  const descendants = new Map();
  const indegree = new Map();
  for (const n of nodes) {
    descendants.set(n, []);
    indegree.set(n, 0n);
  }

  // Populate.
  for (const [a, b] of edges) {
    if (! indegree.has(a)) {
      return {success: false, reason: 'unknown-node', unknownNode: a};
    }
    if (! indegree.has(b)) {
      return {success: false, reason: 'unknown-node', unknownNode: b};
    }
    descendants.get(a).push(b);
    indegree.set(b, indegree.get(b) + 1n);
  }

  const heads = [];
  for (const a of nodes) {
    if (indegree.get(a) === 0n) heads.push(a);
  }
  heads.reverse();

  const order = [];

  while (heads.length > 0 && order.length < nodes.length) {
    const validNode = heads.pop();
    order.push(validNode);
    const nextNodes = descendants.get(validNode);
    nextNodes.reverse();
    for (const nn of nextNodes) {
      indegree.set(nn, indegree.get(nn) - 1n);
      if (indegree.get(nn) === 0n) {
        heads.push(nn);
      }
    }
    descendants.set(validNode, []);
  }

  // Success!
  if (order.length >= nodes.length) {
    return {success: true, order};
  }

  // Otherwise, return a loop.
  const unresolved = [];
  for (const [n, degree] of indegree.entries()) {
    if (degree > 0n) unresolved.push(n);
  }
  const unresolvedSet = new Set(unresolved);

  const ancestor = new Map();
  for (const [a, b] of edges) {
    if (unresolvedSet.has(a) && unresolvedSet.has(b) && ! ancestor.has(b))
      ancestor.set(b, a);
  }

  let ptr = unresolved[0];
  const covered = new Set();

  while(! covered.has(ptr)) {
    covered.add(ptr);
    ptr = ancestor.get(ptr);
  }

  // Loop found
  const loop = [];
  while (loop.length < nodes.length) {
    loop.push(ptr);
    ptr = ancestor.get(ptr);
    if (ptr === loop[0]) break;
  }

  // Loop complete
  loop.reverse();
  return {success: false, reason: 'loop', loop};
}

/* const arr = rangeto(100).map(() => random(100));
arr.sortby((x) => x.toString())
console.log(arr) */

function printArr(...args) {
  return args.map((x) => `${x}`).join(' ')
}

function sexpToElement (sexp) {
  // Sexp should have the form
  // [tag-name [k1 v1 k2 v2 ...] [c1 c2 ...]]

  if (isList (sexp)) {
    const [tag, attrs, children] = sexp;
    const attrmap = {};
    for (let i = 0; i < attrs.length; i+=2) {
      let targetValue = str(attrs[i+1]);
      if (targetValue.startsWith('{}'[0])) targetValue = targetValue.slice(1, targetValue.length - 1);
      attrmap[attrs[i]] = targetValue;
    }
    const childrenEvaluated = children.map((a) => sexpToElement(a));
    return E(tag, attrmap, childrenEvaluated);
  } else {
    let targetValue = str(sexp);
    if (targetValue.startsWith('{}'[0])) targetValue = targetValue.slice(1, targetValue.length - 1);
    return T (targetValue);
  }
}

// Helper for rounding

function snapTo (number, granularity, offset=0) {
  return Math.round ((number - offset) / granularity) * granularity + offset;
}

function removePrefix (str, prefix) {
  return str.slice(prefix.length);
}

function removeSuffix (str, suffix) {
  return str.slice(0, str.length - suffix.length);
}

