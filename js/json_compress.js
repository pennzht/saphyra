/**
    A custom compressor for JSON.

    TODO - implement.
**/

function jsonCompress (obj) {
  function isLiteral (obj) {
    return (
      obj === true || obj === false || obj === null ||
        typeof obj === 'number' || typeof obj === 'string'
    );
  }

  function makeLiteral (obj) {
    if (obj === true) return '#t';
    if (obj === false) return '#f';
    if (obj === null) return '#n';
    if (typeof obj === 'number') return '#' + obj.toString();
    if (typeof obj === 'string') {
      // Test if all-ascii
      let allAscii = true;
      for (let i = 0; i < obj.length; i++) {
        let cc = obj.charCodeAt(i);
        if (cc <= 0x20 || cc >= 0x7f) {
          allAscii = false; break;
        }
      }
      if (allAscii) return '&' + obj;
      else return '$' + Buffer.from(obj).toString('base64');
    }
    throw new Error ('Unrecognized literal type');
  }

  const table = new Map();
  const trie = {};    // Finds a symbol based on value.
  const latest = {label: 0};

  function _base64bijective (num) {
    if (num === 0) return '';
    const rem = (num - 1) % 64 + 1;
    const quo = (num - rem) / 64;
    return _base64bijective (quo) + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[rem-1];
  }

  function _gensym () {
    const ans = '@' + _base64bijective(latest.label); latest.label++; return ans;
  }

  function _peeksym () {
    const ans = '@' + _base64bijective(latest.label); return ans;
  }

  function encode (obj) {
    if (isLiteral(obj)) {
      const lit = makeLiteral(obj);
      if (trie[lit]) {
        return trie[lit];
      } else {
        const sym = _peeksym();

        if (sym.length < lit.length) {
          _gensym();
          trie[lit] = sym;
          table.set(sym, lit);
          return sym;
        } else {
          trie[lit] = lit;
          table.set(lit, lit);
          return lit;
        }
      }
    } else if (Array.isArray(obj)) {
      const def = ['!a', ... obj.map(encode)];
      let ptr = trie;

      for (const atom of def) {
        if (! (ptr[atom])) {
          ptr[atom] = {};
        }
        ptr = ptr[atom];
      }

      if (ptr['!e']) {
        // Already defined
        return ptr['!e'];
      } else {
        ptr['!e'] = _gensym();
        table.set(ptr['!e'], def);
        return ptr['!e'];
      }
    } else {
      // Object
      const def = ['!o'];
      let ptr = trie;

      for (const k of Object.keys(obj)) {
        def.push(encode(k));
        def.push(encode(obj[k]));
      }

      for (const atom of def) {
        if (! (ptr[atom])) {
          ptr[atom] = {};
        }
        ptr = ptr[atom];
      }

      if (ptr['!e']) {
        // Already defined
        return ptr['!e'];
      } else {
        ptr['!e'] = _gensym();
        table.set(ptr['!e'], def);
        return ptr['!e'];
      }
    }
  }

  const root = encode (obj);

  // Root obtained. Now, compose all symbols.
  const ans = [];
  for (const [sym, ref] of table.entries()) {
    if (sym[0] !== '@') continue;

    const row = Array.isArray(ref) ? [sym, ...ref] : [sym, ref];
    row.push('!e');
    if (sym === root) row.push('!y');
    ans.push(row.join(' '));
  }
  ans.push('');
  return ans.join('\n');
}

function jsonDecompress (string) {
  const atoms = string.trim().split(/[ \t\n]+/);
  const table = new Map();

  // Use a state machine. Decided.

  const S = {
    await_id: 'await_id',
    await_def: 'await_def',
    literal_done: 'literal_done',
    in_array: 'in_array',
    await_key: 'await_key',
    await_value: 'await_value',
  };
  let state = S.await_id;
  let currentid = null;
  let currentvalue = null;
  let currentkey = null;

  function getValue(atom) {
    const head = atom[0], body = atom.slice(1);
    if (head === '@') {
      if (table.has (atom)) return table.get(atom);
      else throw new Error (`Value not found ${atom}`);
    } else if (head === '&') {
      // String literal
      return body;
    } else if (head === '$') {
      // Base64
      return Buffer.from(body, 'base64').toString();
    } else if (head === '#') {
      if (atom === '#t') return true;
      if (atom === '#f') return false;
      if (atom === '#n') return null;
      const v = parseFloat(body);
      if (v === v) return v;    // not NaN
      throw new Error (`Unrecognized literal ${atom}`);
    }
  }

  for (const atom of atoms) {
    if (state === S.await_id) {
      if (atom === '!y') {
        if (currentid === null) throw new Error ('No value entered yet');
        if (! table.has(currentid)) throw new Error ('Definition not finished yet');
        return table.get(currentid);
      }
      if (atom[0] !== '@') throw new Error (`Unknown identifier ${atom}`);
      if (table.has (atom)) throw new Error (`Redefining identifier ${atom}`);

      currentid = atom;
      currentvalue = null;
      currentkey = null;
      state = S.await_def;
    } else if (state === S.await_def) {
      // determine which type this is.
      if (atom[0] === '!') {
        if (atom === '!a') {
          state = S.in_array;
          currentvalue = [];
        } else if (atom === '!o') {
          state = S.await_key;
          currentvalue = {};
        } else throw new Error (`Unknown atom at definition ${atom}`);
      } else {
        currentvalue = getValue (atom);
        state = S.literal_done;
      }
    } else if (state === S.literal_done) {
      // simple literal; next must be !e
      if (atom === '!e') {
        // Save value
        table.set(currentid, currentvalue);
        state = S.await_id;
        currentvalue = null;
        currentkey = null;
      } else throw new Error (`Atom after literal not equal to !e: ${atom}`);
    } else if (state === S.in_array) {
      if (atom === '!e') {
        table.set(currentid, currentvalue);
        state = S.await_id;
        currentvalue = null;
        currentkey = null;
      } else {
        const value = getValue (atom);
        currentvalue.push(value);
      }
    } else if (state === S.await_key) {
      if (atom === '!e') {
        table.set(currentid, currentvalue);
        state = S.await_id;
        currentvalue = null;
        currentkey = null;
      } else {
        currentkey = getValue (atom);
        if (typeof currentkey !== 'string') throw new Error ('Non-string encountered in key');
        state = S.await_value;
      }
    } else if (state === S.await_value) {
      const v = getValue (atom);
      currentvalue[currentkey] = v;
      state = S.await_key;
    }
  } // end for

  throw new Error ('No value yielded (needs !y)');
}

/*
    Compression format.
    @identifier        // identifier uses base64 digits
    #1.2345 #1e15
    #t #f #n
    $Str1NgBase64
    &string-literal    // for printable-ascii literals
    !a                 // begin array def
    !o                 // begin object def
    !e                 // end of row
    !y                 // yields last value (can yield multiple)

    Each row is of format:
    @identifier #number/literal !e
    @identifier !a @val1 $val2 &val3 ... !e
    @identifier !o $key1 @val1 $key2 @val2 ... !e
    !y                 // yields value
*/

function testDecompress () {
  const data = `
    @a #3.1415926 !e
    @b !a @a @a @a !e
    @c !a @b @b @a #t !e
    @d !o &value @c &else @a !e !y
  `;

  const datadec = jsonDecompress(data);
  console.log(datadec);
  console.log(jsonDecompress(jsonCompress(datadec)));

  const data2 = [[3, 4, 5], [3, 4, 5], [3, {'asdfghjkl;': [3, 4, 5]}, [3, 4, 5], 'a'], 'asdfghjkl;'];
  console.log((jsonCompress(data2)));
  console.log(jsonDecompress(jsonCompress(data2)));
}

testDecompress();
