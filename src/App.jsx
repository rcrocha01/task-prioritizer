import { useState, useRef, useEffect } from "react";

const QUADRANTS = [
  { id: "do", label: "DO FIRST", sub: "Urgent + Important", color: "#e63946", emoji: "🔥", desc: "Critical deadlines, crises, urgent problems" },
  { id: "schedule", label: "SCHEDULE", sub: "Not Urgent + Important", color: "#2a9d8f", emoji: "📅", desc: "Planning, growth, relationships, strategy" },
  { id: "delegate", label: "DELEGATE", sub: "Urgent + Not Important", color: "#e9c46a", emoji: "🤝", desc: "Interruptions, some emails, some meetings" },
  { id: "eliminate", label: "ELIMINATE", sub: "Not Urgent + Not Important", color: "#adb5bd", emoji: "🗑️", desc: "Time wasters, trivial tasks, distractions" },
];

let nextId = Date.now();

const DEFAULT_TASKS = [
  { id: 1, text: "Reply to client proposal", quadrant: "do", done: false, dueDate: "", hiddenFromQuadrant: false },
  { id: 2, text: "Learn a new skill", quadrant: "schedule", done: false, dueDate: "", hiddenFromQuadrant: false },
  { id: 3, text: "Schedule team lunch", quadrant: "delegate", done: false, dueDate: "", hiddenFromQuadrant: false },
  { id: 4, text: "Browse social media", quadrant: "eliminate", done: false, dueDate: "", hiddenFromQuadrant: false },
];

function loadTasks() {
  try {
    const saved = localStorage.getItem("eisenhower-tasks-v2");
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  } catch { return DEFAULT_TASKS; }
}

function getDueLabel(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "#e63946" };
  if (diff === 0) return { label: "Due today", color: "#e9c46a" };
  if (diff === 1) return { label: "Due tomorrow", color: "#e9c46a" };
  return { label: `Due in ${diff}d`, color: "#adb5bd" };
}

export default function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [urgent, setUrgent] = useState(null);
  const [step, setStep] = useState("input");
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [showDone, setShowDone] = useState(true);
  const inputRef = useRef();

  useEffect(() => {
    try { localStorage.setItem("eisenhower-tasks-v2", JSON.stringify(tasks)); } catch {}
  }, [tasks]);

  const getQuadrant = (u, i) => u && i ? "do" : !u && i ? "schedule" : u && !i ? "delegate" : "eliminate";

  const handleAddStart = () => { if (!input.trim()) return; setStep("urgent"); };
  const handleUrgent = (val) => { setUrgent(val); setStep("important"); };
  const handleImportant = (val) => {
    const q = getQuadrant(urgent, val);
    setTasks((prev) => [...prev, { id: nextId++, text: input.trim(), quadrant: q, done: false, dueDate, hiddenFromQuadrant: false }]);
    setInput(""); setDueDate(""); setUrgent(null); setStep("input");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleToggleDone = (id) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done, hiddenFromQuadrant: !t.done ? t.hiddenFromQuadrant : false } : t));

  // Delete from quadrant view only (task remains in completed section)
  const handleHideFromQuadrant = (id) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, hiddenFromQuadrant: true } : t));

  // Permanently delete (from completed section)
  const handleDeletePermanently = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const handleDueDateChange = (id, date) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, dueDate: date } : t));

  const handleDragStart = (e, task) => { if (task.done) return; setDragging(task); e.dataTransfer.effectAllowed = "move"; };
  const handleDrop = (e, qid) => {
    e.preventDefault();
    if (dragging && dragging.quadrant !== qid) setTasks((prev) => prev.map((t) => t.id === dragging.id ? { ...t, quadrant: qid } : t));
    setDragging(null); setDragOver(null);
  };

  const activeTasks = tasks.filter((t) => !t.done);
  const completedTasks = tasks.filter((t) => t.done);
  const totalActive = activeTasks.length;
  const totalDone = completedTasks.length;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", fontFamily: "'Georgia', serif", padding: "32px 20px", color: "#f1f1f1" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .task-chip { display: flex; align-items: flex-start; gap: 10px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 12px; margin-bottom: 6px; font-family: 'DM Sans', sans-serif; font-size: 13px; transition: all 0.2s ease; animation: fadeIn 0.3s ease; background: rgba(255,255,255,0.06); }
        .task-chip.active { cursor: grab; }
        .task-chip.active:hover { background: rgba(255,255,255,0.1); }
        .task-chip.done-in-quadrant { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); cursor: default; }
        .task-chip.done-in-quadrant .task-text { text-decoration: line-through; color: rgba(255,255,255,0.3); }
        .task-chip.done-in-bottom { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.06); cursor: default; }
        .task-chip.done-in-bottom .task-text { text-decoration: line-through; color: rgba(255,255,255,0.35); }
        .done-divider { border: none; border-top: 1px dashed rgba(255,255,255,0.1); margin: 10px 0 8px; }
        .done-label { font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(255,255,255,0.2); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px; }
        .checkbox { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid rgba(255,255,255,0.3); background: transparent; cursor: pointer; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .checkbox:hover { border-color: rgba(255,255,255,0.6); }
        .checkbox.checked { background: #2a9d8f; border-color: #2a9d8f; }
        .delete-btn { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.15); font-size: 14px; transition: color 0.15s; line-height: 1; padding: 0; flex-shrink: 0; margin-top: 1px; }
        .delete-btn:hover { color: #e63946; }
        .quadrant { border-radius: 16px; padding: 20px; min-height: 200px; transition: all 0.2s ease; border: 2px solid transparent; }
        .quadrant.dragover { transform: scale(1.02); border-style: dashed !important; }
        .btn-choice { font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500; padding: 12px 28px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.2); cursor: pointer; transition: all 0.2s ease; background: transparent; color: #f1f1f1; }
        .btn-yes:hover { background: #2a9d8f; border-color: #2a9d8f; }
        .btn-no:hover { background: #e63946; border-color: #e63946; }
        .add-input { background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.15); border-radius: 10px; color: #f1f1f1; font-family: 'DM Sans', sans-serif; font-size: 15px; padding: 13px 18px; outline: none; width: 100%; transition: border-color 0.2s; }
        .add-input:focus { border-color: rgba(255,255,255,0.4); }
        .add-input::placeholder { color: rgba(255,255,255,0.3); }
        .date-input { background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.15); border-radius: 10px; color: rgba(255,255,255,0.6); font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 13px 14px; outline: none; transition: border-color 0.2s; width: 160px; flex-shrink: 0; }
        .date-input::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        .add-btn { background: #f1f1f1; color: #0f0f0f; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; padding: 13px 22px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .add-btn:hover { background: #e0e0e0; transform: translateY(-1px); }
        .add-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
        .inline-date { background: transparent; border: none; color: rgba(255,255,255,0.3); font-family: 'DM Sans', sans-serif; font-size: 11px; cursor: pointer; outline: none; padding: 0; width: 100px; }
        .inline-date::-webkit-calendar-picker-indicator { filter: invert(0.3); cursor: pointer; width: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .count-badge { display: inline-block; background: rgba(255,255,255,0.12); border-radius: 20px; padding: 2px 10px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; margin-left: 8px; vertical-align: middle; }
        .due-badge { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.08); }
        .done-section { max-width: 900px; margin: 32px auto 0; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; }
        .done-section-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: rgba(255,255,255,0.04); cursor: pointer; transition: background 0.2s; }
        .done-section-header:hover { background: rgba(255,255,255,0.07); }
        .done-section-body { padding: 16px 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "8px" }}>Task Prioritizer</h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Eisenhower Matrix · {totalActive} active · {totalDone} completed
        </p>
      </div>

      {/* Add Task Panel */}
      <div style={{ maxWidth: 640, margin: "0 auto 40px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px" }}>
        {step === "input" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <input ref={inputRef} className="add-input" placeholder="What's on your plate? Add a task…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddStart()} autoFocus />
              <button className="add-btn" onClick={handleAddStart} disabled={!input.trim()}>Add</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>Due date (optional):</span>
              <input type="date" className="date-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        )}
        {step === "urgent" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Categorizing</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "20px" }}>"{input}"</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", marginBottom: "18px", color: "rgba(255,255,255,0.7)" }}>⚡ Is this <strong>urgent</strong>? (needs attention soon / has a deadline)</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button className="btn-choice btn-yes" onClick={() => handleUrgent(true)}>Yes, urgent</button>
              <button className="btn-choice btn-no" onClick={() => handleUrgent(false)}>Not urgent</button>
            </div>
          </div>
        )}
        {step === "important" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>One more question</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "20px" }}>"{input}"</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", marginBottom: "18px", color: "rgba(255,255,255,0.7)" }}>🎯 Is this <strong>important</strong>? (moves your goals forward)</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button className="btn-choice btn-yes" onClick={() => handleImportant(true)}>Yes, important</button>
              <button className="btn-choice btn-no" onClick={() => handleImportant(false)}>Not really</button>
            </div>
          </div>
        )}
      </div>

      {/* Matrix Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", maxWidth: 900, margin: "0 auto" }}>
        {QUADRANTS.map((q) => {
          const qActive = tasks.filter((t) => t.quadrant === q.id && !t.done);
          const qDone = tasks.filter((t) => t.quadrant === q.id && t.done && !t.hiddenFromQuadrant);
          const isOver = dragOver === q.id;

          return (
            <div key={q.id} className={`quadrant${isOver ? " dragover" : ""}`}
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)", borderColor: isOver ? q.color : "rgba(255,255,255,0.08)", borderLeftColor: q.color, borderLeftWidth: 4 }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(q.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, q.id)}>

              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "20px" }}>{q.emoji}</span>
                  <span className="count-badge" style={{ color: q.color }}>{qActive.length}</span>
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", fontWeight: 700, color: q.color, letterSpacing: "0.05em" }}>{q.label}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "2px" }}>{q.sub}</div>
              </div>

              {/* Active tasks */}
              {qActive.length === 0 && qDone.length === 0 && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "24px 0", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.1)" }}>Drop tasks here</div>
              )}
              {qActive.map((task) => {
                const due = getDueLabel(task.dueDate);
                return (
                  <div key={task.id} className="task-chip active" draggable onDragStart={(e) => handleDragStart(e, task)} onDragEnd={() => { setDragging(null); setDragOver(null); }}>
                    <div className="checkbox" onClick={() => handleToggleDone(task.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="task-text" style={{ marginBottom: "4px" }}>{task.text}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {due && <span className="due-badge" style={{ color: due.color }}>{due.label}</span>}
                        <input type="date" className="inline-date" value={task.dueDate} onChange={(e) => handleDueDateChange(task.id, e.target.value)} title="Set due date" />
                      </div>
                    </div>
                    <button className="delete-btn" onClick={() => handleDeletePermanently(task.id)} title="Delete">✕</button>
                  </div>
                );
              })}

              {/* Completed tasks inside quadrant */}
              {qDone.length > 0 && (
                <>
                  {qActive.length > 0 && <hr className="done-divider" />}
                  <div className="done-label">✓ Completed</div>
                  {qDone.map((task) => (
                    <div key={task.id} className="task-chip done-in-quadrant">
                      <div className="checkbox checked" onClick={() => handleToggleDone(task.id)}>
                        <span style={{ color: "white", fontSize: "10px", lineHeight: 1 }}>✓</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="task-text">{task.text}</div>
                        {task.dueDate && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "3px" }}>{task.dueDate}</div>}
                      </div>
                      {/* X here hides from quadrant but keeps in bottom section */}
                      <button className="delete-btn" onClick={() => handleHideFromQuadrant(task.id)} title="Remove from quadrant">✕</button>
                    </div>
                  ))}
                </>
              )}

              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.18)", marginTop: "10px", fontStyle: "italic" }}>{q.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Completed Section at Bottom */}
      {completedTasks.length > 0 && (
        <div className="done-section">
          <div className="done-section-header" onClick={() => setShowDone((v) => !v)}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "18px" }}>✅</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", fontWeight: 700 }}>Completed Tasks</span>
              <span className="count-badge" style={{ color: "#2a9d8f" }}>{completedTasks.length}</span>
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", color: "rgba(255,255,255,0.4)" }}>{showDone ? "▾" : "▸"}</span>
          </div>
          {showDone && (
            <div className="done-section-body">
              {completedTasks.map((task) => {
                const q = QUADRANTS.find((q) => q.id === task.quadrant);
                return (
                  <div key={task.id} className="task-chip done-in-bottom">
                    <div className="checkbox checked" onClick={() => handleToggleDone(task.id)}>
                      <span style={{ color: "white", fontSize: "10px", lineHeight: 1 }}>✓</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="task-text">{task.text}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", color: q.color, fontWeight: 600 }}>{q.emoji} {q.label}</span>
                        {task.dueDate && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>· {task.dueDate}</span>}
                      </div>
                    </div>
                    {/* X here permanently deletes */}
                    <button className="delete-btn" onClick={() => handleDeletePermanently(task.id)} title="Delete permanently">✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: "24px", letterSpacing: "0.05em" }}>
        ↕ Drag to move · ✓ Checkbox to complete/undo · ✕ in quadrant hides from there · ✕ in completed deletes permanently · 💾 Auto-saved
      </p>
    </div>
  );
}
