import { Move } from "./Move.js";

export class MoveSet {
    constructor(checkpoint = false, moves = []) { 
        this.checkpoint = checkpoint;
        this.moves = moves;
    }

    reverse() {
        let newMoveSet = new MoveSet();
        for (let i = 0; i < this.moves.length; i++) {
            let move = this.moves[i];
            newMoveSet.moves.push(move.reverse());
        }
        newMoveSet.checkpoint = this.checkpoint;
        return newMoveSet;
    }
}
