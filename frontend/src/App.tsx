import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import medassistLogo from './medassist_logo.png';

interface SymptomData {
  primary_symptom: string;
  severity_score: number;
  duration_category: string;
  frequency: string;
  age_group: string;
  breathlessness_level: string;
  vomiting_severity: string;
  fever_level: string;
  pain_type: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  isNew?: boolean;
  suggestions?: string[];
}

const TypewriterMessage = ({ content, isNew }: { content: string; isNew?: boolean }) => {
  const [displayedText, setDisplayedText] = React.useState(isNew ? "" : content);
  
  React.useEffect(() => {
    if (!isNew) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(content.slice(0, i + 1));
      i++;
      if (i >= content.length) clearInterval(interval);
    }, 5);
    return () => clearInterval(interval);
  }, [content, isNew]);

  return <div className="formatted-message">{formatText(displayedText)}</div>;
};

const formatText = (text: string) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return <div key={i} style={{ height: '0.5rem' }} />;

    // Function to render bold parts within a line
    const renderLineContent = (content: string) => {
      const parts = content.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    // Handle bullet points
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      return (
        <div key={i} style={{ margin: '0.4rem 0 0.4rem 1.2rem', display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ marginRight: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>•</span>
          <div style={{ flex: 1 }}>{renderLineContent(trimmedLine.substring(2))}</div>
        </div>
      );
    }

    // Handle Disclaimer styling
    if (trimmedLine.includes("DISCLAIMER:")) {
      return (
        <div key={i} className="message-disclaimer-box" style={{ 
          margin: '1.5rem 0 0.5rem 0', 
          padding: '1rem 0 0 0',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          lineHeight: '1.4'
        }}>
          {renderLineContent(trimmedLine)}
        </div>
      );
    }

    // Default paragraph
    return (
      <p key={i} style={{ margin: '0 0 0.8rem 0', lineHeight: '1.6' }}>
        {renderLineContent(line)}
      </p>
    );
  });
};

interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

const INITIAL_DATA: SymptomData = {
  primary_symptom: '',
  severity_score: 5,
  duration_category: '',
  frequency: '',
  age_group: '',
  breathlessness_level: 'none',
  vomiting_severity: 'none',
  fever_level: 'none',
  pain_type: 'none',
};

const ASSOCIATED_OPTIONS = [
  { id: 'breathlessness', label: 'Breathlessness' },
  { id: 'vomiting', label: 'Vomiting' },
  { id: 'dizziness', label: 'Dizziness' },
  { id: 'sweating', label: 'Sweating' },
  { id: 'nausea', label: 'Nausea' },
];

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<'portfolio' | 'login' | 'register' | 'app' | 'dictionary' | 'medicine'>('portfolio');
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(0); // 0 is Home, 1-6 are triage steps
  const [data, setData] = useState<SymptomData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });

  const [showExternalTriage, setShowExternalTriage] = useState(false);

  // Chat state
  const [chatHistory, setChatHistory] = useState<Chat[]>(() => {
    const saved = localStorage.getItem('medassist_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extras states
  const [dictTerm, setDictTerm] = useState('');
  const [dictResult, setDictResult] = useState<any>(null);
  const [medName, setMedName] = useState('');
  const [medResult, setMedResult] = useState<any>(null);
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [showDictModal, setShowDictModal] = useState(false);
  const [recentMedSearches, setRecentMedSearches] = useState<string[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleChange = (name: string, value: any) => {
    setData(prev => ({ ...prev, [name]: value }));
  };

  const sendMessage = async (text?: string) => {
    const msg = text || chatInput.trim();
    if (!msg) return;
    
    let newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsTyping(true);

    const saveToHistory = (msgs: ChatMessage[]) => {
      setChatHistory(prev => {
        let updatedHistory = [...prev];
        if (currentChatId) {
          const index = updatedHistory.findIndex(c => c.id === currentChatId);
          if (index !== -1) {
            updatedHistory[index] = { ...updatedHistory[index], messages: msgs, timestamp: Date.now() };
          }
        } else {
          const newId = Date.now().toString();
          const newChat: Chat = {
            id: newId,
            title: msgs[0].content.substring(0, 30) + (msgs[0].content.length > 30 ? '...' : ''),
            messages: msgs,
            timestamp: Date.now()
          };
          updatedHistory = [newChat, ...updatedHistory];
          setCurrentChatId(newId);
        }
        localStorage.setItem('medassist_history', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
    };

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: msg,
          history: newMessages.map(m => ({ role: m.role, content: m.content }))
        }),
      });
      const json = await res.json();
      const aiMsg: ChatMessage = { 
        role: 'ai', 
        content: json.reply, 
        isNew: true,
        suggestions: ["Start Symptom Analysis", ...(json.suggestions || []).filter((s: string) => s !== "Start Symptom Analysis")]
      };
      const finalMsgs = [...newMessages, aiMsg];
      setChatMessages(finalMsgs);
      saveToHistory(finalMsgs);
    } catch {
      const errorMsg: ChatMessage = { 
        role: 'ai', 
        content: 'Sorry, I could not connect to the server. Please try again.', 
        isNew: true,
        suggestions: []
      };
      const finalMsgs = [...newMessages, errorMsg];
      setChatMessages(finalMsgs);
      saveToHistory(finalMsgs);
    } finally {
      setIsTyping(false);
    }
  };

  const startNewChat = () => {
    setChatMessages([]);
    setCurrentChatId(null);
    setStep(0);
    setResult(null);
    setData(INITIAL_DATA);
  };

  const selectChat = (chat: Chat) => {
    setCurrentChatId(chat.id);
    setChatMessages(chat.messages);
    setStep(0);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedHistory = chatHistory.filter(c => c.id !== id);
    setChatHistory(updatedHistory);
    localStorage.setItem('medassist_history', JSON.stringify(updatedHistory));
    if (currentChatId === id) {
      startNewChat();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Backend error " + response.status);
      const json = await response.json();
      setResult(json);
      setStep(8); // Transition to results
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  const lookupDictionary = async (term?: string) => {
    const search = term || dictTerm.trim();
    if (!search) return;
    setLoading(true);
    setDictTerm(search);
    try {
      const res = await fetch('http://localhost:8000/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: search }),
      });
      const json = await res.json();
      setDictResult(json);
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  const lookupMedicine = async (name?: string) => {
    const search = (name || medName).trim();
    if (!search) return;
    setLoading(true);
    setMedResult(null);
    setMedName(search);
    try {
      const res = await fetch('http://localhost:8000/medicine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: search }),
      });
      const json = await res.json();
      setMedResult(json);
      // Track recent searches (only on success)
      if (!json.error) {
        setRecentMedSearches(prev => {
          const updated = [search, ...prev.filter(s => s.toLowerCase() !== search.toLowerCase())];
          return updated.slice(0, 5);
        });
      }
    } catch (err) {
      setMedResult({ error: 'Could not connect to MedAssist server. Please ensure the backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setData(INITIAL_DATA);
    setStep(0);
    setView('app');
  };

  const handleAuth = async (type: 'login' | 'register') => {
    setLoading(true);
    try {
      const endpoint = type === 'login' ? '/auth/login' : '/auth/register';
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || "Auth failed");
      
      setUser(json.user || { email: authForm.email });
      setView('app');
      setStep(0);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // UI Components
  const Navbar = () => (
    <nav className="navbar">
      <div className="logo" onClick={() => user ? setView('app') : setView('portfolio')} style={{ cursor: 'pointer' }}>
        <div className="logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </div>
        <span>MedAssist v2</span>
      </div>
      <div className="nav-links">
        {user ? (
          <>
            <a href="#" className={`nav-item ${step === 0 ? 'active' : ''}`} onClick={reset}>Home</a>
            <a href="#" className={`nav-item ${step > 0 && step < 7 ? 'active' : ''}`}>Symptom Check</a>
            <div className="user-profile">
              <div className="avatar">{user.email[0].toUpperCase()}</div>
              <span className="user-email">{user.email}</span>
              <button className="btn-logout" onClick={() => { setUser(null); setView('portfolio'); }}>Logout</button>
            </div>
          </>
        ) : (
          <>
            <a href="#" className="nav-item" onClick={() => setView('portfolio')}>Features</a>
            <button className="btn-login-nav" onClick={() => setView('login')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              Login
            </button>
            <button className="btn-register-nav" onClick={() => setView('register')}>Join MedAssist</button>
          </>
        )}
      </div>
    </nav>
  );

  const Footer = () => (
    <footer>
      © 2026 MedAssist v2 — Clinical decision support demonstration.
    </footer>
  );

  const ProgressBar = () => {
    if (step < 1 || step > 6) return null;
    const progress = Math.round(((step) / 6) * 100);
    return (
      <>
        <div className="step-info">
          <span>Step {step} of 6</span>
          <span>{progress}%</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
      </>
    );
  };

  // Rendering logic
  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <img src={medassistLogo} alt="MedAssist Logo" className="splash-logo" />
          <h1 className="splash-title">MedAssist</h1>
          <div className="splash-loader"></div>
        </div>
      </div>
    );
  }

  // Chat layout for logged-in users (all app views)
  if (user && (view === 'app' || view === 'dictionary' || view === 'medicine')) {
    return (
      <div className="chat-layout">
        {sidebarOpen && <div className="sidebar-overlay visible" onClick={() => setSidebarOpen(false)} />}
        <aside className={`chat-sidebar ${sidebarOpen ? 'expanded' : ''}`}>
          {/* Collapsed icon strip */}
          <div className="sidebar-icons">
            <div className="sidebar-logo-icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            </div>
            <button className="sidebar-icon-btn" onClick={startNewChat} title="New chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button className="sidebar-icon-btn" title="Search chats">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
            <button className="sidebar-icon-btn" title="All chats">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </button>
            <div className="sidebar-icons-footer">
              <div className="sidebar-avatar" style={{width:32,height:32,fontSize:'0.75rem'}}>{user.email[0].toUpperCase()}</div>
            </div>
          </div>
          {/* Expanded panel */}
          <div className="sidebar-panel">
            <div className="sidebar-panel-header">
              <div className="sidebar-brand">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                <span>MedAssist AI</span>
              </div>
              <button className="sidebar-collapse-btn" onClick={() => setSidebarOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
              </button>
            </div>
            <div className="sidebar-nav-items">
              <div className="sidebar-nav-item" onClick={startNewChat} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                New Chat
              </div>
              <div className={`sidebar-nav-item ${view === 'app' ? 'active' : ''}`} onClick={() => { setView('app'); setStep(0); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                Chat Assistant
              </div>
            </div>
            <div className="sidebar-search-container">
              <div className="sidebar-search-box">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  type="text" 
                  placeholder="Search chats..." 
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="sidebar-section-label">Recents</div>
            <div className="sidebar-chats">
              {chatHistory.filter(c => (c.title || "").toLowerCase().includes(chatSearchQuery.toLowerCase())).length === 0 ? (
                <div className="sidebar-empty-history" style={{padding:'0 0.75rem', fontSize:'0.8rem', color:'var(--text-muted)'}}>
                  {chatSearchQuery ? "No matches found" : "No recent chats"}
                </div>
              ) : (
                chatHistory
                  .filter(chat => (chat.title || "New Chat").toLowerCase().includes(chatSearchQuery.toLowerCase()))
                  .map(chat => (
                  <div 
                    key={chat.id} 
                    className={`chat-history-item ${currentChatId === chat.id ? 'active' : ''}`}
                    onClick={() => selectChat(chat)}
                  >
                    <svg className="chat-history-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis'}}>{chat.title || 'New Chat'}</span>
                    <button className="btn-delete-chat" onClick={(e) => deleteChat(e, chat.id)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="sidebar-footer">
              <div className="sidebar-avatar">{user.email[0].toUpperCase()}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-email">{user.email}</div>
                <div className="sidebar-user-plan">Free Plan</div>
              </div>
              <button className="btn-sidebar-logout" onClick={() => { setUser(null); setView('portfolio'); setSidebarOpen(false); }} title="Logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
          </div>
        </aside>

        <div className="chat-main">
          <header className="chat-main-header">
            <div className="chat-model-selector" style={{ display: 'none' }}>
              MedAssist AI <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"></path></svg>
            </div>
          </header>

          {/* ---- Chat / Triage view ---- */}
          {view === 'app' && step > 0 && (
            <div className="chat-triage-container">
              <button className="btn-back-to-chat" onClick={() => { setStep(0); setResult(null); setData(INITIAL_DATA); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
                Back to chat
              </button>
          <div className="triage-card fade-in">
            <h2 className="step-title">Symptom Assessment</h2>
            <p className="step-description">Answer 6 structured questions. All inputs are required.</p>

            <ProgressBar />

            <div className="form-box">
              {step === 1 && (
                <div className="fade-in">
                  <label className="control-label">Primary symptom</label>
                  <p className="control-sub">What is the main symptom you are experiencing?</p>
                  <select
                    className="custom-select"
                    value={data.primary_symptom}
                    onChange={(e) => handleChange('primary_symptom', e.target.value)}
                  >
                    <option value="" disabled>Select your primary symptom</option>
                    <option value="chest_pain">Chest Pain</option>
                    <option value="shortness_of_breath">Shortness of Breath</option>
                    <option value="fever">Fever</option>
                    <option value="vomiting">Vomiting</option>
                    <option value="headache">Headache</option>
                    <option value="abdominal_pain">Abdominal Pain</option>
                    <option value="sore_throat">Sore Throat</option>
                    <option value="cough">Cough</option>
                    <option value="dizziness">Dizziness</option>
                  </select>
                </div>
              )}

              {step === 2 && (
                <div className="fade-in">
                  <label className="control-label">Severity score</label>
                  <p className="control-sub">Rate the intensity of your primary symptom.</p>
                  <div className="slider-container">
                    <div className="slider-value">{data.severity_score}/10 <br /><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>{data.severity_score < 4 ? 'Mild' : data.severity_score < 8 ? 'Moderate' : 'Severe'}</span></div>
                    <input
                      type="range"
                      min="1" max="10"
                      value={data.severity_score}
                      onChange={(e) => handleChange('severity_score', parseInt(e.target.value))}
                    />
                    <div className="slider-labels">
                      <span>1 — Mild</span>
                      <span>5 — Moderate</span>
                      <span>10 — Severe</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="fade-in">
                  <label className="control-label">Duration</label>
                  <p className="control-sub">How long have you been experiencing this symptom?</p>
                  <div className="radio-group">
                    {[
                      { val: 'short', label: 'Less than 1 day' },
                      { val: 'medium', label: '1–3 days' },
                      { val: 'long', label: 'More than 3 days' }
                    ].map(opt => (
                      <div
                        key={opt.val}
                        className={`radio-card ${data.duration_category === opt.val ? 'active' : ''}`}
                        onClick={() => handleChange('duration_category', opt.val)}
                      >
                        <div className="radio-circle">
                          <div className="radio-inner"></div>
                        </div>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="fade-in">
                  <label className="control-label">Frequency</label>
                  <p className="control-sub">Has this happened before?</p>
                  <div className="radio-group">
                    {[
                      { val: 'rare', label: 'First time' },
                      { val: 'frequent', label: 'Recurring' },
                      { val: 'persistent', label: 'Constant' }
                    ].map(opt => (
                      <div
                        key={opt.val}
                        className={`radio-card ${data.frequency === opt.val ? 'active' : ''}`}
                        onClick={() => handleChange('frequency', opt.val)}
                      >
                        <div className="radio-circle"><div className="radio-inner"></div></div>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="fade-in">
                  <label className="control-label">Associated symptoms</label>
                  <p className="control-sub">Select any other symptoms you are experiencing.</p>
                  <div className="radio-group">
                    {ASSOCIATED_OPTIONS.map(opt => {
                      const isActive = (opt.id === 'breathlessness' && data.breathlessness_level !== 'none') ||
                        (opt.id === 'vomiting' && data.vomiting_severity !== 'none') ||
                        (opt.id === 'dizziness' && data.pain_type === 'dizzy');
                      return (
                        <div
                          key={opt.id}
                          className={`radio-card ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            if (opt.id === 'breathlessness') handleChange('breathlessness_level', data.breathlessness_level === 'none' ? 'mild' : 'none');
                            if (opt.id === 'vomiting') handleChange('vomiting_severity', data.vomiting_severity === 'none' ? 'mild' : 'none');
                            if (opt.id === 'dizziness') handleChange('pain_type', data.pain_type === 'none' ? 'dizzy' : 'none');
                          }}
                        >
                          <div className="radio-circle"><div className="radio-inner"></div></div>
                          {opt.label}
                        </div>
                      );
                    })}
                    <div
                      className={`radio-card ${data.breathlessness_level === 'none' && data.vomiting_severity === 'none' && data.pain_type === 'none' ? 'active' : ''}`}
                      onClick={() => {
                        handleChange('breathlessness_level', 'none');
                        handleChange('vomiting_severity', 'none');
                        handleChange('pain_type', 'none');
                      }}
                    >
                      <div className="radio-circle"><div className="radio-inner"></div></div>
                      None
                    </div>
                  </div>
                  <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select all that apply. Choose "None" if there are no associated symptoms.</p>
                </div>
              )}

              {step === 6 && (
                <div className="fade-in">
                  <label className="control-label">Age group</label>
                  <p className="control-sub">Which age group does the patient belong to?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {[
                      { val: 'child', label: 'Under 18' },
                      { val: 'adult', label: '18–40' },
                      { val: 'adult_plus', label: '41–60' },
                      { val: 'elderly', label: '60+' }
                    ].map(opt => (
                      <div
                        key={opt.val}
                        className={`radio-card ${data.age_group === opt.val ? 'active' : ''}`}
                        onClick={() => handleChange('age_group', opt.val)}
                      >
                        <div className="radio-circle"><div className="radio-inner"></div></div>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="step-actions">
              <button className="btn-back" onClick={prevStep}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
                Back
              </button>
              {step < 6 ? (
                <button
                  className="btn-next"
                  onClick={nextStep}
                  disabled={step === 1 && !data.primary_symptom || step === 3 && !data.duration_category || step === 4 && !data.frequency}
                >
                  Next
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
                </button>
              ) : (
                <button className="btn-next" style={{ background: 'var(--primary)' }} onClick={nextStep} disabled={!data.age_group}>
                  Review
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
                </button>
              )}
            </div>
          </div>

        {step === 7 && !result && (
          <div className="triage-card fade-in">
            <h2 className="step-title">Symptom Assessment</h2>
            <p className="step-description">Answer 6 structured questions. All inputs are required.</p>

            {result?.status === 'Contradiction Detected' ? (
              <div className="validation-banner" style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c' }}>
                <div className="validation-icon">⚠</div>
                <div>
                  <strong>Input Contradiction Detected</strong>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>{result.ai_explanation.narrative}</p>
                </div>
              </div>
            ) : (
              <div className="validation-banner">
                <div className="validation-icon">✓</div>
                <div>
                  <strong>Inputs validated</strong>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>No contradictions detected. You can proceed to results.</p>
                </div>
              </div>
            )}

            <div className="review-box">
              <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Review your inputs</h3>
              <table className="review-table">
                <tbody>
                  <tr><td>Primary symptom</td><td>{data.primary_symptom.replace('_', ' ')}</td></tr>
                  <tr><td>Severity</td><td>{data.severity_score}/10 ({data.severity_score < 4 ? 'Mild' : data.severity_score < 8 ? 'Moderate' : 'Severe'})</td></tr>
                  <tr><td>Duration</td><td>{data.duration_category === 'short' ? 'Less than 1 day' : data.duration_category === 'medium' ? '1–3 days' : 'More than 3 days'}</td></tr>
                  <tr><td>Frequency</td><td>{data.frequency === 'rare' ? 'First time' : data.frequency === 'frequent' ? 'Recurring' : 'Constant'}</td></tr>
                  <tr><td>Associated symptoms</td><td>{
                    (() => {
                      const list = [];
                      if (data.breathlessness_level !== 'none') list.push('Breathlessness');
                      if (data.vomiting_severity !== 'none') list.push('Vomiting');
                      if (data.pain_type === 'dizzy') list.push('Dizziness');
                      return list.length > 0 ? list.join(', ') : 'None';
                    })()
                  }</td></tr>
                  <tr><td>Age group</td><td>{
                    data.age_group === 'child' ? 'Under 18' :
                      data.age_group === 'adult' ? '18–40' :
                        data.age_group === 'adult_plus' ? '41–60' : '60+'
                  }</td></tr>
                </tbody>
              </table>
            </div>

            <div className="step-actions">
              <button className="btn-back" onClick={() => setStep(6)}>← Edit answers</button>
              <button className="btn-next" style={{ background: 'var(--primary)' }} onClick={handleSubmit} disabled={loading}>
                {loading ? 'Analyzing...' : 'Run triage'}
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>
        )}
        {step === 8 && result && (
          <div className="fade-in" style={{ width: '100%', maxWidth: '800px' }}>
            <h2 className="step-title">Triage Results</h2>
            <p className="step-description">Generated {new Date().toLocaleString()}</p>

            <div className="urgency-decision-card">
              <div>
                <div className="section-tag">Urgency Decision</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Final recommendation from the triage layers</div>
                <div className={`urgency-badge-large urgency-${(result?.final_urgency || 'MODERATE').toUpperCase()}`}>
                  {result?.final_urgency || 'Moderate'}
                </div>
              </div>
              <div className="decision-source">
                <div className="decision-source-label">Decision made by</div>
                <div className="decision-source-name">Rule Engine</div>
                <div className="decision-source-status" style={{ color: result.status.includes('Conflict') ? '#f59e0b' : '#10b981' }}>
                  {result.status.includes('Conflict') ? 'Uncertain' : 'Verified'}
                </div>
              </div>
            </div>

            <div className="explanation-section">
              <div className="section-tag">Decision Explanation</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Why this recommendation was made</div>

              <div className="rule-fired-box">
                <div className="section-tag">Rule That Fired</div>
                <div style={{ fontWeight: 700, margin: '0.5rem 0' }}>
                  {result.rule_output.matching_rule}
                </div>
                <div style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'var(--primary)', color: 'white' }}>
                  Rule output: {result.final_urgency.toUpperCase()}
                </div>
              </div>

              <div className="ml-confidence-container">
                <div className="ml-conf-header">
                  <div className="section-tag">ML Confidence</div>
                  <div className="ml-conf-badge">{result.ml_output.confidence > 0.8 ? 'HIGH' : 'LOW'}</div>
                </div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  Score {Math.round(result.ml_output.confidence * 10)}/10 · {Math.round(result.ml_output.confidence * 100)}% confidence
                </div>
                <div className="progress-bar-container" style={{ marginBottom: 0, height: '8px' }}>
                  <div className="progress-bar" style={{ width: `${result.ml_output.confidence * 100}%`, background: '#0487af' }}></div>
                </div>
              </div>

              <div className="ai-explanation-box">
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  AI-GENERATED EXPLANATION
                </div>
                {result.ai_explanation.narrative}
              </div>
            </div>

            <div className="next-steps-banner">
              <div className="section-tag">Next Steps</div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', marginTop: '0.5rem' }}>{result.ai_explanation.recommendation}</div>
            </div>

            <div className="step-actions">
              <button className="btn-secondary" onClick={reset}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                New assessment
              </button>
              <button className="btn-next" onClick={() => setStep(9)}>
                View PDF report
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </button>
            </div>
          </div>
        )}

        {step === 9 && result && (
          <div className="fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setStep(8)}>← Back to results</button>
              <button className="btn-next" onClick={() => window.open(`http://localhost:8000/report?urgency=${result.final_urgency}&explanation=${encodeURIComponent(result.ai_explanation.narrative)}`, '_blank')}>
                Download PDF
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </button>
            </div>

            <div className="report-view">
              <div className="report-header">
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>MedAssist v2</h1>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Triage Assessment Report</div>
                </div>
                <div className="report-date">
                  Generated<br />{new Date().toLocaleString()}
                </div>
              </div>

              <div className="section-tag" style={{ marginBottom: '1rem' }}>Patient Inputs</div>
              <table className="review-table" style={{ marginBottom: '3rem' }}>
                <tbody>
                  <tr><td>Primary symptom</td><td>{data.primary_symptom.replace('_', ' ')}</td></tr>
                  <tr><td>Severity score</td><td>{data.severity_score}/10 ({data.severity_score < 4 ? 'Mild' : data.severity_score < 8 ? 'Moderate' : 'Severe'})</td></tr>
                  <tr><td>Duration</td><td>{data.duration_category === 'short' ? 'Less than 1 day' : data.duration_category === 'medium' ? '1–3 days' : 'More than 3 days'}</td></tr>
                  <tr><td>Frequency</td><td>{data.frequency === 'rare' ? 'First time' : data.frequency === 'frequent' ? 'Recurring' : 'Constant'}</td></tr>
                  <tr><td>Associated symptoms</td><td>{
                    (() => {
                      const list = [];
                      if (data.breathlessness_level !== 'none') list.push('Breathlessness');
                      if (data.vomiting_severity !== 'none') list.push('Vomiting');
                      if (data.pain_type === 'dizzy') list.push('Dizziness');
                      return list.length > 0 ? list.join(', ') : 'None';
                    })()
                  }</td></tr>
                  <tr><td>Age group</td><td>{
                    data.age_group === 'child' ? 'Under 18' :
                      data.age_group === 'adult' ? '18–40' :
                        data.age_group === 'adult_plus' ? '41–60' : '60+'
                  }</td></tr>
                </tbody>
              </table>

              <div className="section-tag" style={{ marginBottom: '1rem' }}>Urgency Level</div>
              <div className="urgency-decision-card" style={{ padding: '1.5rem', marginBottom: '3rem' }}>
                <div className={`urgency-badge-large urgency-${result.final_urgency.toUpperCase()}`} style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
                  {result.final_urgency}
                </div>
                <div className="decision-source">
                  <div style={{ fontSize: '0.85rem' }}>Decision layer: <strong>Rule Engine</strong></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidence: Uncertain</div>
                </div>
              </div>

              <div className="section-tag" style={{ marginBottom: '1rem' }}>Decision Explanation</div>
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}><strong>Rule engine ({result.final_urgency.toUpperCase()}):</strong> {result.rule_output.matching_rule}</div>
                <div style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}><strong>ML model (LOW):</strong> Score {Math.round(result.ml_output.confidence * 10)}/10, {Math.round(result.ml_output.confidence * 100)}% confidence.</div>

                <div className="ai-explanation-box">
                  <div className="section-tag" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>AI-Generated Explanation</div>
                  {result.ai_explanation.narrative}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '3rem 0' }} />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                This report is for informational purposes only and does not replace professional medical advice. If you believe you are experiencing a medical emergency, contact emergency services immediately.
              </p>
            </div>
          </div>
        )}
            </div>
          )}

          {/* ---- Chat messages view ---- */}
          {view === 'app' && step === 0 && (
            <>
              {chatMessages.length === 0 ? (
                <div className="chat-empty-state">
                  <div className="empty-chat-branding">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" style={{ marginBottom: '1rem' }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                    <h1 className="empty-chat-main-title">MedAssist AI</h1>
                  </div>
                  <h1 className="empty-chat-title">How can I help you?</h1>
                  
                  <div className="chat-input-wrapper empty-state-input">
                    <div className="chat-input-box">
                      <textarea
                        rows={1}
                        placeholder="Ask anything"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      />
                      <button className="btn-send" onClick={() => sendMessage()} disabled={!chatInput.trim() || isTyping}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                      </button>
                    </div>
                  </div>

                  <div className="quick-actions-horizontal">
                    <button className="quick-action-chip" onClick={() => setShowExternalTriage(true)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                      Start Symptom Analysis
                    </button>
                    <button className="quick-action-chip" onClick={() => setShowMedicineModal(true)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>
                      Know Your Medicine
                    </button>
                    <button className="quick-action-chip" onClick={() => setShowDictModal(true)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                      Medical Dictionary
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="chat-messages">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`chat-message ${msg.role}`}>
                        <div className={`message-avatar ${msg.role === 'ai' ? 'ai-avatar' : 'user-avatar'}`}>
                          {msg.role === 'ai' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                          ) : user.email[0].toUpperCase()}
                        </div>
                        <div className="message-content">
                          <div className="message-sender">{msg.role === 'ai' ? 'MedAssist AI' : 'You'}</div>
                          <div className="message-text">
                            <TypewriterMessage content={msg.content} isNew={msg.isNew} />
                            {msg.role === 'ai' && msg.suggestions && msg.suggestions.length > 0 && (
                              <div className="message-suggestions">
                                {msg.suggestions.map((suggestion, idx) => (
                                  <button 
                                    key={idx} 
                                    className="suggestion-pill"
                                    onClick={() => {
                                      if (suggestion === "Start Symptom Analysis") {
                                        setShowExternalTriage(true);
                                      } else if (suggestion === "Open Know Your Medicine" || suggestion === "Use Medical Dictionary") {
                                          if (suggestion.includes("Medicine")) setShowMedicineModal(true);
                                          else setShowDictModal(true);
                                      } else {
                                        sendMessage(suggestion);
                                      }
                                    }}
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="chat-message ai">
                        <div className="message-avatar ai-avatar">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                        </div>
                        <div className="message-content">
                          <div className="message-sender">MedAssist AI</div>
                          <div className="thinking-text">
                            <div className="thinking-icon"></div>
                            Thinking...
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="chat-input-area">
                    <div className="chat-input-wrapper">
                      <div className="chat-input-box">
                        <textarea
                          rows={1}
                          placeholder="Ask anything"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        />
                        <button className="btn-send" onClick={() => sendMessage()} disabled={!chatInput.trim() || isTyping}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                      </div>
                        <div className="chat-input-disclaimer" style={{ color: '#ef4444', fontWeight: 600 }}>
                          ⚠ MedAssist provides clinical support for educational purposes only. Not a substitute for professional diagnosis. In emergencies, call 911 immediately.
                        </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ---- Dictionary view ---- */}
          {view === 'dictionary' && (
            <div className="extra-view-container fade-in">
              <div className="extra-header">
                <div className="section-tag">Medical Dictionary</div>
                <h1 className="extra-title">Term Definitions</h1>
                <p className="extra-description">Enter a medical term to get a simplified and clinical definition.</p>
              </div>
              <div className="extra-search-box">
                <input 
                  type="text" 
                  placeholder="Search for a medical term (e.g., Encephalitis, Tachycardia)..." 
                  value={dictTerm}
                  onChange={(e) => setDictTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && lookupDictionary()}
                />
                <button className="btn-extra-search" onClick={() => lookupDictionary()} disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              {dictResult && (
                <div className="dict-result-card fade-in">
                  <div className="dict-term-header">
                    <h2 className="dict-term">{dictResult.term}</h2>
                    <span className="dict-phonetic">{dictResult.phonetic}</span>
                  </div>
                  
                  <div className="dict-section">
                    <div className="dict-section-label">Simple Definition</div>
                    <p className="dict-text">{dictResult.simple_definition}</p>
                  </div>
                  
                  <div className="dict-section">
                    <div className="dict-section-label">Clinical Context</div>
                    <p className="dict-text">{dictResult.clinical_definition}</p>
                  </div>
                  
                  <div className="dict-section">
                    <div className="dict-section-label">Usage & Context</div>
                    <p className="dict-text">{dictResult.context}</p>
                  </div>
                  
                  {dictResult.related_terms && (
                    <div className="dict-related">
                      <div className="dict-section-label">Related Terms</div>
                      <div className="dict-tags">
                        {dictResult.related_terms.map((t: string) => (
                          <span key={t} className="dict-tag" onClick={() => lookupDictionary(t)}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---- Medicine view ---- */}
          {view === 'medicine' && (
            <div className="extra-view-container fade-in">
              <div className="extra-header">
                <div className="section-tag">Know Your Medicine</div>
                <h1 className="extra-title">Medication Intelligence</h1>
                <p className="extra-description">Search for any medicine to understand its mechanism, side effects, and precautions.</p>
              </div>
              <div className="extra-search-box">
                <input 
                  type="text" 
                  placeholder="Enter medication name (e.g., Metformin, Amoxicillin)..." 
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && lookupMedicine()}
                />
                <button className="btn-extra-search" onClick={() => lookupMedicine()} disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              {medResult && (
                <div className="med-result-card fade-in">
                  <h2 className="med-title">{medResult.medicine}</h2>
                  <p className="med-overview">{medResult.overview}</p>
                  
                  <div className="med-grid">
                    <div className="med-info-box">
                      <div className="dict-section-label">Mechanism of Action</div>
                      <p className="med-text">{medResult.mechanism}</p>
                    </div>
                    <div className="med-info-box">
                      <div className="dict-section-label">Typical Dosage</div>
                      <p className="med-text">{medResult.dosage_info}</p>
                    </div>
                  </div>
                  
                  <div className="med-list-section">
                    <div className="dict-section-label">Common Side Effects</div>
                    <ul className="med-list">
                      {medResult.side_effects.map((s: string) => <li key={s}>{s}</li>)}
                    </ul>
                  </div>
                  
                  <div className="med-list-section warning">
                    <div className="dict-section-label">Critical Warnings</div>
                    <ul className="med-list">
                      {medResult.warnings.map((w: string) => <li key={w}>{w}</li>)}
                    </ul>
                  </div>
                  
                  {medResult.related_medicines && (
                    <div className="dict-related">
                      <div className="dict-section-label">Related / Alternatives</div>
                      <div className="dict-tags">
                        {medResult.related_medicines.map((m: string) => (
                          <span key={m} className="dict-tag" onClick={() => lookupMedicine(m)}>{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>


        {/* ---- Know Your Medicine Modal ---- */}
        {showMedicineModal && (
          <div className="external-triage-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowMedicineModal(false); setMedResult(null); setMedName(''); } }}>
            <div className="external-triage-modal" style={{ maxWidth: '860px', height: 'auto', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="external-modal-header">
                <div className="modal-brand">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>
                  <span>Know Your Medicine</span>
                </div>
                <button className="btn-close-external" onClick={() => { setShowMedicineModal(false); setMedResult(null); setMedName(''); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  Close
                </button>
              </div>
              <div style={{ padding: '2.5rem', overflowY: 'auto', flex: 1 }}>
                {!medResult ? (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f0f9fa', border: '1px solid #d1e9f0', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '1.5rem' }}>
                        ⓘ MedAssist Module
                      </div>
                      <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>Look up any medicine in seconds</h2>
                      <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>Search for usage, side effects, precautions, warnings and drug interactions — clearly organized and easy to understand.</p>
                    </div>
                    <div className="extra-search-box" style={{ marginBottom: '1.5rem' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ marginLeft: '1rem', flexShrink: 0 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      <input
                        type="text"
                        placeholder="Search medicine name"
                        value={medName}
                        onChange={(e) => setMedName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && lookupMedicine()}
                        autoFocus
                      />
                      <button className="btn-extra-search" onClick={() => lookupMedicine()} disabled={loading}>
                        {loading ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Popular:&nbsp;
                      {['Paracetamol', 'Dolo 650', 'Amoxicillin', 'Cetirizine'].map(m => (
                        <button key={m} onClick={() => lookupMedicine(m)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.25rem 0.75rem', marginRight: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-main)' }}>{m}</button>
                      ))}
                    </div>
                    <div style={{ background: '#fffbf0', border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', fontSize: '0.9rem', color: '#92400e' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      Always consult a doctor before taking medications.
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '1rem' }}>Browse Medicines</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      {[
                        { name: 'Paracetamol', sub: 'Acetaminophen 500mg' },
                        { name: 'Dolo 650', sub: 'Paracetamol 650mg' },
                        { name: 'Amoxicillin', sub: 'Amoxicillin 500mg' },
                        { name: 'Cetirizine', sub: 'Cetirizine 10mg' },
                        { name: 'Ibuprofen', sub: 'Ibuprofen 400mg' },
                        { name: 'Azithromycin', sub: 'Azithromycin 500mg' },
                      ].map(m => (
                        <div key={m.name} onClick={() => lookupMedicine(m.name)} style={{ border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: 'white', transition: 'all 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(4,135,175,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                          <div style={{ width: 38, height: 38, background: '#e8f7f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{m.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : medResult.error ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💊</div>
                    <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '1rem' }}>{medResult.error}</p>
                    <button onClick={() => { setMedResult(null); setMedName(''); }} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.6rem 1.5rem', cursor: 'pointer', fontWeight: 600 }}>← Try Again</button>
                  </div>
                ) : (
                  <div className="fade-in">
                    {/* Recent searches */}
                    {recentMedSearches.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          Recent Searches
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {recentMedSearches.slice(0, 5).map(s => (
                            <button key={s} onClick={() => lookupMedicine(s)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.3rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path></svg>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medicine header card */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem', background: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>
                          </div>
                          <div>
                            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>{medResult.medicine}</h2>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.2rem' }}>{medResult.subtitle}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {medResult.tags?.map((tag: string) => (
                            <span key={tag} style={{ background: '#f0f9fa', border: '1px solid #d1e9f0', borderRadius: '20px', padding: '0.2rem 0.8rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      {medResult.description && (
                        <p style={{ marginTop: '1rem', marginBottom: 0, fontSize: '0.92rem', color: '#475569', lineHeight: 1.6 }}>{medResult.description}</p>
                      )}
                    </div>

                    {/* 2×2 info grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                      {/* USES */}
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', background: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                          <div style={{ width: 28, height: 28, background: '#e8f7f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Uses</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                          {medResult.uses?.map((u: string) => (
                            <li key={u} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                              <span style={{ color: 'var(--primary)', fontWeight: 900, marginTop: '2px', flexShrink: 0 }}>•</span>{u}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* SIDE EFFECTS */}
                      <div style={{ border: '1px solid #fef3c7', borderRadius: '14px', padding: '1.25rem', background: '#fffdf5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                          <div style={{ width: 28, height: 28, background: '#fef3c7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#92400e' }}>Side Effects</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                          {medResult.side_effects?.map((s: string) => (
                            <li key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                              <span style={{ color: '#d97706', fontWeight: 900, marginTop: '2px', flexShrink: 0 }}>•</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* PRECAUTIONS */}
                      <div style={{ border: '1px solid #dbeafe', borderRadius: '14px', padding: '1.25rem', background: '#f0f7ff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                          <div style={{ width: 28, height: 28, background: '#dbeafe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#1d4ed8' }}>Precautions</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                          {medResult.precautions?.map((p: string) => (
                            <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                              <span style={{ color: '#2563eb', fontWeight: 900, marginTop: '2px', flexShrink: 0 }}>•</span>{p}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* WARNINGS */}
                      <div style={{ border: '1px solid #fecaca', borderRadius: '14px', padding: '1.25rem', background: '#fff5f5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                          <div style={{ width: 28, height: 28, background: '#fee2e2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#b91c1c' }}>Warnings</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                          {medResult.warnings?.map((w: string) => (
                            <li key={w} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                              <span style={{ color: '#dc2626', fontWeight: 900, marginTop: '2px', flexShrink: 0 }}>•</span>{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Related medicines + actions */}
                    {medResult.related_medicines && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>Related / Alternatives</div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {medResult.related_medicines.map((m: string) => (
                            <span key={m} className="dict-tag" onClick={() => lookupMedicine(m)}>{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button onClick={() => { setMedResult(null); setMedName(''); }} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.55rem 1.2rem', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>← Search another medicine</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- Medical Dictionary Modal ---- */}
        {showDictModal && (
          <div className="external-triage-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowDictModal(false); setDictResult(null); setDictTerm(''); } }}>
            <div className="external-triage-modal" style={{ maxWidth: '800px', height: 'auto', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="external-modal-header">
                <div className="modal-brand">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                  <span>Medical Dictionary</span>
                </div>
                <button className="btn-close-external" onClick={() => { setShowDictModal(false); setDictResult(null); setDictTerm(''); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  Close
                </button>
              </div>
              <div style={{ padding: '2.5rem', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Medical Dictionary</h2>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginLeft: '3rem' }}>Search any medical term to get a clear, structured explanation.</p>
                </div>
                
                <div className="extra-search-box" style={{ marginBottom: '1rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '50px', padding: '0.5rem', display: 'flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ marginLeft: '1rem', flexShrink: 0 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input 
                    type="text" 
                    placeholder="Search diseases, symptoms, tests, or medical terms" 
                    value={dictTerm} 
                    onChange={(e) => setDictTerm(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && lookupDictionary()} 
                    autoFocus 
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '0.75rem 1rem', fontSize: '1rem' }}
                  />
                  <button onClick={() => lookupDictionary()} disabled={loading} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '40px', padding: '0.75rem 2rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem', marginLeft: '1rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Try:</span>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['diabetes', 'hypertension', 'MRI', 'anemia'].map(t => (
                      <span key={t} onClick={() => lookupDictionary(t)} style={{ color: 'var(--primary)', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>{t}</span>
                    ))}
                  </div>
                </div>

                {!dictResult ? (
                  <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>Search any medical term to learn more</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>Get reliable, structured information on diseases, symptoms, diagnostic tests, and treatments.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      {['Diabetes', 'Hypertension', 'MRI', 'Anemia'].map(t => (
                        <button key={t} onClick={() => lookupDictionary(t)} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.75rem 2.5rem', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : dictResult.error ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
                    <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '1rem' }}>{dictResult.error}</p>
                    <button onClick={() => { setDictResult(null); setDictTerm(''); }} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.6rem 1.5rem', cursor: 'pointer', fontWeight: 600 }}>← Try Again</button>
                  </div>
                ) : (
                  <div className="dict-result-card fade-in" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '2.5rem' }}>
                    <div className="dict-term-header" style={{ marginBottom: '2rem' }}>
                      <h2 className="dict-term" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0' }}>{dictResult.term}</h2>
                      <span className="dict-phonetic" style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>{dictResult.phonetic}</span>
                    </div>
                    <div className="dict-section" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                      <div className="dict-section-label" style={{ color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '0.75rem' }}>Simple Definition</div>
                      <p className="dict-text" style={{ fontSize: '1.1rem', color: '#334155', lineHeight: 1.6, margin: 0 }}>{dictResult.simple_definition}</p>
                    </div>
                    <div className="dict-section" style={{ background: 'white', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                      <div className="dict-section-label" style={{ color: '#0f172a', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '0.75rem' }}>Clinical Context</div>
                      <p className="dict-text" style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>{dictResult.clinical_definition}</p>
                    </div>
                    <div className="dict-section" style={{ background: 'white', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                      <div className="dict-section-label" style={{ color: '#0f172a', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '0.75rem' }}>Usage & Context</div>
                      <p className="dict-text" style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>{dictResult.context}</p>
                    </div>
                    {dictResult.related_terms && (
                      <div>
                        <div className="dict-section-label" style={{ color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '0.75rem' }}>Related Terms</div>
                        <div className="dict-tags" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {dictResult.related_terms.map((t: string) => (
                            <span key={t} className="dict-tag" onClick={() => lookupDictionary(t)} style={{ background: '#f1f5f9', color: 'var(--primary)', padding: '0.5rem 1.2rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseEnter={e => {e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white';}}
                              onMouseLeave={e => {e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = 'var(--primary)';}}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showExternalTriage && (
          <div className="external-triage-overlay">
            <div className="external-triage-modal">
              <div className="external-modal-header">
                <div className="modal-brand">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                  <span>Smart Triage Buddy</span>
                </div>
                <button className="btn-close-external" onClick={() => { setShowExternalTriage(false); startNewChat(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  Return to MedAssist
                </button>
              </div>
              <div className="external-iframe-container">
                <iframe 
                  src="https://smart-triage-buddy-94.lovable.app" 
                  title="External Triage Tool"
                  className="external-triage-frame"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Navbar />
      <main className="container">
        {view === 'portfolio' && (
          <div className="portfolio-view fade-in">
            <section className="portfolio-hero">
              <div className="rolling-text-container">
                <div className="rolling-text">
                  <span>AI-POWERED TRIAGE • CLINICAL ACCURACY • 24/7 SUPPORT • INSTANT PDF REPORTS • EMERGENCY PREDICTION • SMART HOSPITAL FINDER • </span>
                  <span>AI-POWERED TRIAGE • CLINICAL ACCURACY • 24/7 SUPPORT • INSTANT PDF REPORTS • EMERGENCY PREDICTION • SMART HOSPITAL FINDER • </span>
                </div>
              </div>
              <div className="hero-content">
                <h1 className="main-title">The Future of <br/><span>Personal Healthcare</span></h1>
                <p className="main-subtitle">Advanced clinical decision support driven by structured medical logic and validated by state-of-the-art machine learning.</p>
                <div className="hero-buttons">
                  <button className="btn-primary-large" onClick={() => setView('register')}>Get Started for Free</button>
                  <button className="btn-secondary-large" onClick={() => document.getElementById('features')?.scrollIntoView({behavior: 'smooth'})}>Explore Features</button>
                </div>
              </div>
            </section>
            <section id="features" className="features-grid">
              <div className="feature-card premium"><div className="feature-icon">🔍</div><h3>Symptom Analysis</h3><p>Structured 6-step clinical evaluation to identify potential health risks with high precision.</p></div>
              <div className="feature-card premium"><div className="feature-icon">🚨</div><h3>Emergency Prediction</h3><p>Real-time urgency detection that warns you when immediate medical attention is required.</p></div>
              <div className="feature-card"><div className="feature-icon">📑</div><h3>PDF Report Summarizer</h3><p>Instantly generate professional clinical summaries to share with your doctor or healthcare provider.</p></div>
              <div className="feature-card"><div className="feature-icon">💬</div><h3>Dedicated AI Chatbot</h3><p>An intelligent assistant ready to answer your medical queries and guide you through the platform.</p></div>
            </section>
          </div>
        )}
        {view === 'login' && (
          <div className="auth-card fade-in">
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">Login to access your clinical dashboard</p>
            <div className="auth-form">
              <div className="input-group"><label>Email Address</label><input type="email" placeholder="name@example.com" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} /></div>
              <div className="input-group"><label>Password</label><input type="password" placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} /></div>
              <button className="btn-auth-submit" onClick={() => handleAuth('login')} disabled={loading}>{loading ? 'Verifying...' : 'Login to MedAssist'}</button>
              <p className="auth-switch">Don't have an account? <span onClick={() => setView('register')}>Sign up</span></p>
            </div>
          </div>
        )}
        {view === 'register' && (
          <div className="auth-card fade-in">
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">Join thousands of users prioritizing their health</p>
            <div className="auth-form">
              <div className="input-group"><label>Full Name</label><input type="text" placeholder="John Doe" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} /></div>
              <div className="input-group"><label>Email Address</label><input type="email" placeholder="name@example.com" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} /></div>
              <div className="input-group"><label>Password</label><input type="password" placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} /></div>
              <button className="btn-auth-submit" onClick={() => handleAuth('register')} disabled={loading}>{loading ? 'Creating Account...' : 'Get Started Now'}</button>
              <p className="auth-switch">Already have an account? <span onClick={() => setView('login')}>Login</span></p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
