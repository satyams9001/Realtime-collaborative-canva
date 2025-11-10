# ARCHITECTURE

# Overview
Single Node.js server (Socket.IO) hosts multiple rooms. Each room keeps a canonical operation history. Clients render by replaying the canonical strokes (server linearization).

# Data Flow Diagram
1. User draws on canvas — client locally renders incremental path (prediction).
2. When stroke completes (or periodically in long strokes), client sends `stroke-data` to server containing a compressed path, color, width, tool, author.
3. Server stamps stroke with unique id and appends to room history (linearization point).
4. Server broadcasts `stroke-broadcast` to the room. Each client appends and renders this stroke.
5. Undo: client sends `undo`. Server finds last eligible stroke by that author, marks it `tombstone` and emits `history-update` (undo op). Clients remove target stroke on receive.
6. Redo: server looks for the last undo by that author and re-applies it (clear tombstone) and emits `history-update`.

# WebSocket Protocol
- `join`: { roomId, userName } — client -> server
- `init-state`: { strokes: [{id, stroke, author}], users: [...] } — server -> client (on join)
- `stroke-data`: { path, color, width, tool, author } — client -> server
- `stroke-broadcast`: { id, opType:'stroke', payload } — server -> clients
- `cursor`: { x, y } — client -> server -> broadcast as `cursor-update`: { socketId, userName, x, y }
- `undo` / `redo` — client -> server; server emits `history-update`: { op } where op = { opType:'undo'|'redo', targetId }
- `users-update` — server -> clients with list of users

# Undo/Redo Strategy (global)
- Server maintains ordered `history` of ops.
- Each stroke is an op `{ id, opType:'stroke', payload, author, ts, tombstone:false }`.
- **Undo**: server marks the author's most recent non-tombstoned 'stroke' as `tombstone=true` and emits an undo op to clients. Undo is global and deterministic.
- **Redo**: server finds last undo by the same author that wasn't reapplied and restores the target (tombstone=false).
- This tombstone approach avoids rewriting history and ensures every client can reconstruct the same canvas by replaying history and skipping tombstoned strokes.

# Conflict Resolution
- Conflicts in overlapping drawing are resolved by server ordering — later strokes in history draw after earlier ones.
- Eraser is implemented as normal stroke with white color (simple compositing). For proper erasing of vector strokes you'd need boolean subtraction or per-stroke masking.
- Because we don't allow undos to remove others' strokes directly (undo applies only to the user's stroke), we avoid "user A undoing user B" semantics that require complex transform logic.
# Performance Decisions
- **Batching**: clients send finished strokes (polylines) rather than every mouse sample. This reduces bandwidth and server load. For perceived low-latency, clients draw locally while recording points.
- **Simplification**: naive sampling reduces point count for long strokes; production should implement RDP or cubic spline resampling.
- **Server linearization**: a single authoritative order prevents divergence among clients.
- **Tombstone history**: cheap and easier to reason about than OT/CRDT for initial implementation.
- **Cursor updates**: sent frequently but inexpensive and optionally throttled on server/client.

## Extensibility
- Persist `history` into DB for long sessions.
- Move drawing-state to separate service or worker to horizontally scale and use pub/sub (Redis) to broadcast to many socket servers.
- Replace tombstones with optimized CRDT if concurrent multi-user undo/redo across different authors required.

