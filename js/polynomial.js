Q = (...args) => document.querySelectorAll(...args);

$('text').oninput = (e) => {
    $('display').innerHTML = '';
    $('display').appendChild (infixFormat (infixParse (
        e.target.value
    )));
}
