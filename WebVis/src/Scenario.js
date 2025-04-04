import * as THREE from 'three';
import {ModuleType, MoveType, VisConfigData} from "./utils.js";
import { Module } from "./Module.js";
import { Move } from "./Move.js";
import { MoveSet } from "./MoveSet.js";
import { MoveSetSequence } from "./MoveSetSequence.js";
import { gModules, gModulePositions, gRenderer, gUser, cancelActiveMove } from "./main.js";

function Visgroup(r, g, b, scale) {
    this.color = `rgb(${r}, ${g}, ${b})`;
    this.scale = scale / 100;
}

// TODO this doesn't really need to be a class, with the way the code is structured
//  modules are loaded globally into gModules,
//  and moves/MoveSetSequence is loaded globally into window.gwMoveSetSequence
export class Scenario {
    constructor(rawString) {
        for (let module in gModules) gModules[module].destroy();
        cancelActiveMove();

        // Reset Data
        VisConfigData.nextModID = 0;
        VisConfigData.clearBounds();

        // remove '\r' characters
        rawString = rawString.replace(/\r/g, '');
        let _dataStartIndex = rawString.indexOf('\n\n');
        let metadataString = rawString.substring(0, _dataStartIndex);
        let dataString = rawString.substring(_dataStartIndex + 2);

        let metadataLines = metadataString.split('\n');
        let scenarioName = metadataLines[0];
        let scenarioDescription = metadataLines[1];
        let scenarioModuleType;
        switch (metadataLines[2]) {
            case 'CUBE': scenarioModuleType = ModuleType.CUBE; break;
            case 'RHOMBIC_DODECAHEDRON': scenarioModuleType = ModuleType.RHOMBIC_DODECAHEDRON; break;
            case 'CATOM': scenarioModuleType = ModuleType.CATOM; break;
            default: console.log("Unknown module type ", metadataLines[2], " -- defaulting to CUBE"); scenarioModuleType = ModuleType.CUBE; break;
        }

        let visgroups = {}; // key-value pairs of 'visgroupId: visgroup'
        let dataLines = dataString.split('\n');
        let nBlock = 0;
        let checkpointMove = true;
        let moveSet = new MoveSet();
        let moveSets = [];
        let numModules = 0;
        let totalMass = new THREE.Vector3(0.0, 0.0, 0.0);
        let minCoords, maxCoords;
        let maxRadius = 1.0;
        for (let iLine = 0; iLine < dataLines.length; iLine++) {

            // Read the line, sanitize it (remove comments and whitespace)
            let line = dataLines[iLine];
            line = line.replace(/ /g, '').split("//")[0];

            // if the line is empty, skip it and increment our block counter
            // if we were constructing a MoveSet,
            //  add it to our list of MoveSets and initialize a new one
            if (!line) { 
                nBlock++;
                if (moveSet.moves.length > 0) {
                    moveSets.push(moveSet);
                    moveSet = new MoveSet();
                    checkpointMove = false;
                }
                continue;
            }

            // check if it's a checkpoint move (first character of sanitized string is *)
            //  if it is, strip the * character
            if (line[0] == '*') {
                checkpointMove = true;
                line = line.substring(1);
            }

            // extract the individual values from the line
            let lineVals = line.split(',').map((val) => parseInt(val));

            // perform different logic depending on which block we're in
            switch (nBlock) {
                case 0: { // Visgroup definitions
                    let vgId = lineVals[0];
                    let r = lineVals[1];
                    let g = lineVals[2];
                    let b = lineVals[3];
                    let scale = lineVals[4];
                    visgroups[vgId] = new Visgroup(r, g, b, scale);
                    break;
                }
                case 1: { // Module definitions
                    let moduleId = lineVals[0];
                    let vg = visgroups[lineVals[1]];
                    let pos = new THREE.Vector3(lineVals[2], lineVals[3], lineVals[4]);
                    new Module(scenarioModuleType, moduleId, pos, vg.color, vg.scale);
                    gModules[moduleId].markStatic(); // Initially set all modules static

                    if (!minCoords) {
                        minCoords = new THREE.Vector3(lineVals[2], lineVals[3], lineVals[4]);
                        maxCoords = minCoords.clone();
                    }
                    numModules++;
                    totalMass.add(pos);
                    minCoords.min(pos);
                    maxCoords.max(pos);
                    break;
                }
                default: { // Move definitions
                    let moverId = lineVals[0];
                    gModules[moverId].unMarkStatic(); // Set non-static if module moves
                    let anchorDirCode = lineVals[1];
                    let deltaPos = new THREE.Vector3(lineVals[2], lineVals[3], lineVals[4]);
                    // TODO if we add more move types, this needs to be changed
                    let moveType = anchorDirCode > 0 ? MoveType.PIVOT : MoveType.SLIDING;
                    moveSet.moves.push(new Move(moverId, anchorDirCode, deltaPos, moveType, scenarioModuleType));
                    moveSet.checkpoint = moveSet.checkpointMove || checkpointMove;
                    break;
                }
            }  // end Switch statement
        } // end For loop (line iteration)
        if (moveSet.moves.length > 0) { moveSets.push(moveSet); }

        let centroid = totalMass.divideScalar(numModules);
        let radius = Math.max(...maxCoords.sub(minCoords).toArray());
        gUser.camera.position.x = centroid.x;
        gUser.camera.position.y = centroid.y;
        gUser.camera.position.z = centroid.z + radius + 3.0;
        gUser.controls.target.set(...centroid);

        window.gwMoveSetSequence = new MoveSetSequence(moveSets);
        window.gwScenarioCentroid = centroid;
        window.gwScenarioRadius = radius;

    } // end Constructor
}

const scenarioUploadElement = document.getElementById("scenarioUploadButton");
scenarioUploadElement.onchange = (e) => {
    const file = scenarioUploadElement.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const textContent = e.target.result;
        new Scenario(textContent);
    }
    reader.onerror = (e) => {
        const error = e.target.error;
    }
    reader.readAsText(file);
}

