import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {api} from './api';
import './auth.css';

const GOOGLE_CLIENT_ID=import.meta.env.VITE_GOOGLE_CLIENT_ID||'';

function App(){
  const[mode,setMode]=useState('login'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),googleRef=useRef(null);
  useEffect(()=>{
    if(!GOOGLE_CLIENT_ID||!googleRef.current)return;
    const render=()=>{
      if(!window.google?.accounts?.id||!googleRef.current)return;
      window.google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:handleGoogleResponse,auto_select:false});
      window.google.accounts.id.renderButton(googleRef.current,{theme:'outline',size:'large',width:326,text:'continue_with',shape:'rectangular'});
    };
    if(window.google?.accounts?.id)render();else{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.onload=render;document.head.appendChild(script);return()=>script.remove()}
  },[]);
  const handleGoogleResponse=async response=>{setBusy(true);setError('');try{const r=await api.auth.google(response.credential);localStorage.setItem('testprep_access_token',r.accessToken);localStorage.setItem('testprep_refresh_token',r.refreshToken);window.location.href='/student.html'}catch(e){setError(e.message||'Google sign-in failed.')}finally{setBusy(false)}};
  const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{const r=mode==='login'?await api.auth.login({email,password}):await api.auth.register({fullName:name,email,password});localStorage.setItem('testprep_access_token',r.accessToken);localStorage.setItem('testprep_refresh_token',r.refreshToken);window.location.href='/student.html'}catch(e){setError(e.message)}finally{setBusy(false)}};
  return <div className="auth-page"><div className="auth-card"><div className="auth-logo">✦</div><h1>{mode==='login'?'Welcome Back':'Create Account'}</h1><p>{mode==='login'?'Sign in to continue your preparation.':'Start your exam preparation journey.'}</p>{error&&<div className="auth-error">{error}</div>}{GOOGLE_CLIENT_ID&&<><div className="google-wrap" ref={googleRef}></div><div className="auth-divider"><span>OR</span></div></>}<form onSubmit={submit}>{mode==='register'&&<label>Full Name<input required value={name} onChange={e=>setName(e.target.value)}/></label>}<label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input required minLength="6" type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="auth-primary" disabled={busy}>{busy?'Please wait...':mode==='login'?'Sign In':'Create Account'}</button></form><button className="switch" onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?"Don't have an account? Create one":"Already have an account? Sign in"}</button><a href="/">Continue without signing in</a></div></div>
}
createRoot(document.getElementById('auth-root')).render(<App/>);