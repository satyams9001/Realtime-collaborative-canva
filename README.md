 Collaborative Canvas (Vanilla JS + Node + Socket.IO)
# About the project
A starter multi-user collaborative drawing canvas using HTML5 Canvas (no frameworks) and Socket.IO for real-time sync. Implements brush/eraser/colors/width, cursor indicators, and a server-linearized history with global undo/redo.

# TO run  the project
1. Clone repository
2.   `cd collaborative-canvas`
3. `npm install`
4. `npm start`
5. Open multiple browser tabs and go to `http://localhost:3000/`

Join the same room id to collaborate.

# Files
See project tree. Key files:
- `server/server.js` — express + socket.io server
- `server/rooms.js`, `server/drawing-state.js` — room & history logic
- `client/index.html`, `client/canvas.js`, `client/main.js`, `client/websocket.js`

# How to test multiple users
- Open `http://localhost:3000` in multiple browser tabs or different machines on the same network (point to server host).
- Use the same room id in the toolbar to join same canvas.

# Known limitations
- Undo/redo strategy: only allows undo of last stroke by the same user (server tombstones). This avoids complex transform logic (OT/CRDT).
- No persistence beyond server memory — restarting server clears canvases.
- Eraser implemented as white stroke (compositing/alpha could be better).
- No authenticated users.
- No optimized Ramer-Douglas-Peucker simplifier; path simplification is naive.
- Concurrency edge-cases exist under extremely high concurrency: recommend batching and server-side rate-limiting for production.

# Time spent
Estimated: 9-10 hours to build this prototype, document architecture, and test basic multi-tab synchronization.

# Next steps / suggestions
- Add persistent storage (Redis or S3), or snapshotting for long sessions.
- Implement CRDT/OT for per-stroke collaborative semantics.
- Implement server rate-limits & batching and client smoothing spline (Catmull-Rom or Bezier).
- Add mobile touch support (pointer events already help) and rooms listing endpoint.

#DEPLOYED LINK
https://realtime-collaborative-canva.onrender.com/
