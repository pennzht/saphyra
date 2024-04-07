// Unused: Refcount system + 1-ref optimizations.

const lines = Source.split('\n').length;
const size = Source.length;
print(`${lines} lines, ${size} chars`)
const DEBUG = false;

isAtom = G.isAtom;
isList = G.isList;
isSym = G.isSym;

function isComplete (stack) {
    return stack.length === 1 && (stack[0].type === 'literal'
                                  || stack[0].type === 'closure');
}

function main () {
  var p = G.parse(G.programs[14]);
  evaluate(p);
}

// Returns the type of a value.
function valType (val) {
    if (val === null || val === undefined) return 'null';
    if (val.type && typeof val.type === 'string') return val.type;
    if (typeof val === 'bigint') return 'bigint';
    if (typeof val === 'string') return 'atom';
    if (val instanceof Array) return 'list';
    if (val instanceof Map) return 'map';
    if (val === true || val === false) return 'bool';
    throw new Error (`Unrecognized type ${val}`);
}

function isResolved (type) {
    return ['closure', 'bigint', 'atom', 'list', 'map', 'bool'].includes (type);
}

class Cons {
  constructor(obj) {
    this.ref = 1;
    this.type = 'cons';
    if (obj instanceof Array) {this.kind = 'list'; this.obj = [...obj];}
    else if (obj instanceof Map) {this.kind = 'map'; this.obj = new Map(obj);}
    else {throw new Error(`Cons on unknown type ${this.type}`)};
  }
  children() { if (this.kind === 'list') return this.obj; else return [...this.obj.values()] }
  shallowCopy() {
    if (this.kind === 'list') {
      const copiedList = [... this.obj];
      for (const x of copiedList) inc(x);
      return new Cons(copiedList);
    } else {
      const copiedMap = new Map([... this.obj]);
      for (const y of this.children()) inc(y);
      return new Cons(copiedMap);
    }
  }
}

function dec(obj) {
  if (obj instanceof Cons) {
    obj.ref --;
    if (obj.ref <= 0) {
      for (const child of obj.children()) dec(child);
      if (DEBUG) print(`${obj.obj} freed.`);
      obj.obj = null;
    }
  }
}

function inc(obj) {
  if (obj instanceof Cons) obj.ref ++;
}

consOperators = {};

for (const name of Object.keys(G.operators)) {
  consOperators[name] = G.operators[name];
}

// Override certain operators.

consOperators['list:'] = (...args) => {
  for (const a of args) inc(a);
  return new Cons([...args]);
};

consOperators['map:'] = (...args) => {
  const ansMap = new Map();
  for (var i = 0; i+1 < args.length; i+=2) {
    const key = args[i], value = args[i+1];
    if (typeof key !== 'string') return '#error:map-key-non-string';
    ansMap.set(key, value);
  }
  for (const y of ansMap.values()) inc(y);
  return new Cons(ansMap);
}

consOperators['get'] = (ind, cons) => {
  if (! (cons instanceof Cons)) {
    return '#error:get-non-cons';
  }
  if (cons.kind === 'list') return (cons.obj[Number(ind)] ?? null);
  else if (cons.kind === 'map') return (cons.obj.get(ind) ?? null);
};

consOperators['atom?'] = (obj) => ! (obj instanceof Cons);
G.arity['atom?'] = 1;

consOperators['size'] = (obj) => {
  if (obj instanceof Cons) {
    return obj.kind === 'list'? BigInt(obj.obj.length) : BigInt(obj.obj.size);
  }
  return 0n;
};

function literal(expr) {
  if (expr instanceof Array) {
    const parts = expr.map(literal);
    return new Cons(parts);
  } else if (typeof(expr) === 'string') {
    if (expr.match(/^[#]/)) return expr;
    if (expr.match(/^[-]?[0-9]+$/)) return BigInt(expr);
    if (['true', 'false', 'null'].includes(expr)) return {'true': true, 'false': false, 'null': null}[expr];
    return expr;
  } else {
    return expr;
  }
}

consOperators['literal'] = literal;
G.arity['literal'] = 1;

consOperators['typeof'] = (val) => {
    if (val === null) return 'null';
    if (val === true || val === false) return 'bool';
    if (typeof val === 'bigint') return 'bigint';
    if (typeof val === 'string') return 'atom';
    if (val instanceof Cons) return val.kind;
    throw new Error (`Unrecognized type ${val}`);
}
G.arity['typeof'] = 1;

const nativeFunctions = new Set(Object.keys(consOperators));

function truthy(val) {
  return ! falsey(val);
}

function falsey(val) {
  return val === false || val === null || val === 0n || val === '' || (
   val instanceof Cons && val.kind === 'list' && val.obj.length === 0
  ) || (
   val instanceof Cons && val.kind === 'map' && val.obj.size === 0
  );
}

class Stepper {
  constructor (code, initialMap) {
    // Constructing a stepper with the code it runs and the initial map it has
    this.code = code; this.map = initialMap || new Map();
    this.pc = 0;
    // Initialize
    this.jumpTable = {};
    for (var i = 0; i < code.length; i++) {
      if (isAtom(code[i])) this.jumpTable[code[i]] = i;
    }
    this.done = false;
  }

  step() {
    const line = this.code[this.pc];
    if (this.pc >= this.code.length) {this.done = true; return;}
    if (isAtom(line)) {this.pc++; return;}
    if (! isList(line) || line.length <= 0) throw new Error(`Bad line at ${this.pc}, ${line}`);
    const head = line[0];
    if (head === 'drop') { this.drop(line); }
    else if (head === 'load') { this.load(line); }
    else if (head === 'fnop') { this.fnop(line); }
    else if (head === 'move') { this.move(line); }
    else if (head === 'set') { this.set(line); }
    else if (head === 'if') { this.jump(line); }
    else if (head === 'push') { this.push(line); }
    else if (head === 'pop') { this.pop(line); }

    // drops exclamations
    for (const elem of line) if (typeof elem === 'string' && elem.match(/^[#].*[!]$/)) {
      this.drop(['drop', elem]);
    }

    this.pc++;
  }

  val(atom) {
    if (isSym(atom)) return this.rawGet(atom);
    return literal(atom);
  }

  copyTarget(target) {
    const aTarget = this.val(target);
    if (aTarget.ref > 1) {
      if (DEBUG) print('Copy happened.');
      // Copy first
      const newTarget = aTarget.shallowCopy();
      dec (aTarget);
      this.rawSet(target, newTarget);
      return newTarget;
    } else {
      if (DEBUG) print('Direct hit.');
      return aTarget;
    }
  }

  norm(name) {
    // returns the normalized name of a variable.
    if (typeof name === 'string' && name.match(/^[#].*[!]$/)) {
      return name.slice(0, name.length - 1);
    } else return name;
  }

  rawSet(name, val) { this.map.set(this.norm(name), val); }
  rawGet(name) { return this.map.get(this.norm(name)); }
  rawHas(name) { return this.map.has(this.norm(name)); }
  rawDelete(name) { return this.map.delete(this.norm(name)); }

  /// Stepper: individual commands

  drop(line) {
    const [_, target] = line;
    if (! this.rawHas(target)) {return;}
    dec(this.rawGet(target));
    this.rawDelete(target);
  }

  load(line) {
    if (! (line.length === 3 && line[0] === 'load' && isAtom(line[1]))) {
      throw new Error(`Bad load command`);
    }
    const [_, target, value] = line;
    this.drop(['drop', target]);
    this.rawSet(target, literal(value));
  }

  move(line) {
    const [_, target, src] = line;
    if (target === src) {return;}
    this.drop(['drop', target]);
    this.rawSet(target, this.rawGet(src));
    inc(this.rawGet(target));
  }

  fnop(line) {
    if (line.length < 3) throw new Error(`Bad fnop command: too short`);
    const [_head, target, fnOrig, ...args] = line;

    const fn = this.val(fnOrig);

    if (_head !== 'fnop') throw new Error(`Bad fnop command: head ${_head} not fnop`);
    if (! isSym(target)) throw new Error(`Bad fnop command: not a symbol`);
    if (! nativeFunctions.has(fn)) throw new Error(`Bad fnop command: no such builtin command ${fnOrig} -> ${fn}`);
    if (! (G.arity[fn] === 'VARIABLE' || G.arity[fn] === args.length)) throw new Error(`Bad fnop command: arity mismatch ${fn} ${G.arity[fn]} != ${args.length}`);

    const argVals = args.map((x) => this.val(x));
    const result = consOperators[fn](...argVals);
    this.drop(['drop', target]);
    this.rawSet(target, result);
    // Increase point only if not newly created list
    if (fn !== 'list:' && fn !== 'map:') inc(result);
  }

  jump(line) {
    const [_, target, labelIf, labelElse] = line;
    if (truthy(this.val(target))) this.pc = this.jumpTable[labelIf] ?? this.pc;
    else this.pc = this.jumpTable[labelElse] ?? this.pc;
  }

  set(line) {
    const [_, target, index, obj] = line;
    const aIndex = this.val(index);
    const aObj = this.val(obj);
    inc(aObj);

    const aTarget = this.copyTarget(target);

    if (! (aTarget instanceof Cons)) {
      console.log('cons', this);
      throw new Error(`${this.pc} Try setting non-cons ${line}`);
    }

    if (aTarget.kind === 'list') {
      dec(aTarget.obj[Number(aIndex)]);
      aTarget.obj[Number(aIndex)] = aObj;
    } else {
      // Map
      dec(aTarget.obj.get(aIndex));
      aTarget.obj.set(aIndex, aObj);
    }
  }

  push(line) {
    const [_, target, obj] = line;

    const aTarget = this.copyTarget(target);
    const aObj = this.val(obj);
    aTarget.obj.push(aObj);
  }

  pop(line) {
    const [_, target] = line;

    const aTarget = this.copyTarget(target);
    const tail = aTarget.obj.pop();
    dec(tail);
  }
}

const codeFib = `
  start
  [load #A 0]
  [load #B 1]
  continue
  [fnop #C + #A #B]
  [move #A #B]
  [move #B #C]
  [fnop #D < #C 100]
  [if #D continue]
`;

const codeList = `
  [fnop #A list: 3 4 5 100]
  [move #B #A]
  [move #C #A]
  [set #A 3 999]
  [set #A 0 2]
  [push #A 5]
  [push #B 7]
  [pop #C]
  [load #D [3 4 5 6 7 8 9]]
  [drop #C]
`;

const code3 = `
  [fnop #A list: 3 5 100]
  [fnop #A list: #A #A]
  [fnop #A list: 1 2 3]
  [move #A #A]
  [fnop #B list: #A #A #A]
  [fnop #C get 1 #A]
  [move #D #A]
  [drop #B]`;

const code4 = `
  [load #A [3 5 100]]
  [set #A a m]
  [set #A 1 #A]
`;

const code5 = `
  [fnop #A map: a 5 b 7 c 9]
  [set #A a m]
  [fnop #A get d #A]
`;

const code6 = `
  [push #A 3]
  [push #A 5]
  [load #B +]
  [fnop #e #B 3 5]
`;

const exampleCode = G.parse(code6);

print(elemSexp(exampleCode));

const range = (a, b) => {
  const ans = [];
  for (let i = a; i < b; i++) ans.push(i);
  return ans;
};

/**
  Continuously evolve the stack.
  #s = [expr/fnop/macro/...  form  env  ind(ex)  parent]
 */
const lispToStackInterpreter = `
#cycle
[fnop #head get 0 #s]
[fnop #form get 1 #s]
[fnop #env get 2 #s]
[fnop #ind get 3 #s]
[fnop #parent get 4 #s]

[fnop #h1 = #head expr] [if #h1! #handle_expr]
[fnop #h1 = #head fnop] [if #h1! #handle_fnop]
[fnop #h1 = #head macro] [if #h1! #handle_macro]
[fnop #h1 = #head literal] [if #h1! #handle_literal]
[fnop #h1 = #head closure] [if #h1! #handle_closure]
[if true #handle_error]

#handle_expr
[fnop #is_atom atom? #form] [if #is_atom! #expr_eval_atom #expr_eval_cons]

#expr_eval_atom
[fnop #lookup get #form #env]
[fnop #nonnull != null #lookup]
[if #nonnull! #set_value]
[fnop #lookup get #form #builtins]
[fnop #nonnull != null #lookup]
[if #nonnull! #set_builtin]
[fnop #atom_type typeof #form]
[fnop #atom_is_var = atom #atom_type!]
[if #atom_is_var! #end]
[fnop #s list: literal #form null null #parent]
[if true #cycle]

#expr_eval_cons
[fnop #op get 0 #form]
[fnop #is_macro get #op! #macros] [if #is_macro! #set_macro #set_function]

#set_function
[fnop #s list: fnop #form! #env! 0 #parent!]
[if true #cycle]

#set_macro
[fnop #s list: macro #form! #env! 1 #parent!]
[if true #cycle]

#set_value
[fnop #s list: literal #lookup! null null #parent!]
[if true #cycle]

#set_builtin
[fnop #s list: literal #form! null null #parent!]
[if true #cycle]

#handle_fnop
[fnop #form_length size #form]
[fnop #reached_end >= #ind #form_length!]
[if #reached_end! #handle_fnop_application]
[fnop #nth_part get #ind #form]
[set #form #ind null]
[set #s 1 #form]
[fnop #s list: expr #nth_part! #env 0 #s]
[if true #cycle]

#handle_fnop_application
[fnop #fn_head get 0 #form]
[fnop #fn_arity get #fn_head #builtins]
[if #fn_arity! #handle_fnop_builtin #handle_fnop_lambda]

#handle_fnop_lambda
[fnop #fn_args get 1 #fn_head]
[fnop #fn_body get 2 #fn_head]
[fnop #fn_captures get 3 #fn_head]

#//TODO_define_captures

[fnop #fn_list_is_atom atom? #fn_args]
[if #fn_list_is_atom #assign_whole_list #assign_individual]

#assign_whole_list
[set #fn_captures #fn_args! #form!]
[fnop #s list: expr #fn_body! #fn_captures! 0 #parent!]
[if true #cycle]

#assign_individual
[load #arg_index 0]
[fnop #arg_length size #fn_args]
#assign_individual_loop
[fnop #arg_reached_end >= #arg_index #arg_length] [if #arg_reached_end! #fnop_set_expr]
[fnop #this_arg get #arg_index #fn_args]
[fnop #this_val get #arg_index #form]
[set #fn_captures #this_arg! #this_val!]
[fnop #arg_index + 1 #arg_index]
[if true #assign_individual_loop]

#fnop_set_expr
[fnop #s list: expr #fn_body! #fn_captures! 0 #parent!]
[drop #fn_args] [drop #arg_length] [drop #arg_index]
[if true #cycle]

#handle_fnop_builtin
[fnop #op1 get 1 #form]
[fnop #op2 get 2 #form]
[fnop #ans #fn_head #op1! #op2!]
[fnop #s list: literal #ans! 0 0 #parent!]
[if true #cycle]

#handle_macro
[fnop #op get 0 #form]
[fnop #cond = #op if] [if #cond! #handle_if]
[fnop #cond = #op let] [if #cond! #handle_let]
[fnop #cond = #op '] [if #cond! #handle_']
[fnop #cond = #op :] [if #cond! #handle_:]
[if true #end]

#handle_if
[fnop #at_1 <= #ind 1]
[fnop #if_1 get 1 #form]
[if #at_1! #handle_if_1 #handle_if_past_1]

#handle_if_1
[fnop #s list: expr #if_1 #env 0 #s]
[if true #cycle]

#handle_if_past_1
[if #if_1 #handle_true #handle_false]
#handle_true [fnop #realpart get 2 #form] [if true #push_form]
#handle_false [fnop #realpart get 3 #form]
#push_form [fnop #s list: expr #realpart #env 0 #parent]
[if true #cycle]

#handle_let
[fnop #let_var get 1 #form]
[fnop #let_val get 2 #form]
[fnop #let_body get 3 #form]
[fnop #val_handled > #ind 2] [if #val_handled! #let_push]
[set #s 3 2]
[set #form 2 null]
[set #s 1 #form]
[fnop #s list: expr #let_val! #env! 0 #s]
[if true #cycle]

#let_push
[set #env #let_var #let_val]
[fnop #s list: expr #let_body #env 0 #parent]
[if true #cycle]

#handle_'
[fnop #realpart get 1 #form!]
[fnop #s list: literal #realpart! null null #parent!]
[if true #cycle]

#handle_:
[fnop #:_capture get 3 #form]
[fnop #:_capturemap map:]
#//compute_captures
[fnop #:_cap_len size #:_capture]
[load #_i 0]
#while_loop
[fnop #q >= #_i #:_cap_len] [if #q! #while_loop_ends]
[fnop #atom get #_i #:_capture]
[fnop #val get #atom #env]
[set #:_capturemap #atom! #val!]
[fnop #_i + 1 #_i]
[if true #while_loop]
#while_loop_ends
[drop #_i] [drop #:_cap_len]
[set #form 3 #:_capturemap!]
[drop #:_capture]
[fnop #s list: literal #form! null null #parent!]
[if true #cycle]

#handle_literal
[fnop #is_root = -root #parent]
[if #is_root #end]
[fnop #parent_index get 3 #parent]
[fnop #parent_form get 1 #parent]
[set #parent_form #parent_index #form!]
[set #parent 1 #parent_form!]
[fnop #parent_index + 1 #parent_index]
[set #parent 3 #parent_index!]
[move #s #parent!]
[if true #cycle]

#handle_closure
#loop3 [if true #loop3]

#handle_error
#loop4 [if true #loop4]

#end
`;

/// Stats for the interpreter.
function collectAtoms(sexp) {
  if (sexp instanceof Array) {
    const ans = new Set();
    for (const y of sexp) for (const elem of collectAtoms(y)) {
      ans.add(elem);
    }
    return ans;
  } else if (sexp instanceof Map) {
    const ans = new Set();
    for (const y of sexp.values()) for (const elem of collectAtoms(y)) {
      ans.add(elem);
    }
    return ans;
  } else return new Set([sexp]);
}

print(`Atoms in interpreter: ${collectAtoms(G.parse(lispToStackInterpreter)).size}`);

/// Individual programs.

const m1 = "let x (+ 2 1) [let y (* x x) (- y 1)]";
const m2 = "(: [_ x] [+ x x] []) 3";
const m3 = "(: [_ x y z] [* x [+ y z]]) 3 4 5";
const m4 = `
  (: [self x y] (if x [self (- x 1) (+ y 1)] y)) 3 5
`;
const m5 = `
  (: [self a b] [if (= b 0) 1 (* a [self a (- b 1)])]) 3 5
`;
const m6 = `
  (: [^ a b acc] [if (= b 0) acc (^ a (- b 1) (* acc a))]) 3 5 1
`;
const m7 = `
  [(: [_ a] (: [_ b] [+ a b] [a])) 3] 9
`;

// Primality test
const m8 = `
  let isprime-factor [: (isprime-factor n f)
                        (if (> (* f f) n) true
                          (if (= 0 (% n f)) false
                            (isprime-factor n (+ 1 f))))]
  (let isprime [: (_ n) (if (< n 2) false (isprime-factor n 2)) [isprime-factor]]
    [isprime n])
`;

const stepper = new Stepper(G.parse(lispToStackInterpreter));
const initialState = new Cons([
  'expr',
  literal(G.parse(m8)),
  new Cons(new Map([['a', 3n], ['b', 7n], ['n', 2n]])),
  0n,
  '-root',
]);
stepper.map.set('#s', initialState);

// TODO: use full builtins.
const builtins = new Map(['+', '-', '*', '/', '%', 'b<<', 'b>>', '=', '<', '>'].map((x) => [x, G.arity[x] === 'VARIABLE' ? 'VARIABLE' : BigInt(G.arity[x])]));
const macroTypes = ['if', 'let', ':', "'"];
// print(elemMap(builtins));
stepper.map.set('#builtins', new Cons(builtins));
stepper.map.set('#macros', new Cons(new Map(macroTypes.map((x) => [x, 1n]))));

var stepsTaken = 0;
const timeStart = Date.now();
for (const a of range(0,10000)) {
//  print(`Step ${a}: pc = ${stepper.pc}, line = ${stepper.code[stepper.pc]}`);
//  print(elemMap(stepper.map));
  stepper.step();
  stepsTaken++;
  console.log(stepper);
  if (stepper.done) break;
}
const msTaken = Date.now() - timeStart;

print(`pc = ${stepper.pc}, line = ${stepper.code[stepper.pc]}, ${stepsTaken} steps, ${msTaken} ms`);
print(elemMap(stepper.map));
