import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";

const QUADRANTS = [
  { id: "do", label: "Do First", sub: "Urgent · Important", color: "#ff4757", accent: "rgba(255,71,87,0.12)", emoji: "🔥", desc: "Act on these now" },
  { id: "schedule", label: "Schedule", sub: "Important · Not Urgent", color: "#2ed8a8", accent: "rgba(46,216,168,0.08)", emoji: "📅", desc: "Block time for these" },
  { id: "delegate", label: "Delegate", sub: "Urgent · Not Important", color: "#ffa502", accent: "rgba(255,165,2,0.08)", emoji: "🤝", desc: "Hand these off" },
  { id: "eliminate", label: "Eliminate", sub: "Not Urgent · Not Important", color: "#747d8c", accent: "rgba(116,125,140,0.06)", emoji: "🗑️", desc: "Cut these ruthlessly" },
];

function getDueLabel(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "#ff4757", bg: "rgba(255,71,87,0.15)" };
  if (diff === 0) return { label: "Today", color: "#ffa502", bg: "rgba(255,165,2,0.15)" };
  if (diff === 1) return { label: "Tomorrow", color: "#ffa502", bg: "rgba(255,165,2,0.12)" };
  return { label: `${diff}d`, color: "#747d8c", bg: "rgba(116,125,140,0.1)" };
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
    <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.3)", fontSize: "13px", letterSpacing: "0.15em", textTransform: "uppercase" }}>Loading…</p>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; min-height: 100vh; background: #0d0d0d; }
        body { font-family: 'DM Sans', sans-serif; color: #f0f0f0; overflow-x: hidden; -webkit-font-smoothing: antialiased; }

        /* ─── HEADER ─────────────────────────────── */
        .hdr {
          position: sticky; top: 0; z-index: 200;
          background: rgba(13,13,13,0.95); backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; gap: 0;
          height: 60px; padding: 0;
        }
        .hdr-brand {
          display: flex; flex-direction: column; justify-content: center;
          padding: 0 24px; border-right: 1px solid rgba(255,255,255,0.06);
          height: 100%; min-width: 200px;
        }
        .hdr-brand h1 {
          font-family: 'Playfair Display', serif;
          font-size: 16px; font-weight: 900; letter-spacing: -0.01em;
          color: #f0f0f0; line-height: 1;
        }
        .hdr-brand p {
          font-size: 9px; color: rgba(255,255,255,0.2);
          letter-spacing: 0.15em; text-transform: uppercase; margin-top: 3px;
        }
        .hdr-counters {
          display: flex; align-items: center; gap: 0;
          border-right: 1px solid rgba(255,255,255,0.06);
          height: 100%;
        }
        .hdr-counter {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 0 18px; height: 100%;
          border-right: 1px solid rgba(255,255,255,0.04);
          transition: background 0.15s;
          cursor: default;
        }
        .hdr-counter:last-child { border-right: none; }
        .hdr-counter:hover { background: rgba(255,255,255,0.03); }
        .hdr-counter-num { font-size: 20px; font-weight: 700; line-height: 1; }
        .hdr-counter-lbl { font-size: 8px; color: rgba(255,255,255,0.25); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 3px; }
        .hdr-input-zone {
          flex: 1; display: flex; align-items: center;
          gap: 10px; padding: 0 20px; height: 100%;
        }

        /* ─── INPUT ──────────────────────────────── */
        .inp {
          flex: 1; min-width: 0;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; color: #f0f0f0;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 400;
          padding: 10px 16px; outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .inp:focus { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.07); }
        .inp::placeholder { color: rgba(255,255,255,0.2); }

        .btn-add {
          background: #f0f0f0; color: #0d0d0d;
          border: none; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
          padding: 10px 20px; cursor: pointer; white-space: nowrap;
          letter-spacing: 0.02em; transition: all 0.15s;
        }
        .btn-add:hover { background: #fff; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
        .btn-add:disabled { opacity: 0.2; cursor: not-allowed; transform: none; box-shadow: none; }

        .btn-date {
          background: none; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: rgba(255,255,255,0.35);
          font-family: 'DM Sans', sans-serif; font-size: 12px;
          padding: 10px 14px; cursor: pointer; white-space: nowrap;
          transition: all 0.15s; flex-shrink: 0;
        }
        .btn-date:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.6); }
        .btn-date.set { border-color: #2ed8a8; color: #2ed8a8; }

        .inp-date {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: rgba(255,255,255,0.6);
          font-family: 'DM Sans', sans-serif; font-size: 12px;
          padding: 10px 12px; outline: none; flex-shrink: 0; -webkit-appearance: none;
        }
        .inp-date::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }

        /* categorize step */
        .cat-flow { flex: 1; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .cat-task-name {
          font-family: 'Playfair Display', serif; font-size: 15px;
          color: #f0f0f0; flex-shrink: 0; max-width: 300px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cat-q { font-size: 13px; color: rgba(255,255,255,0.5); flex-shrink: 0; }
        .cat-yes, .cat-no {
          font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700;
          padding: 8px 20px; border-radius: 8px; cursor: pointer;
          border: 1.5px solid; transition: all 0.15s; letter-spacing: 0.03em;
        }
        .cat-yes { background: transparent; border-color: #2ed8a8; color: #2ed8a8; }
        .cat-yes:hover { background: #2ed8a8; color: #0d0d0d; }
        .cat-no { background: transparent; border-color: #ff4757; color: #ff4757; }
        .cat-no:hover { background: #ff4757; color: #fff; }

        /* ─── MATRIX WRAPPER ─────────────────────── */
        .matrix-wrap {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          min-height: calc(100vh - 60px);
        }

        /* Axis lines */
        .axis-v {
          position: absolute; left: 50%; top: 0; bottom: 0;
          width: 1px; background: rgba(255,255,255,0.08); pointer-events: none; z-index: 10;
        }
        .axis-h {
          position: absolute; top: 50%; left: 0; right: 0;
          height: 1px; background: rgba(255,255,255,0.08); pointer-events: none; z-index: 10;
        }
        /* Axis labels */
        .axis-label {
          position: absolute; z-index: 11; pointer-events: none;
          font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
          color: rgba(255,255,255,0.15);
        }
        .axis-urgent-high { top: 50%; left: 12px; transform: translateY(-50%); }
        .axis-urgent-low { top: 50%; right: 12px; transform: translateY(-50%); }
        .axis-imp-high {
          left: 50%; top: 12px; transform: translateX(-50%);
          writing-mode: horizontal-tb;
        }
        .axis-imp-low {
          left: 50%; bottom: 12px; transform: translateX(-50%);
        }

        /* ─── QUADRANT ───────────────────────────── */
        .quad {
          padding: 20px; overflow-y: auto;
          border-right: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: background 0.2s;
          min-height: 0;
        }
        .quad:nth-child(2), .quad:nth-child(4) { border-right: none; }
        .quad:nth-child(3), .quad:nth-child(4) { border-bottom: none; }
        .quad.over { background: rgba(255,255,255,0.025); }

        .quad-hdr {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 12px;
        }
        .quad-name {
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .quad-sub {
          font-size: 9px; color: rgba(255,255,255,0.25);
          letter-spacing: 0.06em; margin-top: 2px;
        }
        .quad-badge {
          font-size: 11px; font-weight: 800;
          width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* ─── TASK CARD ──────────────────────────── */
        .card {
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; padding: 10px 12px; margin-bottom: 6px;
          font-size: 13px; line-height: 1.45; cursor: grab;
          transition: transform 0.12s, box-shadow 0.12s, background 0.15s;
          animation: rise 0.2s ease;
        }
        .card:hover {
          background: rgba(255,255,255,0.09);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.35);
        }
        .card.done-q {
          background: transparent; border-color: rgba(255,255,255,0.04);
          cursor: default; opacity: 0.4;
          transform: none !important; box-shadow: none !important;
        }
        .card.done-q .card-txt { text-decoration: line-through; }
        .card.done-b {
          background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.04);
          cursor: default; opacity: 0.55;
        }
        .card.done-b .card-txt { text-decoration: line-through; color: rgba(255,255,255,0.35); }

        .cb {
          width: 16px; height: 16px; border-radius: 4px;
          border: 1.5px solid rgba(255,255,255,0.2);
          background: transparent; cursor: pointer; flex-shrink: 0; margin-top: 1px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .cb:hover { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05); }
        .cb.on { background: #2ed8a8; border-color: #2ed8a8; }

        .x-btn {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.12); font-size: 11px;
          padding: 2px 3px; flex-shrink: 0; transition: color 0.12s; margin-top: 1px;
        }
        .x-btn:hover { color: #ff4757; }

        .due-tag {
          font-size: 9px; font-weight: 700; padding: 2px 6px;
          border-radius: 4px; white-space: nowrap; letter-spacing: 0.04em;
        }
        .idate {
          background: transparent; border: none;
          color: rgba(255,255,255,0.18); font-family: 'DM Sans', sans-serif;
          font-size: 10px; cursor: pointer; outline: none; padding: 0; width: 80px;
        }
        .idate::-webkit-calendar-picker-indicator { filter: invert(0.3); cursor: pointer; width: 8px; }

        .empty {
          font-size: 11px; color: rgba(255,255,255,0.1); text-align: center;
          padding: 20px 12px; border-radius: 8px;
          border: 1px dashed rgba(255,255,255,0.06);
          font-style: italic; margin-top: 2px;
        }

        .done-div { border: none; border-top: 1px dashed rgba(255,255,255,0.07); margin: 8px 0 6px; }
        .done-lbl { font-size: 9px; color: rgba(255,255,255,0.15); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 5px; }

        /* ─── COMPLETED SECTION ──────────────────── */
        .comp-section { border-top: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.01); }
        .comp-hdr {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 20px; cursor: pointer; transition: background 0.15s;
        }
        .comp-hdr:hover { background: rgba(255,255,255,0.03); }
        .comp-body {
          padding: 8px 20px 20px;
          display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px;
        }

        .footer {
          padding: 10px 20px; border-top: 1px solid rgba(255,255,255,0.04);
          font-size: 10px; color: rgba(255,255,255,0.12);
          text-align: center; letter-spacing: 0.05em;
        }

        @keyframes rise { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: none; } }

        /* ─── MOBILE ─────────────────────────────── */
        @media (max-width: 680px) {
          .hdr { height: auto; flex-wrap: wrap; padding: 12px 14px; gap: 10px; }
          .hdr-brand { border-right: none; padding: 0; min-width: unset; }
          .hdr-counters { border-right: none; gap: 0; }
          .hdr-counter { padding: 0 12px; }
          .hdr-input-zone { width: 100%; padding: 0; flex-wrap: wrap; }
          .matrix-wrap { grid-template-columns: 1fr; grid-template-rows: auto; min-height: auto; }
          .quad { min-height: 150px; }
          .quad:nth-child(3) { border-bottom: 1px solid rgba(255,255,255,0.05); }
          .axis-v, .axis-h, .axis-label { display: none; }
          .comp-body { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ─── HEADER ─────────────────────────────── */}
      <header className="hdr">
        <div className="hdr-brand">
          <h1>Task Prioritizer</h1>
          <p>Eisenhower Matrix</p>
        </div>

        <div className="hdr-counters">
          {QUADRANTS.map((q) => {
            const count = tasks.filter((t) => t.quadrant === q.id && !t.done).length;
            return (
              <div key={q.id} className="hdr-counter" title={q.label}>
                <span className="hdr-counter-num" style={{ color: count > 0 ? q.color : "rgba(255,255,255,0.15)" }}>{count}</span>
                <span className="hdr-counter-lbl">{q.emoji}</span>
              </div>
            );
          })}
        </div>

        <div className="hdr-input-zone">
          {step === "input" && (
            <>
              <input ref={inputRef} className="inp" placeholder="Add a task to prioritize…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddStart()} autoFocus />
              {showDatePicker && (
                <input type="date" className="inp-date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              )}
              <button className={`btn-date${dueDate ? " set" : ""}`} onClick={() => setShowDatePicker((v) => !v)}>
                {dueDate ? `📅 ${dueDate}` : "📅 Date"}
              </button>
              <button className="btn-add" onClick={handleAddStart} disabled={!input.trim()}>Add →</button>
            </>
          )}
          {step === "urgent" && (
            <div className="cat-flow">
              <span className="cat-task-name">"{input}"</span>
              <span className="cat-q">⚡ Is this urgent?</span>
              <button className="cat-yes" onClick={() => handleUrgent(true)}>YES</button>
              <button className="cat-no" onClick={() => handleUrgent(false)}>NO</button>
            </div>
          )}
          {step === "important" && (
            <div className="cat-flow">
              <span className="cat-task-name">"{input}"</span>
              <span className="cat-q">🎯 Is this important?</span>
              <button className="cat-yes" onClick={() => handleImportant(true)}>YES</button>
              <button className="cat-no" onClick={() => handleImportant(false)}>NO</button>
            </div>
          )}
        </div>
      </header>

      {/* ─── MATRIX ──────────────────────────────── */}
      <div className="matrix-wrap">
        {/* Axis */}
        <div className="axis-v" />
        <div className="axis-h" />
        <span className="axis-label axis-urgent-high">← Urgent</span>
        <span className="axis-label axis-urgent-low">Not Urgent →</span>
        <span className="axis-label axis-imp-high">Important ↑</span>
        <span className="axis-label axis-imp-low">↓ Not Important</span>

        {QUADRANTS.map((q) => {
          const qActive = tasks.filter((t) => t.quadrant === q.id && !t.done);
          const qDone = tasks.filter((t) => t.quadrant === q.id && t.done && !t.hidden_from_quadrant);
          const isOver = dragOver === q.id;

          return (
            <div key={q.id} className={`quad${isOver ? " over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(q.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, q.id)}>

              <div className="quad-hdr">
                <div>
                  <div className="quad-name" style={{ color: q.color }}>{q.emoji} {q.label}</div>
                  <div className="quad-sub">{q.sub}</div>
                </div>
                <div className="quad-badge" style={{ color: q.color, background: q.accent }}>
                  {qActive.length}
                </div>
              </div>

              {qActive.length === 0 && qDone.length === 0 && (
                <div className="empty">Drop tasks here</div>
              )}

              {qActive.map((task) => {
                const due = getDueLabel(task.due_date);
                return (
                  <div key={task.id} className="card"
                    draggable onDragStart={(e) => handleDragStart(e, task)} onDragEnd={() => { setDragging(null); setDragOver(null); }}>
                    <div className="cb" onClick={() => handleToggleDone(task)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-txt" style={{ marginBottom: due || true ? "4px" : 0, wordBreak: "break-word" }}>{task.text}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                        {due && <span className="due-tag" style={{ color: due.color, background: due.bg }}>{due.label}</span>}
                        <input type="date" className="idate" value={task.due_date || ""} onChange={(e) => handleDueDateChange(task, e.target.value)} title="Set due date" />
                      </div>
                    </div>
                    <button className="x-btn" onClick={() => handleDeletePermanently(task.id)}>✕</button>
                  </div>
                );
              })}

              {qDone.length > 0 && (
                <>
                  {qActive.length > 0 && <hr className="done-div" />}
                  <div className="done-lbl">completed</div>
                  {qDone.map((task) => (
                    <div key={task.id} className="card done-q">
                      <div className="cb on" onClick={() => handleToggleDone(task)}>
                        <span style={{ color: "#0d0d0d", fontSize: "8px", fontWeight: 900 }}>✓</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="card-txt" style={{ wordBreak: "break-word" }}>{task.text}</div>
                      </div>
                      <button className="x-btn" onClick={() => handleHideFromQuadrant(task)}>✕</button>
                    </div>
                  ))}
                </>
              )}

              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.1)", marginTop: "10px", fontStyle: "italic" }}>{q.desc}</div>
            </div>
          );
        })}
      </div>

      {/* ─── COMPLETED ───────────────────────────── */}
      {completedTasks.length > 0 && (
        <div className="comp-section">
          <div className="comp-hdr" onClick={() => setShowDone((v) => !v)}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px" }}>✅</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>COMPLETED TASKS</span>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "1px 8px", borderRadius: "20px", background: "rgba(46,216,168,0.12)", color: "#2ed8a8" }}>{completedTasks.length}</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "14px" }}>{showDone ? "▾" : "▸"}</span>
          </div>
          {showDone && (
            <div className="comp-body">
              {completedTasks.map((task) => {
                const q = QUADRANTS.find((q) => q.id === task.quadrant);
                return (
                  <div key={task.id} className="card done-b">
                    <div className="cb on" onClick={() => handleToggleDone(task)}>
                      <span style={{ color: "#0d0d0d", fontSize: "8px", fontWeight: 900 }}>✓</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-txt" style={{ wordBreak: "break-word" }}>{task.text}</div>
                      <div style={{ display: "flex", gap: "5px", marginTop: "3px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "9px", color: q.color, fontWeight: 700, letterSpacing: "0.04em" }}>{q.emoji} {q.label.toUpperCase()}</span>
                        {task.due_date && <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>· {task.due_date}</span>}
                      </div>
                    </div>
                    <button className="x-btn" onClick={() => handleDeletePermanently(task.id)}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="footer">☁️ Synced across devices · drag cards between quadrants · click ✓ to complete</div>
    </>
  );
}
