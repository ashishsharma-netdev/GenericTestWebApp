import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Crown, CheckCircle2, ArrowLeft, Loader2, ShieldCheck, CalendarDays, CreditCard, History, RefreshCw } from 'lucide-react';
import { api } from './api';
import './premium.css';

function saveTokens(result) { localStorage.setItem('testprep_access_token', result.accessToken); localStorage.setItem('testprep_refresh_token', result.refreshToken); }
async function refreshSession() { const token = localStorage.getItem('testprep_refresh_token'); if (!token) return false; try { saveTokens(await api.auth.refresh({ refreshToken: token })); return true; } catch { return false; } }
async function callAuth(fn) { try { return await fn(); } catch (e) { if (e.status === 401 && await refreshSession()) return fn(); throw e; } }
function loadRazorpay() { return new Promise((resolve, reject) => { if (window.Razorpay) return resolve(); const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = resolve; s.onerror = reject; document.body.appendChild(s); }); }
function date(value) { return value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
function money(value, currency = 'INR') { return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(Number(value || 0)); }

function App() {
  const [plans, setPlans] = useState([]); const [current, setCurrent] = useState(null); const [subscriptions, setSubscriptions] = useState([]); const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(null); const [error, setError] = useState(''); const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [p, s, h, pay] = await Promise.all([api.subscriptions.plans(), callAuth(api.subscriptions.me), callAuth(api.subscriptions.history), callAuth(api.subscriptions.payments)]);
      setPlans(p || []); setCurrent(s); setSubscriptions(h || []); setPayments(pay || []);
    } catch (e) { setError(e.message || 'Unable to load subscription details.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!localStorage.getItem('testprep_access_token')) { location.href='/auth.html'; return; } load(); }, []);

  const buy = async plan => {
    setBusy(plan.id); setError(''); setMessage('');
    try {
      const order = await callAuth(() => api.subscriptions.createOrder(plan.id)); await loadRazorpay();
      const options = { key: order.keyId, amount: order.amount, currency: order.currency, name: 'TestPrep', description: `${plan.name} Premium`, order_id: order.orderId,
        handler: async response => { try { const result = await callAuth(() => api.subscriptions.verify({ razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature })); setMessage(result.message); await load(); } catch (e) { setError(e.message || 'Payment verification failed.'); } finally { setBusy(null); } },
        modal: { ondismiss: () => setBusy(null) } };
      new window.Razorpay(options).open();
    } catch (e) { setError(e.message || 'Unable to start payment.'); setBusy(null); }
  };

  if (loading) return <div className="premium-loading"><Loader2 className="spin"/> Loading Premium plans...</div>;
  const active = current?.isPremium; const expires = current?.subscription?.expiresAtUtc;
  return <div className="premium-page">
    <header><button onClick={() => location.href='/student.html'}><ArrowLeft size={17}/> Back to Dashboard</button><span className="premium-logo"><Crown size={19}/> TestPrep Premium</span></header>
    <main>
      <section className="hero"><span className="crown-badge"><Crown size={18}/></span><p className="eyebrow">PREMIUM MEMBERSHIP</p><h1>{active ? 'Keep your preparation going.' : 'Prepare with more focus.'}</h1><p>{active ? 'Your Premium access is active. Renew anytime and the new plan will extend from your current expiry date.' : 'Unlock premium mock tests, deeper performance insights and additional preparation tools.'}</p>
        {active && <div className="active-banner"><CheckCircle2 size={18}/> Premium active until <b>{date(expires)}</b>{current.daysRemaining != null && <span>· {current.daysRemaining} day{current.daysRemaining === 1 ? '' : 's'} remaining</span>}</div>}
        {active && current.isExpiringSoon && <div className="premium-warning"><CalendarDays size={17}/> Your Premium access expires soon. Choose a plan below to extend your access.</div>}
      </section>
      {error && <div className="premium-alert">{error}</div>}{message && <div className="premium-success"><CheckCircle2 size={17}/>{message}</div>}
      <section className="plans">{plans.map((p, i) => <article className={`plan-card ${i === plans.length - 1 ? 'featured' : ''}`} key={p.id}>{i === plans.length - 1 && <span className="popular">POPULAR</span>}<h2>{p.name}</h2><div className="price"><strong>₹{Number(p.price).toLocaleString('en-IN')}</strong><span> / {p.durationDays} days</span></div><ul><li><CheckCircle2/> Premium test access</li><li><CheckCircle2/> Performance history</li><li><CheckCircle2/> Study analytics</li><li><CheckCircle2/> Secure Razorpay checkout</li></ul><button disabled={busy !== null} onClick={() => buy(p)}>{busy === p.id ? <><Loader2 className="spin"/> Opening Checkout...</> : active ? `Renew ${p.name}` : `Choose ${p.name}`}</button></article>)}</section>
      <section className="subscription-section"><div className="section-heading"><div><p className="eyebrow">ACCOUNT BILLING</p><h2>Subscription & Payment History</h2><p>Review your Premium plans and payment records.</p></div><button className="refresh-history" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
        <div className="history-grid">
          <div className="history-card"><div className="history-title"><History size={18}/><h3>Subscriptions</h3></div>{subscriptions.length ? <div className="history-list">{subscriptions.map(x => <div className="history-row" key={x.id}><div><b>{x.plan}</b><small>{date(x.startedAtUtc)} → {date(x.expiresAtUtc)}</small></div><span className={`status-pill status-${String(x.status).toLowerCase()}`}>{x.status}</span></div>)}</div> : <p className="history-empty">No subscription history yet.</p>}</div>
          <div className="history-card"><div className="history-title"><CreditCard size={18}/><h3>Payments</h3></div>{payments.length ? <div className="history-list">{payments.map(x => <div className="history-row" key={x.id}><div><b>{money(x.amount, x.currency)}</b><small>{date(x.paidAtUtc || x.createdAtUtc)} · {x.provider || 'Razorpay'}</small></div><span className={`status-pill status-${String(x.status).toLowerCase()}`}>{x.status}</span></div>)}</div> : <p className="history-empty">No payments recorded yet.</p>}</div>
        </div>
      </section>
      <div className="secure-note"><ShieldCheck size={17}/><span>Payments are processed by Razorpay. TestPrep never receives or stores your card details.</span></div>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
