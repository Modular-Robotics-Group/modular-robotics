importScripts("./Pathfinder.js");
const pathfinder = Module.cwrap("pathfinder", "string", ["string", "string", "string"]);
const config2Scen = Module.cwrap("config2Scen", "string", ["string", "string"]);

onmessage = (msg) => {
    switch (msg.data[0]) {
        case 0:
            // pathfinder stuff here
            console.log("Initializing worker...");
            Module.onRuntimeInitialized = () => {
                console.log("Worker initialized");
                console.log("Running pathfinder...");
                try {
                    let pathfinder_out = pathfinder(msg.data[1], msg.data[2], msg.data[3]);
                    console.log("Task complete");
                    postMessage([0, pathfinder_out]);
                } catch (error) {
                    console.log("Task failed with exception:");
                    console.error(error);
                    postMessage([-1]);
                }
            }
            break;
        case 1:
            // config2scen stuff here
            console.log("Initializing worker...");
            Module.onRuntimeInitialized = () => {
                console.log("Worker initialized");
                console.log("Running config2Scen...");
                try {
                    let config2Scen_out = config2Scen(msg.data[1]);
                    console.log("Task complete");
                    postMessage([0, config2Scen_out]);
                } catch (error) {
                    console.log("Task failed with exception:");
                    console.error(error);
                    postMessage([-1]);
                }
            }
            break;
    }
}