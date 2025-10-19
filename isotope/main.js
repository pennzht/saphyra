// Sync with visual.js (with dispCons removed)

state = {
  validState: true,

  // Global positioning
  center: [0, 0],
  scale: 1,

  // Cards
  nextCardNumber: 3,
  cards: new Map([
    ['card-1', {
      location: [0, 0],
      size: [300, 150],
      content: 'This is the initial card',
    }],
  ]),

  // Dragging
  dragId: null,        // Internal ID for item being dragged
  dragAnchor: null,    // Mouse coords when drag starts
  dragMode: null,      // background | move | resize
  dragHome: null,      // Object coords when drag starts

  // Whether current state should snap
  dragSnap: true,

  // Workers
  nextWorkerNumber: 1,
  workers: new Map(),
}

function stateToJson (state) {
  const copiedState = {};
  for (const key of Object.keys(state)) copiedState[key] = state[key];
  copiedState.cards = [... state.cards];
  copiedState.workers = {};
  return copiedState;
}

function jsonToState (state) {
  state.cards = new Map (state.cards);
  state.workers = new Map ();
  state.nextWorkerNumber ??= 1;
  return state;
}

const workerData = `\
onmessage = (e) => {
  const func = Function(e.data)
  const ans = func()
  postMessage(ans)
}
`

function stringUrl(string) {
  return 'data:text/javascript;base64,' + btoa(string)  // for now
}

function updateUi(options) {
  const opt = options || {};

  // Print SVG with all UI.

  // Compute viewBox.
  const width = window.innerWidth / state.scale, height = window.innerHeight / state.scale;
  $('mainsvg').setAttribute('viewBox', printArr(
    /*x*/ state.center[0] - width / 2,
    /*y*/ state.center[1] - height / 2,
    width,
    height,
  ))
  
  $('background').setAttr(
    {x: state.center[0] - width / 2,
     y: state.center[1] - height / 2,
     width,
     height}
  );

  // Remove elements that do not exist
  for (const child of [...$('mainsvg').children]) {
    if (child.dataset.cardId && child.id !== 'background' && ! state.cards.has(child.dataset.cardId)) {
      $('mainsvg').removeChild(child);
    }
  }

  // Update all elements; make if they don't exist.
  for (const [cardId, card] of state.cards.entries()) {
    let element = $(cardId);
    if (!element) {
      // Initialize element
      element = Es('foreignObject', {
        class: 'card',
        'data-card-id': cardId,
        id: cardId,
      }, [
        E('div', {xmlns: 'http://www.w3.org/1999/xhtml'}, [
          E('div', {class: 'inner'}, [
            E('div', {class: 'holder', id: cardId+'-holder', onmousedown: 'registerDrag(event)'}, [
              E('span', {class: 'holder-button', 'data-card-id': cardId, onmousedown: 'playCard(event)'}, ['\u25ba']),
              E('span', {class: 'holder-button', 'data-card-id': cardId, onmousedown: 'playCardInWorker(event)'}, ['(W)']),
              E('span', {class: 'holder-button', 'data-card-id': cardId, onmousedown: 'deleteCard(event)'}, ['\u2326']),
              T(cardId),
            ]),
            card.isHtml ?
              sexpToElement(deepParse(card.content)[1]) :
              E('textarea', {class: 'card-content', id: cardId+'-content', spellcheck: false}, []),
          ])
        ])
      ])
      $('mainsvg').appendChild(element)

      // Add resizer element
      let resizer = Es('circle', {
        cx: 0, cy: 0, r: 9, fill: '#face01', 'fill-opacity': '50%',
        id: cardId+'-resizer',
        'data-card-id': cardId,
        onmousedown: 'registerDrag(event)',
        cursor: 'se-resize',
      });
      $('mainsvg').appendChild(resizer);
    }

    // Set location and content
    $(cardId).setAttr(
      {x: card.location[0], y: card.location[1],
       width: card.size[0], height: card.size[1]},
    );
    // Set location of resizer
    let resizer = $(cardId+'-resizer');
    resizer.setAttr ({
      cx: state.cards.get(cardId).size[0] + state.cards.get(cardId).location[0],
      cy: state.cards.get(cardId).size[1] + state.cards.get(cardId).location[1],
    });

    const cardHolder = $(cardId+'-holder');
    const cardContent = $(cardId+'-content');
    if (!cardContent) continue;
    cardContent.value = card.content;
    cardContent.oninput = cardContent.onchange = (e) => {
      state.cards.get(cardId).content = e.target.value;
    };
    /*
    // NOTE: we are no longer using the default resizing for card content.
    cardContent.onmousemove = (e) => {
      state.cards.get(cardId).size = [e.target.offsetWidth, e.target.offsetHeight + cardHolder.offsetHeight];
      updateUi();
    }; */
    // Set size if fromLoad
    if (opt.fromLoad) {
      cardContent.style.width = state.cards.get(cardId).size[0] + 'px';
      cardContent.style.height = state.cards.get(cardId).size[1] - (cardHolder.offsetHeight || 30) + 'px';

    }
  }

  // Update tasklist
  $('tb-tasklist').clear();
  for (const [key, worker] of state.workers.entries()) {
    const obj = E(
      'div',
      {style: 'display:inline-block;'},
      [T ('× ' + key)],
    );
    obj.onclick = (e) => {
      // terminates worker
      worker.terminate();
      state.workers.delete(key);
      updateUi();
    };
    $('tb-tasklist').add (obj);
  }
}

function registerDrag(e) {
  let id = e.target.id;
  if (id === 'background') {
    // Pan
    state.dragId = id
    state.dragMode = 'background'
    state.dragHome = [...state.center]
  } else if (id.endsWith ('-holder')) {
    // Relocate card
    state.dragId = removeSuffix (id, '-holder')
    state.dragMode = 'move'
    state.dragHome = [...state.cards.get(state.dragId).location]
  } else if (id.endsWith ('-resizer')) {
    // Resize card
    state.dragId = removeSuffix (id, '-resizer')
    state.dragMode = 'resize'
    state.dragHome = [...state.cards.get(state.dragId).size]
  }
  state.dragAnchor = [e.clientX, e.clientY]
}

function playCard(e) {
  e.stopPropagation();
  const cardId = e.target.dataset.cardId;

  const data = state.cards.get(cardId).content;

  if (data.startsWith('//') || data.startsWith('/*')) {
    const code = Function (data);
    code();
  } else {
    console.log('[mock] playing card', cardId, 'content', state.cards.get(cardId).content);
  }
}

function getLowerLeft (cardId) {
  const card = state.cards.get (cardId);
  const [x, y] = card.location, [w, h] = card.size;
  return [x, y + h + 10];  // Adding gap
}

function playCardInWorker(e) {
  e.stopPropagation();
  const cardId = e.target.dataset.cardId;

  const data = state.cards.get(cardId).content;

  if (data.startsWith('//') || data.startsWith('/*')) {
    // For JS actions, use a dedicated worker.

    if (state.workers.has (cardId)) {
      state.workers.get(cardId).terminate();
      state.workers.delete(cardId);
    }

    const worker = new Worker(stringUrl(workerData));

    console.log('started worker at', stringUrl(workerData));
    state.workers.set(cardId, worker);
    worker.onmessage = (e) => {
      addCard ({
        content: JSON.stringify (e.data),
        location: getLowerLeft (cardId),
      });
      state.workers.delete(cardId);
      updateUi();
    };
    worker.postMessage (data);
    updateUi();
  } else {
    // Lisp code
    // complete: add lisp interpreter into worker.
    // TODO next step: add HTML special case.
    console.log('started lisp worker');
    const worker = new Worker(lispStringUrl);
    const workerNumber = state.nextWorkerNumber;
    state.nextWorkerNumber ++;
    state.workers.set(workerNumber, worker);
    worker.onmessage = (e) => {
      const parsed = deepParse(e.data);
      const isHtml = isList(parsed) && parsed[0] === 'html';

      addCard ({
        content: e.data,
        location: getLowerLeft (cardId),
        isHtml,
      });
      state.workers.delete(workerNumber);
    };
    worker.postMessage (data);
    updateUi();
  }
}

function deleteCard(e) {
  e.stopPropagation();
  const cardId = e.target.dataset.cardId;
  state.cards.delete(cardId);
  updateUi();
}

document.onmouseup = (e) => {
  state.dragId = null
  state.dragMode = null
  state.dragHome = null
  state.dragAnchor = null
}

document.onmousemove = (e) => {
  const dx = state.dragAnchor ? (e.clientX - state.dragAnchor[0]) / state.scale : 0;
  const dy = state.dragAnchor ? (e.clientY - state.dragAnchor[1]) / state.scale : 0;
  if (state.dragMode === 'background') {
    // Update viewBox instead
    const x = - dx + state.dragHome[0], y = - dy + state.dragHome[1]
    state.center = [x, y]
    updateUi();
  } else if (state.dragMode === 'move') {
    let x = dx + state.dragHome[0], y = dy + state.dragHome[1]
    if (state.dragSnap) {
      x = snapTo (x, 100, 5);
      y = snapTo (y, 100, 5);
    }
    state.cards.get(state.dragId).location = [x, y]
    updateUi();
  } else if (state.dragMode === 'resize') {
    let x = dx + state.dragHome[0], y = dy + state.dragHome[1]
    if (state.dragSnap) {
      x = snapTo (x, 100, -10);
      y = snapTo (y, 100, -10);
    }
    state.cards.get(state.dragId).size = [
      Math.max(x, 90),
      Math.max(y, 90),
    ];
    updateUi({fromLoad: true});
  }
}

function dataToContent (dat) {
    if (typeof dat === 'string') {
        return T(dat);
    } else if (Array.isArray (dat)) {
        const [tag, attrs, ...children] = dat;
        const childrenElems = children.map ((c) => dataToContent (c));
        return E (tag, attrs, childrenElems);
    } else {
        return T('Unknown type ' + typeof(dat));
    }
}

$('tb-add').onclick = (e) => {
  addCard();
}

function addCard (options) {
  const opt = options || {};

  const cardNumber = state.nextCardNumber
  const cardId = 'card-' + cardNumber
  state.nextCardNumber ++

  const location = opt.location || [state.center[0] + (Math.random() - 1/2) * 20, state.center[1] + (Math.random() - 1/2) * 20];

  state.cards.set(cardId, {
    location,
    size: [200 - 10, 100 - 10],  // Adding gap
    content: opt.content ?? (cardId + ' created.'),
    isHtml: opt.isHtml ?? false,
  })

  updateUi();

  return cardId;
}

$('tb-save').onclick = (e) => {
  const jsonstring = JSON.stringify(stateToJson(state), null, 2);
  localStorage.setItem('state', jsonstring);
}

saveserver = $('tb-saveserver').onclick = (e) => {
  const jsonstring = JSON.stringify(stateToJson(state), null, 2);
  fetch ('/isotope-upload/', {
    method: 'POST',
    body: jsonstring,
  }).then (
    // onFulfilled
    (v) => {console.log ('Upload succeeded', v)},
    // onRejected
    (e) => {console.log ('Upload failed', e)},
  );
}

$('tb-saveclip').onclick = (e) => {
  const save = JSON.stringify(stateToJson(state));

  if (navigator.clipboard) {
    navigator.clipboard.writeText(save).then(
      (_) => {alert(save.length + ' characters written.')},
      (e) => {alert(`Writing to clipboard failed because of ${e}`)},
    );
  } else {
    alert ('Your browser does not support clipboards.');
  }
}

$('tb-load').onclick = (e) => {
  try {
    const state = JSON.parse(localStorage.getItem('state') || '{}');

    if (! state.validState) {
      // Do not load
      alert ('No valid state; did not load');
    } else {
      window.state = jsonToState(state);
      updateUi({fromLoad: true});
    }
  } catch (e) {
    alert ('Broken state string in localStorage');
  }
}

loadserver = $('tb-loadserver').onclick = (e) => {
  fetch ('/isotope/state.json').then (
    // onFulfilled
    async (r) => {
      console.log ('Load succeeded', r);
      const state = await r.json();
      console.log (state);
      if (! state.validState) {
        // Do not load
        alert ('No valid state; did not load');
      } else {
        window.state = jsonToState(state);
        updateUi({fromLoad: true});
      }
    },
    // onRejected
    (e) => {console.log ('Load failed', e)},
  );
}

$('tb-align').onclick = (e) => {
  for (const [cardId, card] of state.cards.entries()) {
    let [x0, y0] = card.location, [dx, dy] = card.size;
    let x1 = x0 + dx, y1 = y0 + dy;
    x0 = snapTo (x0, 100, 5);
    y0 = snapTo (y0, 100, 5);
    x1 = snapTo (x1, 100, -5);
    y1 = snapTo (y1, 100, -5);
    x1 = Math.max (x0 + 100 - 5 * 2, x1);
    y1 = Math.max (y0 + 100 - 5 * 2, y1);
    card.location = [x0, y0];
    card.size = [x1 - x0, y1 - y0];
  }
  updateUi({fromLoad: true}); // Requires cards to follow size
}

window.onresize = (e) => {
  updateUi();
}

document.body.onwheel = (e) => {
  state.scale *= 2 ** ((e.deltaY < 0 ? -1 : +1) / 4)
  updateUi()
}

// Main

window.onload = async (e) => {
  await loadserver();
  updateUi({fromLoad: true});
}
