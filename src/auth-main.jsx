import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api';
import './auth.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function saveTokens(result) {
  localStorage.setItem('testprep_access_token', result.accessToken);
  localStorage.setItem('testprep_refresh_token', result.refreshToken);
}

function getReturnUrl() {
  const value = new URLSearchParams(window.location.search).get('returnUrl');
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/student.html';
  return value;
}

function friendlyError(error, fallback) {
  try {
    const payload = JSON.parse(error?.message || '{}');
    return payload.message || fallback;
  } catch {
    return error?.message || fallback;
  }
}

function App() {
  const queryMode = new URLSearchParams(window.location.search).get('mode');
  const [mode, setMode] = useState(queryMode === 'register' ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const googleRef = useRef(null);
  const returnUrl = getReturnUrl();

  useEffect(() => {
    if (localStorage.getItem('testprep_access_token')) {
      window.location.href = returnUrl;
      return;
    }
    if (!GOOGLE_CLIENT_ID || !googleRef.current) return;
    const render = () => {
      if (!window.google?.accounts?.id || !googleRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse, auto_select: false });
      window.google.accounts.id.renderButton(googleRef.current, { theme: 'outline', size: 'large', width: 326, text: 'continue_with', shape: 'rectangular' });
    };
    if (window.google?.accounts?.id) render();
    else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
      return () => script.remove();
    }
  }, [returnUrl]);

  const handleGoogleResponse = async response => {
    setBusy(true); setError('');
    try {
      const result = await api.auth.google(response.credential);
      saveTokens(result);
      window.location.href = returnUrl;
    } catch (e) {
      setError(friendlyError(e, 'Google sign-in failed. Please try again.'));
    } finally { setBusy(false); }
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    if (mode === 'register' && normalizedName.length < 2) { setError('Please enter your full name.'); return; }
    if (mode === 'register' && password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must contain at least 6 characters.'); return; }
    setBusy(true);
    try {
      const result = mode === 'login'
        ? await api.auth.login({ email: normalizedEmail, password })
        : await api.auth.register({ fullName: normalizedName, email: normalizedEmail, password });
      saveTokens(result);
      window.location.href = returnUrl;
    } catch (e) {
      setError(friendlyError(e, mode === 'login' ? 'Unable to sign in.' : 'Unable to create your account.'));
    } finally { setBusy(false); }
  };

  const switchMode = () => {
    const next = mode === 'login' ? 'register' : 'login';
    setMode(next);
    setError('');
    setConfirmPassword('');
    const params = new URLSearchParams(window.location.search);
    params.set('mode', next);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  };

  return <div className="auth-page">
    <div className="auth-card">
      <div className="auth-logo">✦</div>
      <h1>{mode === 'login' ? 'Welcome Back' : 'Create Your Account'}</h1>
      <p>{mode === 'login' ? 'Sign in to continue your preparation.' : 'Create your free TestPrep student account.'}</p>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {GOOGLE_CLIENT_ID && <><div className="google-wrap" ref={googleRef}></div><div className="auth-divider"><span>OR</span></div></>}
      <form onSubmit={submit} noValidate>
        {mode === 'register' && <label>Full Name<input autoComplete="name" required value={name} onChange={e => setName(e.target.value)} maxLength={150} placeholder="Enter your full name" disabled={busy}/></label>}
        <label>Email<input autoComplete="email" required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" disabled={busy}/></label>
        <label>Password<div className="password-field"><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength="6" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" disabled={busy}/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
        {mode === 'register' && <label>Confirm Password<div className="password-field"><input autoComplete="new-password" required minLength="6" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" disabled={busy}/><button type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>{showConfirm ? 'Hide' : 'Show'}</button></div></label>}
        <button className="auth-primary" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}</button>
      </form>
      <button className="switch" type="button" onClick={switchMode} disabled={busy}>{mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}</button>
      <a href={returnUrl === '/student.html' ? '/' : returnUrl}>Continue without signing in</a>
    </div>
  </div>;
}

createRoot(document.getElementById('auth-root')).render(<App/>);
