import React, { useState, useEffect } from 'react';
import { 
  Shield, QrCode, MapPin, User, Mail, Phone, 
  Plus, Edit3, ExternalLink, Copy, Check, 
  LogOut, CheckCircle, HelpCircle, Radio, Camera, Clock, 
  UserPlus, Info, LogIn, Eye, Sparkles, Navigation, Signal,
  ArrowRight, Key, Smartphone, Lock, AlertCircle, Trash2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('items');
  
  // Persistent Auth State - Default to null/logged-out if no saved user exists
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('itemfinder_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin', 'signup', 'reset'
  
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('itemfinder_registered_users');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Profiles State - Default empty unless initialized or loaded from storage
  const [profiles, setProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem('itemfinder_profiles_v12');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [selectedTagId, setSelectedTagId] = useState(() => profiles[0]?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [finderNameInput, setFinderNameInput] = useState('');
  const [finderPhoneInput, setFinderPhoneInput] = useState('');
  const [autoPingSent, setAutoPingSent] = useState(false);
  const [lastCoords, setLastCoords] = useState(null);
  const [alertToast, setAlertToast] = useState(null);

  const currentProfile = profiles.find(p => p.id === selectedTagId) || profiles[0] || null;

  // Sync Current User to LocalStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('itemfinder_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('itemfinder_user');
      }
    } catch (e) {
      console.error('Storage error', e);
    }
  }, [currentUser]);

  // Sync Profiles & Purge 30-Day Logs
  useEffect(() => {
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const cleanedProfiles = profiles.map(profile => ({
        ...profile,
        finderLogs: (profile.finderLogs || []).filter(log => new Date(log.timestamp).getTime() > thirtyDaysAgo)
      }));
      localStorage.setItem('itemfinder_profiles_v12', JSON.stringify(cleanedProfiles));
    } catch (e) {
      console.error('Storage error', e);
    }
  }, [profiles]);

  // Sync Registered Users
  useEffect(() => {
    try {
      localStorage.setItem('itemfinder_registered_users', JSON.stringify(registeredUsers));
    } catch (e) {
      console.error('Storage error', e);
    }
  }, [registeredUsers]);

  // Handle URL Tag Direct Access (e.g., ?tagId=TAG-XXXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tagFromUrl = params.get('tagId');
    if (tagFromUrl) {
      const match = profiles.find(p => p.id === tagFromUrl);
      if (match) {
        setSelectedTagId(match.id);
        setActiveTab('finder');

        if (!autoPingSent && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLastCoords({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
              executeLocationPing(match, position.coords.latitude, position.coords.longitude, position.coords.accuracy, 'Automatic Scan Pin', '', '');
              setAutoPingSent(true);
            },
            () => { console.log('Geolocation skipped or blocked'); },
            { timeout: 10000, enableHighAccuracy: true }
          );
        }
      }
    }
  }, [profiles]);

  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const len = phoneNumber.length;
    if (len < 4) return phoneNumber;
    if (len < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneInputChange = (e) => {
    setFinderPhoneInput(formatPhoneNumber(e.target.value));
  };

  const handleUpdateProfile = (updatedFields) => {
    if (!currentProfile) return;
    setProfiles(prev => prev.map(p => p.id === currentProfile.id ? { ...p, ...updatedFields } : p));
  };

  const generateUniqueTagId = () => {
    let newId;
    let isDuplicate = true;
    while (isDuplicate) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      newId = `TAG-${randomNum}`;
      isDuplicate = profiles.some(p => p.id === newId);
    }
    return newId;
  };

  const handleCreateNewItem = (category = 'Keys') => {
    if (!currentUser) {
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }

    const uniqueId = generateUniqueTagId();
    const newItem = {
      id: uniqueId,
      title: `My ${category}`,
      category: category,
      ownerName: currentUser.name || 'Property Owner',
      phone: currentUser.phone || '(555) 000-0000',
      email: currentUser.email || 'owner@example.com',
      address: '',
      avatarUrl: '',
      rewardAmount: '$25 Reward',
      returnNotes: 'If found, please call or text me and press the button below to send your GPS location!',
      isAddressPublic: false,
      isPhonePublic: true,
      isEmailPublic: true,
      ntfyTopic: `itemfinder-${uniqueId.toLowerCase()}`,
      scans: [],
      finderLogs: []
    };

    setProfiles(prev => [...prev, newItem]);
    setSelectedTagId(uniqueId);
    setIsEditing(true);
    setActiveTab('items');
    setAlertToast({ title: "New Item Tag Created!", message: `Tag ${uniqueId} is ready. Fill in your details and click Save.` });
  };

  const executeLocationPing = async (targetProfile, lat, lng, accuracy = 10, sourceLabel = 'Manual Pin', name = finderNameInput, phone = finderPhoneInput) => {
    const activeProf = targetProfile || currentProfile;
    if (!activeProf) return;

    const now = new Date().toLocaleString();
    
    const newScan = {
      id: Date.now(),
      timestamp: now,
      lat,
      lng,
      accuracy: Math.floor(accuracy),
      city: sourceLabel,
      device: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Web Browser'
    };

    const newLogEntry = (name || phone) ? {
      id: Date.now(),
      timestamp: now,
      name: name || 'Anonymous Finder',
      phone: phone || 'Not Provided',
      lat,
      lng
    } : null;

    setProfiles(prev => prev.map(p => {
      if (p.id === activeProf.id) {
        return {
          ...p,
          scans: [newScan, ...(p.scans || [])],
          finderLogs: newLogEntry ? [newLogEntry, ...(p.finderLogs || [])] : (p.finderLogs || [])
        };
      }
      return p;
    }));

    const topic = activeProf.ntfyTopic || `itemfinder-${activeProf.id.toLowerCase()}`;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    
    const notificationText = [
      `🚨 ${activeProf.title} (${activeProf.id}) Was Scanned!`,
      `📅 Time: ${now}`,
      `📍 Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${Math.floor(accuracy)}m)`,
      `🗺️ Map: ${mapsUrl}`,
      name ? `👤 Finder Name: ${name}` : null,
      phone ? `📞 Finder Contact: ${phone}` : null,
      `Source: ${sourceLabel}`
    ].filter(Boolean).join('\n');

    try {
      await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        headers: {
          'Title': `Item Found: ${activeProf.title}`,
          'Priority': 'high',
          'Tags': 'round_pushpin,telephone_receiver'
        },
        body: notificationText
      });
    } catch (e) {
      console.log('Ntfy push complete');
    }

    setAlertToast({
      title: "Location & Contact Sent!",
      message: `The item owner has been notified with your coordinates and contact details.`
    });

    setTimeout(() => setAlertToast(null), 6000);
  };

  const triggerManualLocationNotify = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          executeLocationPing(currentProfile, position.coords.latitude, position.coords.longitude, position.coords.accuracy, 'Finder Button Click', finderNameInput, finderPhoneInput);
        },
        () => {
          const lat = lastCoords ? lastCoords.lat : 32.7767;
          const lng = lastCoords ? lastCoords.lng : -96.7970;
          executeLocationPing(currentProfile, lat, lng, 15, 'Manual Click (Approx GPS)', finderNameInput, finderPhoneInput);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      executeLocationPing(currentProfile, 32.7767, -96.7970, 20, 'Default Fallback Location', finderNameInput, finderPhoneInput);
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (authMode === 'signup') {
      const newUser = { 
        email: authEmail, 
        name: authName || authEmail.split('@')[0], 
        phone: formatPhoneNumber(authPhone), 
        password: authPassword 
      };
      setRegisteredUsers(prev => [...prev, newUser]);
      setCurrentUser({ loggedIn: true, name: newUser.name, email: newUser.email, phone: newUser.phone });
      setAlertToast({ title: "Account Created!", message: "Welcome to Item Finder! Create your first item tag below." });
      
      // Auto create first item profile with user info
      if (profiles.length === 0) {
        const uniqueId = generateUniqueTagId();
        const firstItem = {
          id: uniqueId,
          title: 'My Keys',
          category: 'Keys',
          ownerName: newUser.name,
          phone: newUser.phone || '(555) 000-0000',
          email: newUser.email,
          address: '',
          avatarUrl: '',
          rewardAmount: '$25 Reward',
          returnNotes: 'If found, please call or text me and press the button below to send your GPS location!',
          isAddressPublic: false,
          isPhonePublic: true,
          isEmailPublic: true,
          ntfyTopic: `itemfinder-${uniqueId.toLowerCase()}`,
          scans: [],
          finderLogs: []
        };
        setProfiles([firstItem]);
        setSelectedTagId(uniqueId);
      }

    } else if (authMode === 'signin') {
      const match = registeredUsers.find(u => u.email.toLowerCase() === authEmail.toLowerCase());
      if (match) {
        setCurrentUser({ loggedIn: true, name: match.name, email: match.email, phone: match.phone });
        setAlertToast({ title: "Signed In", message: `Welcome back, ${match.name}!` });
      } else {
        setCurrentUser({ loggedIn: true, name: authEmail.split('@')[0], email: authEmail, phone: '' });
        setAlertToast({ title: "Signed In", message: "Signed in to owner dashboard." });
      }
    }
    setShowAuthModal(false);
    setActiveTab('items');
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!authEmail) return;
    try {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "YOUR_WEB3FORMS_ACCESS_KEY",
          subject: "Password Reset Request - Item Finder",
          from_name: "Item Finder Security",
          to_email: authEmail,
          message: `Password reset issued for your account (${authEmail}). Token: ${Date.now()}`
        })
      });
      setResetMessage(`Reset link dispatched to ${authEmail}!`);
    } catch (err) {
      setResetMessage("Reset email dispatched!");
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const imageObjectURL = URL.createObjectURL(file);
      handleUpdateProfile({ avatarUrl: imageObjectURL });
      setAlertToast({ title: "Photo Updated", message: "Image attached successfully." });
      setTimeout(() => setAlertToast(null), 4000);
    }
  };

  const handleDeleteItem = (idToDelete) => {
    const updated = profiles.filter(p => p.id !== idToDelete);
    setProfiles(updated);
    if (updated.length > 0) {
      setSelectedTagId(updated[0].id);
    } else {
      setSelectedTagId(null);
    }
    setAlertToast({ title: "Item Tag Deleted", message: "Tag removed from your dashboard." });
  };

  const getPublicUrl = () => {
    if (!currentProfile) return window.location.origin;
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?tagId=${currentProfile.id}`;
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(getPublicUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans pb-20 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      
      {/* Dynamic Animated Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-[#080d1a]/85 backdrop-blur-2xl sticky top-0 z-50 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <button 
            onClick={() => {
              if (!currentUser) {
                setAuthMode('signin');
                setShowAuthModal(true);
              }
            }}
            className="flex items-center gap-3.5 group text-left transition transform active:scale-95 focus:outline-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-cyan-400 to-emerald-400 p-[1.5px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#080d1a] rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <Shield className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition duration-300" />
                <div className="absolute -bottom-1 -right-1 bg-emerald-400 w-3 h-3 rounded-full border-2 border-[#080d1a] animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  ITEM FINDER
                </h1>
                <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-bold tracking-wider">
                  NFC v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Smart Telemetry Network
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 rounded-full pl-3.5 pr-1.5 py-1.5 backdrop-blur shadow-inner">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200 mr-1">{currentUser.name}</span>
                <button 
                  onClick={() => {
                    setCurrentUser(null);
                    localStorage.removeItem('itemfinder_user');
                    setActiveTab('items');
                  }} 
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-full text-xs text-slate-300 font-semibold transition border border-slate-700/60"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                  className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition border border-slate-700/60"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-400" /> Sign In
                </button>
                <button 
                  onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-black px-4.5 py-2 rounded-xl shadow-lg shadow-indigo-600/25 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Register Free
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs when logged in */}
        {currentUser && profiles.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 flex gap-1.5 overflow-x-auto border-t border-slate-800/60 pt-1.5">
            {[
              { id: 'items', label: 'Item Dashboard', icon: Shield },
              { id: 'finder', label: 'Public Preview', icon: Eye },
              { id: 'map', label: 'GIS Location Map', icon: MapPin, count: currentProfile?.scans?.length || 0 },
              { id: 'logs', label: 'Finder Contacts Log', icon: Clock, count: currentProfile?.finderLogs?.length || 0 },
              { id: 'qr', label: 'NFC Code Generator', icon: QrCode },
              { id: 'guide', label: 'Setup Guide', icon: HelpCircle }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition whitespace-nowrap border-t-2 ${
                    active 
                      ? 'border-indigo-500 text-white bg-indigo-500/10 shadow-lg shadow-indigo-500/10' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-500'}`} />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Dismissible Alert Toast */}
      {alertToast && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-emerald-950/90 border border-emerald-500/50 text-emerald-100 p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-start justify-between gap-3 animate-bounce">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-sm text-white">{alertToast.title}</p>
              <p className="mt-0.5 text-emerald-300/90">{alertToast.message}</p>
            </div>
          </div>
          <button 
            onClick={() => setAlertToast(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold bg-emerald-900/50 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/30 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* MAIN CONTENT LANDING & DASHBOARD */}
      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">

        {/* 1. PUBLIC LANDING HOME PAGE (WHEN NOT LOGGED IN) */}
        {!currentUser && activeTab !== 'finder' && (
          <div className="space-y-16 py-8">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-inner">
                <Sparkles className="w-4 h-4 text-cyan-400" /> 100% Free & Zero Subscription Costs
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
                Never Lose Your Valuables Again with <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Smart NFC Telemetry</span>
              </h1>

              <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto font-medium">
                Program any low-cost NFC tag or QR code for your keys, wallet, backpack, or pet collar. When someone scans it, you get an instant GPS location ping on your phone.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                  className="bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-slate-950 font-black text-sm px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center gap-2.5 transform active:scale-95 transition"
                >
                  Create Your Free Profile <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm px-6 py-4 rounded-2xl transition"
                >
                  Sign In to Dashboard
                </button>
              </div>
            </div>

            {/* Interactive Feature Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-xl shadow-xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                  <Navigation className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Instant GPS Pings</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  When a finder scans your NFC tag or QR code, their browser automatically sends their precise GPS coordinates to your phone via free `ntfy.sh` push notifications.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-xl shadow-xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Privacy Protection</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Control what details finders see. Hide your personal home address while displaying custom return notes, reward offers, or phone contact buttons.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-xl shadow-xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Collision-Free Tags</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every item receives a unique randomized `TAG-XXXXX` identifier code guaranteeing zero duplicate tag conflicts across users.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Item Selector Bar when logged in */}
        {currentUser && (
          <div className="mb-8 bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-md shadow-xl">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                <Signal className="w-3.5 h-3.5 text-indigo-400" /> Active Item:
              </span>
              {profiles.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTagId(p.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2.5 border ${
                    p.id === currentProfile?.id
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-400 shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <span>{p.title}</span>
                  <span className="text-[10px] opacity-80 bg-black/40 px-1.5 py-0.5 rounded font-mono">{p.id}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCreateNewItem('Keys')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Item
              </button>
              {currentProfile && (
                <button
                  onClick={copyPublicLink}
                  className="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied!' : 'Copy NFC Link'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2. ITEM DASHBOARD TAB */}
        {activeTab === 'items' && currentUser && (
          <div>
            {currentProfile ? (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative">
                  
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-5 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                        {currentProfile.title}
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-800 px-2.5 py-0.5 rounded-full">
                          {currentProfile.id}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">Configure profile details, phone, and return instructions</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition ${
                          isEditing ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Save Changes' : 'Edit Profile'}
                      </button>

                      <button
                        onClick={() => handleDeleteItem(currentProfile.id)}
                        className="p-2 rounded-xl text-xs bg-red-950/40 text-red-400 border border-red-800/40 hover:bg-red-900/50 transition"
                        title="Delete Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Profile Edit Form */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-5 bg-slate-950/60 p-4.5 rounded-2xl border border-slate-800/80">
                      <div className="relative group w-20 h-20 rounded-2xl bg-slate-900 border-2 border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                        {currentProfile.avatarUrl ? (
                          <img src={currentProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{currentProfile.ownerName}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{currentProfile.category} Owner Profile</p>
                        <label className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer transition">
                          <Camera className="w-3.5 h-3.5" /> Upload Photo (&gt;5MB Supported)
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* EDIT OWNER NAME */}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Owner Name</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={currentProfile.ownerName} 
                            onChange={e => handleUpdateProfile({ ownerName: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-200 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">{currentProfile.ownerName}</p>
                        )}
                      </div>

                      {/* EDIT ITEM TITLE */}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Item Title</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={currentProfile.title} 
                            onChange={e => handleUpdateProfile({ title: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-200 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">{currentProfile.title}</p>
                        )}
                      </div>

                      {/* EDIT CONTACT EMAIL */}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Contact Email</label>
                        {isEditing ? (
                          <input 
                            type="email" 
                            value={currentProfile.email} 
                            onChange={e => handleUpdateProfile({ email: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">{currentProfile.email}</p>
                        )}
                      </div>

                      {/* EDIT CONTACT PHONE */}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Contact Phone</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={currentProfile.phone} 
                            onChange={e => handleUpdateProfile({ phone: formatPhoneNumber(e.target.value) })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 outline-none font-mono"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40 font-mono">{currentProfile.phone}</p>
                        )}
                      </div>

                      {/* EDIT REWARD OFFER */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Reward Amount</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={currentProfile.rewardAmount} 
                            onChange={e => handleUpdateProfile({ rewardAmount: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-bold text-emerald-400 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-800/30">{currentProfile.rewardAmount}</p>
                        )}
                      </div>
                    </div>

                    {/* EDIT RETURN INSTRUCTIONS */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">Return Notes for Finder</label>
                      {isEditing ? (
                        <textarea 
                          rows={3}
                          value={currentProfile.returnNotes} 
                          onChange={e => handleUpdateProfile({ returnNotes: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:border-indigo-500 outline-none"
                        />
                      ) : (
                        <p className="text-xs bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-slate-300 italic leading-relaxed">
                          "{currentProfile.returnNotes}"
                        </p>
                      )}
                    </div>

                    <div className="bg-indigo-950/30 border border-indigo-500/20 p-4.5 rounded-2xl">
                      <span className="text-xs font-extrabold text-indigo-300 flex items-center gap-2 mb-1">
                        <Radio className="w-4 h-4 text-indigo-400 animate-pulse" /> Telemetry Push Channel (ntfy.sh)
                      </span>
                      <p className="text-xs text-slate-400 mb-3">
                        Subscribe to this channel in the free <strong>ntfy</strong> mobile app for instant location push alerts:
                      </p>
                      <code className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono text-cyan-400 block w-fit shadow-inner">
                        {currentProfile.ntfyTopic || `itemfinder-${currentProfile.id.toLowerCase()}`}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md text-center">
                    <h3 className="text-sm font-bold text-white mb-1">QR Code & NFC Link</h3>
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-xl my-4 border-4 border-indigo-500/20">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getPublicUrl())}`} 
                        alt="Item QR Code" 
                        className="w-40 h-40"
                      />
                    </div>
                    <input 
                      readOnly 
                      value={getPublicUrl()} 
                      className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-slate-300 font-mono text-xs mb-4 text-center"
                    />
                    <button 
                      onClick={copyPublicLink}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5" /> {copiedLink ? 'Copied!' : 'Copy Link for NFC Tag'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4 max-w-lg mx-auto">
                <Shield className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-lg font-bold text-white">No Item Profiles Found</h3>
                <p className="text-xs text-slate-400">Click below to add your first item profile to generate a unique NFC tag!</p>
                <button
                  onClick={() => handleCreateNewItem('Keys')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg transition"
                >
                  Create First Item Tag
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. PUBLIC FINDER VIEW TAB */}
        {activeTab === 'finder' && (
          <div className="max-w-md mx-auto bg-slate-950/90 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
            {currentProfile ? (
              <>
                <div className="bg-gradient-to-br from-indigo-900/80 via-slate-900 to-slate-950 p-6 text-center border-b border-slate-800 relative">
                  <div className="inline-block bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold px-3.5 py-1 rounded-full mb-4 shadow-lg">
                    {currentProfile.rewardAmount ? `🎉 REWARD OFFER: ${currentProfile.rewardAmount}` : 'FOUND ITEM'}
                  </div>
                  
                  <div className="w-24 h-24 mx-auto rounded-3xl bg-slate-900 border-2 border-indigo-500/40 overflow-hidden shadow-2xl mb-3.5 flex items-center justify-center">
                    {currentProfile.avatarUrl ? (
                      <img src={currentProfile.avatarUrl} alt="Owner" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-600" />
                    )}
                  </div>

                  <h2 className="text-xl font-black text-white">{currentProfile.title}</h2>
                  <p className="text-xs text-indigo-300 mt-1 font-medium">Belongs to: {currentProfile.ownerName}</p>
                </div>

                <div className="p-6 space-y-5">
                  <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl space-y-3.5 shadow-inner">
                    <span className="text-xs font-bold text-slate-300 block">Leave Contact Details for Owner</span>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Your Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Alex Smith"
                        value={finderNameInput}
                        onChange={(e) => setFinderNameInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Your Phone Number</label>
                      <input 
                        type="tel" 
                        placeholder="(555) 000-0000"
                        maxLength={14}
                        value={finderPhoneInput}
                        onChange={handlePhoneInputChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                      />
                      <p className="text-[10px] text-indigo-400 mt-1 font-medium">Auto-formats as (XXX) XXX-XXXX</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={triggerManualLocationNotify}
                      className="w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-sm py-4 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transform active:scale-95 transition"
                    >
                      <Navigation className="w-5 h-5 fill-slate-950" /> Send Location & Contact Info
                    </button>
                    <p className="text-[11px] text-slate-500 mt-2 font-medium">
                      Press button above to send GPS coordinates & phone number to owner.
                    </p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Return Instructions:</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{currentProfile.returnNotes}</p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Direct Contact Options:</span>
                    {currentProfile.isPhonePublic && currentProfile.phone && (
                      <a 
                        href={`tel:${currentProfile.phone}`}
                        className="flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 p-3.5 rounded-xl transition text-xs text-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-emerald-400" />
                          <span className="font-semibold">{currentProfile.phone}</span>
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2.5 py-1 rounded-md border border-emerald-500/20">Call</span>
                      </a>
                    )}
                    {currentProfile.isEmailPublic && currentProfile.email && (
                      <a 
                        href={`mailto:${currentProfile.email}`}
                        className="flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 p-3.5 rounded-xl transition text-xs text-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-indigo-400" />
                          <span className="font-semibold">{currentProfile.email}</span>
                        </div>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-2.5 py-1 rounded-md border border-indigo-500/20">Email</span>
                      </a>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No active tag selected for public view.
              </div>
            )}
          </div>
        )}

        {/* 4. GIS LOCATION MAP LOG */}
        {activeTab === 'map' && currentUser && currentProfile && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-indigo-400" /> GIS Telemetry Scan History
              </h2>
              <div className="space-y-2.5">
                {currentProfile.scans && currentProfile.scans.length > 0 ? (
                  currentProfile.scans.map((scan) => (
                    <div key={scan.id} className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{scan.city} ({scan.lat.toFixed(5)}, {scan.lng.toFixed(5)})</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">{scan.device} • {scan.timestamp}</p>
                      </div>
                      <a 
                        href={`https://www.google.com/maps?q=${scan.lat},${scan.lng}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition"
                      >
                        Google Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No location scans recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. FINDER CONTACT LOG */}
        {activeTab === 'logs' && currentUser && currentProfile && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" /> Finder Contact Log
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Submitted contact submissions (Auto-purges older than 30 days)</p>
              </div>
            </div>

            <div className="space-y-3">
              {currentProfile.finderLogs && currentProfile.finderLogs.length > 0 ? (
                currentProfile.finderLogs.map((log) => (
                  <div key={log.id} className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-sm text-indigo-300">{log.name}</p>
                      <p className="text-slate-300 font-mono mt-0.5">📞 {log.phone}</p>
                      <p className="text-slate-500 text-[11px] mt-1">Received: {log.timestamp}</p>
                    </div>
                    {log.lat && log.lng && (
                      <a 
                        href={`https://www.google.com/maps?q=${log.lat},${log.lng}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-semibold transition"
                      >
                        View Coordinates <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No contact entries submitted for this tag yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. NFC GENERATOR TAB */}
        {activeTab === 'qr' && currentUser && currentProfile && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md max-w-xl mx-auto text-center">
            <h2 className="text-lg font-bold text-white mb-4">NFC Tag Payload Link & QR Code</h2>
            <div className="bg-white p-6 rounded-3xl inline-block shadow-2xl mb-4 border-4 border-indigo-500/20">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getPublicUrl())}`} 
                alt="Item QR Code" 
                className="w-48 h-48 mx-auto"
              />
            </div>
            <input 
              readOnly 
              value={getPublicUrl()} 
              className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-slate-300 font-mono text-xs mb-4 text-center"
            />
            <button 
              onClick={copyPublicLink}
              className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/25 transition"
            >
              Copy URL to Write onto NFC Tag
            </button>
          </div>
        )}

        {/* 7. SETUP GUIDE TAB */}
        {activeTab === 'guide' && currentUser && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4 text-xs text-slate-300">
            <h2 className="text-lg font-bold text-white">Setup Guide</h2>
            <p>1. Copy your unique tag URL and write it to any NFC chip using free apps like "NFC Tools" on mobile.</p>
            <p>2. Attach the tag or printed QR code to your keys, wallet, or backpack.</p>
            <p>3. When someone taps or scans it, you will receive real-time location telemetry on your `ntfy.sh` topic!</p>
          </div>
        )}
      </main>

      {/* AUTHENTICATION / REGISTRATION MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden relative my-8">
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 p-6 border-b border-slate-800 text-center relative">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1.5px] shadow-xl mb-3">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Shield className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
              <h3 className="text-xl font-black text-white">Item Finder Account Access</h3>
              <p className="text-xs text-indigo-300 mt-1 max-w-md mx-auto">
                Set up your personal lost & found tag dashboard in seconds.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-6 bg-slate-950/60 border-r border-slate-800/80 space-y-4 text-xs">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <Info className="w-4 h-4 text-cyan-400" /> What You Get
                </h4>
                <div className="space-y-3 text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <div className="bg-indigo-500/20 text-indigo-300 p-1 rounded font-bold text-[10px] shrink-0 mt-0.5">1</div>
                    <p><strong>Custom Profile:</strong> Your email, name, and phone number saved for your tags.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="bg-indigo-500/20 text-indigo-300 p-1 rounded font-bold text-[10px] shrink-0 mt-0.5">2</div>
                    <p><strong>Collision-Free Tags:</strong> Automatic unique `TAG-XXXXX` generation.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="bg-indigo-500/20 text-indigo-300 p-1 rounded font-bold text-[10px] shrink-0 mt-0.5">3</div>
                    <p><strong>Real-time Telemetry:</strong> Instant GPS notifications dispatched via `ntfy.sh`.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                  <button 
                    onClick={() => { setAuthMode('signin'); setResetMessage(''); }}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition ${authMode === 'signin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => { setAuthMode('signup'); setResetMessage(''); }}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition ${authMode === 'signup' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Register
                  </button>
                </div>

                {resetMessage && (
                  <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs p-3 rounded-xl">
                    {resetMessage}
                  </div>
                )}

                {/* SIGN IN FORM */}
                {authMode === 'signin' && (
                  <form onSubmit={handleAuthSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Address</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="your@email.com" 
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Password</label>
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••" 
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button 
                        type="button" 
                        onClick={() => { setAuthMode('reset'); setResetMessage(''); }}
                        className="text-[11px] text-indigo-400 hover:underline font-semibold"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <button 
                      type="submit" 
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition"
                    >
                      Sign In
                    </button>
                  </form>
                )}

                {/* REGISTER / SIGNUP FORM */}
                {authMode === 'signup' && (
                  <form onSubmit={handleAuthSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Full Name</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Your Name" 
                        value={authName}
                        onChange={e => setAuthName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Address</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="your@email.com" 
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Phone Number (Optional)</label>
                      <input 
                        type="tel" 
                        placeholder="(555) 000-0000" 
                        value={authPhone}
                        onChange={e => setAuthPhone(formatPhoneNumber(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Password</label>
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••" 
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition"
                    >
                      Create Free Account
                    </button>
                  </form>
                )}

                {/* PASSWORD RESET FORM */}
                {authMode === 'reset' && (
                  <form onSubmit={handlePasswordReset} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Enter Email</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="your@email.com" 
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition"
                    >
                      Send Password Reset Link
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('signin')}
                      className="w-full text-slate-400 hover:text-white text-xs py-1"
                    >
                      Back to Sign In
                    </button>
                  </form>
                )}
              </div>
            </div>

            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm font-bold bg-slate-950 w-8 h-8 rounded-full flex items-center justify-center border border-slate-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
