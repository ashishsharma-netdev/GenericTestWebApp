import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, ClipboardList, BarChart3, UserRound, LogOut, BookOpen, Trophy, Target, Clock3, CheckCircle2, XCircle, ArrowRight, RefreshCw, ShieldCheck, Crown, ChevronRight, LockKeyhole } from 'lucide-react';
import { api } from './api';
import './student.css';

const navItems = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['tests', 'My Tests', ClipboardList],
  ['history', 'Test History', BarChart3],
  ['profile', 'Profile', UserRound]
];

function saveTokens(result) {
  localStorage.setItem('testprep_access_token', result.accessToken);
  localStorage.setItem('testprep_refresh_token', result.refreshToken);
}

async function refreshSession() {
  const refreshToken = localStorage.getItem('testprep_refresh_token');
  if (!refreshToken) return false;
  try {
    const result = await api.auth.refresh({ refreshToken });
    saveTokens(result);
    return true;
  } catch {
    localStorage.removeItem('testprep_access_token');
    localStorage.removeItem('testprep_refresh_token');
    return false;
  }
}

async function authenticatedCall(fn) {
  try { return await fn(); }
  catch (error) {
    if (error.status === 401 && await refreshSession()) return fn();
    throw error;
  }
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('testprep_access_token')) { window.location.href = '/auth.html'; return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const [me, attempts, cats] = await Promise.all([
        authenticatedCall(() => api.users.me()),
        authenticatedCall(() => api.auth.history()),
        api.categories().catch(() => [])
      ]);
      setUser(me); setHistory(attempts || []); setCategories(cats || []);
      const allTests = [];
      for (const category of cats || []) {
        try { const items = await api.tests(category.name); allTests.push(...items); } catch { /* keep dashboard usable */ }
      }
      setTests(allTests);
    } catch (e) {
      setError(e.message || 'Unable to load your dashboard.');
      if (!localStorage.getItem('testprep_access_token')) window.location.href = '/auth.html';
    } finally { setLoading(false); }
  };

  const signOut = async () => {
    const refreshToken = localStorage.getItem('testprep_refresh_token');
    try { if (refreshToken) await api.auth.logout({ refreshToken }); } catch { /* logout locally even if API is unavailable */ }
    localStorage.removeItem('testprep_access_token');
    localStorage.removeItem('testprep_refresh_token');
    window.location.href = '/';
  };

  const updateUser = next => setUser(next);

  if (loading && !user) return <div className="student-loading"><RefreshCw className="spin"/> Loading your TestPrep account...</div>;

  return <div className="student-app">
    <header className="student-topbar">
      <button className="student-brand" onClick={() => setPage('dashboard')}><span className="brand-mark">✦</span><span>TestPrep</span></button>
      <div className="student-top-actions">
        <button className="open-tests" onClick={() => setPage('tests')}>Browse Tests <ArrowRight size={15}/></button>
        <div className="user-chip"><span className="user-avatar">{initials(user?.fullName)}</span><span>{user?.fullName || 'Student'}</span></div>
      </div>
    </header>
    <div className="student-layout">
      <aside className="student-sidebar">
        <div className="welcome-mini"><span className="user-avatar large">{initials(user?.fullName)}</span><div><b>{user?.fullName || 'Student'}</b><small>{isPremium(user) ? 'Premium User' : 'Free User'}</small></div></div>
        <div className="student-nav">{navItems.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon size={18}/><span>{label}</span>{id === 'history' && history.length > 0 && <em>{history.length}</em>}</button>)}</div>
        <div className="sidebar-upgrade">
          {isPremium(user) ? <><Crown size={19}/><b>Premium Active</b><small>Keep improving your score.</small></> : <><Crown size={19}/><b>Unlock Premium</b><small>More tests, analytics and study tools.</small><button onClick={() => window.location.href = '/premium.html'}>View Plans</button></>}
        </div>
        <button className="signout" onClick={signOut}><LogOut size={17}/> Sign Out</button>
      </aside>
      <main className="student-content">
        {error && <div className="student-alert"><XCircle size={16}/>{error}<button onClick={loadData}>Retry</button></div>}
        {page === 'dashboard' && <Dashboard user={user} history={history} tests={tests} categories={categories} onPage={setPage}/>} 
        {page === 'tests' && <MyTests tests={tests} history={history} premium={isPremium(user)} onRefresh={loadData}/>} 
        {page === 'history' && <History history={history}/>} 
        {page === 'profile' && <Profile user={user} onSaved={updateUser}/>} 
      </main>
    </div>
  </div>;
}

function Dashboard({ user, history, tests, categories, onPage }) {
  const attempted = history.length;
  const avg = attempted ? Math.round(history.reduce((sum, x) => sum + Number(x.percentage || 0), 0) / attempted) : 0;
  const best = attempted ? Math.max(...history.map(x => Number(x.percentage || 0))) : 0;
  const totalTime = history.reduce((sum, x) => sum + Number(x.timeTakenSeconds || 0), 0);
  const recent = history.slice(0, 5);
  return <>
    <div className="student-heading"><div><p className="eyebrow">STUDENT DASHBOARD</p><h1>Welcome back, {firstName(user?.fullName)} 👋</h1><p>Track your preparation and keep moving toward your exam goal.</p></div><button className="primary-student" onClick={() => onPage('tests')}>Start a Mock Test <ArrowRight size={16}/></button></div>
    <div className="stat-grid">
      <Stat icon={ClipboardList} label="Tests Attempted" value={attempted}/>
      <Stat icon={Target} label="Average Score" value={`${avg}%`}/>
      <Stat icon={Trophy} label="Best Score" value={`${best}%`}/>
      <Stat icon={Clock3} label="Practice Time" value={formatDuration(totalTime)}/>
    </div>
    <div className="dashboard-grid">
      <section className="panel progress-panel"><div className="panel-title"><div><h2>Preparation Overview</h2><p>Your performance based on completed tests.</p></div><button onClick={() => onPage('history')}>View History <ChevronRight size={15}/></button></div><div className="progress-ring"><div className="ring-inner"><strong>{avg}%</strong><span>Average</span></div></div><div className="overview-copy"><b>{attempted ? 'Keep building consistency' : 'Your first test is waiting'}</b><p>{attempted ? `You have completed ${attempted} test${attempted === 1 ? '' : 's'}. Review mistakes after every attempt to improve faster.` : 'Take a mock test to start creating your personal performance history.'}</p></div></section>
      <section className="panel quick-panel"><div className="panel-title"><div><h2>Quick Start</h2><p>Choose an exam category.</p></div></div><div className="quick-list">{categories.slice(0, 5).map(c => <button key={c.id || c.name} onClick={() => onPage('tests')}><span className="category-icon">{c.icon || '◉'}</span><span><b>{c.name}</b><small>{c.description}</small></span><ChevronRight size={16}/></button>)}</div></section>
    </div>
    <section className="panel recent-panel"><div className="panel-title"><div><h2>Recent Attempts</h2><p>Your latest completed mock tests.</p></div><button onClick={() => onPage('history')}>View All <ChevronRight size={15}/></button></div>{recent.length ? <AttemptTable rows={recent}/> : <EmptyState onPage={onPage}/>}</section>
    <section className="tip-card"><BookOpen size={22}/><div><b>Study smarter</b><p>Use your Test History to identify weak areas, then choose a sectional test from My Tests.</p></div><button onClick={() => onPage('tests')}>Explore Tests</button></section>
  </>;
}

function MyTests({ tests, history, premium, onRefresh }) {
  const attemptedIds = useMemo(() => new Set(history.map(x => x.testId)), [history]);
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'attempted' ? tests.filter(t => attemptedIds.has(t.id)) : filter === 'new' ? tests.filter(t => !attemptedIds.has(t.id)) : tests;
  return <>
    <div className="student-heading"><div><p className="eyebrow">MY TESTS</p><h1>Practice Library</h1><p>Browse available mock tests and continue your preparation.</p></div><button className="ghost-button" onClick={onRefresh}><RefreshCw size={15}/> Refresh</button></div>
    <div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All Tests</button><button className={filter === 'new' ? 'active' : ''} onClick={() => setFilter('new')}>Not Attempted</button><button className={filter === 'attempted' ? 'active' : ''} onClick={() => setFilter('attempted')}>Attempted</button></div>
    {filtered.length ? <div className="test-library">{filtered.map(t => {
      const locked = !!t.isLocked && !premium;
      return <div className={`library-card${locked ? ' locked-test' : ''}`} key={`${t.id}-${t.title}`}>
        <div className="library-icon">{locked ? <LockKeyhole size={18}/> : '◈'}</div>
        <div className="library-body"><span className="test-category">{t.category || 'Exam'}</span><h3>{t.title}</h3><p>{t.questions} Questions · {t.marks} Marks · {t.durationMinutes} Minutes</p><div className="library-meta">{locked ? <span className="premium-required"><LockKeyhole size={14}/> Premium Required</span> : attemptedIds.has(t.id) ? <span className="attempted"><CheckCircle2 size={14}/> Attempted</span> : <span><Clock3 size={14}/> New Test</span>}{t.tag && <span className="tag">{t.tag}</span>}</div></div>
        {locked ? <a className="test-launch premium-launch" href="/premium.html">Unlock <Crown size={14}/></a> : <a className="test-launch" href={`/?testId=${t.id}`}>Start <ArrowRight size={15}/></a>}
      </div>;
    })}</div> : <div className="empty-card"><ClipboardList size={34}/><h3>No tests found</h3><p>Try another filter or refresh the test library.</p></div>}
  </>;
}

function History({ history }) {
  return <><div className="student-heading"><div><p className="eyebrow">PERFORMANCE</p><h1>Test History</h1><p>Every completed test is saved to your account.</p></div></div><section className="panel history-panel">{history.length ? <AttemptTable rows={history} detailed/> : <div className="empty-inline"><BarChart3 size={32}/><h3>No attempts yet</h3><p>Your completed tests will appear here automatically.</p></div>}</section></>;
}

function AttemptTable({ rows, detailed = false }) {
  return <div className="table-wrap"><table><thead><tr><th>Test</th><th>Date</th><th>Score</th><th>Correct</th><th>Incorrect</th><th>Time</th>{detailed && <th>Result</th>}</tr></thead><tbody>{rows.map(x => <tr key={x.id}><td><b>{x.test}</b><small>Attempt #{x.id}</small></td><td>{formatDate(x.submittedAtUtc)}</td><td><strong className={Number(x.percentage) >= 70 ? 'score-good' : Number(x.percentage) >= 40 ? 'score-mid' : 'score-low'}>{Number(x.percentage || 0).toFixed(0)}%</strong><small>{Number(x.score || 0).toFixed(1)} / points</small></td><td className="correct-cell">{x.correct}</td><td className="incorrect-cell">{x.incorrect}</td><td>{formatDuration(x.timeTakenSeconds)}</td>{detailed && <td><span className="result-pill">Completed</span></td>}</tr>)}</tbody></table></div>;
}

function Profile({ user, onSaved }) {
  const [name, setName] = useState(user?.fullName || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => setName(user?.fullName || ''), [user]);
  const saveProfile = async e => { e.preventDefault(); setSaving(true); setMessage(''); setError(''); try { const updated = await authenticatedCall(() => api.users.updateMe({ fullName: name })); onSaved(updated); setMessage('Profile updated successfully.'); } catch (e) { setError(e.message || 'Unable to update profile.'); } finally { setSaving(false); } };
  const changePassword = async e => { e.preventDefault(); setMessage(''); setError(''); if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; } setSaving(true); try { const r = await authenticatedCall(() => api.users.changePassword({ currentPassword, newPassword })); setMessage(r.message || 'Password changed successfully.'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); } catch (e) { setError(e.message || 'Unable to change password.'); } finally { setSaving(false); } };
  return <><div className="student-heading"><div><p className="eyebrow">ACCOUNT</p><h1>Profile & Security</h1><p>Manage your personal information and account password.</p></div></div>{message && <div className="success-alert"><CheckCircle2 size={16}/>{message}</div>}{error && <div className="student-alert"><XCircle size={16}/>{error}</div>}<div className="profile-grid"><section className="panel profile-card"><div className="profile-cover"><span className="profile-avatar">{initials(user?.fullName)}</span></div><div className="profile-info"><h2>{user?.fullName}</h2><p>{user?.email}</p><div className="role-row">{(user?.roles || []).map(r => <span key={r}><ShieldCheck size={13}/>{r}</span>)}</div><small>Member since {formatDate(user?.createdAtUtc)}</small></div></section><section className="panel form-panel"><div className="panel-title"><div><h2>Personal Information</h2><p>Update the name shown across TestPrep.</p></div></div><form onSubmit={saveProfile}><label>Full Name<input value={name} onChange={e => setName(e.target.value)} maxLength={150} required/></label><label>Email<input value={user?.email || ''} disabled/></label><button className="primary-student" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></form></section><section className="panel form-panel password-panel"><div className="panel-title"><div><h2>Change Password</h2><p>Use a strong password you do not reuse elsewhere.</p></div><LockKeyhole size={20}/></div><form onSubmit={changePassword}><label>Current Password<input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required/></label><label>New Password<input type="password" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} required/></label><label>Confirm New Password<input type="password" minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required/></label><button className="ghost-button" disabled={saving}>{saving ? 'Updating...' : 'Change Password'}</button></form></section></div></>;
}

function Stat({ icon: Icon, label, value }) { return <div className="stat-card"><span><Icon size={19}/></span><div><small>{label}</small><strong>{value}</strong></div></div>; }
function EmptyState({ onPage }) { return <div className="empty-inline"><Trophy size={30}/><h3>No test attempts yet</h3><p>Start your first mock test and your results will be tracked here.</p><button className="primary-student" onClick={() => onPage('tests')}>Start First Test <ArrowRight size={15}/></button></div>; }
function initials(name) { return (name || 'Student').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
function firstName(name) { return (name || 'Student').trim().split(/\s+/)[0]; }
function isPremium(user) { return (user?.roles || []).includes('PremiumUser') || (user?.roles || []).includes('Admin'); }
function formatDuration(seconds) { const s = Number(seconds || 0); if (s < 60) return `${s}s`; const m = Math.floor(s / 60); if (m < 60) return `${m}m`; return `${Math.floor(m / 60)}h ${m % 60}m`; }
function formatDate(value) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); }

createRoot(document.getElementById('student-root')).render(<App />);
