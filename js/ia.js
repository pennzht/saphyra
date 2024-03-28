// Interactivity. Sync with ia.js
// Might become unused.

function tree(tag, attributes=null, children=null) {
  const trySerialize = (stuff) => {
    if(Array.isArray(stuff)) return stuff;
    if(stuff === null || stuff === undefined) return [];
    return [stuff];
  };

  const ans = document.createElement(tag);
  for (const [a, b] of trySerialize(attributes)) {
    ans.setAttribute(a, b);
  }
  for (const ch of trySerialize(children)) {
    ans.appendChild(ch);
  }
  return ans;
}

function preprocess(dataStrings) {
  const ans = [];
  ans.push(`
    function print(...x) {G.print(...x)};
  `)

  for (var i = 0; i < dataStrings.length; i++) {
    const ds = dataStrings[i];
    ans.push(ds + '\n\n');
    ans.push('G.outputIndex ++\n\n');
  }

  return ans.join('');
}

const update = (e) => {
  let dataStrings = [];
  for (const elem of document.getElementsByTagName('textarea')) {
    dataStrings.push(elem.value);
    elem.oninput = elem.onchange = update;
  }

  const G = {
    output: new Map(),
    outputIndex: 0,

    // Assigns functions.
    arity, operators, builtinFunctions,
    isAtom, isSym, isVar, isList, isAtomic,
    parse, translateLiteral, deepParse,
    simpleMatch, combineMatch,
    replaceAll,
    eq,
    str, programs,
    prepro,
    axioms, theories,
  };

  var successful = true;

  try {
    const fn = Function('G', 'Source', preprocess(dataStrings));

    /// G = Global.
    G.print = (...args) => {
      if (! G.output.has(G.outputIndex)) {
        G.output.set(G.outputIndex, []);
      }
      G.output.get(G.outputIndex).push(...args);
    };
    const result = fn(G, dataStrings.join('\n'));
  } catch (ex) {
    successful = false;
    for (const x of document.getElementsByClassName('output-cell')) {
      x.innerHTML = '';
    }

    $('error-0').innerHTML = `<div style="color:#F00024;">${ex.message}\n${ex.stack}</div>`
      .replaceAll('\n', '<br>');
    console.log(ex);
  } finally {
    // Display all results
    for (const x of document.getElementsByClassName('output-display')) {
      x.innerHTML = '';
    }

    // If successful, clear errors
    if (successful) for (const x of document.getElementsByClassName('output-error')) {
      x.innerHTML = '';
    }

    for(const [index, values] of G.output.entries()) {
      const outputTarget = document.getElementsByClassName('output-cell')[index];
      if (! outputTarget) throw new Error('output target not found');
      for (const item of values){
        if (item instanceof Node) {
          outputTarget.appendChild(item);
        } else if (typeof item === 'string') {
          const result = elem('div');
          if (item.startsWith('<')) {
            // HTML
            result.innerHTML = item;
          } else {
            // string
            result.innerText = item;
          }
          outputTarget.appendChild(result);
        } else {
          const json = elem('div', [], [text(JSON.stringify(item, null, 2))]);
          outputTarget.appendChild(json);
        }
      }
    }
  }
};

window.onload = (e) => {
  $('display-0').innerHTML = 'Displaying here.';
  // update(e); // TODO: let proper update.
}

$('input').onupdate = $('input').oninput =
$('input-2').onupdate = $('input-2').oninput = update;

$('add-row').onclick = (e) => {
  $('two-columns').appendChild(
    tree('tr', null, [
      /* left cell */
      tree('td', null, tree('div', null,
        tree('textarea',
             [['spellcheck', 'false'], ['rows', '8'], ['cols', '80']]))),
      /* right cell */
      tree('td', null, tree('details', [['open', '']],
        [
          tree('summary', null, text('Another display')),
          tree('div', [['class', 'output-cell']], text('Output')),
        ]
      )),
    ]),
  );
  update();
}

$('savedata-button').onclick = (e) => {
  localStorage.setItem('code', $('input').value);
}

$('loaddata-button').onclick = (e) => {
  $('input').value = localStorage.getItem('code');
  update(e);
}
