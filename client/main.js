document.addEventListener('DOMContentLoaded', () => {
  // const socket = io();
  const socket = io(
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : window.location.origin
);

  const canvasEl = document.getElementById('canvas');
  const app = new CanvasApp(canvasEl, { getSocket: ()=>socket, sendStroke: (s)=>socket.emit('stroke-data', s) });
  const colorEl = document.getElementById('color');
  const widthEl = document.getElementById('width');
  const brushBtn = document.getElementById('brush');
  const eraserBtn = document.getElementById('eraser');
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  const joinBtn = document.getElementById('join');
  const roomInput = document.getElementById('room');
  const nameInput = document.getElementById('name');
  const usersList = document.getElementById('users');
  const status = document.getElementById('status');

  colorEl.addEventListener('input', ()=> app.setColor(colorEl.value));
  widthEl.addEventListener('input', ()=> app.setWidth(parseInt(widthEl.value,10)));
  brushBtn.onclick = ()=> app.setTool('brush');
  eraserBtn.onclick = ()=> app.setTool('eraser');
  undoBtn.onclick = ()=> socket.emit('undo');
  redoBtn.onclick = ()=> socket.emit('redo');

  joinBtn.onclick = () => {
    const room = roomInput.value || 'default';
    const name = nameInput.value || 'Guest';
    socket.emit('join', { roomId: room, userName: name });
    status.textContent = `Joined ${room} as ${name}`;
  };

  socket.on('init-state', (state) => {
    app.setUsers(state.users || []);
    usersList.innerHTML = '';
    state.users?.forEach(u => {
      const li = document.createElement('li'); li.className='user';
      li.innerHTML = `<span class="dot" style="background:${u.color}"></span>${u.name}`;
      usersList.appendChild(li);
    });
    app.loadState(state);
  });

  socket.on('stroke-broadcast', (op) => {
    if (op.opType === 'stroke') {
      app.strokes.push({ id: op.id, stroke: op.payload, author: op.payload.author });
      app._renderStroke(op.payload);
    } else {
      app.applyRemoteStroke(op);
    }
  });

  socket.on('users-update', users => {
    app.setUsers(users);
    usersList.innerHTML = '';
    users.forEach(u => {
      const li = document.createElement('li'); li.className='user';
      li.innerHTML = `<span class="dot" style="background:${u.color}"></span>${u.name}`;
      usersList.appendChild(li);
    });
  });

  socket.on('cursor-update', (data) => {
    app.updateCursor(data.socketId || data.socketId, data);
  });

  socket.on('history-update', ({op}) => {
    if (op.opType === 'undo') {
      app.strokes = app.strokes.filter(s => s.id !== op.targetId);
      app.redraw();
    } else if (op.opType === 'redo') {
      socket.emit('request-state'); 
    }
  });
});
