Module['print'] = function (text) {
    if (text[0] === '{') {
        postMessage([1, text]);
    } else {
        console.log(text)
    }
};