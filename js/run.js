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
    $('input').value = sampleTreeDeriv2;
    execute(e);
    executeLisp(e);
}

$('command').onchange = $('command').oninput = (e) => {
    console.log ($("command").value);
}

function execute (e) {
    const inValue = $('input').value;

    try {
        const ans = deepParse (inValue);
        // TODO: use $('display') for better options.
        // $('display').innerHTML = displayInRows (ans);
        const module = verifyModule (ans);
        //        $('visual').innerHTML = displayInRowsHuman(visualize(module));
        $('visual').innerHTML = '';
        $('visual').appendChild(dispModule (module));
        $('output').innerText = '';

        // Set actions
        for(const stmt of document.getElementsByTagName('stmt')) {
            stmt.onclick = (e) => {
                const content = stmt.getAttribute('data-sexp');
                let y = stmt;
                let io = null;
                const trace = [];
                while(y.id !== 'visual') {
                    if (y.hasAttribute('data-io')) {
                        io = io || y.getAttribute('data-io');
                    } else if (y.hasAttribute('data-label')) {
                        trace.push(y.getAttribute('data-label'));
                    }
                    y = y.parentNode;
                }
                trace.reverse();
                console.log(trace, io, content);
                const matchedRules = showMatchedRules(trace, io, content);
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
                        console.log('matched-rule', mrElement.getAttribute('data-rule'));
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
