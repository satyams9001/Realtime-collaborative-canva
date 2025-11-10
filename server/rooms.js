const DrawingState = require('./drawing-state');

class Rooms {
  constructor(){
    this.rooms = new Map(); 
  }

  _ensure(roomId){
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { users: new Map(), drawingState: new DrawingState() });
    }
    return this.rooms.get(roomId);
  }

  addUser(roomId, socketId, name){
    const r = this._ensure(roomId);
    r.users.set(socketId, { id: socketId, name, color: this._pickColor(r.users.size) });
  }

  removeUser(roomId, socketId){
    const r = this.rooms.get(roomId);
    if (!r) return;
    r.users.delete(socketId);
    if (r.users.size === 0) {
    }
  }

  getUsers(roomId){
    const r = this.rooms.get(roomId);
    if (!r) return [];
    return Array.from(r.users.values());
  }

  getRoomState(roomId){
    const r = this._ensure(roomId);
    return { strokes: r.drawingState.getStrokes(), users: this.getUsers(roomId) };
  }

  addStroke(roomId, stroke){
    const r = this._ensure(roomId);
    return r.drawingState.addStroke(stroke);
  }

  undo(roomId, socketId){
    const r = this._ensure(roomId);
    return r.drawingState.undo(socketId);
  }

  redo(roomId, socketId){
    const r = this._ensure(roomId);
    return r.drawingState.redo(socketId);
  }

  _pickColor(i){
    const palette = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6'];
    return palette[i % palette.length];
  }
}

module.exports = Rooms;
