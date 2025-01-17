function createDOMFromHTMLString(string) {
    const template = document.createElement('template');
    template.innerHTML = string.trim(); // Removes whitespace to avoid unintended text nodes
    return template.content.firstElementChild;
}

function getOffset(element) {
    const { top, left } = element.getBoundingClientRect();
    return { top: top + window.scrollY, left: left + window.scrollX };
}

export { createDOMFromHTMLString, getOffset }
