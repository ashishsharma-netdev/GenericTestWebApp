import React, { useEffect, useState } from 'react';
import { BookOpen, LayoutDashboard, ClipboardList, Grid2X2, BarChart3, Bookmark, Newspaper, FileText, Mic, Search, Bell, ChevronRight, PlayCircle, XCircle, Flag, ArrowLeft, ShieldCheck, Clock3, RefreshCw, AlertCircle, Trophy, Target, Sparkles } from 'lucide-react';
import './styles.css';
import { api } from './api';

const fallbackExams = [
  { id: 1, name: 'SSC', description: 'CGL, CHSL, MTS, GD, Stenographer', icon: '◉' }, { id: 2, name: 'Railway', description: 'RRB NTPC, Group D, ALP, JE', icon: '◆' },
  { id: 3, name: 'Bank', description: 'IBPS, SBI, RRB, PO, Clerk', icon: '▥' }, { id: 4, name: 'State Exam', description: 'PSC, Police, SI, TET and more', icon: '♜' },
  { id: 5, name: 'UPSC', description: 'Civil Services (IAS/IPS/IFS)', icon: '♛' }, { id: 6, name: 'CAT', description: 'Common Admission Test', icon: '∞' },
  { id: 7, name: 'CTET', description: 'Central Teacher Eligibility Test', icon: '◌' },
];

function App() {
  const query = new URLSearchParams(window.location.search);
  const requestedTestId = Number(query.get('testId')) || 0;
  const requestedExam = query.get('exam');
  const [page, setPage] = useState(requestedTestId > 0 ? 'instructions' : 'home'); const [exam, setExam] = useState(requestedExam || 'SSC'); const [categories, setCategories] = useState(fallbackExams); const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null); const [questions, setQuestions] = useState([]); const [answers, setAnswers] = useState({}); const [marked, setMarked] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0); const [secondsLeft, setSecondsLeft] = useState(0); const [testStartedAt, setTestStartedAt] = useState(null); const [attemptId, setAttemptId] = useState(null);
  const [submitted, setSubmitted] = useState(false); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [apiError, setApiError] = useState('');

  useEffect(() => { api.categories().then(setCategories).catch(() => setApiError('Unable to load exam categories from the API.')); }, []);
  useEffect(() => { if (page !== 'tests') return; setLoading(true); api.tests(exam).then(setTests).catch(() => setTests([])).finally(() => setLoading(false)); }, [page, exam]);
  useEffect(() => { if (page !== 'test' || !testStartedAt) return; const timer = window.setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000); return () => window.clearInterval(timer); }, [page, testStartedAt]);
  useEffect(() => { if (page === 'test' && testStartedAt && secondsLeft === 0 && !submitted) { confirmSubmit(true); } }, [secondsLeft]);

  const nav = (nextPage) => { setPage(nextPage); if (nextPage !== 'test') setSubmitted(false); setApiError(''); };
  const chooseExam = (name) => { setExam(name); nav('tests'); };

  const startInstructions = async (test) => {
    setLoading(true); setApiError(''); setSelectedTest(test);
    try { const [detail, qs] = await Promise.all([api.test(test.id), api.questions(test.id)]); setSelectedTest(detail); setQuestions(qs || []); nav('instructions'); }
    catch (e) { setApiError(e.message || 'Unable to load this test.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!requestedTestId) return;
    startInstructions({ id: requestedTestId, title: 'Loading test...', questions: 0, marks: 0, durationMinutes: 0, negativeMarking: 0 });
  }, []);

  const startTest = async () => {
    if (!selectedTest || !questions.length) { setApiError('This test is not ready because no questions were returned by the API.'); return; }
    setLoading(true); setApiError('');
    try {
      const attempt = await api.attempts.start(selectedTest.id);
      setAttemptId(attempt.attemptId); setSecondsLeft(attempt.remainingSeconds); setTestStartedAt(Date.now()); setAnswers({}); setMarked({}); setCurrentIndex(0); setResult(null); nav('test');
      const saved = await api.attempts.get(attempt.attemptId);
      const nextAnswers = {}; const nextMarked = {};
      (saved.answers || []).forEach(a => { if (a.answer) nextAnswers[a.questionId] = a.answer; if (a.markedForReview) nextMarked[a.questionId] = true; });
      setAnswers(nextAnswers); setMarked(nextMarked);
    } catch (e) { setApiError(e.message || 'Unable to start the test. Please sign in and try again.'); }
    finally { setLoading(false); }
  };

  const saveAnswer = async (questionId, answer, isMarked) => {
    if (!attemptId) return;
    try { await api.attempts.saveAnswer(attemptId, { questionId: Number(questionId), answer: answer || null, markedForReview: !!isMarked }); }
    catch (e) { if (e.status === 409 && e.message.includes('expired')) { await confirmSubmit(true); } else setApiError('Answer could not be saved. Please check your connection.'); }
  };

  const setAnswerForQuestion = (questionId, value) => { setAnswers(prev => ({ ...prev, [questionId]: value })); saveAnswer(questionId, value, !!marked[questionId]); };
  const toggleMarkForQuestion = (questionId) => { const next = !marked[questionId]; setMarked(prev => ({ ...prev, [questionId]: next })); saveAnswer(questionId, answers[questionId] || null, next); };
  const clearAnswerForQuestion = (questionId) => { setAnswers(prev => { const next = { ...prev }; delete next[questionId]; return next; }); saveAnswer(questionId, null, !!marked[questionId]); };

  async function confirmSubmit(auto = false) {
    if (!attemptId || !selectedTest || submitted) return;
    setSubmitted(true); setLoading(true); setApiError('');
    const payload = questions.map(q => ({ questionId: Number(q.id), answer: answers[q.id] || null, markedForReview: !!marked[q.id] }));
    try { const response = await api.attempts.submit(attemptId, payload); setResult(response); setTestStartedAt(null); setSecondsLeft(0); nav('result'); }
    catch (e) { setSubmitted(false); setApiError(e.message || (auto ? 'The test could not be auto-submitted.' : 'Unable to submit the test.')); }
    finally { setLoading(false); }
  }

  return <div className="app"><Header nav={nav} page={page}/>{apiError && <div className="api-banner"><AlertCircle size={14}/>{apiError}<button onClick={() => setApiError('')}>×</button></div>}
    {page === 'home' && <Home exams={categories} onStart={() => chooseExam('SSC')}/>} {page !== 'home' && <div className="shell"><Sidebar page={page} nav={nav}/><main className="content">
      {page === 'dashboard' && <Dashboard/>}{page === 'categories' && <Categories exams={categories} onSelect={chooseExam}/>} {page === 'tests' && <Tests exam={exam} tests={tests} loading={loading} onStart={startInstructions}/>}
      {page === 'instructions' && <Instructions test={selectedTest} loading={loading} onBack={() => nav('tests')} onStart={startTest}/>} 
      {page === 'test' && <TestScreen questions={questions} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} answers={answers} setAnswers={setAnswers} marked={marked} setMarked={setMarked} secondsLeft={secondsLeft} setAnswer={setAnswerForQuestion} toggleMark={toggleMarkForQuestion} clearAnswer={clearAnswerForQuestion} onSubmit={() => setSubmitted(true)}/>} 
      {page === 'performance' && <Analysis result={result}/>} {page === 'result' && <Result result={result} onAnalysis={() => nav('performance')} onAgain={() => nav('tests')}/>} 
      {['study','bookmarks','current','mock','refer','settings'].includes(page) && <Study title={{study:'Study Material',bookmarks:'Bookmarks',current:'Current Affairs',mock:'Mock Interviews',refer:'Refer & Earn',settings:'Settings'}[page]}/>} 
      {submitted && page === 'test' && !loading && <SubmitModal close={() => setSubmitted(false)} onDone={() => confirmSubmit(false)}/>} 
    </main></div>}
  </div>;
}

function Header({ nav, page }) {
  const openAuth = (mode = 'login') => {
    const target = `/auth.html?mode=${mode}&returnUrl=${encodeURIComponent('/student.html')}`;
    window.location.href = target;
  };
  const authButtonStyle = { height: '34px', borderRadius: '8px', padding: '0 15px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' };
  return <header className="top"><button className="brand" onClick={() => nav('home')}><div className="logo">✦</div><span>TestPrep</span></button><nav><button onClick={() => nav('categories')}>Exams</button><button>Features</button><button>Pricing</button><button>Blogs</button><button>About</button></nav><div className="top-actions"><div className="search"><Search size={15}/><input placeholder="Search tests, exams..."/></div><Bell size={18}/>{page === 'home' && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><button style={{ ...authButtonStyle, background: '#fff', color: '#1269df', border: '1px solid #1269df' }} onClick={() => openAuth('login')}>Log In</button><button style={{ ...authButtonStyle, background: '#1269df', color: '#fff', border: '1px solid #1269df' }} onClick={() => openAuth('register')}>Sign Up</button></div>}<div className="avatar">N</div><span className="name">Student⌄</span></div></header>; }
function Sidebar({ page, nav }) { const items=[['dashboard','Dashboard',LayoutDashboard],['tests','My Tests',ClipboardList],['categories','Exam Categories',Grid2X2],['performance','Performance',BarChart3],['bookmarks','Bookmarks',Bookmark],['current','Current Affairs',Newspaper],['study','Study Material',BookOpen],['mock','Mock Interviews',Mic],['refer','Refer & Earn',FileText],['settings','Settings',ShieldCheck]]; return <aside className="sidebar"><div className="side-title"><div className="logo small">✦</div><b>TestPrep</b></div>{items.map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>nav(id)}><Icon size={16}/>{label}{['tests','categories'].includes(id)&&<ChevronRight className="chev" size={14}/>}</button>)}</aside>; }
function Home({ exams, onStart }) { return <div><section className="hero"><div><div className="pill">India’s trusted mock test platform</div><h1>Prepare Today<br/><span>For a Brighter Tomorrow</span></h1><p>Unlimited mock tests, practice sets, previous year papers and performance analytics.</p><div className="exam-row">{exams.map(e=><button onClick={()=>onStart(e.name)} key={e.name}><span>{e.icon}</span>{e.name}</button>)}</div><div className="cta"><button className="primary" onClick={onStart}>Start Free Test</button><button className="secondary"><PlayCircle size={17}/> Watch Video</button></div></div><div className="hero-card"><div className="scribble">Practice<br/>Analyze<br/>Improve<br/>Succeed.</div><div className="person">👩🏻‍💻</div><div className="support">🎓 <b>Your Dream<br/>Our Support</b></div></div></section><section className="features"><Feature t="Latest Exam Pattern" i="▣"/><Feature t="Real Exam Interface" i="✓"/><Feature t="Detailed Analysis" i="↗"/><Feature t="Bilingual Content" i="文"/><Feature t="Affordable Plans" i="♢"/></section><section className="popular"><h2>Popular Exams</h2><div className="exam-grid">{exams.map(e=><button onClick={()=>onStart(e.name)} key={e.name}><strong>{e.icon} {e.name}</strong><small>{e.description}</small></button>)}</div></section></div>; }
const Feature=({t,i})=><div><span className="ficon">{i}</span><b>{t}</b></div>;
function Categories({exams,onSelect}) { return <><div className="page-head"><div><h1>Exam Categories</h1><p>Choose your goal and start preparing</p></div></div><div className="cat-grid">{exams.map(e=><button className="cat" onClick={()=>onSelect(e.name)} key={e.id||e.name}><span className="caticon">{e.icon}</span><span><b>{e.name}</b><small>{e.description}</small></span><ChevronRight/></button>)}</div></>; }
function Tests({exam,tests,loading,onStart}) { return <><div className="page-head"><div><h1>{exam} Mock Tests</h1><p>Practice with latest pattern mock tests and previous year papers</p></div></div><div className="tabs"><button className="tab active">All Tests</button></div>{loading&&<Loading text="Loading mock tests..."/>}{!loading && !tests.length && <div className="loading"><AlertCircle size={16}/> No tests are currently available from the API.</div>}<div className="list">{tests.map(t=><div className="test-row" key={t.id}><div className="test-icon">◈</div><div className="test-info"><b>{t.title}</b><small>{t.questions} Questions | {t.marks} Marks | {t.durationMinutes} Minutes</small></div>{t.tag&&<span className="badge">{t.tag}</span>}<button className="start" onClick={()=>onStart(t)}>Start Test</button></div>)}</div></>; }
function Instructions({test,loading,onBack,onStart}) { const data=test||{}; return <div className="instructions"><button className="back" onClick={onBack}><ArrowLeft size={16}/> Back</button><h2>Test: {data.title || 'Mock Test'}</h2><div className="instruction-card"><div className="stats">{[[ClipboardList,'Total Questions',data.questions || 0],[Target,'Total Marks',data.marks || 0],[Clock3,'Duration',`${data.durationMinutes || 0} Minutes`],[XCircle,'Negative Marking',`${data.negativeMarking || 0} marks`],[BookOpen,'Test Language','English & Hindi'],[Grid2X2,'Section Wise','Yes']].map(([Icon,label,value])=><div key={label}><span><Icon size={16}/></span><label>{label}<b>{value}</b></label></div>)}</div><div className="rules"><h3>General Instructions</h3><p>• The test contains multiple sections based on the selected exam pattern.</p><p>• Each question carries marks defined by the test configuration.</p><p>• Negative marking is applied by the server when the test is submitted.</p><p>• You can navigate between questions and mark questions for review.</p><p>• The server is the source of truth for the test timer and evaluation.</p><label><input type="checkbox" defaultChecked/> I have read and understood the instructions</label><button disabled={loading} className="primary full" onClick={onStart}>{loading?'Starting...':'Start Test'}</button></div></div></div>; }
function TestScreen({questions,currentIndex,setCurrentIndex,answers,marked,secondsLeft,setAnswer,toggleMark,clearAnswer,onSubmit}) { const question=questions[currentIndex]; if (!question) return <Loading text="Loading questions..."/>; const formattedTime=`${String(Math.floor(secondsLeft/60)).padStart(2,'0')}:${String(secondsLeft%60).padStart(2,'0')}`; const sections=[...new Set(questions.map(q=>q.section))]; const answer=answers[question.id]||''; const isLast=currentIndex>=questions.length-1; const goNext=()=>isLast?onSubmit():setCurrentIndex(i=>i+1); return <div className="test-screen"><div className="test-top"><button className="back" onClick={()=>window.history.back()}><ArrowLeft size={15}/></button><b>Mock Test</b><span className="timer"><Clock3 size={14}/> Time Left <strong>{formattedTime}</strong></span><button className="primary smallbtn" onClick={onSubmit}>Submit Test</button></div><div className="section-tabs">{sections.map((s,i)=><button key={s} className={i===0?'active':''}>{s}</button>)}</div><div className="question-area"><div className="question"><div className="qnum">Q. {currentIndex+1}<span className="question-counter">{Object.keys(answers).length} answered</span></div><h3>{question.text}</h3>{question.series&&<p className="series">{question.series}</p>}{question.options.map((o,i)=><label className={answer===o?'option chosen':'option'} key={`${question.id}-${o}`}><input type="radio" name={`q-${question.id}`} checked={answer===o} onChange={()=>setAnswer(question.id,o)}/><span className="option-letter">{String.fromCharCode(65+i)}</span><span>{o}</span></label>)}<div className="q-actions"><button disabled={currentIndex===0} onClick={()=>setCurrentIndex(i=>Math.max(0,i-1))}>← Previous</button><button className={marked[question.id]?'review active-review':'review'} onClick={()=>toggleMark(question.id)}><Flag size={14}/>{marked[question.id]?'Marked':'Mark for Review'}</button><button onClick={()=>clearAnswer(question.id)}><XCircle size={14}/> Clear Response</button><button className="primary" onClick={goNext}>{isLast?'Submit Test':'Save & Next →'}</button></div></div><QuestionPalette questions={questions} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} answers={answers} marked={marked}/></div></div>; }
function QuestionPalette({questions,currentIndex,setCurrentIndex,answers,marked}) { return <div className="palette"><div className="palette-summary"><b>{Object.keys(answers).length}</b> Answered <span>{Math.max(0,questions.length-Object.keys(answers).length)}</span> Remaining</div><div className="legend"><span><i className="dot answered"/> Answered</span><span><i className="dot not-answered"/> Not Answered</span><span><i className="dot marked"/> Marked</span></div><div className="numbers">{questions.map((q,i)=><button key={q.id} className={`${answers[q.id]?'green':''} ${marked[q.id]?'purple':''} ${i===currentIndex?'current':''}`} onClick={()=>setCurrentIndex(i)}>{i+1}</button>)}</div></div>; }
function SubmitModal({close,onDone}) { return <div className="modal"><div className="overlay" onClick={close}/><div className="modalbox"><div className="party"><Sparkles size={44}/></div><h2>Are you sure you want to submit the test?</h2><p>Once submitted, you cannot make any changes.</p><div><button onClick={close}>Cancel</button><button className="primary" onClick={onDone}>Submit Test</button></div></div></div>; }
function Result({result,onAnalysis,onAgain}) { const r=result||{score:0,maxScore:0,percentage:0,correct:0,incorrect:0,unattempted:0,timeTakenSeconds:0}; return <div className="result"><div className="trophy"><Trophy size={58}/></div><h1>Test Submitted Successfully!</h1><p>Your result was evaluated by the TestPrep server.</p><div className="result-cards">{[['Score',`${r.score} / ${r.maxScore}`],['Percentage',`${r.percentage}%`],['Correct',r.correct],['Incorrect',r.incorrect],['Unattempted',r.unattempted],['Time Taken',formatDuration(r.timeTakenSeconds)]].map(x=><div key={x[0]}><small>{x[0]}</small><b>{x[1]}</b></div>)}</div><div><button className="primary" onClick={onAnalysis}>View Detailed Analysis</button><button className="ghost" onClick={onAgain}>Attempt Another Test</button></div></div>; }
function Analysis({result}) { const r=result||{score:0,maxScore:0,percentage:0,correct:0,incorrect:0,unattempted:0,sections:[]}; const sections=r.sections||[]; return <><div className="page-head"><div><h1>Test Analysis</h1><p>Understand your performance across every section.</p></div></div><div className="analysis"><div className="chart"><div className="donut" style={{'--score':`${r.percentage || 0}%`}}><span>{r.percentage || 0}%</span></div><div className="legend2"><span>🟢 Correct ({r.correct || 0})</span><span>🔴 Incorrect ({r.incorrect || 0})</span><span>⚪ Unattempted ({r.unattempted || 0})</span></div></div><div className="table-wrap"><table><thead><tr><th>Section</th><th>Correct</th><th>Incorrect</th><th>Unattempted</th><th>Score</th><th>Accuracy</th></tr></thead><tbody>{sections.map(row=><tr key={row.section}><td>{row.section}</td><td>{row.correct}</td><td>{row.incorrect}</td><td>{row.unattempted}</td><td>{row.score}</td><td>{row.accuracy}%</td></tr>)}</tbody></table></div></div></>; }
function Dashboard() { return <><div className="page-head"><div><h1>My Dashboard</h1><p>Practice consistently and review every completed test.</p></div></div><div className="metrics"><div><span><ClipboardList size={17}/></span><small>Test Engine</small><b>Ready</b></div><div><span><Target size={17}/></span><small>Evaluation</small><b>Server-side</b></div><div><span><Clock3 size={17}/></span><small>Timer</small><b>Protected</b></div><div><span><Trophy size={17}/></span><small>History</small><b>Saved</b></div></div></>; }
function Study({title='Study Material'}) { const items=['Current Affairs (Daily)','Subject Notes','Previous Year Papers','Practice Sets','Important Formulas','Exam Books (Recommended)']; return <><div className="page-head"><div><h1>{title}</h1><p>Access notes, PDFs, current affairs and previous year papers.</p></div></div><div className="resource-list">{items.map((x,i)=><div key={x}><span className="resource-icon">{['◫','▤','▣','◈','Σ','📚'][i]}</span><div><b>{x}</b><small>Updated content with explanations and exam-focused practice resources.</small></div><button>View</button></div>)}</div></>; }
function Loading({text}) { return <div className="loading"><RefreshCw size={15} className="spin"/>{text}</div>; }
function formatDuration(totalSeconds=0) { const m=Math.floor(totalSeconds/60); const s=totalSeconds%60; return `${m}m ${s}s`; }
createRoot(document.getElementById('root')).render(<App/>);
