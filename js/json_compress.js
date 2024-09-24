/**
    A custom compressor for JSON.

    TODO - implement.
**/

function jsonCompress (obj) {
  // return string
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
    @d !o &key @c &else @a !e !y
  `;

  console.log(jsonDecompress(data));
}

testDecompress();
