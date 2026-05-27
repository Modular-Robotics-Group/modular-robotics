import { gModules } from "./main.js";

export class MoveSetSequence {
    constructor(moveSets = []) {
        this.moveSets = moveSets;
        this.undostack = [];
        this.totalMoveSets = moveSets.length;
        this.remainingMoveSets = moveSets.length;
        this.currentMoveSet = 0;
        this.totalCheckpoints = moveSets.reduce((sum, x) => sum + x.checkpoint, 0);
        this.currentCheckpoint = 0;
        this.updateMoveProgressString();
    }

    updateMoveProgressString() {
        this.moveProgressString = `Move #${this.currentCheckpoint} / #${this.totalCheckpoints}`;
        document.getElementById("infoOverlay").innerHTML = this.moveProgressString;
    }

    pop() {
        if (this.remainingMoveSets == 0) {
            return;
        }

        let moveSet = this.moveSets.shift();

        this.remainingMoveSets--;
        this.currentMoveSet++;
        if (moveSet.checkpoint) { this.currentCheckpoint += 1; }

        // Apply any visgroup redefinitions attached to this MoveSet
        if (moveSet.visgroupUpdates) {
            for (let update of moveSet.visgroupUpdates) {
                for (let modId in gModules) {
                    if (gModules[modId].visgroupId === update.id) {
                        gModules[modId].updateAppearance(update.newColor, update.newScale, update.newOpacity);
                    }
                }
            }
        }

        this.undostack.push(moveSet);
        
        this.updateMoveProgressString();
        return moveSet;
    }

    undo() {
        if (this.currentMoveSet == 0) {
            return;
        }

        let moveSet = this.undostack.pop();
        if (moveSet.checkpoint) { this.currentCheckpoint -= 1; }

        this.remainingMoveSets++;
        this.currentMoveSet--;

        this.moveSets.unshift(moveSet);

        // Revert any visgroup redefinitions attached to this MoveSet
        if (moveSet.visgroupUpdates) {
            for (let update of moveSet.visgroupUpdates) {
                for (let modId in gModules) {
                    if (gModules[modId].visgroupId === update.id) {
                        gModules[modId].updateAppearance(update.oldColor, update.oldScale, update.oldOpacity);
                    }
                }
            }
        }

        this.updateMoveProgressString();
        return moveSet.reverse();
    }

    reset() {
        // Reset move sequence state to initial
        while (this.undostack.length !== 0) {
            let unMoveSet = this.undo();
            for (let i = 0; i < unMoveSet.moves.length; i++) {
                let unMove = unMoveSet.moves[i];
                gModules[unMove.id].finishMove(unMove);
            }
        }
    }

    invalidate() {
        // Important note: it is assumed this will only be called in painter mode, meaning that the sequence will
        // already be locked to its initial state! Calling invalidate mid-sequence may cause odd behavior.
        this.moveSets = [];
        this.totalMoveSets = 0;
        this.remainingMoveSets = 0;
        this.totalCheckpoints = 0;
        this.updateMoveProgressString();
    }
}
