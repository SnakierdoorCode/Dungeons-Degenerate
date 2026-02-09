const originalFetch = window.fetch;

function mergeFiles(fileParts) {
    return new Promise((resolve, reject) => {
        let buffers = [];

        function fetchPart(index) {
            if (index >= fileParts.length) {
                let mergedBlob = new Blob(buffers);
                let mergedFileUrl = URL.createObjectURL(mergedBlob);
                resolve(mergedFileUrl);
                return;
            }
            fetch(fileParts[index]).then((response) => {
                if (!response.ok) throw new Error("Missing part: " + fileParts[index]);
                return response.arrayBuffer();
            }).then((data) => {
                buffers.push(data);
                fetchPart(index + 1);
            }).catch(reject);
        }
        fetchPart(0);
    });
}

function getParts(file, start, end) {
    let parts = [];
    for (let i = start; i <= end; i++) {
        parts.push(file + ".part" + i);
    }
    return parts;
}

// We use Promise.all to merge BOTH the .wasm and the .pck simultaneously
Promise.all([
    mergeFiles(getParts("index.wasm", 1, 2)), // Merges index.wasm.part1, .part2
    mergeFiles(getParts("index.pck", 1, 2))   // Merges index.pck.part1, .part2
]).then(([wasmUrl, pckUrl]) => {
    
    window.fetch = async function (url, ...args) {
        // Redirect the engine to the merged WASM blob
        if (url.endsWith("index.wasm")) {
            return originalFetch(wasmUrl, ...args);
        } 
        // Redirect the engine to the merged PCK blob
        else if (url.endsWith("index.pck")) {
            return originalFetch(pckUrl, ...args);
        } 
        // Everything else loads normally
        else {
            return originalFetch(url, ...args);
        }
    };

    window.godotRunStart();
});
