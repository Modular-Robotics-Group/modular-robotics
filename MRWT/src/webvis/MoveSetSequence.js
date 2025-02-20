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
        // TODO MRWT
        //document.getElementById("infoOverlay").innerHTML = this.moveProgressString;
    }

    pop() {
        if (this.remainingMoveSets == 0) {
            return;
        }

        let moveSet = this.moveSets.shift();

        this.remainingMoveSets--;
        this.currentMoveSet++;
        if (moveSet.checkpoint) { this.currentCheckpoint += 1; }

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

        this.updateMoveProgressString();
        return moveSet.reverse();
    }
}
