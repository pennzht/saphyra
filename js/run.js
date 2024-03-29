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
        // TODO - add tactics for active nodes.
        for(const stmt of document.getElementsByClassName('active')) {
            stmt.onclick = (e) => {
                let y = stmt;
                let content = null;
                let trace = '';
                while(y.id !== 'visual') {
                    if (y.hasAttribute('data-trace')) {
                        trace = y.getAttribute('data-trace') + ' ' + trace;
                    }
                    if (y.hasAttribute('data-sexp')) {
                        content = parse(y.getAttribute('data-sexp'))[0];
                    }
                    y = y.parentNode;
                }
                trace = parse(trace);
                console.log(trace, content);

                const matchedRules = getMatchedRules(module, trace, content);
                if (matchedRules.length === 0) return;

                $('display').innerHTML = '';
                $('display').appendChild(elem('div', [],
                    matchedRules.map((mr) => {
                        const [space, port, io, stmt, ruleName, ...args] = mr;
                        const subinput = ruleName === 'add-goal' ?
                            [elem('input', {type: 'text', id: 'add-goal'})] : [];
                        return elem('div',
                            {class: 'matched-rule'},
                            [
                              dispSexp(mr), ...subinput,
                              elem('button', {'data-rule': str(mr), class: 'apply-rule'}, [text('Apply')]),
                            ],
                        );
                    }),
                ));
                for (const mrElement of document.getElementsByClassName('apply-rule')) {
                    mrElement.onclick = (e) => {
                        // New node.
                        const additionalArgs = {};
                        if ($('add-goal')) {
                            additionalArgs.goalContent = $('add-goal').value;
                        }
                        currentCode =
                            applyMatchedRule(
                                code,
                                deepParse(mrElement.getAttribute('data-rule'))[0],
                                additionalArgs,
                            );
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
