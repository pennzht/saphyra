// Main JS file. Browser only.

// import * as data from  './data.js';
// import * as lang from  './lang.js';
// import * as breakdown from './breakdown.js';
// import * as nodeviz from './nodeviz.js';

// const $ = (x) => document.getElementById(x);

$('input').oninput = execute;
$('lisp-input').oninput = executeLisp;

window.onload = (e) => {
    /* example input */
    // $('input').value = incomplete1;
    $('input').value = sampleTreeDeriv3;
    executeInput(e);
    executeLisp(e);
}

$('command').onchange = $('command').oninput = (e) => {
    console.log ($("command").value);
}

// Global state: current node
currentCode = null;

function executeInput (e) {
    const inValue = $('input').value;
    try {
        currentCode = deepParse(inValue);
        execute(currentCode);
    } catch (ex) {
        console.log('Something wrong.', ex.stack);
    }
}

function executeLisp(e) {
    const inValue = $('lisp-input').value;

    try {
        $('display-0').innerHTML = '';
        $('error-0').innerHTML = '';
        const code = prepro (deepParse (inValue));
      const evaluated = evaluate(code, {limit: 100000});
        $('display-0').appendChild(dispStack(evaluated));
    } catch (err) {
        $('error-0').appendChild(
            elem('div', {style: 'color:#f00024;'}, [
                text(err.message),
                elem('br'),
                text(err.stack),
            ])
        );
    }
}

function execute(code) {
    try {
        const module = verifyModule (code);
        $('visual').innerHTML = '';
        $('visual').appendChild(dispModule (module));
        $('output').innerText = '';

        // Set actions
        // Only consider active ports.
        // TODO - change to "active" to accommodate active nodes.
        for(const stmt of document.getElementsByClassName('port')) {
            stmt.onclick = (e) => {
                let y = stmt;
                let io = null;
                let content = null;
                const trace = [];
                while(y.id !== 'visual') {
                    if (y.hasAttribute('data-label')) {
                        trace.push(y.getAttribute('data-label'));
                    } else if (y.hasAttribute('data-ref')) {
                        const [innerNode, innerIo, innerContent] = deepParse(y.getAttribute('data-ref'))[0];
                        trace.push(innerNode); io = innerIo;
                        content = innerContent;
                        console.log(trace, io);
                    }
                    y = y.parentNode;
                }
                trace.reverse();
                console.log(trace, io, content);
                const matchedRules = showMatchedRules(module, trace, io, content);
                $('display').innerHTML = '';
                $('display').appendChild(elem('div', [],
                    matchedRules.map((mr) => elem('div',
                        {class: 'matched-rule',
                         'data-rule': str(mr)},
                        [dispSexp(mr)],
                    )),
                ));
                for (const mrElement of document.getElementsByClassName('matched-rule')) {
                    mrElement.onclick = (e) => {
                        // New node.
                        currentCode =
                            applyMatchedRule(code, deepParse(mrElement.getAttribute('data-rule'))[0]);
                        execute(currentCode);
                    }
                }
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
