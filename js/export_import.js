// TODO - use better (terser) exporting.

function exportState() {
    const tabs = [...state.tabs];
    const highlighted = [...state.highlighted];
    const json = JSON.stringify({
        tabs,
        currentTab: state.currentTab,
        highlighted,
    }, null, 2);

    // console.log('exported', json);

    // Add element and download.
    const a = elem('a', {
        href: 'data:text/plain;base64,' + window.btoa(json),
        download: 'saphyra_export.json',
    });
    a.click();
}

function importState(state) {
}

