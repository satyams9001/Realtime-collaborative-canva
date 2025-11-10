class CanvasApp {
  constructor(canvasEl, socketClient){
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.socketClient = socketClient;
    this.dpr = window.devicePixelRatio || 1;
    this.tool = 'brush';
    this.color = '#000';
    this.width = 4;
    this.isDrawing = false;
    this.currentPath = [];
    this.strokes = [];
    this.cursorMap = new Map();
    this._bindEvents();
    this.resize();
    window.addEventListener('resize', ()=>this.resize());
  }

  resize(){
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(r.width * this.dpr);
    this.canvas.height = Math.floor(r.height * this.dpr);
    this.canvas.style.width = r.width + 'px';
    this.canvas.style.height = r.height + 'px';
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.redraw();
  }

  _bindEvents(){
    const c = this.canvas;
    c.addEventListener('pointerdown', (e)=> this._start(e));
    c.addEventListener('pointermove', (e)=> this._move(e));
    window.addEventListener('pointerup', (e)=> this._end(e));
    c.addEventListener('mouseleave', ()=> {
      this.isDrawing = false;
      this.currentPath = [];
    });
  }

  setTool(tool){ this.tool = tool; }
  setColor(c){ this.color = c; }
  setWidth(w){ this.width = w; }

  _start(e){
    this.isDrawing = true;
    this.currentPath = [{x: e.offsetX, y: e.offsetY, t: Date.now()}];
  }

  _move(e){
    const pos = { x: e.offsetX, y: e.offsetY, t: Date.now() };
    this.socketClient.getSocket()?.emit('cursor', { x: pos.x, y: pos.y });
    if (!this.isDrawing) return;
    this.currentPath.push(pos);
    this._drawPathSegment(this.currentPath, { color: this.color, width: this.width, tool: this.tool });
  }

  _end(e){
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentPath.length < 2) { this.currentPath = []; return;
    }
    const stroke = {
      path: this._simplify(this.currentPath, 1.0),
      color: this.tool === 'eraser' ? '#ffffff' : this.color,
      width: this.width,
      tool: this.tool,
      author: this.socketClient.getSocket()?.id
    };
    this.socketClient.sendStroke(stroke);
    this.currentPath = [];
  }

  _simplify(points, tol){
    if (points.length < 50) return points;
    const step = Math.ceil(points.length / 40);
    return points.filter((p,i)=> i%step===0);
  }

  _drawPathSegment(path, {color, width, tool}){
    if (path.length < 2) return;
    const ctx = this.ctx;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    const last = path[path.length - 2];
    ctx.moveTo(last.x, last.y);
    const cur = path[path.length - 1];
    ctx.lineTo(cur.x, cur.y);
    ctx.stroke();
  }

  applyRemoteStroke(op){
    if (op.opType === 'stroke') {
      this.strokes.push({ id: op.id, stroke: op.payload, author: op.payload.author });
      this._renderStroke(op.payload);
    } else if (op.opType === 'undo') {
      const targetId = op.targetId;
      this.strokes = this.strokes.filter(s => s.id !== targetId);
      this.redraw();
    } else if (op.opType === 'redo') {
      // noop: history updates handled elsewhere
    }
  }

  _renderStroke(stroke){
    const ctx = this.ctx;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    const p0 = stroke.path[0];
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < stroke.path.length; i++) {
      const p = stroke.path[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  redraw(){
    const ctx = this.ctx;
    ctx.clearRect(0,0,this.canvas.width/this.dpr, this.canvas.height/this.dpr);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,this.canvas.width/this.dpr, this.canvas.height/this.dpr);
    for (const s of this.strokes) this._renderStroke(s.stroke);
    this._renderCursors();
  }

  _renderCursors(){
    const ctx = this.ctx;
    for (const [, c] of this.cursorMap) {
      ctx.beginPath();
      ctx.fillStyle = c.color || '#000';
      ctx.arc(c.x, c.y, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.font = '12px sans-serif';
      ctx.fillText(c.userName || '', c.x + 8, c.y + 4);
    }
  }

  setUsers(users){
    this.users = users;
  }

  updateCursor(socketId, {x,y,userName}){
    const user = this.users?.find(u => u.id === socketId);
    const color = user?.color || '#000';
    this.cursorMap.set(socketId, { x, y, userName, color });
    setTimeout(()=> {
      this.cursorMap.delete(socketId);
      this.redraw();
    }, 2000);
    this.redraw();
  }

  loadState(state){
    this.strokes = state.strokes.map(s => ({ id: s.id, stroke: s.stroke, author: s.author }));
    this.redraw();
  }
}