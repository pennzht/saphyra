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
  currentFocus: ['#root'],  // Current focus, in current tab.
  // After every change, only verify `currentFocus`.
  // To check entire tree, zoom out to `#root`.

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
  state.currentFocus = ['#root']; // For now, just use root.
}

/// Shows current state on page.
/// This is the MAIN_LOOP of the program.
function updateState() {
  // Prints state for debugging.
  console.log('Current state is', state);

  const matchingRules = runTacticRules ();

  $('display').innerHTML = '';

  for (const mr of matchingRules) {
    if (mr.fail) continue;
    const ruleElement = elem('div');

    ruleElement.appendChild (elem ('div', {}, [text('Rule: ' + mr.rule)]));

    if (mr.rule === 'axiom') {
      ruleElement.appendChild (elem('div', {}, [text('Axiom: ' + mr.axiom)]));
      const newDiv = elem('div');
      for (const i of mr.ins) newDiv.appendChild(infixFormat(i, /*wrap*/true));
      newDiv.appendChild(text('→'));
      for (const o of mr.outs) newDiv.appendChild(infixFormat(o, /*wrap*/true));
      ruleElement.appendChild(newDiv);
    }

    for (const arg of Object.keys(mr.requestArgs || {})) {
      const selection = elem('div');
      const argType = mr.requestArgs[arg];
      if (argType[0] === 'oneof') {
        // Radio group
        const options = argType.slice(1);
        for (const opt of options) {
          const radioButton = elem('input', {type: 'radio', id: 'mr-' + mr.rule + ':' + arg + ':' + opt, name: 'mr-' + mr.rule + ':' + arg, 'data-group': arg, value: opt, 'data-type': 'oneof'});
          const radioLabel = elem('label', {'for': radioButton.getAttribute('id')}, [text(opt)]);
          selection.appendChild(radioButton);
          selection.appendChild(radioLabel);
        }
      } else if (argType === 'stmt') {
        // Input box
        const inputField = elem('input', {type: 'text', id: 'mr-' + mr.rule + ':' + arg, 'data-group': arg, 'data-type': argType});
        const inputLabel = elem('label', {'for': inputField.getAttribute('id')}, [text(arg + ' ')]);
        const dispBack = elem('div', {style: 'display:inline-block;'});
        selection.appendChild(inputLabel);
        selection.appendChild(inputField);
        selection.appendChild(dispBack);

        inputField.oninput = (e) => {dispBack.innerHTML = ''; dispBack.appendChild(infixFormat(infixParse(inputField.value)));}
      } else if (argType === 'sexp') {
        // Input box
        const inputField = elem('input', {type: 'text', id: 'mr-' + mr.rule + ':' + arg, 'data-group': arg, 'data-type': argType});
        const inputLabel = elem('label', {'for': inputField.getAttribute('id')}, [text(arg + ' ')]);
        selection.appendChild(inputLabel);
        selection.appendChild(inputField);
      } else if (argType === 'bool') {
        const inputField = elem('input', {type: 'checkbox', id: 'mr-' + mr.rule + ':' + arg, 'data-group': arg, 'data-type': argType});
        const inputLabel = elem('label', {'for': inputField.getAttribute('id')}, [text(arg + ' ')]);
        selection.appendChild(inputLabel);
        selection.appendChild(inputField);
      } else {
        // Input box
        const inputField = elem('input', {type: 'text', id: 'mr-' + mr.rule + ':' + arg, 'data-group': arg, 'data-type': argType});
        const inputLabel = elem('label', {'for': inputField.getAttribute('id')}, [text(arg + ' ')]);
        selection.appendChild(inputLabel);
        selection.appendChild(inputField);
      }
      ruleElement.appendChild(selection);
    }

    const submitButton = elem('input', {type: 'button', value: 'Apply'});
    submitButton.onclick = () => {
      const inputs = ruleElement.querySelectorAll('input');
      const selectedArgs = mr.rule === 'axiom' ? mr : {rule: mr.rule};

      if (mr.rule === 'axiom') {
        // Try apply. Otherwise, replace and apply.
        if (mr.success) {
          setCurrentRootNode(mr.newRoot);
          state.highlighted = new Set(mr.newHls.map ((hl) => str(hl.path) + ' ' + str(hl.sexp)));
          updateState();
        } else {
          const axiomReplacements = {};
          for (const input of inputs) axiomReplacements[input.dataset.group] = infixParse(input.value);
          tacticAxiomCommit (mr, axiomReplacements);
          setCurrentRootNode(mr.newRoot);
          state.highlighted = new Set(mr.newHls.map ((hl) => str(hl.path) + ' ' + str(hl.sexp)));
          updateState();
        }
        return;
      }

      for (const input of inputs) {
        if (input.getAttribute('type') === 'button') continue;

        if (input.dataset.type == 'oneof') {
          if (input.checked) selectedArgs[input.dataset.group] = input.getAttribute('value');
        } else if (input.dataset.type == 'stmt') {
          if (input.value.trim()) {
            // nonempty
            selectedArgs[input.dataset.group] = infixParse(input.value);
          } // otherwise, don't set value
        } else if (input.dataset.type == 'sexp') {
          if (input.value.trim()) {
            // nonempty
            selectedArgs[input.dataset.group] = parse(input.value);
          } // otherwise, don't set value
        } else if (input.dataset.type == 'bool') {
          selectedArgs[input.dataset.group] = input.checked;
        } else {
          selectedArgs[input.dataset.group] = input.value;
        }
      }
      console.log(JSON.stringify(selectedArgs, null, 2));

      const applicationResult = tacticApplyRule (getCurrentRootNode(), [...state.highlighted].map(parse).map((pair) => {
        return ({
          path: pair[0],
          sexp: pair[1],
        });
      }), selectedArgs);

      if (applicationResult.success) {
        setCurrentRootNode(applicationResult.newRoot);
        console.log(applicationResult.newHls);
        state.highlighted = new Set(applicationResult.newHls.map ((hl) => str(hl.path) + ' ' + str(hl.sexp)));
        updateState();
      }
    };

    ruleElement.appendChild(submitButton);
    ruleElement.appendChild(elem('hr'));

    $('display').appendChild(ruleElement);
  }


    // Set local storage.
    /*
  localStorage.setItem('state',
                       JSON.stringify({
                         tabs: [...state.tabs],
                         currentTab: state.currentTab,
                         highlighted: [...state.highlighted],
                       })
                      );
    */

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

  // Prints stats about current root.
  const rootTheoremCount = getCurrentRootNode()[Subs].filter ((n) => n[0] == 'node').length;

  $('theorem-count').innerText = `${rootTheoremCount} top-level theorems.`;

  const currentTabObj = state.tabs.get(state.currentTab);
  const currentRoot = currentTabObj[currentTabObj[0]];
  const currentFocus = findSubnodeByPath(currentRoot, state.currentFocus);
  execute(currentFocus);  // Only current focus is being executed.

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

  return;

  ////////////////////////////////////////////////////////////////
  // Below is legacy.                                           //
  ////////////////////////////////////////////////////////////////

  {

  // Find all matches for tactics.
  const allMatches = tacticsMultiMatchAll();
  // Sort by priority.
  allMatches.sort ((a, b) => rulePriority(a) - rulePriority(b));

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

    // A feedback for user input.
    let userInputFeedback = elem('span');

    // A representation of the sexp itself, allowing user to choose a subelement.
    let subelemInput = elem('span');

    // Feedback for subelem selection
    let subelemInputDisplay = m.rule === 'replace-sub' ? elem('span', [], [text('Specify a subexpression.')]) : elem('span');

    if (m.targetNodes || m.rule === 'rename-space' || m.rule === 'detect-accessible-stmts') {
      // Add user input.
      userInput = elem('input', {
        type: 'text',
      });
    }

    if (m.rule === 'replace-sub') {
      subelemInput = infixFormat(m.stmt, /*wrap*/true);

      userInput.oninput = (e) => {
        const data = infixParse(userInput.value);
        userInputFeedback.innerHTML = '';
        userInputFeedback.appendChild(infixFormat(data, true));
      }

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
            subelemInputDisplay.appendChild(infixFormat(sexp, true));
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
        m.ins ? elem('div', {}, [text(m.rule), ... m.ins.map((a) => infixFormat(a, true)), text('→'), ... m.outs.map((a) => infixFormat(a, true))]) : text(m.rule),
        userInput,
        subelemInput,
        subelemInputDisplay,
        userInputFeedback,
        argsInput,
        elem('hr'),
      ])
    )

    inputButton.onclick = () => {
      if (m.rule === 'detect-accessible-stmts') {
        console.log(m, userInput.value);
      } else if (m.ins) {
        // Compute new root.

        // Replace all in m.addnodes
        const replaceMap = new Map();
        if (m.args) {
          for (let i = 0; i < m.args.length; i++) {
            const argName = m.args[i];
            if (argsInputFields[i].value === '') continue;
            const replaceWith = infixParse(argsInputFields[i].value);
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
        const newSub = infixParse(userInput.value);
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
          m.rule === 'add-node-input' ? [infixParse(input)] : [],
          m.rule === 'add-node-output' ? [infixParse(input)] : [],
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
    /*
  if(window.localStorage && localStorage.getItem('state')) {
    // Recover state
    const recState = JSON.parse(localStorage.getItem('state'));
    state.tabs = new Map(recState.tabs);
    state.currentTab = recState.currentTab;
    state.highlighted = new Set(recState.highlighted);
  }
    */

  // Recover state from repo_20250401.

  setEditorState(repo_20250401);

  // updateState();

  const sampleCode = parseOne(sampleTreeDeriv7);

  const pprinted = pprint(sampleCode);
  console.log(pprinted);
  console.log(eq(parseOne(pprinted), sampleCode ));

  // Add Exporting/importing.
  $('export-editor-button').onclick = (e) => {
    exportState('file');
  }
  $('import-editor-button').onclick = (e) => {
    importState('file');
  }
  $('export-server-button').onclick = (e) => {
    exportState('server');
  }
  $('import-server-button').onclick = (e) => {
    importState('server');
  }
}

$('command').onchange = $('command').oninput = (e) => {
  console.log ($("command").value);
}

function execute(code) {
  try {
    const module = verifyNodeWithDefs (code);

    // Filter out bad ones
    /*
    r = getCurrentRootNode();
    n = verifyNode(getCurrentRootNode());
    subs = n[Subs];
    bad = subs.filter((a) => a[0] === 'node' && a[6] !== '#good');
    badLabels = bad.map((a) => a[Label]);
    badStmts = bad.map((a) => a[Outs][0]);

    isIn = (a, b) => b.some ((x) => eq(a, x));

    goodSubs = r[Subs].filter((a) => ! (
      (a[0] === 'node' && isIn (a[Label], badLabels) ) ||
        (a[0] === 'link' && isIn (a[1], badLabels))
    ));
    goodStmts = r[Outs].filter((a) => ! isIn(a, badStmts));

    console.log('good subs', goodSubs);
    console.log('good stmts', goodStmts);

    r[Subs] = goodSubs;
    r[Outs] = goodStmts;
    */

    $('node-display').innerHTML = '';
    // Provide current prefix to dispNode, so that `data-fulltrace` is accurate
    const currentPrefix = state.currentFocus.slice(0, state.currentFocus.length - 1);
    $('node-display').appendChild(dispNode (module, currentPrefix));
    $('output').innerText = '';

    showBreadcrumbs();

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

function showBreadcrumbs() {
  const bc = $('breadcrumbs');
  bc.innerHTML = '';
  const focus = state.currentFocus;
  for (let index = 0; index < focus.length; index++) {
    const prefix = focus.slice(0, index + 1);
    const piece = elem('div', {style: 'display:inline-block;cursor:zoom-out;'}, [focus[index]]);
    piece.onclick = () => {
      state.currentFocus = prefix;
      updateState();
    }
    bc.appendChild(piece);
    if(index < focus.length - 1) bc.appendChild(text(' / '));
  }
}

console.log('New version as of Sep.');
