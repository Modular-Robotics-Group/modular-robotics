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
            let newDeltaPos = move.deltaPos.clone().negate();

            //  For cube "double-move" pivots and RD pivots, we need to calculate a new anchor direction
            //  For cube "single-move" pivots, we can just use the old anchor direction
            let newAnchorDir;
            if (move.deltaPos.abs().sum() > 1) {
                // In the coordinate system centered at the origin of the "anchor" shape,
                //  take our position and subtract the delta-position of the move.
                //  This results in the end-position of the move, which...
                //  happens to correspond neatly the anchor direction in this coordinate system.
                //      (Same property that allows us to identify our position in this coordinate system)
                newAnchorDir = move.anchorDir.clone().multiplyScalar(move.inscsphere * 2).sub(move.deltaPos).normalize();
            } else {
                newAnchorDir = move.anchorDir.clone();
            }

            newMoveSet.moves.push(new Move(move.id, newAnchorDir, newDeltaPos, move.moveType, move.moduleType));
        }
        newMoveSet.checkpoint = this.checkpoint;
        return newMoveSet;
    }
}
