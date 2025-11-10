const SocketClient = (function(){
  let socket = null;

  function connect() {
    socket = io();
    return socket;
  }

  function join(roomId, userName) {
    socket.emit('join', { roomId, userName });
  }

  function sendStroke(stroke) {
    socket.emit('stroke-data', stroke);
  }

  function sendCursor(pos) {
    socket.emit('cursor', pos);
  }

  function undo(){
    socket.emit('undo');
  }

  function redo(){
    socket.emit('redo');
  }

  return { connect, join, sendStroke, sendCursor, on: (ev, cb)=> socket && socket.on(ev, cb), undo, redo, getSocket: ()=>socket };
})();
