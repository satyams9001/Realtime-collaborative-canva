const { v4: uuidv4 } = require('uuid');

class DrawingState {
  constructor(){
    this.history = []; 
    this.present = []; 
    this.stackPos = null;
    this.strokesById = new Map();
  }

  addStroke(stroke){
    const id = uuidv4();
    const op = { id, opType: 'stroke', payload: stroke, author: stroke.author, ts: Date.now(), tombstone: false };
    this.history.push(op);
    this.strokesById.set(id, op);
    return op;
  }

  undo(authorSocketId){
    for (let i = this.history.length - 1; i >= 0; i--) {
      const op = this.history[i];
      if (op.author === authorSocketId && op.opType === 'stroke' && !op.tombstone) {
        op.tombstone = true;
        const undoOp = { id: uuidv4(), opType: 'undo', targetId: op.id, author: authorSocketId, ts: Date.now() };
        this.history.push(undoOp);
        return undoOp;
      }
    }
    return null;
  }

  redo(authorSocketId){
    for (let i = this.history.length - 1; i >= 0; i--) {
      const op = this.history[i];
      if (op.opType === 'undo' && op.author === authorSocketId && !op.reapplied) {
        const target = this.strokesById.get(op.targetId);
        if (target && target.tombstone) {
          target.tombstone = false;
          op.reapplied = true;
          const redoOp = { id: uuidv4(), opType: 'redo', targetId: target.id, author: authorSocketId, ts: Date.now() };
          this.history.push(redoOp);
          return redoOp;
        }
      }
    }
    return null;
  }

  getStrokes(){
    const list = [];
    for (const op of this.history) {
      if (op.opType === 'stroke' && !op.tombstone) list.push({ id: op.id, stroke: op.payload, author: op.author });
    }
    return list;
  }
}

module.exports = DrawingState;
