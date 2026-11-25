import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const initialMeds = [
  { id: 1, name: "Vitamin D3", detail: "1000 IU · 1 capsule", time: "8:00 AM", taken: true, icon: "☀", color: "amber" },
  { id: 2, name: "Omega 3", detail: "1200 mg · 1 softgel", time: "1:00 PM", taken: false, icon: "◒", color: "blue" },
  { id: 3, name: "Magnesium", detail: "200 mg · 1 tablet", time: "8:00 PM", taken: false, icon: "✳", color: "violet" },
];
const initialAppointments = [
  { id: "demo-appointment-1", date: "2026-11-24", day: "24", month: "NOV", title: "Annual check-up", doctor: "Dr. Priya Sharma · General physician", time: "10:30 AM", tag: "IN PERSON", color: "green" },
  { id: "demo-appointment-2", date: "2026-12-02", day: "02", month: "DEC", title: "Dental cleaning", doctor: "Dr. Anil Mehta · Dentist", time: "2:00 PM", tag: "IN PERSON", color: "blue" },
];
const initialReadings = [{ label: "Blood pressure", value: "118/76", unit: "mmHg", date: "Nov 21", icon: "⌁", tone: "rose" }, { label: "Heart rate", value: "72", unit: "bpm", date: "Nov 21", icon: "♡", tone: "pink" }, { label: "Weight", value: "68.4", unit: "kg", date: "Nov 19", icon: "◉", tone: "blue" }];
const nav = [{ id: "overview", icon: "▦", label: "Overview" }, { id: "medications", icon: "✚", label: "Medications" }, { id: "appointments", icon: "▣", label: "Appointments" }, { id: "health", icon: "⌁", label: "Health records" }];

function Icon({ children, className = "" }) { return <span className={`icon ${className}`} aria-hidden="true">{children}</span>; }

async function apiRequest(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || "The request could not be completed.");
  return result;
}

function initials(name = "") { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "PT"; }
function localDate() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function mapMedication(item, index = 0) { const styles = [["☀", "amber"], ["◒", "blue"], ["✳", "violet"], ["✚", "mint"]]; const [icon, color] = styles[index % styles.length]; return { ...item, id: item.id, icon, color, taken: Boolean(item.taken) }; }
function mapAppointment(item, index = 0) { const date = new Date(`${item.date}T00:00:00`); return { ...item, day: String(date.getDate()).padStart(2, "0"), month: date.toLocaleString("en", { month: "short" }).toUpperCase(), weekday: date.toLocaleString("en", { weekday: "short" }).toUpperCase(), doctor: [item.provider, item.specialty].filter(Boolean).join(" · ") || "Healthcare provider", tag: (item.type || "In person").toUpperCase(), color: index % 2 ? "blue" : "green" }; }
function mapReading(item) { const recorded = new Date(item.recordedAt); const tone = /heart/i.test(item.label) ? "pink" : /blood|pressure/i.test(item.label) ? "rose" : "blue"; return { ...item, date: Number.isNaN(recorded.getTime()) ? "Today" : recorded.toLocaleDateString("en", { month: "short", day: "numeric" }), icon: tone === "pink" ? "♡" : tone === "rose" ? "⌁" : "◉", tone }; }

function AddMedication({ onClose, onAdd }) {
  const [name, setName] = useState(""); const [dose, setDose] = useState(""); const [time, setTime] = useState("8:00 AM");
  function submit(event) { event.preventDefault(); if (!name.trim()) return; onAdd({ id: Date.now(), name: name.trim(), detail: dose.trim() || "As prescribed", time, taken: false, icon: "✚", color: "mint" }); onClose(); }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="modal-icon">✚</div><p className="eyebrow">YOUR DAILY ROUTINE</p><h2 id="modal-title">Add a medication</h2><p className="muted-copy">Keep your schedule in one simple place.</p><form onSubmit={submit}><label>Medication name<input autoFocus required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vitamin D3" /></label><label>Dosage or notes<input value={dose} onChange={e => setDose(e.target.value)} placeholder="e.g. 1000 IU · 1 capsule" /></label><label>Reminder time<select value={time} onChange={e => setTime(e.target.value)}>{["8:00 AM", "9:00 AM", "1:00 PM", "6:00 PM", "8:00 PM"].map(t => <option key={t}>{t}</option>)}</select></label><button className="button button-primary full" type="submit">Add to my routine <span>→</span></button></form></section></div>;
}

function AccountDialog({ user, onClose, onSuccess, onSignOut }) {
  const [mode, setMode] = useState("login"); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setError(""); setBusy(true); try { const result = await apiRequest(`/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", body: { ...(mode === "register" ? { name } : {}), email, password } }); onSuccess(result); onClose(); } catch (requestError) { setError(requestError.message === "Failed to fetch" ? "The Wellnest API is not running yet. Start the backend and try again." : requestError.message); } finally { setBusy(false); } }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="account-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="modal-icon">♙</div>{user ? <><p className="eyebrow">ACCOUNT</p><h2 id="account-title">Personal health account</h2><p className="muted-copy">Signed in as {user.email}</p><button className="button button-primary full" onClick={onSignOut}>Sign out</button></> : <><p className="eyebrow">YOUR PRIVATE WORKSPACE</p><h2 id="account-title">{mode === "login" ? "Sign in to Wellnest" : "Create your account"}</h2><p className="muted-copy">Your records are saved to your account when you sign in.</p><form onSubmit={submit}>{mode === "register" && <label>Full name<input required maxLength="100" value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Your name" /></label>}<label>Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" /></label><label>Password<input required minLength="8" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" /></label>{error && <p className="auth-error">{error}</p>}<button className="button button-primary full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form><p className="account-switch">{mode === "login" ? "New to Wellnest?" : "Already have an account?"} <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create account" : "Sign in"}</button></p></>}</section></div>;
}

function AddAppointment({ onClose, onAdd }) {
  const [form, setForm] = useState({ title: "", provider: "", specialty: "", date: localDate(), time: "10:00 AM", type: "In person" });
  function change(key, value) { setForm(current => ({ ...current, [key]: value })); }
  function submit(event) { event.preventDefault(); onAdd(form); onClose(); }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="appointment-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="modal-icon">▣</div><p className="eyebrow">PLAN AHEAD</p><h2 id="appointment-title">Add an appointment</h2><p className="muted-copy">Save a visit to your personal schedule.</p><form onSubmit={submit}><label>Appointment title<input required maxLength="120" value={form.title} onChange={e => change("title", e.target.value)} placeholder="e.g. Annual check-up" /></label><div className="form-pair"><label>Provider<input value={form.provider} onChange={e => change("provider", e.target.value)} placeholder="Name (optional)" /></label><label>Specialty<input value={form.specialty} onChange={e => change("specialty", e.target.value)} placeholder="e.g. Dentist" /></label></div><div className="form-pair"><label>Date<input required type="date" value={form.date} onChange={e => change("date", e.target.value)} /></label><label>Time<input required value={form.time} onChange={e => change("time", e.target.value)} placeholder="e.g. 10:30 AM" /></label></div><label>Visit type<select value={form.type} onChange={e => change("type", e.target.value)}><option>In person</option><option>Virtual</option></select></label><button className="button button-primary full">Save appointment</button></form></section></div>;
}

function AddReading({ onClose, onAdd }) {
  const [form, setForm] = useState({ label: "", value: "", unit: "" });
  function change(key, value) { setForm(current => ({ ...current, [key]: value })); }
  function submit(event) { event.preventDefault(); onAdd(form); onClose(); }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reading-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="modal-icon">⌁</div><p className="eyebrow">PERSONAL HEALTH LOG</p><h2 id="reading-title">Add a reading</h2><p className="muted-copy">Record a value you want to keep track of.</p><form onSubmit={submit}><label>Reading name<input required maxLength="120" value={form.label} onChange={e => change("label", e.target.value)} placeholder="e.g. Blood pressure" /></label><div className="form-pair"><label>Value<input required maxLength="80" value={form.value} onChange={e => change("value", e.target.value)} placeholder="e.g. 118/76" /></label><label>Unit<input maxLength="40" value={form.unit} onChange={e => change("unit", e.target.value)} placeholder="e.g. mmHg" /></label></div><button className="button button-primary full">Save reading</button></form></section></div>;
}

function App() {
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [active, setActive] = useState("overview"); const [theme, setTheme] = useState(() => localStorage.getItem("wellnest-theme") || "light"); const [meds, setMeds] = useState(() => localStorage.getItem("wellnest-token") ? [] : initialMeds); const [appointments, setAppointments] = useState(() => localStorage.getItem("wellnest-token") ? [] : initialAppointments); const [readings, setReadings] = useState(() => localStorage.getItem("wellnest-token") ? [] : initialReadings); const [showModal, setShowModal] = useState(false); const [showAccount, setShowAccount] = useState(false); const [showAppointment, setShowAppointment] = useState(false); const [showReading, setShowReading] = useState(false); const [toast, setToast] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("wellnest-token") || "");
  const [currentUser, setCurrentUser] = useState(() => { try { return JSON.parse(localStorage.getItem("wellnest-user") || "null"); } catch { return null; } });
  useEffect(() => {
    const clock = window.setInterval(() => setCurrentDateTime(new Date()), 30_000);
    return () => window.clearInterval(clock);
  }, []);
  const currentDateLabel = currentDateTime.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const currentTimeLabel = currentDateTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const takenCount = meds.filter(m => m.taken).length; const progress = meds.length ? Math.round(takenCount / meds.length * 100) : 0;
  const title = nav.find(item => item.id === active)?.label || "Overview";
  function notify(message) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function toggleTheme() { const next = theme === "light" ? "dark" : "light"; setTheme(next); localStorage.setItem("wellnest-theme", next); }
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [savedMeds, savedAppointments, savedReadings] = await Promise.all([
          apiRequest(`/medications?date=${localDate()}`, { token }),
          apiRequest("/appointments", { token }),
          apiRequest("/readings", { token })
        ]);
        if (!cancelled) { setMeds(savedMeds.map(mapMedication)); setAppointments(savedAppointments.map(mapAppointment)); setReadings(savedReadings.map(mapReading)); }
      } catch (error) {
        if (!cancelled) { notify(error.message); if (error.message.includes("session has expired")) signOut(); }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);
  function signOut() { localStorage.removeItem("wellnest-token"); localStorage.removeItem("wellnest-user"); setToken(""); setCurrentUser(null); setMeds(initialMeds); setAppointments(initialAppointments); setReadings(initialReadings); setShowAccount(false); notify("Signed out. Showing demo data."); }
  function acceptSession(session) { localStorage.setItem("wellnest-token", session.token); localStorage.setItem("wellnest-user", JSON.stringify(session.user)); setCurrentUser(session.user); setMeds([]); setAppointments([]); setReadings([]); setToken(session.token); notify("Signed in. Loading your records."); }
  async function addMedication(med) {
    if (!token) { setMeds(items => [...items, med]); notify(`${med.name} added to this demo session`); return; }
    try { const saved = await apiRequest("/medications", { token, method: "POST", body: { name: med.name, detail: med.detail, time: med.time } }); setMeds(items => [...items, mapMedication(saved, items.length)]); notify("Medication saved to your account"); }
    catch (error) { notify(error.message); }
  }
  async function toggleMed(id) {
    const med = meds.find(m => m.id === id); if (!med) return;
    const taken = !med.taken;
    if (token) {
      try { await apiRequest(`/medications/${encodeURIComponent(id)}`, { token, method: "PATCH", body: { taken, date: localDate() } }); }
      catch (error) { notify(error.message); return; }
    }
    setMeds(items => items.map(m => m.id === id ? { ...m, taken } : m));
    notify(taken ? `${med.name} marked as taken` : `${med.name} marked as not taken`);
  }
  async function addAppointment(appointment) {
    if (!token) { setAppointments(items => [...items, mapAppointment({ ...appointment, id: Date.now() })].sort((a, b) => a.date.localeCompare(b.date))); notify("Appointment added to this demo session"); return; }
    try { const saved = await apiRequest("/appointments", { token, method: "POST", body: appointment }); setAppointments(items => [...items, mapAppointment(saved)].sort((a, b) => a.date.localeCompare(b.date))); notify("Appointment saved to your account"); }
    catch (error) { notify(error.message); }
  }
  async function addReading(reading) {
    if (!token) { setReadings(items => [{ ...reading, date: "Today", icon: "⌁", tone: "blue" }, ...items]); notify("Reading added to this demo session"); return; }
    try { const saved = await apiRequest("/readings", { token, method: "POST", body: reading }); setReadings(items => [mapReading(saved), ...items]); notify("Reading saved to your account"); }
    catch (error) { notify(error.message); }
  }
  const nextAppointment = appointments[0];
  return <div className="app-shell" data-theme={theme}>
    <aside className="sidebar"><a className="brand" href="#overview" onClick={() => setActive("overview")}><span className="brand-mark">✚</span><span>Wellnest<small>PERSONAL HEALTH TRACKER</small></span></a><div className="side-label">WORKSPACE</div><nav className="side-nav" aria-label="Main navigation">{nav.map(item => <button key={item.id} className={active === item.id ? "nav-item selected" : "nav-item"} onClick={() => setActive(item.id)}><Icon>{item.icon}</Icon>{item.label}{item.id === "medications" && <span className="nav-count">{meds.length}</span>}</button>)}</nav><div className="side-spacer"/><div className="help-card"><div className="help-orb">✳</div><b>Need assistance?</b><p>Find guidance on managing your personal health records.</p><button onClick={() => notify("Support resources are coming soon")}>Support resources <span>↗</span></button></div><button className="profile" onClick={() => setShowAccount(true)}><span className="avatar">{initials(currentUser?.name)}</span><span><b>{currentUser?.name || "Guest profile"}</b><small>{currentUser ? "Personal account" : "Demo data only"}</small></span><span className="profile-more">···</span></button></aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumb"><span>My health</span><b>/</b>{title}</div><div className="top-actions"><span className="today-chip"><span className="calendar-mini">▦</span> Monday, November 23</span><button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}><span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span><span className="theme-label">{theme === "light" ? "Dark mode" : "Light mode"}</span></button><button className="bell-button" aria-label="Notifications" onClick={() => notify("You’re all caught up")}><span>♧</span><i/></button><span className="top-avatar">{initials(currentUser?.name)}</span></div></header>
    <div className="page-content"><section className="welcome-row"><div><p className="eyebrow"><time dateTime={currentDateTime.toISOString()} aria-label={`Local date and time: ${currentDateLabel}, ${currentTimeLabel}`}>{currentDateLabel} · {currentTimeLabel} local</time> <span className="sun-symbol">☀</span></p><h1>{active === "overview" ? <>Good morning<span className="wave">✦</span></> : title}</h1><p className="intro">{active === "overview" ? "Your health overview and daily care schedule." : `Review and manage your ${title.toLowerCase()}.`}</p></div>{active === "overview" && <button className="button button-primary" onClick={() => setShowModal(true)}><span className="plus">＋</span> Add medication</button>}</section>
    {active === "overview" && <>
      <section className="summary-grid"><article className="summary-card adherence-card"><div className="summary-top"><span className="summary-icon mint-bg">✚</span><span className="trend-pill">↗ &nbsp;On track</span></div><p className="card-label">TODAY’S MEDICATIONS</p><div className="summary-value">{takenCount}<small>/{meds.length}</small><span> taken today</span></div><div className="progress-track"><span style={{ width: `${progress}%` }}/></div><div className="card-foot"><span>{progress}% completed</span><button onClick={() => setActive("medications")}>View schedule <span>→</span></button></div></article>
        <article className="summary-card appointment-summary"><div className="summary-top"><span className="summary-icon lilac-bg">▣</span><span className="tiny-status">{nextAppointment ? "UP NEXT" : "SCHEDULE"}</span></div><p className="card-label">NEXT APPOINTMENT</p><div className="appointment-date"><strong>{nextAppointment?.day || "—"}</strong><span>{nextAppointment?.month || "NONE"}<br/><small>{nextAppointment?.weekday || " "}</small></span></div><div className="appointment-name"><b>{nextAppointment?.title || "No upcoming visits"}</b><span>{nextAppointment ? `${nextAppointment.time} · ${nextAppointment.provider || nextAppointment.doctor.split(" · ")[0]}` : "Add an appointment to get started"}</span></div><div className="card-foot"><span className="green-dot">●</span><span>{nextAppointment ? "Next scheduled visit" : "No visits scheduled"}</span><button onClick={() => setActive("appointments")}>View schedule <span>→</span></button></div></article>
        <article className="summary-card wellbeing-card"><div className="summary-top"><span className="summary-icon peach-bg">☼</span><span className="streak-pill">✦ &nbsp;3 day streak</span></div><p className="card-label">WELLNESS CHECK-IN</p><div className="wellbeing-title">You’re building<br/>healthy habits.</div><p className="wellbeing-copy">Small steps add up. Keep showing up for yourself.</p><div className="card-foot"><span>Last check-in · Today</span><button onClick={() => notify("Your daily check-in is complete")}>Check in <span>→</span></button></div></article></section>
      <section className="dashboard-columns"><article className="panel medication-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR ROUTINE</p><h2>Today’s medications</h2></div><button className="text-link" onClick={() => setActive("medications")}>See all <span>→</span></button></div><div className="med-list">{meds.slice(0, 4).map((med, index) => <div className={`med-row ${med.taken ? "is-taken" : ""}`} key={med.id}><span className={`med-symbol ${med.color}`}>{med.icon}</span><div className="med-info"><b>{med.name}</b><span>{med.detail}</span></div><span className="med-time"><i>◷</i>{med.time}</span><button className={med.taken ? "taken-button" : "take-button"} onClick={() => toggleMed(med.id)}>{med.taken ? <><span>✓</span> Taken</> : "Mark taken"}</button></div>)}</div><button className="add-inline" onClick={() => setShowModal(true)}>＋ &nbsp;Add a medication</button></article>
      <article className="panel appointments-panel"><div className="panel-heading"><div><p className="eyebrow">COMING UP</p><h2>Appointments</h2></div><button className="square-add" aria-label="Add appointment" onClick={() => setShowAppointment(true)}>＋</button></div><div className="appointment-list">{appointments.slice(0, 2).map(item => <div className="appointment-row" key={item.id || item.title}><div className={`date-block ${item.color}`}><b>{item.day}</b><span>{item.month}</span></div><div className="appointment-details"><b>{item.title}</b><span>{item.provider ? [item.provider, item.specialty].filter(Boolean).join(" · ") : item.doctor}</span><small><i>◷</i> {item.time} <em>{item.tag || item.type?.toUpperCase()}</em></small></div><button className="more-button" aria-label={`More about ${item.title}`} onClick={() => notify(`${item.title} · ${item.time}`)}>···</button></div>)}{appointments.length === 0 && <p className="empty-state">No appointments yet. Add a visit to keep it on your schedule.</p>}</div><button className="panel-bottom-link" onClick={() => setActive("appointments")}>View all appointments <span>→</span></button></article></section>
      <section className="panel health-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR NUMBERS, OVER TIME</p><h2>Recent health readings</h2></div><button className="text-link" onClick={() => setActive("health")}>View health records <span>→</span></button></div><div className="reading-grid">{readings.slice(0,3).map((r, i) => <article className="reading-card" key={`${r.label}-${i}`}><span className={`reading-icon ${r.tone}`}>{r.icon}</span><span className="reading-date">{r.date}</span><p>{r.label}</p><strong>{r.value}<small> {r.unit}</small></strong><div className="sparkline" aria-label="Recent trend"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>)}</div></section>
    </>}
    {active === "medications" && <section className="panel full-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR ROUTINE</p><h2>Medication schedule</h2></div><button className="button button-primary" onClick={() => setShowModal(true)}><span className="plus">＋</span> Add medication</button></div><p className="section-description">Your daily schedule · {takenCount} of {meds.length} completed</p><div className="med-list expanded">{meds.map(med => <div className={`med-row ${med.taken ? "is-taken" : ""}`} key={med.id}><span className={`med-symbol ${med.color}`}>{med.icon}</span><div className="med-info"><b>{med.name}</b><span>{med.detail}</span></div><span className="med-time"><i>◷</i>{med.time}</span><button className={med.taken ? "taken-button" : "take-button"} onClick={() => toggleMed(med.id)}>{med.taken ? <><span>✓</span> Taken</> : "Mark taken"}</button></div>)}</div><div className="privacy-note">ⓘ &nbsp;Follow the instructions from your healthcare professional for medication use.</div></section>}
    {active === "appointments" && <section className="panel full-panel"><div className="panel-heading"><div><p className="eyebrow">PLAN AHEAD</p><h2>Your appointments</h2></div><button className="button button-primary" onClick={() => setShowAppointment(true)}><span className="plus">＋</span> Add appointment</button></div><p className="section-description">Keep upcoming visits and check-ups close at hand.</p><div className="appointment-list expanded">{appointments.map(item => <div className="appointment-row" key={item.id || item.title}><div className={`date-block ${item.color}`}><b>{item.day}</b><span>{item.month}</span></div><div className="appointment-details"><b>{item.title}</b><span>{item.provider ? [item.provider, item.specialty].filter(Boolean).join(" · ") : item.doctor}</span><small><i>◷</i> {item.time} <em>{item.tag || item.type?.toUpperCase()}</em></small></div><button className="more-button" aria-label={`More about ${item.title}`} onClick={() => notify(`${item.title} · ${item.time}`)}>···</button></div>)}{appointments.length === 0 && <p className="empty-state">No appointments yet. Add a visit to keep it on your schedule.</p>}</div><div className="privacy-note">ⓘ &nbsp;Appointment details are saved to your account when you are signed in.</div></section>}
    {active === "health" && <section className="panel full-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR NUMBERS, OVER TIME</p><h2>Health records</h2></div><button className="button button-primary" onClick={() => setShowReading(true)}><span className="plus">＋</span> Add a reading</button></div><p className="section-description">A simple log of readings you choose to track.</p><div className="reading-grid expanded-readings">{readings.map((r, i) => <article className="reading-card" key={r.id || `${r.label}-${i}`}><span className={`reading-icon ${r.tone}`}>{r.icon}</span><span className="reading-date">{r.date}</span><p>{r.label}</p><strong>{r.value}<small> {r.unit}</small></strong><div className="sparkline" aria-label="Recent trend"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>)}</div>{readings.length === 0 && <p className="empty-state">No readings have been recorded yet.</p>}<div className="privacy-note">ⓘ &nbsp;Readings are for personal tracking and aren’t medical advice.</div></section>}
      <footer className="page-footer"><span>© 2026 Wellnest · Personal health tracker</span><span>For personal organization only</span></footer></div></main>
    {showModal && <AddMedication onClose={() => setShowModal(false)} onAdd={addMedication} />}{showAccount && <AccountDialog user={currentUser} onClose={() => setShowAccount(false)} onSuccess={acceptSession} onSignOut={signOut} />}{showAppointment && <AddAppointment onClose={() => setShowAppointment(false)} onAdd={addAppointment} />}{showReading && <AddReading onClose={() => setShowReading(false)} onAdd={addReading} />}{toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}</div>;
}

export default App;
