import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";

const QUADRANTS = [
  { id: "do", label: "Do First", sub: "Urgent · Important", color: "#e63946", bg: "rgba(230,57,70,0.06)", emoji: "🔥", desc: "Critical deadlines & crises" },
  { id: "schedule", label: "Schedule", sub: "Not Urgent · Important", color: "#2a9d8f", bg: "rgba(42,157,143,0.06)", emoji: "📅", desc: "Planning, growth & strategy" },
  { id: "delegate", label: "Delegate", sub: "Urgent · Not Important", color: "#e9c46a", bg: "rgba(233,196,106,0.06)", emoji: "🤝", desc: "Interruptions & quick requests" },
  { id: "eliminate", label: "Eliminate", sub: "Not Urgent · Not Important", color: "#6c757d", bg: "rgba(108,117,125,0.06)", emoji: "🗑️", desc: "Distractions & time wasters" },
];

function getDueLabel(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "#e63946" };
  if (diff === 0) return { label: "Today", color: "#e9c46a" };
  if (diff === 1) return { label: "Tomorrow", color: "#e9c46a" };
  return { label: `${diff}d`, color: "#6c757d" };
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
  const [showDatePicker, setShowDatePicker] = useState(false);
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
  const handleAddStart = () => { if (!input.trim()) return; setStep("urgent"); setShowDatePicker(false); };
  const handleUrgent = (val) => { setUrgent(val); setStep("important"); };

  const handleImportant = async (val) => {
    const q = getQuadrant(urgent, val);
    const { data, error } = await supabase.from("tasks").insert([{ text: input.trim(), quadrant: q, done: false, due_date: dueDate, hidden_from_quadrant: false }]).select().single();
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

  const handleDragStart = (e, task) => { if (task.done) return; setDragging(task); e.dataTransfer.effectAllowed = "move"; };
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
    <div style={{ minHeight: "100vh", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.3)", fontSize: "14px", letterSpacing: "0.1em" }}>LOADING…</p>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; height: 100%; background: #111; }
        body { font-family: 'DM Sans', sans-serif; color: #f0f0f0; overflow-x: hidden; }

        /* ── STICKY HEADER ── */
        .header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(17,17,17,0.96);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          padding: 0 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          height: 64px;
        }
        .header-brand {
          display: flex; align-items: center; gap: 14px;
          flex-shrink: 0;
          border-right: 1px solid rgba(255,255,255,0.08);
          padding-right: 20px;
        }
        .header-stats {
          display: flex; gap: 16px; flex-shrink: 0;
          border-right: 1px solid rgba(255,255,255,0.08);
          padding-right: 20px;
        }
        .stat-pill {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 500;
          color: rgba(255,255,255,0.4);
        }
        .stat-num { font-weight: 700; font-size: 14px; }
        .header-add { flex: 1; display: flex; align-items: center; gap: 10px; }

        .add-input {
          flex: 1; min-width: 0;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: #f0f0f0;
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          padding: 9px 14px; outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .add-input:focus { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.08); }
        .add-input::placeholder { color: rgba(255,255,255,0.25); }

        .add-btn {
          background: #f0f0f0; color: #111; border: none;
          border-radius: 8px; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 700; padding: 9px 18px;
          cursor: pointer; white-space: nowrap; flex-shrink: 0;
          transition: background 0.15s, transform 0.1s;
          letter-spacing: 0.02em;
        }
        .add-btn:hover { background: #ddd; transform: translateY(-1px); }
        .add-btn:disabled { opacity: 0.25; cursor: not-allowed; transform: none; }

        .date-toggle {
          background: none; border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px; color: rgba(255,255,255,0.4);
          font-family: 'DM Sans', sans-serif; font-size: 12px;
          padding: 9px 12px; cursor: pointer; white-space: nowrap;
          transition: all 0.15s; flex-shrink: 0;
        }
        .date-toggle:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.7); }
        .date-toggle.active { border-color: #2a9d8f; color: #2a9d8f; }

        .date-input-inline {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: rgba(255,255,255,0.7);
          font-family: 'DM Sans', sans-serif; font-size: 13px;
          padding: 9px 12px; outline: none; flex-shrink: 0;
          -webkit-appearance: none;
        }
        .date-input-inline::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }

        /* categorize UI in header */
        .cat-bar {
          flex: 1; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
        }
        .cat-task { font-family: 'Playfair Display', serif; font-size: 16px; color: #f0f0f0; flex-shrink: 0; }
        .cat-question { font-size: 13px; color: rgba(255,255,255,0.6); flex-shrink: 0; }
        .cat-btns { display: flex; gap: 8px; }
        .cat-btn {
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          padding: 8px 18px; border-radius: 8px; border: 1.5px solid rgba(255,255,255,0.15);
          cursor: pointer; background: transparent; color: #f0f0f0; transition: all 0.15s;
        }
        .cat-btn-yes:hover { background: #2a9d8f; border-color: #2a9d8f; }
        .cat-btn-no:hover { background: #e63946; border-color: #e63946; }

        /* ── MATRIX ── */
        .matrix {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          min-height: calc(100vh - 64px);
        }

        .quadrant {
          padding: 20px 22px;
          border-right: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          overflow-y: auto;
          transition: background 0.2s;
          border-left: 3px solid transparent;
          position: relative;
        }
        .quadrant:nth-child(2), .quadrant:nth-child(4) { border-right: none; }
        .quadrant:nth-child(3), .quadrant:nth-child(4) { border-bottom: none; }
        .quadrant.dragover { background: rgba(255,255,255,0.03) !important; }

        .q-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px; padding-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .q-title-group { display: flex; align-items: center; gap: 8px; }
        .q-label { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .q-sub { font-size: 10px; color: rgba(255,255,255,0.3); letter-spacing: 0.05em; margin-top: 1px; }
        .q-count {
          font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
          padding: 2px 8px; border-radius: 20px;
          background: rgba(255,255,255,0.07); min-width: 24px; text-align: center;
        }

        /* ── TASK CHIPS ── */
        .chip {
          display: flex; align-items: flex-start; gap: 9px;
          padding: 9px 11px; margin-bottom: 5px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; font-size: 13px; line-height: 1.4;
          background: rgba(255,255,255,0.04);
          transition: all 0.15s; animation: fadeUp 0.25s ease;
          cursor: grab;
        }
        .chip:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); }
        .chip.done-q { background: transparent; border-color: rgba(255,255,255,0.04); cursor: default; opacity: 0.5; }
        .chip.done-q .chip-text { text-decoration: line-through; color: rgba(255,255,255,0.35); }
        .chip.done-b { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); cursor: default; }
        .chip.done-b .chip-text { text-decoration: line-through; color: rgba(255,255,255,0.3); }

        .cb {
          width: 15px; height: 15px; border-radius: 3px;
          border: 1.5px solid rgba(255,255,255,0.25);
          background: transparent; cursor: pointer; flex-shrink: 0; margin-top: 1px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .cb:hover { border-color: rgba(255,255,255,0.5); }
        .cb.on { background: #2a9d8f; border-color: #2a9d8f; }

        .del {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.15); font-size: 12px;
          padding: 1px 3px; flex-shrink: 0; transition: color 0.15s; margin-top: 1px;
        }
        .del:hover { color: #e63946; }

        .due-tag {
          font-size: 10px; font-weight: 600; padding: 1px 5px;
          border-radius: 3px; background: rgba(255,255,255,0.07); white-space: nowrap;
          letter-spacing: 0.03em;
        }
        .inline-date {
          background: transparent; border: none; color: rgba(255,255,255,0.2);
          font-family: 'DM Sans', sans-serif; font-size: 10px;
          cursor: pointer; outline: none; padding: 0; width: 80px;
        }
        .inline-date::-webkit-calendar-picker-indicator { filter: invert(0.3); cursor: pointer; width: 8px; }

        .empty-state {
          font-size: 12px; color: rgba(255,255,255,0.12); text-align: center;
          padding: 20px 0; border-radius: 6px; border: 1px dashed rgba(255,255,255,0.07);
          margin-top: 4px;
        }

        .done-divider { border: none; border-top: 1px dashed rgba(255,255,255,0.08); margin: 8px 0 6px; }
        .done-label { font-size: 9px; color: rgba(255,255,255,0.18); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }

        /* ── COMPLETED SECTION ── */
        .done-section { border-top: 1px solid rgba(255,255,255,0.07); }
        .done-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 24px; cursor: pointer; background: rgba(255,255,255,0.02);
          transition: background 0.15s;
        }
        .done-header:hover { background: rgba(255,255,255,0.04); }
        .done-body {
          padding: 12px 24px 20px;
          display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 6px;
        }

        /* ── FOOTER ── */
        .footer {
          padding: 8px 24px; border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 10px; color: rgba(255,255,255,0.15); text-align: center; letter-spacing: 0.05em;
        }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

        /* ── MOBILE ── */
        @media (max-width: 680px) {
          .header { height: auto; padding: 12px 16px; flex-wrap: wrap; gap: 10px; }
          .header-brand { border-right: none; padding-right: 0; }
          .header-stats { border-right: none; padding-right: 0; }
          .header-add { width: 100%; }
          .matrix { grid-template-columns: 1fr; grid-template-rows: auto; min-height: auto; }
          .quadrant { min-height: 160px; }
          .quadrant:nth-child(2), .quadrant:nth-child(4) { border-right: none; }
          .quadrant:nth-child(3) { border-bottom: 1px solid rgba(255,255,255,0.06); }
          .done-body { grid-template-columns: 1fr; }
          .done-header, .done-body { padding-left: 16px; padding-right: 16px; }
          .cat-bar { gap: 10px; }
        }
      `}</style>

      {/* ── STICKY HEADER ── */}
      <header className="header">
        <div className="header-brand">
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "17px", fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1 }}>Task Prioritizer</div>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "3px" }}>Eisenhower Matrix</div>
          </div>
        </div>

        <div className="header-stats">
          {QUADRANTS.map((q) => {
            const count = tasks.filter((t) => t.quadrant === q.id && !t.done).length;
            return (
              <div key={q.id} className="stat-pill">
                <span>{q.emoji}</span>
                <span className="stat-num" style={{ color: count > 0 ? q.color : "rgba(255,255,255,0.2)" }}>{count}</span>
              </div>
            );
          })}
        </div>

        <div className="header-add">
          {step === "input" && (
            <>
              <input ref={inputRef} className="add-input" placeholder="Add a task…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddStart()} autoFocus />
              <button className={`date-toggle${dueDate ? " active" : ""}`} onClick={() => setShowDatePicker((v) => !v)}>
                {dueDate ? `📅 ${dueDate}` : "📅 Due date"}
              </button>
              {showDatePicker && (
                <input type="date" className="date-input-inline" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              )}
              <button className="add-btn" onClick={handleAddStart} disabled={!input.trim()}>Add →</button>
            </>
          )}
          {step === "urgent" && (
            <div className="cat-bar">
              <span className="cat-task">"{input}"</span>
              <span className="cat-question">⚡ Urgent?</span>
              <div className="cat-btns">
                <button className="cat-btn cat-btn-yes" onClick={() => handleUrgent(true)}>Yes</button>
                <button className="cat-btn cat-btn-no" onClick={() => handleUrgent(false)}>No</button>
              </div>
            </div>
          )}
          {step === "important" && (
            <div className="cat-bar">
              <span className="cat-task">"{input}"</span>
              <span className="cat-question">🎯 Important?</span>
              <div className="cat-btns">
                <button className="cat-btn cat-btn-yes" onClick={() => handleImportant(true)}>Yes</button>
                <button className="cat-btn cat-btn-no" onClick={() => handleImportant(false)}>No</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── MATRIX ── */}
      <div className="matrix">
        {QUADRANTS.map((q) => {
          const qActive = tasks.filter((t) => t.quadrant === q.id && !t.done);
          const qDone = tasks.filter((t) => t.quadrant === q.id && t.done && !t.hidden_from_quadrant);
          const isOver = dragOver === q.id;

          return (
            <div key={q.id} className={`quadrant${isOver ? " dragover" : ""}`}
              style={{ borderLeftColor: q.color, background: isOver ? "rgba(255,255,255,0.03)" : q.bg }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(q.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, q.id)}>

              <div className="q-header">
                <div className="q-title-group">
                  <span style={{ fontSize: "16px" }}>{q.emoji}</span>
                  <div>
                    <div className="q-label" style={{ color: q.color }}>{q.label}</div>
                    <div className="q-sub">{q.sub}</div>
                  </div>
                </div>
                <span className="q-count" style={{ color: q.color }}>{qActive.length}</span>
              </div>

              {qActive.length === 0 && qDone.length === 0 && (
                <div className="empty-state">No tasks · drop here to add</div>
              )}

              {qActive.map((task) => {
                const due = getDueLabel(task.due_date);
                return (
                  <div key={task.id} className="chip" draggable onDragStart={(e) => handleDragStart(e, task)} onDragEnd={() => { setDragging(null); setDragOver(null); }}>
                    <div className="cb" onClick={() => handleToggleDone(task)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="chip-text" style={{ wordBreak: "break-word", marginBottom: "3px" }}>{task.text}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                        {due && <span className="due-tag" style={{ color: due.color }}>{due.label}</span>}
                        <input type="date" className="inline-date" value={task.due_date || ""} onChange={(e) => handleDueDateChange(task, e.target.value)} title="Set due date" />
                      </div>
                    </div>
                    <button className="del" onClick={() => handleDeletePermanently(task.id)}>✕</button>
                  </div>
                );
              })}

              {qDone.length > 0 && (
                <>
                  {qActive.length > 0 && <hr className="done-divider" />}
                  <div className="done-label">completed</div>
                  {qDone.map((task) => (
                    <div key={task.id} className="chip done-q">
                      <div className="cb on" onClick={() => handleToggleDone(task)}>
                        <span style={{ color: "white", fontSize: "8px" }}>✓</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="chip-text" style={{ wordBreak: "break-word" }}>{task.text}</div>
                      </div>
                      <button className="del" onClick={() => handleHideFromQuadrant(task)}>✕</button>
                    </div>
                  ))}
                </>
              )}

              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.1)", marginTop: "10px", fontStyle: "italic" }}>{q.desc}</div>
            </div>
          );
        })}
      </div>

      {/* ── COMPLETED SECTION ── */}
      {completedTasks.length > 0 && (
        <div className="done-section">
          <div className="done-header" onClick={() => setShowDone((v) => !v)}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "14px" }}>✅</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
                Completed Tasks
              </span>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "1px 8px", borderRadius: "20px", background: "rgba(255,255,255,0.06)", color: "#2a9d8f" }}>{completedTasks.length}</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "14px" }}>{showDone ? "▾" : "▸"}</span>
          </div>
          {showDone && (
            <div className="done-body">
              {completedTasks.map((task) => {
                const q = QUADRANTS.find((q) => q.id === task.quadrant);
                return (
                  <div key={task.id} className="chip done-b">
                    <div className="cb on" onClick={() => handleToggleDone(task)}>
                      <span style={{ color: "white", fontSize: "8px" }}>✓</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="chip-text" style={{ wordBreak: "break-word" }}>{task.text}</div>
                      <div style={{ display: "flex", gap: "5px", marginTop: "2px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", color: q.color, fontWeight: 600 }}>{q.emoji} {q.label}</span>
                        {task.due_date && <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>· {task.due_date}</span>}
                      </div>
                    </div>
                    <button className="del" onClick={() => handleDeletePermanently(task.id)}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="footer">☁️ Synced · drag to move · click ✓ to complete · ✕ to delete</div>
    </>
  );
}
