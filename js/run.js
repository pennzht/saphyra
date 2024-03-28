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
        for(const sexp of document.getElementsByClassName('shade')) {
            sexp.onclick = (e) => {
                console.log (e.target.getAttribute('data-pos'),
                             parse(e.target.innerText));
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
