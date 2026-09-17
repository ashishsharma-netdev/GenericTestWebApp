import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen, LayoutDashboard, ClipboardList, Grid2X2, BarChart3, Bookmark,
  Newspaper, FileText, Mic, Search, Bell, ChevronRight, PlayCircle,
  XCircle, Flag, Menu, UserRound, ArrowLeft, ShieldCheck, CheckCircle2,
  Clock3, RefreshCw, AlertCircle, Trophy, Target, Sparkles
} from 'lucide-react';
import './styles.css';
import { api } from './api';

const fallbackExams = [
  { id: 1, name: 'SSC', description: 'CGL, CHSL, MTS, GD, Stenographer', icon: '◉' },
  { id: 2, name: 'Railway', description: 'RRB NTPC, Group D, ALP, JE', icon: '◆' },
  { id: 3, name: 'Bank', description: 'IBPS, SBI, RRB, PO, Clerk', icon: '▥' },
  { id: 4, name: 'State Exam', description: 'PSC, Police, SI, TET and more', icon: '♜' },
  { id: 5, name: 'UPSC', description: 'Civil Services (IAS/IPS/IFS)', icon: '♛' },
  { id: 6, name: 'CAT', description: 'Common Admission Test', icon: '∞' },
  { id: 7, name: 'CTET', description: 'Central Teacher Eligibility Test', icon: '◌' },
];

const fallbackTests = (category = 'SSC') => [
  { id: 1, category, title: `${category} Full Mock Test 01`, questions: 200, marks: 200, durationMinutes: 60, tag: 'Latest Pattern' },
  { id: 2, category, title: `${category} Full Mock Test 02`, questions: 200, marks: 200, durationMinutes: 60, tag: '' },
  { id: 3, category, title: `${category} Previous Year Paper (2023)`, questions: 200, marks: 200, durationMinutes: 60, tag: 'PYQ' },
  { id: 4, category, title: `${category} Sectional Test - Quant`, questions: 50, marks: 50, durationMinutes: 30, tag: '' },
  { id: 5, category, title: `${category} Sectional Test - Reasoning`, questions: 50, marks: 50, durationMinutes: 30, tag: '' },
  { id: 6, category, title: `${category} Sectional Test - English`, questions: 50, marks: 50, durationMinutes: 30, tag: '' },
];

function App() {
  const [page, setPage] = useState('home');
  const [exam, setExam] = useState('SSC');
  const [categories, setCategories] = useState(fallbackExams);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60 * 60);
  const [testStartedAt, setTestStartedAt] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setApiError('API is not connected. Showing demo data.'));
  }, []);

  useEffect(() => {
    if (page !== 'tests') return;
    setLoading(true);
    api.tests(exam)
      .then(setTests)
      .catch(() => setTests(fallbackTests(exam)))
      .finally(() => setLoading(false));
  }, [page, exam]);

  useEffect(() => {
    if (page !== 'test' || !testStartedAt || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [page, testStartedAt, secondsLeft]);

  useEffect(() => {
    if (page === 'test' && testStartedAt && secondsLeft === 0 && !submitted) handleSubmit();
  }, [secondsLeft]);

  const nav = (nextPage) => {
    setPage(nextPage);
    setSubmitted(false);
    setApiError('');
  };

  const startInstructions = async (test) => {
    setLoading(true);
    setSelectedTest(test);
    try {
      const [detail, qs] = await Promise.all([api.test(test.id), api.questions(test.id)]);
      setSelectedTest(detail);
      setQuestions(qs);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
      nav('instructions');
    }
  };

  const startTest = () => {
    const duration = selectedTest?.durationMinutes || 60;
    setSecondsLeft(duration * 60);
    setTestStartedAt(Date.now());
    setAnswers({});
    setMarked({});
    setCurrentIndex(0);
    setResult(null);
    nav('test');
  };

  async function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    const payload = Object.entries(answers).map(([questionId, answer]) => ({
      questionId: Number(questionId),
      answer,
      markedForReview: !!marked[questionId],
    }));
    const duration = selectedTest?.durationMinutes ? selectedTest.durationMinutes * 60 : 3600;
    const timeTaken = Math.max(0, duration - secondsLeft);
    try {
      const response = await api.submit(selectedTest?.id || 1, payload, timeTaken);
      setResult(response);
    } catch {
      const correct = questions.filter(q => answers[q.id] === q.correctAnswer).length;
      const attempted = Object.keys(answers).length;
      const incorrect = Math.max(0, attempted - correct);
      const score = Math.max(0, correct - incorrect * 0.5);
      setResult({ score, maxScore: questions.length, percentage: questions.length ? Math.round(score * 100 / questions.length) : 0, correct, incorrect, unattempted: Math.max(0, questions.length - attempted), timeTakenSeconds: timeTaken });
    }
  }

  const chooseExam = (name) => { setExam(name); nav('tests'); };

  return <div className="app">
    <Header page={page} nav={nav} />
    {apiError && <div className="api-banner"><AlertCircle size={14}/>{apiError}<button onClick={() => setApiError('')}>×</button></div>}
    {page === 'home' && <Home exams={categories} onStart={() => chooseExam('SSC')} />}
    {page !== 'home' && <div className="shell">
      <Sidebar page={page} nav={nav} />
      <main className="content">
        {page === 'dashboard' && <Dashboard />}
        {page === 'categories' && <Categories exams={categories} onSelect={chooseExam} />}
        {page === 'tests' && <Tests exam={exam} tests={tests} loading={loading} onStart={startInstructions} />}
        {page === 'instructions' && <Instructions test={selectedTest} loading={loading} onBack={() => nav('tests')} onStart={startTest} />}
        {page === 'test' && <TestScreen questions={questions} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} answers={answers} setAnswers={setAnswers} marked={marked} setMarked={setMarked} secondsLeft={secondsLeft} onSubmit={handleSubmit} />}
        {page === 'performance' && <Analysis result={result} />}
        {page === 'result' && <Result result={result} onAnalysis={() => nav('performance')} onAgain={() => nav('tests')} />}
        {['study', 'bookmarks', 'current', 'mock', 'refer', 'settings'].includes(page) && <Study title={{ study: 'Study Material', bookmarks: 'Bookmarks', current: 'Current Affairs', mock: 'Mock Interviews', refer: 'Refer & Earn', settings: 'Settings' }[page]} />}
        {submitted && page === 'test' && <SubmitModal close={() => setSubmitted(false)} onDone={() => nav('result')} />}
      </main>
    </div>}
  </div>;
}

function Header({ nav }) {
  return <header className="top">
    <button className="brand" onClick={() => nav('home')}><div className="logo">✦</div><span>TestPrep</span></button>
    <nav><button onClick={() => nav('categories')}>Exams</button><button>Features</button><button>Pricing</button><button>Blogs</button><button>About</button></nav>
    <div className="top-actions"><div className="search"><Search size={15}/><input placeholder="Search tests, exams..."/></div><Bell size={18}/><div className="avatar">N</div><span className="name">Neha⌄</span></div>
  </header>;
}

function Sidebar({ page, nav }) {
  const items = [
    ['dashboard', 'Dashboard', LayoutDashboard], ['tests', 'My Tests', ClipboardList], ['categories', 'Exam Categories', Grid2X2],
    ['performance', 'Performance', BarChart3], ['bookmarks', 'Bookmarks', Bookmark], ['current', 'Current Affairs', Newspaper],
    ['study', 'Study Material', BookOpen], ['mock', 'Mock Interviews', Mic], ['refer', 'Refer & Earn', FileText], ['settings', 'Settings', ShieldCheck]
  ];
  return <aside className="sidebar"><div className="side-title"><div className="logo small">✦</div><b>TestPrep</b></div>{items.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => nav(id)}><Icon size={16}/>{label}{['tests', 'categories'].includes(id) && <ChevronRight className="chev" size={14}/>}</button>)}</aside>;
}

function Home({ exams, onStart }) {
  return <div><section className="hero"><div><div className="pill">India’s trusted mock test platform</div><h1>Prepare Today<br/><span>For a Brighter Tomorrow</span></h1><p>Unlimited mock tests, practice sets, previous year papers and performance analytics.</p><div className="exam-row">{exams.map(e => <button onClick={onStart} key={e.name}><span>{e.icon}</span>{e.name}</button>)}</div><div className="cta"><button className="primary" onClick={onStart}>Start Free Test</button><button className="secondary"><PlayCircle size={17}/> Watch Video</button></div></div><div className="hero-card"><div className="scribble">Practice<br/>Analyze<br/>Improve<br/>Succeed.</div><div className="person">👩🏻‍💻</div><div className="support">🎓 <b>Your Dream<br/>Our Support</b></div></div></section><section className="features"><Feature t="Latest Exam Pattern" i="▣"/><Feature t="Real Exam Interface" i="✓"/><Feature t="Detailed Analysis" i="↗"/><Feature t="Bilingual Content" i="文"/><Feature t="Affordable Plans" i="♢"/></section><section className="popular"><h2>Popular Exams</h2><div className="exam-grid">{exams.map(e => <button onClick={onStart} key={e.name}><strong>{e.icon} {e.name}</strong><small>{e.description}</small></button>)}</div></section></div>;
}
const Feature = ({ t, i }) => <div><span className="ficon">{i}</span><b>{t}</b></div>;

function Categories({ exams, onSelect }) {
  return <><div className="page-head"><div><h1>Exam Categories</h1><p>Choose your goal and start preparing</p></div></div><div className="cat-grid">{exams.map(e => <button className="cat" onClick={() => onSelect(e.name)} key={e.id || e.name}><span className="caticon">{e.icon}</span><span><b>{e.name}</b><small>{e.description}</small></span><ChevronRight/></button>)}</div></>;
}

function Tests({ exam, tests, loading, onStart }) {
  const list = tests.length ? tests : fallbackTests(exam);
  return <><div className="page-head"><div><h1>{exam} Mock Tests</h1><p>Practice with latest pattern mock tests and previous year papers</p></div></div><div className="tabs"><button className="tab active">All Tests</button><button className="tab">CGL</button><button className="tab">CHSL</button><button className="tab">MTS</button><button className="tab">GD</button><button className="tab">Stenographer</button></div>{loading && <Loading text="Loading mock tests..."/>}<div className="list">{list.map(t => <div className="test-row" key={t.id}><div className="test-icon">◈</div><div className="test-info"><b>{t.title}</b><small>{t.questions} Questions | {t.marks} Marks | {t.durationMinutes} Minutes</small></div>{t.tag && <span className="badge">{t.tag}</span>}<button className="start" onClick={() => onStart(t)}>Start Test</button></div>)}</div></>;
}

function Instructions({ test, loading, onBack, onStart }) {
  const disabled = loading;
  const data = test || { title: 'SSC Full Mock Test 01', questions: 200, marks: 200, durationMinutes: 60 };
  return <div className="instructions"><button className="back" onClick={onBack}><ArrowLeft size={16}/> Back</button><h2>Test: {data.title}</h2><div className="instruction-card"><div className="stats">{[[ClipboardList, 'Total Questions', data.questions], [Target, 'Total Marks', data.marks], [Clock3, 'Duration', `${data.durationMinutes} Minutes`], [XCircle, 'Negative Marking', '0.50 marks'], [BookOpen, 'Test Language', 'English & Hindi'], [Grid2X2, 'Section Wise', 'Yes']].map(([Icon, label, value]) => <div key={label}><span><Icon size={16}/></span><label>{label}<b>{value}</b></label></div>)}</div><div className="rules"><h3>General Instructions</h3><p>• The test contains multiple sections based on the selected exam pattern.</p><p>• Each question carries 1 mark unless the test specifies otherwise.</p><p>• There is a negative marking of 0.50 marks for each wrong answer.</p><p>• You can navigate between questions and mark questions for review.</p><p>• The timer will continue even if you switch sections.</p><label><input type="checkbox" defaultChecked/> I have read and understood the instructions</label><button disabled={disabled} className="primary full" onClick={onStart}>{disabled ? 'Loading...' : 'Start Test'}</button></div></div></div>;
}

function TestScreen({ questions, currentIndex, setCurrentIndex, answers, setAnswers, marked, setMarked, secondsLeft, onSubmit }) {
  const question = questions[currentIndex] || { id: 1, section: 'Reasoning', text: 'Which of the following numbers will replace the question mark (?) in the series?', series: '2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '46'], correctAnswer: '42' };
  const formattedTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const sections = [...new Set(questions.map(q => q.section))];
  const answeredCount = Object.keys(answers).length;
  const isLast = currentIndex >= questions.length - 1;
  const answer = answers[question.id] || '';

  const setAnswer = (value) => setAnswers(prev => ({ ...prev, [question.id]: value }));
  const toggleMark = () => setMarked(prev => ({ ...prev, [question.id]: !prev[question.id] }));
  const goNext = () => isLast ? onSubmit() : setCurrentIndex(i => i + 1);
  const goPrevious = () => setCurrentIndex(i => Math.max(0, i - 1));

  return <div className="test-screen"><div className="test-top"><button className="back"><ArrowLeft size={15}/></button><b>{questions.length ? 'Mock Test' : 'SSC CGL Full Mock Test 01'}</b><span className="timer"><Clock3 size={14}/> Time Left <strong>{formattedTime}</strong></span><button className="primary smallbtn" onClick={onSubmit}>Submit Test</button></div><div className="section-tabs">{(sections.length ? sections : ['Reasoning', 'Quantitative Aptitude', 'General Awareness', 'English']).map((s, i) => <button key={s} className={i === 0 ? 'active' : ''}>{s}</button>)}</div><div className="question-area"><div className="question"><div className="qnum">Q. {currentIndex + 1} <span className="question-counter">{answeredCount} answered</span></div><h3>{question.text}</h3>{question.series && <p className="series">{question.series}</p>}{question.options.map((o, i) => <label className={answer === o ? 'option chosen' : 'option'} key={o}><input type="radio" name={`q-${question.id}`} checked={answer === o} onChange={() => setAnswer(o)}/><span className="option-letter">{String.fromCharCode(65 + i)}</span><span>{o}</span></label>)}<div className="q-actions"><button onClick={goPrevious}>← Previous</button><button className={marked[question.id] ? 'review active-review' : ''} onClick={toggleMark}><Flag size={14}/> {marked[question.id] ? 'Marked' : 'Mark for Review'}</button><button onClick={() => setAnswers(prev => { const next = { ...prev }; delete next[question.id]; return next; })}><XCircle size={14}/> Clear Response</button><button className="primary" onClick={goNext}>{isLast ? 'Submit Test' : 'Save & Next →'}</button></div></div><QuestionPalette questions={questions} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} answers={answers} marked={marked}/></div></div>;
}

function QuestionPalette({ questions, currentIndex, setCurrentIndex, answers, marked }) {
  const list = questions.length ? questions : Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
  return <div className="palette"><div className="palette-summary"><b>{Object.keys(answers).length}</b> Answered <span>{list.length - Object.keys(answers).length}</span> Remaining</div><div className="legend"><span><i className="dot answered"/> Answered</span><span><i className="dot not-answered"/> Not Answered</span><span><i className="dot marked"/> Marked</span></div><div className="numbers">{list.map((q, i) => <button key={q.id} className={`${answers[q.id] ? 'green' : ''} ${marked[q.id] ? 'purple' : ''} ${i === currentIndex ? 'current' : ''}`} onClick={() => setCurrentIndex(i)}>{i + 1}</button>)}</div></div>;
}

function SubmitModal({ close, onDone }) { return <div className="modal"><div className="overlay" onClick={close}/><div className="modalbox"><div className="party"><Sparkles size={44}/></div><h2>Are you sure you want to submit the test?</h2><p>Once submitted, you cannot make any changes.</p><div><button onClick={close}>Cancel</button><button className="primary" onClick={onDone}>Submit Test</button></div></div></div>; }

function Result({ result, onAnalysis, onAgain }) {
  const r = result || { score: 0, maxScore: 0, percentage: 0, correct: 0, incorrect: 0, unattempted: 0, timeTakenSeconds: 0 };
  return <div className="result"><div className="trophy"><Trophy size={58}/></div><h1>Test Submitted Successfully!</h1><p>Great job! Keep practicing to achieve your goal.</p><div className="result-cards">{[['Score', `${r.score} / ${r.maxScore}`], ['Percentage', `${r.percentage}%`], ['Correct', r.correct], ['Time Taken', formatDuration(r.timeTakenSeconds)]].map(x => <div key={x[0]}><small>{x[0]}</small><b>{x[1]}</b></div>)}</div><div><button className="primary" onClick={onAnalysis}>View Detailed Analysis</button><button className="ghost" onClick={onAgain}>Attempt Another Test</button></div></div>;
}

function Analysis({ result }) {
  const r = result || { score: 152, maxScore: 200, percentage: 76, correct: 152, incorrect: 32, unattempted: 16, sections: [] };
  const sections = r.sections?.length ? r.sections : [['Reasoning', 42, 5, 3, '39.5 / 50', '89%'], ['Quantitative Aptitude', 38, 9, 3, '33.5 / 50', '81%'], ['General Awareness', 35, 10, 5, '30.0 / 50', '78%'], ['English', 37, 8, 5, '33.0 / 50', '82%']].map(x => ({ section: x[0], correct: x[1], incorrect: x[2], unattempted: x[3], score: x[4], accuracy: Number.parseInt(x[5]) }));
  return <><div className="page-head"><div><h1>Test Analysis</h1><p>Understand your performance across every section.</p></div></div><div className="analysis"><div className="chart"><div className="donut" style={{ '--score': `${r.percentage}%` }}><span>{r.percentage}%</span></div><div className="legend2"><span>🟢 Correct ({r.correct})</span><span>🔴 Incorrect ({r.incorrect})</span><span>⚪ Unattempted ({r.unattempted})</span></div></div><div className="table-wrap"><table><thead><tr><th>Section</th><th>Correct</th><th>Incorrect</th><th>Unattempted</th><th>Score</th><th>Accuracy</th></tr></thead><tbody>{sections.map(row => <tr key={row.section}><td>{row.section}</td><td>{row.correct}</td><td>{row.incorrect}</td><td>{row.unattempted}</td><td>{row.score}</td><td>{row.accuracy}%</td></tr>)}</tbody></table></div></div></>;
}

function Dashboard() { return <><div className="page-head"><div><h1>My Dashboard</h1><p>Welcome back, Neha!</p></div></div><div className="metrics">{[['Test Attempted', '28', ClipboardList], ['Average Score', '68%', Target], ['Study Streak', '12 Days', Sparkles], ['Global Rank', '2,456', Trophy]].map(([label, value, Icon]) => <div key={label}><span><Icon size={17}/></span><small>{label}</small><b>{value}</b></div>)}</div><div className="dash-grid"><div className="panel"><h3>My Progress</h3>{[['SSC CGL', '76%'], ['Bank PO', '62%'], ['Railway NTPC', '45%'], ['UPSC', '35%']].map(x => <div className="prog" key={x[0]}><div><b>{x[0]}</b><span>{x[1]}</span></div><div className="bar"><i style={{ width: x[1] }}/></div></div>)}</div><div className="panel"><h3>Today's Goal</h3>{['Attempt 1 Mock Test', 'Read Current Affairs', 'Practice 20 Questions', 'Revise Mistakes'].map((x, i) => <label className="goal" key={x}><input type="checkbox" checked={i < 2} readOnly/><span>{x}</span></label>)}<p className="goalp">2 / 4 completed</p></div></div></>; }

function Study({ title = 'Study Material' }) { const items = ['Current Affairs (Daily)', 'Subject Notes', 'Previous Year Papers', 'Practice Sets', 'Important Formulas', 'Exam Books (Recommended)']; return <><div className="page-head"><div><h1>{title}</h1><p>Access notes, PDFs, current affairs and previous year papers.</p></div></div><div className="resource-list">{items.map((x, i) => <div key={x}><span className="resource-icon">{['◫', '▤', '▣', '◈', 'Σ', '📚'][i]}</span><div><b>{x}</b><small>Updated content with explanations and exam-focused practice resources.</small></div><button>View</button></div>)}</div></>; }

function Loading({ text }) { return <div className="loading"><RefreshCw size={15} className="spin"/> {text}</div>; }
function formatDuration(totalSeconds = 0) { const m = Math.floor(totalSeconds / 60); const s = totalSeconds % 60; return `${m}m ${s}s`; }

createRoot(document.getElementById('root')).render(<App/>);
