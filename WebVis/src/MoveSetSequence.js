export class MoveSetSequence {
    constructor(moveSets = []) {
        this.moveSets = moveSets;
        this.undostack = [];
        this.totalMoveSets = moveSets.length;
        this.remainingMoveSets = moveSets.length;
        this.currentMoveSet = 0;
        this.updateMoveProgressString();
    }

    updateMoveProgressString() {
        this.moveProgressString = `Move #${this.currentMoveSet} / #${this.totalMoveSets}`;
        document.getElementById("infoOverlay").innerHTML = this.moveProgressString;
    }

    pop() {
        if (this.remainingMoveSets == 0) {
            return;
        }

        let moveSet = this.moveSets.shift();

        this.remainingMoveSets--;
        this.currentMoveSet++;

        this.undostack.push(moveSet);
        
        this.updateMoveProgressString();
        return moveSet;
    }

    undo() {
        if (this.currentMoveSet == 0) {
            return;
        }

        let moveSet = this.undostack.pop();

        this.remainingMoveSets++;
        this.currentMoveSet--;

        this.moveSets.unshift(moveSet);

        this.updateMoveProgressString();
        return moveSet.reverse();
    }
}
