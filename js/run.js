$ = (x) => document.getElementById(x);

$('input').oninput = execute;

window.onload = (e) => {
    $('input').value = '2 ** 16';
    execute(e);
}

function execute (e) {
    inValue = $('input').value;
    fn = new Function (`return ${inValue}`);
    $('output').innerText = fn();
}
