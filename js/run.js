// Main JS file. Browser only.

/*
  At startup, `window.onload` loads a given statement into `currentCode`;

  Structure of the operation loop:
  User selects an "active" node or statement, displaying multiple tactics to use
  User selects a tactic, setting `currentCode` to the resolved new node.
*/

const emptyNode = `
  [node #root [] [] [join] [
    [comment This is an empty workspace. Add a goal to start proving, or choose a different workspace in the panel on the right.]
  ]]
`

// tab[0] is the current step index.
function tabInit(node) {
  return [1, node];
}

function tabAddStep(tab, newNode) {
  const [step, ..._] = tab;
  while(tab.length - 1 > step) tab.pop();
  tab.push(newNode);
  tab[0] = step + 1;
}

function tabBack(tab) {
  const [step, ..._] = tab;
  tab[0] = Math.max (1, step - 1);
}

function tabForward(tab) {
  const [step, ..._] = tab;
  tab[0] = Math.min (tab.length - 1, step + 1);
}

function toggleSetElement(set, element) {
  if (set.has(element)) set.delete(element);
  else set.add(element);
}

// State definition
state = {
  // A map of tabs, map of TABNAME:STRING -> [CURRENTPAGENUMBER, PAGECONTENT]
  // PAGECONTENT is a tree.
  tabs: new Map([
    ['empty', tabInit(parseOne(emptyNode))]   // Initial page, empty.
  ]),
  currentTab: 'empty',

  // A state for highlighted NODES and PORTS. Example:
  // {[#root ^c in], [#root]}
  highlighted: new Set(),
}

function getCurrentRootNode() {
  const currentTab = state.tabs.get(state.currentTab);
  return currentTab[currentTab[0]];
}

function setCurrentRootNode(newRoot) {
  tabAddStep(state.tabs.get(state.currentTab), newRoot);
  state.highlighted = new Set();
}

function clearTransientState() {
  state.highlighted = new Set();
}

/// Shows current state on page.
function updateState() {
  // Prints state for debugging.
  console.log('Current state is', state);
  const allMatches = tacticsMultiMatchAll();

  $('display').innerHTML = '';

  // Append each rule, with a button for application.

  /*
    A rule can have one of the two formats:
    {rule, ins, outs, subnode, addnodes}
    {rule, targetNodes: list[nodes], userInput: list[[argname, argtype:stmt,str]]}
  */

  for (const m of allMatches) {
    let inputButton;
    
    // A text input for anything.
    let userInput = elem('span');

    // A representation of the sexp itself, allowing user to choose a subelement.
    let subelemInput = elem('span');

    // Feedback for subelem selection
    let subelemInputDisplay = elem('span', [], [text('Specify a subexpression.')]);

    if (m.targetNodes || m.rule === 'rename-space') {
      // Add user input.
      userInput = elem('input', {
        type: 'text',
      });
    }

    if (m.rule === 'replace-sub') {
      subelemInput = dispStmt(m.stmt);

      for (const subelem of subelemInput.getElementsByTagName('*')) {
        if (subelem.hasAttribute ('data-relpos')) {
          subelem.onclick = (e) => {
            const relpos = parseOne(e.target.dataset.relpos).map ((a) => parseInt(a));

            // Finds subelement

            if (relpos[relpos.length - 1] === 0) {
              // Operator.
              relpos.pop();
            }

            let sexp = m.stmt;
            for (const index of relpos) sexp = sexp[index];

            subelemInputDisplay.innerHTML = '';
            subelemInputDisplay.appendChild(dispSexp(sexp));
            subelemInputDisplay.dataset.relpos = str(relpos);
            subelemInputDisplay.dataset.sexp = str(sexp);
            console.log ('relpos:', relpos);
            e.stopPropagation();
          }
        }
      }
    }

    let argsInput = elem('div');
    const argsInputFields = [];
    for (const argName of (m.args || [])) {
      argsInput.appendChild(dispSexp(argName));
      const newInput = elem('input', {type: 'text'});
      argsInput.appendChild(newInput);
      argsInputFields.push(newInput);
    }

    $('display').appendChild(
      elem('div', null, [
        inputButton = elem('input', {
          type: 'button', value: 'Apply',
          'data-rule': str(m.rule),
          'data-subnode': str(m.subnode ?? null),
          'data-addnodes': str(m.addnodes ?? null),
          'data-target-nodes': str(m.targetNodes ?? null),
          'data-args': str(m.args ?? null),
        }),
        m.ins ? dispSexp([m.rule, ... m.ins, '=>', ... m.outs]) : dispSexp([m.rule]),
        userInput,
        subelemInput,
        subelemInputDisplay,
        argsInput,
        elem('hr'),
      ])
    )

    inputButton.onclick = () => {
      if (m.ins) {
        // Compute new root.

        // Replace all in m.addnodes
        const replaceMap = new Map();
        if (m.args) {
          for (let i = 0; i < m.args.length; i++) {
            const argName = m.args[i];
            if (argsInputFields[i].value === '') continue;
            const replaceWith = parseOne(argsInputFields[i].value);
            replaceMap.set(argName, replaceWith);
          }
        }

        const addnodesResolved = replaceAll(m.addnodes, replaceMap);

        const newRoot = addToSubnode(
          getCurrentRootNode(),
          m.subnode,
          addnodesResolved,
        )
        console.log(pprint(newRoot));
        setCurrentRootNode(newRoot);
        updateState();
      } else if (m.rule === 'replace-sub') {
        const replaceSubIndex = parseOne(subelemInputDisplay.dataset.relpos);
        const replaceSub = parseOne(subelemInputDisplay.dataset.sexp);
        const newSub = parseOne(userInput.value);
        console.log ('Replacing', replaceSub, 'at', replaceSubIndex, 'with', newSub, 'at port', m.targetPort);

        const root = getCurrentRootNode();
        const newRoot = applyReplaceSub (
          root,
          m.targetPort,
          m.stmt,
          replaceSubIndex,
          replaceSub,
          newSub,
        );
        setCurrentRootNode(newRoot);
        updateState();
      } else if (m.rule === 'import-stmt') {
        // Exact new root offered; replace with new root.
        setCurrentRootNode(m.newRoot);
        updateState();
      } else if (['add-node-input', 'add-node-output', 'rename-node'].includes(m.rule)) {
        const input = userInput.value;
        
        // Special case: add node input, &c.
        const newRoot = applyIOToSubnodes(
          getCurrentRootNode(),
          m.targetNodes,
          m.rule,
          m.rule === 'add-node-input' ? parse(input) : [],
          m.rule === 'add-node-output' ? parse(input) : [],
          m.rule === 'rename-node' ? '#' + userInput.value : null,
        )
        console.log(pprint(newRoot));
        setCurrentRootNode(newRoot);
        updateState();
      } else if (m.rule === 'rename-space') {
        const currentTabName = state.currentTab;
        const newTabName = userInput.value;
        if (state.tabs.has (newTabName) || newTabName === currentTabName || newTabName.length < 1) {
          console.log('no change');
        } else {
          state.currentTab = newTabName;
          state.tabs.set(newTabName, state.tabs.get(currentTabName));
          state.tabs.delete(currentTabName);
          updateState();
        }
      } else if (m.rule === 'add-comment') {
        const root = getCurrentRootNode();
        const newRoot = addToSubnode(
          root,
          m.targetNodes[0],
          [['comment', userInput.value]],
        );
        setCurrentRootNode(newRoot);
        updateState();
        console.log('add-comment run', pprint(newRoot));
      }
    }
  }

  // Set local storage.
  localStorage.setItem('state',
                       JSON.stringify({
                         tabs: [...state.tabs],
                         currentTab: state.currentTab,
                         highlighted: [...state.highlighted],
                       })
                      );

  // Update div.
  $('tab-display').innerHTML = '';
  for (const [tabName, _] of state.tabs.entries()) {
    const classes = tabName === state.currentTab ? 'tab selected' : 'tab';
    const newTab = elem('div', {class: classes}, [
      text(tabName),
    ]);
    newTab.onclick = (event) => {
      state.currentTab = tabName;
      console.log('switching to tab', tabName);
      clearTransientState();
      updateState();
    }

    $('tab-display').appendChild(newTab);
  }

  // Add new tab.
  const addNewTabButton = elem('div', {class: 'tab', style: 'background-color: #eaeaea;'}, [text('+ Workspace')]);;
  addNewTabButton.onclick = () => {
    const tabName = gensyms([... state.tabs.keys()], 1, 'space_')[0];
    state.tabs.set(tabName, tabInit(parseOne(emptyNode)));
    state.currentTab = tabName;
    clearTransientState();
    updateState();
  };
  $('tab-display').appendChild(addNewTabButton);

  const currentTabObj = state.tabs.get(state.currentTab);
  const currentCode = currentTabObj[currentTabObj[0]];
  execute(currentCode);

  $('step-history').innerHTML = '';

  const undoButton = elem('div', {class: 'step-control-block', style: 'color: black;'}, [text('←')]);
  undoButton.onclick = () => {
    tabBack(currentTabObj);
    clearTransientState();
    updateState();
  }
  $('step-history').appendChild(undoButton);

  const redoButton = elem('div', {class: 'step-control-block', style: 'color: black;'}, [text('→')]);
  redoButton.onclick = () => {
    tabForward(currentTabObj);
    clearTransientState();
    updateState();
  }
  $('step-history').appendChild(redoButton);

  for (let i = 1; i < currentTabObj.length; i++) {
    const isCurrent = (i === currentTabObj[0]);
    const stepControlBlock = elem('div', {class: 'step-control-block' + (isCurrent ? ' current-step' : '')}, [text('.')]);
    stepControlBlock.onclick = () => {currentTabObj[0] = i + 0; clearTransientState(); updateState();};
    $('step-history').appendChild(stepControlBlock);
  }
}

window.onload = (e) => {
  state.tabs.set('incomplete', tabInit(parseOne(tryProve1)));
  state.tabs.set('simple', tabInit(parseOne(tryProve2)));
  state.tabs.set('plus_zero', tabInit(parseOne(sampleTreeDeriv7Complete)));
  state.tabs.set('tautology', tabInit(tryProveTautology(parseOne(`
    (-> _M (-> _N (and _M (or _Q _N))))
  `))));
  state.tabs.set('tautology_2', tabInit(parseOne(tauto10)));
  
  state.currentTab = 'empty';
  
  // Recover state from state.
  if(window.localStorage && localStorage.getItem('state')) {
    // Recover state
    const recState = JSON.parse(localStorage.getItem('state'));
    state.tabs = new Map(recState.tabs);
    state.currentTab = recState.currentTab;
    state.highlighted = new Set(recState.highlighted);
  }
  
  updateState();
  
  const sampleCode = parseOne(sampleTreeDeriv7);
  
  const pprinted = pprint(sampleCode);
  console.log(pprinted);
  console.log(eq( parseOne(pprinted), sampleCode ));
  
  // Add Exporting/importing.
  $('export-editor-button').onclick = (e) => {
    exportState();
  }
  $('import-editor-button').onclick = (e) => {
    importState(/*state*/);
  }
}

$('command').onchange = $('command').oninput = (e) => {
  console.log ($("command").value);
}

function execute(code) {
  try {
    const module = verifyNode (code);
    $('visual').innerHTML = '';
    $('visual').appendChild(dispNode (module));
    $('output').innerText = '';

    // TODO - depending on current tab root node + `state.highlighted`,
    //     find corresponding rules and display them in $('display').

    // Set actions
    // Only consider active ports.
    for(const stmt of document.getElementsByClassName('active')) {
      stmt.onclick = (e) => {
        toggleSetElement(state.highlighted, stmt.dataset.fulltrace + ' ' + (stmt.dataset.sexp || '--fullnode--'));
        // console.log(state.highlighted);
        updateState();
      };
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      $('output').innerText = 'parsing error';
    } else {
      throw e;
    }
  }
}

console.log('New version as of Sep.');

