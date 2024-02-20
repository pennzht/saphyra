import * as data from  './data.js';
import * as lang from  './lang.js';
import * as breakdown from './breakdown.js';
import * as nodeviz from './nodeviz.js';

const $ = (x) => document.getElementById(x);

$('input').oninput = execute;

console.log ('input value is', $('input').value);

window.onload = (e) => {
    /* example input */
    $('input').value = data.incomplete1;
    execute(e);
}

$('command').onchange = $('command').oninput = (e) => {
    console.log ($("command").value);
}

function execute (e) {
    const inValue = $('input').value;

    try {
        const ans = lang.parse (inValue);
        console.log (ans);
        console.log ('string:', lang.str(ans));
        $('display').innerHTML = nodeviz.displayInRows (ans);
        const module = lang.isValidDeriv (ans);
        //        $('visual').innerHTML = nodeviz.displayInRowsHuman(lang.visualize(module));
        $('visual').innerHTML = nodeviz.displayModule (module);
        $('output').innerText = JSON.stringify (module, nodeviz.visualizer, 2);
    } catch (e) {
        if (e instanceof SyntaxError) {
            $('output').innerText = 'parsing error';
        } else {
            throw e;
        }
    }
}

