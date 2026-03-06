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

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
  const [moveMenu, setMoveMenu] = useState(null);
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

  const handleDelete = async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleMoveTask = async (taskId, newQuadrant) => {
    const { error } = await supabase.from("tasks").update({ quadrant: newQuadrant }).eq("id", taskId);
    if (!error) setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, quadrant: newQuadrant } : t));
    setMoveMenu(null);
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
    <div style={{ background: "#0d0d0d", minHeight: "100vh", color: "#f0f0f0", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; min-height: 100vh; background: #0d0d0d; }
        body { font-family: 'DM Sans', sans-serif; color: #f0f0f0; overflow-x: hidden; -webkit-font-smoothing: antialiased; }

        .hdr { position: sticky; top: 0; z-index: 200; background: rgba(13,13,13,0.97); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.07); }
        .hdr-top { display: flex; align-items: center; height: 64px; }
        .hdr-brand { display: flex; flex-direction: column; justify-content: center; padding: 0 24px; border-right: 1px solid rgba(255,255,255,0.07); height: 100%; min-width: 190px; flex-shrink: 0; }
        .hdr-brand h1 { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 900; color: #f0f0f0; line-height: 1; }
        .hdr-brand p { font-size: 10px; color: rgba(255,255,255,0.2); letter-spacing: 0.14em; text-transform: uppercase; margin-top: 3px; }

        .hdr-counters { display: flex; height: 100%; border-right: 1px solid rgba(255,255,255,0.07); flex-shrink: 0; }
        .hdr-ctr { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 20px; height: 100%; border-right: 1px solid rgba(255,255,255,0.04); min-width: 60px; }
        .hdr-ctr:last-child { border-right: none; }
        .hdr-ctr-num { font-size: 22px; font-weight: 800; line-height: 1; }
        .hdr-ctr-lbl { font-size: 16px; margin-top: 2px; }

        .hdr-add { flex: 1; display: flex; align-items: center; gap: 10px; padding: 0 20px; height: 100%; min-width: 0; }
        .hdr-add-mobile { display: none; padding: 10px 14px 14px; border-top: 1px solid rgba(255,255,255,0.06); gap: 10px; flex-direction: column; }
        .hdr-add-mobile-row { display: flex; gap: 8px; align-items: center; }

        @media (max-width: 700px) {
          .hdr-top { height: 56px; }
          .hdr-brand { min-width: unset; padding: 0 14px; }
          .hdr-brand h1 { font-size: 16px; }
          .hdr-ctr { padding: 0 14px; min-width: 48px; }
          .hdr-ctr-num { font-size: 18px; }
          .hdr-add { display: none; }
          .hdr-add-mobile { display: flex; }
        }

        .inp { flex: 1; min-width: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #f0f0f0; font-family: 'DM Sans', sans-serif; font-size: 15px; padding: 10px 16px; outline: none; transition: border-color 0.2s; }
        .inp:focus { border-color: rgba(255,255,255,0.25); }
        .inp::placeholder { color: rgba(255,255,255,0.22); }

        .inp-date { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: rgba(255,255,255,0.7); font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 10px 12px; outline: none; -webkit-appearance: none; flex-shrink: 0; width: 150px; }
        .inp-date::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; width: 16px; height: 16px; }
        @media (max-width: 700px) { .inp-date { width: 100%; } }

        .btn-add { background: #f0f0f0; color: #0d0d0d; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; padding: 10px 20px; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.15s; }
        .btn-add:hover { background: #fff; transform: translateY(-1px); }
        .btn-add:disabled { opacity: 0.2; cursor: not-allowed; transform: none; }

        .cat-flow { flex: 1; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; min-width: 0; }
        .cat-name { font-family: 'Playfair Display', serif; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
        .cat-q { font-size: 14px; color: rgba(255,255,255,0.5); white-space: nowrap; }
        .cat-yes { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; padding: 9px 22px; border-radius: 9px; cursor: pointer; border: 1.5px solid #2ed8a8; color: #2ed8a8; background: transparent; transition: all 0.15s; }
        .cat-yes:hover { background: #2ed8a8; color: #0d0d0d; }
        .cat-no { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; padding: 9px 22px; border-radius: 9px; cursor: pointer; border: 1.5px solid #ff4757; color: #ff4757; background: transparent; transition: all 0.15s; }
        .cat-no:hover { background: #ff4757; color: #fff; }

        .matrix { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; min-height: calc(100vh - 64px); position: relative; }
        @media (max-width: 700px) { .matrix { grid-template-columns: 1fr; grid-template-rows: auto; min-height: auto; } .axis-v, .axis-h, .axis-lbl { display: none !important; } }

        .axis-v { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: rgba(255,255,255,0.07); pointer-events: none; z-index: 5; }
        .axis-h { position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.07); pointer-events: none; z-index: 5; }
        .axis-lbl { position: absolute; z-index: 6; pointer-events: none; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.13); background: #0d0d0d; padding: 2px 8px; border-radius: 4px; }
        .lbl-urgent { top: 50%; left: 16px; transform: translateY(-50%); }
        .lbl-not-urgent { top: 50%; right: 16px; transform: translateY(-50%); }
        .lbl-important { left: 50%; top: 16px; transform: translateX(-50%); }
        .lbl-not-important { left: 50%; bottom: 16px; transform: translateX(-50%); }

        .quad { padding: 18px 20px; overflow-y: auto; border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; }
        .quad:nth-child(6), .quad:nth-child(8) { border-right: none; }
        .quad:nth-child(7), .quad:nth-child(8) { border-bottom: none; }
        .quad.over { background: rgba(255,255,255,0.03); }
        @media (max-width: 700px) { .quad { border-right: none !important; min-height: 140px; } .quad:not(:last-child) { border-bottom: 1px solid rgba(255,255,255,0.05) !important; } }

        .q-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .q-name { font-size: 13px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; }
        .q-sub { font-size: 10px; color: rgba(255,255,255,0.25); letter-spacing: 0.05em; margin-top: 2px; }
        .q-badge { font-size: 12px; font-weight: 800; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .card { display: flex; align-items: flex-start; gap: 10px; background: rgba(255,255,255,0.055); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 11px 13px; margin-bottom: 7px; font-size: 14px; line-height: 1.45; cursor: grab; transition: transform 0.12s, box-shadow 0.12s, background 0.15s; animation: rise 0.2s ease; position: relative; }
        .card:hover { background: rgba(255,255,255,0.09); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.35); }
        .card.done-q { background: transparent; border-color: rgba(255,255,255,0.04); cursor: default; opacity: 0.4; transform: none !important; box-shadow: none !important; }
        .card.done-q .card-txt { text-decoration: line-through; }
        .card.done-b { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.04); cursor: default; opacity: 0.55; }
        .card.done-b .card-txt { text-decoration: line-through; color: rgba(255,255,255,0.35); }

        .cb { width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid rgba(255,255,255,0.22); background: transparent; cursor: pointer; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .cb:hover { border-color: rgba(255,255,255,0.5); }
        .cb.on { background: #2ed8a8; border-color: #2ed8a8; }

        .card-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; margin-top: 1px; }
        .x-btn { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.15); font-size: 12px; padding: 3px 4px; transition: color 0.12s; }
        .x-btn:hover { color: #ff4757; }
        .move-btn { background: none; border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; cursor: pointer; color: rgba(255,255,255,0.3); font-size: 11px; padding: 3px 7px; transition: all 0.12s; white-space: nowrap; font-family: 'DM Sans', sans-serif; font-weight: 600; }
        .move-btn:hover { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.7); }

        .move-menu { position: absolute; right: 0; top: 100%; margin-top: 4px; background: #1c1c1c; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 6px; z-index: 100; min-width: 160px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
        .move-option { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 7px; cursor: pointer; font-size: 13px; transition: background 0.12s; font-family: 'DM Sans', sans-serif; }
        .move-option:hover { background: rgba(255,255,255,0.07); }

        .due-tag { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; white-space: nowrap; letter-spacing: 0.03em; }
        .empty { font-size: 12px; color: rgba(255,255,255,0.1); text-align: center; padding: 22px 12px; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.06); font-style: italic; }
        .done-div { border: none; border-top: 1px dashed rgba(255,255,255,0.07); margin: 8px 0 6px; }
        .done-lbl { font-size: 9px; color: rgba(255,255,255,0.15); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 5px; }

        .comp { border-top: 1px solid rgba(255,255,255,0.06); }
        .comp-hdr { display: flex; align-items: center; justify-content: space-between; padding: 13px 20px; cursor: pointer; transition: background 0.15s; }
        .comp-hdr:hover { background: rgba(255,255,255,0.03); }
        .comp-body { padding: 8px 20px 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; }
        @media (max-width: 700px) { .comp-body { grid-template-columns: 1fr; } }

        .footer { padding: 10px 20px; border-top: 1px solid rgba(255,255,255,0.04); font-size: 11px; color: rgba(255,255,255,0.13); text-align: center; letter-spacing: 0.05em; }
        @keyframes rise { from { opacity:0; transform: translateY(5px); } to { opacity:1; transform: none; } }
      `}</style>

      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-top">
          <div className="hdr-brand">
            <h1>Task Prioritizer</h1>
            <p>Eisenhower Matrix</p>
          </div>
          <div className="hdr-counters">
            {QUADRANTS.map((q) => {
              const count = tasks.filter((t) => t.quadrant === q.id && !t.done).length;
              return (
                <div key={q.id} className="hdr-ctr" title={q.label}>
                  <span className="hdr-ctr-num" style={{ color: count > 0 ? q.color : "rgba(255,255,255,0.15)" }}>{count}</span>
                  <span className="hdr-ctr-lbl">{q.emoji}</span>
                </div>
              );
            })}
          </div>
          {/* Desktop add */}
          <div className="hdr-add">
            {step === "input" && (
              <>
                <input ref={inputRef} className="inp" placeholder="Add a task to prioritize…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddStart()} autoFocus />
                <input type="date" className="inp-date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                <button className="btn-add" onClick={handleAddStart} disabled={!input.trim()}>Add →</button>
              </>
            )}
            {step === "urgent" && (
              <div className="cat-flow">
                <span className="cat-name">"{input}"</span>
                <span className="cat-q">⚡ Urgent?</span>
                <button className="cat-yes" onClick={() => handleUrgent(true)}>YES</button>
                <button className="cat-no" onClick={() => handleUrgent(false)}>NO</button>
              </div>
            )}
            {step === "important" && (
              <div className="cat-flow">
                <span className="cat-name">"{input}"</span>
                <span className="cat-q">🎯 Important?</span>
                <button className="cat-yes" onClick={() => handleImportant(true)}>YES</button>
                <button className="cat-no" onClick={() => handleImportant(false)}>NO</button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile add */}
        <div className="hdr-add-mobile">
          {step === "input" && (
            <>
              <div className="hdr-add-mobile-row">
                <input ref={inputRef} className="inp" placeholder="Add a task…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddStart()} />
                <button className="btn-add" onClick={handleAddStart} disabled={!input.trim()}>Add →</button>
              </div>
              <input type="date" className="inp-date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </>
          )}
          {step === "urgent" && (
            <div className="cat-flow">
              <span className="cat-name">"{input}"</span>
              <span className="cat-q">⚡ Urgent?</span>
              <button className="cat-yes" onClick={() => handleUrgent(true)}>YES</button>
              <button className="cat-no" onClick={() => handleUrgent(false)}>NO</button>
            </div>
          )}
          {step === "important" && (
            <div className="cat-flow">
              <span className="cat-name">"{input}"</span>
              <span className="cat-q">🎯 Important?</span>
              <button className="cat-yes" onClick={() => handleImportant(true)}>YES</button>
              <button className="cat-no" onClick={() => handleImportant(false)}>NO</button>
            </div>
          )}
        </div>
      </header>

      {/* MATRIX */}
      <div className="matrix" onClick={() => setMoveMenu(null)}>
        <div className="axis-v" />
        <div className="axis-h" />
        <span className="axis-lbl lbl-urgent">← URGENT</span>
        <span className="axis-lbl lbl-not-urgent">NOT URGENT →</span>
        <span className="axis-lbl lbl-important">IMPORTANT ↑</span>
        <span className="axis-lbl lbl-not-important">↓ NOT IMPORTANT</span>

        {QUADRANTS.map((q) => {
          const qActive = tasks.filter((t) => t.quadrant === q.id && !t.done);
          const qDone = tasks.filter((t) => t.quadrant === q.id && t.done && !t.hidden_from_quadrant);
          const isOver = dragOver === q.id;

          return (
            <div key={q.id} className={`quad${isOver ? " over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(q.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, q.id)}>

              <div className="q-hdr">
                <div>
                  <div className="q-name" style={{ color: q.color }}>{q.emoji} {q.label}</div>
                  <div className="q-sub">{q.sub}</div>
                </div>
                <div className="q-badge" style={{ color: q.color, background: q.accent }}>{qActive.length}</div>
              </div>

              {qActive.length === 0 && qDone.length === 0 && <div className="empty">Drop tasks here</div>}

              {qActive.map((task) => {
                const due = getDueLabel(task.due_date);
                return (
                  <div key={task.id} className="card" draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    onClick={(e) => e.stopPropagation()}>
                    <div className="cb" onClick={() => handleToggleDone(task)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-txt" style={{ marginBottom: "5px", wordBreak: "break-word" }}>{task.text}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {due && <span className="due-tag" style={{ color: due.color, background: due.bg }}>{due.label}</span>}
                        {task.due_date
                          ? <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{formatDate(task.due_date)}</span>
                          : <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", fontStyle: "italic" }}>no due date</span>
                        }
                      </div>
                    </div>
                    <div className="card-actions" style={{ position: "relative" }}>
                      <button className="move-btn" onClick={(e) => { e.stopPropagation(); setMoveMenu(moveMenu === task.id ? null : task.id); }}>↗ Move</button>
                      <button className="x-btn" onClick={() => handleDelete(task.id)}>✕</button>
                      {moveMenu === task.id && (
                        <div className="move-menu" onClick={(e) => e.stopPropagation()}>
                          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", padding: "4px 10px 6px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Move to…</div>
                          {QUADRANTS.filter((opt) => opt.id !== q.id).map((opt) => (
                            <div key={opt.id} className="move-option" onClick={() => handleMoveTask(task.id, opt.id)}>
                              <span>{opt.emoji}</span>
                              <span style={{ color: opt.color, fontWeight: 600 }}>{opt.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {qDone.length > 0 && (
                <>
                  {qActive.length > 0 && <hr className="done-div" />}
                  <div className="done-lbl">completed</div>
                  {qDone.map((task) => (
                    <div key={task.id} className="card done-q" onClick={(e) => e.stopPropagation()}>
                      <div className="cb on" onClick={() => handleToggleDone(task)}>
                        <span style={{ color: "#0d0d0d", fontSize: "9px", fontWeight: 900 }}>✓</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="card-txt" style={{ wordBreak: "break-word" }}>{task.text}</div>
                      </div>
                      <button className="x-btn" onClick={() => handleDelete(task.id)}>✕</button>
                    </div>
                  ))}
                </>
              )}
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.1)", marginTop: "10px", fontStyle: "italic" }}>{q.desc}</div>
            </div>
          );
        })}
      </div>

      {/* COMPLETED */}
      {completedTasks.length > 0 && (
        <div className="comp">
          <div className="comp-hdr" onClick={() => setShowDone((v) => !v)}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>✅</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>COMPLETED</span>
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "1px 9px", borderRadius: "20px", background: "rgba(46,216,168,0.1)", color: "#2ed8a8" }}>{completedTasks.length}</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>{showDone ? "▾" : "▸"}</span>
          </div>
          {showDone && (
            <div className="comp-body">
              {completedTasks.map((task) => {
                const q = QUADRANTS.find((q) => q.id === task.quadrant);
                return (
                  <div key={task.id} className="card done-b">
                    <div className="cb on" onClick={() => handleToggleDone(task)}>
                      <span style={{ color: "#0d0d0d", fontSize: "9px", fontWeight: 900 }}>✓</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-txt" style={{ wordBreak: "break-word" }}>{task.text}</div>
                      <span style={{ fontSize: "10px", color: q.color, fontWeight: 700 }}>{q.emoji} {q.label}</span>
                    </div>
                    <button className="x-btn" onClick={() => handleDelete(task.id)}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="footer">☁️ Synced across devices · drag to move (desktop) · ↗ Move button (mobile) · ✓ to complete</div>
    </div>
  );
}
