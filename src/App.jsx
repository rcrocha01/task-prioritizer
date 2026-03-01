import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";

const QUADRANTS = [
  { id: "do", label: "DO FIRST", sub: "Urgent + Important", color: "#e63946", emoji: "🔥", desc: "Critical deadlines, crises, urgent problems" },
  { id: "schedule", label: "SCHEDULE", sub: "Not Urgent + Important", color: "#2a9d8f", emoji: "📅", desc: "Planning, growth, relationships, strategy" },
  { id: "delegate", label: "DELEGATE", sub: "Urgent + Not Important", color: "#e9c46a", emoji: "🤝", desc: "Interruptions, some emails, some meetings" },
  { id: "eliminate", label: "ELIMINATE", sub: "Not Urgent + Not Important", color: "#adb5bd", emoji: "🗑️", desc: "Time wasters, trivial tasks, distractions" },
];

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
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [urgent, setUrgent] = useState(null);
  const [step, setStep] = useState("input");
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [showDone, setShowDone] = useState(true);
  const inputRef = useRef();

  useEffect(() => {
    async function loadTasks() {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: true });
      if (!error) setTasks(data || []);
      setLoading(false);
    }
    loadTasks();
  }, []);

  const getQuadrant = (u, i) => u && i ? "do" : !u && i ? "schedule" : u && !i ? "delegate" : "eliminate";
  const handleAddStart = () => { if (!input.trim()) return; setStep("urgent"); };
  const handleUrgent = (val) => { setUrgent(val); setStep("important"); };

  const handleImportant = async (val) => {
    const q = getQuadrant(urgent, val);
    const newTask = { text: input.trim(), quadrant: q, done: false, due_date: dueDate, hidden_from_quadrant: false };
    const { data, error } = await supabase.from("tasks").insert([newTask]).select().single();
    if (!error) setTasks((prev) => [...prev, data]);
    setInput(""); setDueDate(""); setUrgent(null); setStep("input");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleToggleDone = async (task) => {
    const updates = { done: !task.done, hidden_from_quadrant: !task.done ? task.hidden_from_quadrant : false };
    const { error } = await supabase.from("tasks").update(updates).eq("id", task.id);
    if (!error) setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, ...updates } : t));
  };

  const handleHideFromQuadrant = async (task) => {
    const { error } = await supabase.from("tasks").update({ hidden_from_quadrant: true }).eq("id", task.id);
    if (!error) setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, hidden_from_quadrant: true } : t));
  };

  const handleDeletePermanently = async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDueDateChange = async (task, date) => {
    const { error } = await supabase.from("tasks").update({ due_date: date }).eq("id", task.id);
    if (!error) setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, due_date: date } : t));
  };

  const handleDragStart = (e, task) => {
    if (task.done) return;
    setDragging(task); e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e, qid) => {
    e.preventDefault();
    if (dragging && dragging.quadrant !== qid) {
      const { error } = await supabase.from("tasks").update({ quadrant: qid }).eq("id", dragging.id);
      if (!error) setTasks((prev) => prev.map((t) => t.id === dragging.id ? { ...t, quadrant: qid } : t));
    }
    setDragging(null); setDragOver(null);
  };

  const activeTasks = tasks.filter((t) => !t.done);
  const completedTasks = tasks.filter((t) => t.done);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.4)", fontSize: "16px" }}>Loading your tasks…</p>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; min-height: 100vh; overflow-x: hidden; }
        body { background: #0f0f0f; color: #f1f1f1; }

        /* ── LAYOUT ─────────────────────────────── */
        .shell {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding: 0;
        }

        /* Topbar: full width strip */
        .topbar {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
        }
        .topbar-left {
          padding: 24px 28px;
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .topbar-right {
          padding: 20px 28px;
          display: flex;
          align-items: center;
        }

        /* Matrix: full remaining height */
        .matrix {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 0;
          min-height: 0;
        }

        .quadrant {
          padding: 22px 24px;
          border-right: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          overflow-y: auto;
          transition: background 0.2s;
          border-left: 4px solid transparent;
        }
        .quadrant:nth-child(2) { border-right: none; }
        .quadrant:nth-child(3) { border-bottom: none; }
        .quadrant:nth-child(4) { border-right: none; border-bottom: none; }
        .quadrant.dragover { background: rgba(255,255,255,0.04) !important; }

        /* Bottom completed section */
        .done-section {
          border-top: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.01);
        }
        .done-section-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 28px; cursor: pointer;
        }
        .done-section-header:hover { background: rgba(255,255,255,0.04); }
        .done-section-body {
          padding: 0 28px 20px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 8px;
        }

        /* ── ADD PANEL ──────────────────────────── */
        .add-row { display: flex; gap: 8px; width: 100%; }
        .date-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }

        .add-input {
          background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.15);
          border-radius: 10px; color: #f1f1f1; font-family: 'DM Sans', sans-serif;
          font-size: 15px; padding: 11px 14px; outline: none; flex: 1; min-width: 0;
          transition: border-color 0.2s; -webkit-appearance: none;
        }
        .add-input:focus { border-color: rgba(255,255,255,0.4); }
        .add-input::placeholder { color: rgba(255,255,255,0.3); }

        .date-input {
          background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.15);
          border-radius: 10px; color: rgba(255,255,255,0.6); font-family: 'DM Sans', sans-serif;
          font-size: 13px; padding: 9px 12px; outline: none; min-width: 130px; -webkit-appearance: none;
        }
        .date-input::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }

        .add-btn {
          background: #f1f1f1; color: #0f0f0f; border: none; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600;
          padding: 11px 22px; cursor: pointer; white-space: nowrap; flex-shrink: 0;
          transition: background 0.2s;
        }
        .add-btn:hover { background: #ddd; }
        .add-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .btn-choice {
          font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500;
          padding: 11px 20px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.2);
          cursor: pointer; transition: all 0.2s ease; background: transparent; color: #f1f1f1; flex: 1;
        }
        .btn-yes:hover { background: #2a9d8f; border-color: #2a9d8f; }
        .btn-no:hover { background: #e63946; border-color: #e63946; }

        /* ── TASK CHIPS ─────────────────────────── */
        .task-chip {
          display: flex; align-items: flex-start; gap: 10px;
          border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
          padding: 10px 12px; margin-bottom: 6px;
          font-family: 'DM Sans', sans-serif; font-size: 13px;
          background: rgba(255,255,255,0.06); transition: all 0.15s ease;
          animation: fadeIn 0.3s ease;
        }
        .task-chip.active { cursor: grab; }
        .task-chip.active:hover { background: rgba(255,255,255,0.1); }
        .task-chip.done-q { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); }
        .task-chip.done-q .task-text { text-decoration: line-through; color: rgba(255,255,255,0.3); }
        .task-chip.done-b { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.06); }
        .task-chip.done-b .task-text { text-decoration: line-through; color: rgba(255,255,255,0.35); }

        .checkbox {
          width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid rgba(255,255,255,0.3);
          background: transparent; cursor: pointer; flex-shrink: 0; margin-top: 1px;
          display: flex; align-items: center; justify-content: center; transition: all 0.15s;
        }
        .checkbox:hover { border-color: rgba(255,255,255,0.6); }
        .checkbox.checked { background: #2a9d8f; border-color: #2a9d8f; }

        .del-btn {
          background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.18);
          font-size: 13px; padding: 2px 4px; flex-shrink: 0; transition: color 0.15s;
        }
        .del-btn:hover { color: #e63946; }

        .count-badge {
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.1); border-radius: 20px; padding: 1px 9px;
          font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; min-width: 24px;
        }
        .due-badge {
          font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 600;
          padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.08); white-space: nowrap;
        }
        .done-divider { border: none; border-top: 1px dashed rgba(255,255,255,0.1); margin: 8px 0; }
        .done-label { font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(255,255,255,0.2); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px; }
        .inline-date { background: transparent; border: none; color: rgba(255,255,255,0.28); font-family: 'DM Sans', sans-serif; font-size: 11px; cursor: pointer; outline: none; padding: 0; width: 86px; }
        .inline-date::-webkit-calendar-picker-indicator { filter: invert(0.3); cursor: pointer; width: 10px; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }

        /* ── MOBILE ─────────────────────────────── */
        @media (max-width: 700px) {
          .topbar { grid-template-columns: 1fr; }
          .topbar-left { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); text-align: center; padding: 18px 16px 14px; }
          .topbar-right { padding: 16px; }
          .matrix { grid-template-columns: 1fr; grid-template-rows: auto; }
          .quadrant { border-right: none; border-left: 4px solid transparent; min-height: 140px; }
          .quadrant:nth-child(2) { border-right: none; }
          .quadrant:nth-child(3) { border-bottom: 1px solid rgba(255,255,255,0.06); }
          .done-section-header { padding: 14px 16px; }
          .done-section-body { padding: 0 16px 16px; grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="shell">

        {/* ── TOP BAR ── */}
        <div className="topbar">
          <div className="topbar-left">
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "6px" }}>
              Task Prioritizer
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.8 }}>
              Eisenhower Matrix<br />
              <span style={{ color: "#2a9d8f", fontWeight: 600 }}>{activeTasks.length} active</span>
              <span style={{ color: "rgba(255,255,255,0.25)" }}> · {completedTasks.length} done</span>
            </p>
          </div>

          <div className="topbar-right">
            {step === "input" && (
              <div style={{ width: "100%" }}>
                <div className="add-row">
                  <input ref={inputRef} className="add-input" placeholder="What's on your plate? Add a task…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddStart()} autoFocus />
                  <button className="add-btn" onClick={handleAddStart} disabled={!input.trim()}>Add</button>
                </div>
                <div className="date-row">
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>Due date (optional):</span>
                  <input type="date" className="date-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            )}
            {step === "urgent" && (
              <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Categorizing</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px" }}>"{input}"</p>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.7)", marginBottom: "10px" }}>⚡ Is this <strong>urgent</strong>?</p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-choice btn-yes" onClick={() => handleUrgent(true)}>Yes, urgent</button>
                    <button className="btn-choice btn-no" onClick={() => handleUrgent(false)}>Not urgent</button>
                  </div>
                </div>
              </div>
            )}
            {step === "important" && (
              <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>One more question</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px" }}>"{input}"</p>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.7)", marginBottom: "10px" }}>🎯 Is this <strong>important</strong>?</p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-choice btn-yes" onClick={() => handleImportant(true)}>Yes, important</button>
                    <button className="btn-choice btn-no" onClick={() => handleImportant(false)}>Not really</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── MATRIX GRID ── */}
        <div className="matrix">
          {QUADRANTS.map((q) => {
            const qActive = tasks.filter((t) => t.quadrant === q.id && !t.done);
            const qDone = tasks.filter((t) => t.quadrant === q.id && t.done && !t.hidden_from_quadrant);
            const isOver = dragOver === q.id;

            return (
              <div key={q.id} className={`quadrant${isOver ? " dragover" : ""}`}
                style={{ borderLeftColor: q.color, background: isOver ? "rgba(255,255,255,0.04)" : "transparent" }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(q.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, q.id)}>

                {/* Quadrant header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <span style={{ fontSize: "18px" }}>{q.emoji}</span>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 700, color: q.color, letterSpacing: "0.04em" }}>{q.label}</span>
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{q.sub}</div>
                  </div>
                  <span className="count-badge" style={{ color: q.color }}>{qActive.length}</span>
                </div>

                {/* Empty state */}
                {qActive.length === 0 && qDone.length === 0 && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.15)", textAlign: "center", padding: "28px 0", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.08)" }}>
                    Drop tasks here
                  </div>
                )}

                {/* Active tasks */}
                {qActive.map((task) => {
                  const due = getDueLabel(task.due_date);
                  return (
                    <div key={task.id} className="task-chip active" draggable onDragStart={(e) => handleDragStart(e, task)} onDragEnd={() => { setDragging(null); setDragOver(null); }}>
                      <div className="checkbox" onClick={() => handleToggleDone(task)} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="task-text" style={{ marginBottom: "4px", wordBreak: "break-word" }}>{task.text}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          {due && <span className="due-badge" style={{ color: due.color }}>{due.label}</span>}
                          <input type="date" className="inline-date" value={task.due_date || ""} onChange={(e) => handleDueDateChange(task, e.target.value)} title="Set due date" />
                        </div>
                      </div>
                      <button className="del-btn" onClick={() => handleDeletePermanently(task.id)}>✕</button>
                    </div>
                  );
                })}

                {/* Completed tasks in quadrant */}
                {qDone.length > 0 && (
                  <>
                    {qActive.length > 0 && <hr className="done-divider" />}
                    <div className="done-label">✓ Completed</div>
                    {qDone.map((task) => (
                      <div key={task.id} className="task-chip done-q">
                        <div className="checkbox checked" onClick={() => handleToggleDone(task)}>
                          <span style={{ color: "white", fontSize: "9px" }}>✓</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="task-text" style={{ wordBreak: "break-word" }}>{task.text}</div>
                        </div>
                        <button className="del-btn" onClick={() => handleHideFromQuadrant(task)}>✕</button>
                      </div>
                    ))}
                  </>
                )}

                {/* Quadrant hint */}
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.12)", marginTop: "12px", fontStyle: "italic" }}>{q.desc}</div>
              </div>
            );
          })}
        </div>

        {/* ── COMPLETED SECTION ── */}
        {completedTasks.length > 0 && (
          <div className="done-section">
            <div className="done-section-header" onClick={() => setShowDone((v) => !v)}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span>✅</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 700 }}>Completed Tasks</span>
                <span className="count-badge" style={{ color: "#2a9d8f" }}>{completedTasks.length}</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "16px" }}>{showDone ? "▾" : "▸"}</span>
            </div>
            {showDone && (
              <div className="done-section-body">
                {completedTasks.map((task) => {
                  const q = QUADRANTS.find((q) => q.id === task.quadrant);
                  return (
                    <div key={task.id} className="task-chip done-b">
                      <div className="checkbox checked" onClick={() => handleToggleDone(task)}>
                        <span style={{ color: "white", fontSize: "9px" }}>✓</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="task-text" style={{ wordBreak: "break-word" }}>{task.text}</div>
                        <div style={{ display: "flex", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", color: q.color, fontWeight: 600 }}>{q.emoji} {q.label}</span>
                          {task.due_date && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>· {task.due_date}</span>}
                        </div>
                      </div>
                      <button className="del-btn" onClick={() => handleDeletePermanently(task.id)}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.15)", textAlign: "center", padding: "12px", letterSpacing: "0.04em" }}>
          ☁️ Synced · ↕ Drag to move · ✓ Complete · ✕ Delete
        </p>
      </div>
    </>
  );
}
