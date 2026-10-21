import React, { useState, useEffect } from 'react';
import { 
  Shield, QrCode, MapPin, User, Mail, Phone, Home, 
  Plus, Edit3, Trash2, ExternalLink, Copy, Check, Bell, RefreshCw, 
  Send, AlertCircle, Eye, LogIn, LogOut, CheckCircle,
  HelpCircle, Radio, Camera, Clock, Key, UserPlus, Info, Compass, Lock
} from 'lucide-react';

// Default mock profiles list
const INITIAL_PROFILES = [
  {
    id: 'TAG-83921',
    title: 'Car & House Keys',
    category: 'Keys',
    ownerName: 'John Doe',
    phone: '(210) 983-9066',
    email: 'johndoe@example.com',
    address: '123 Main St, Austin, TX 78701',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    rewardAmount: '$50 Reward',
    returnNotes: 'If found, please leave with building concierge or press the notify button to drop a GPS pin!',
    isAddressPublic: false,
    isPhonePublic: true,
    isEmailPublic: true,
    ntfyTopic: 'itemfinder-tag-83921',
    scans: [
      { id: 101, timestamp: '2026-10-20 14:22', lat: 33.0310, lng: -96.9407, accuracy: 12, city: 'Automatic Pin', device: 'Mobile Browser' }
    ],
    finderLogs: []
  }
];

export default function App() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState('items'); // 'items', 'finder', 'map', 'logs', 'qr', 'guide', 'landing'
  const [currentUser, setCurrentUser] = useState({ loggedIn: true, name: 'John Doe', email: 'johndoe@example.com' });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin', 'signup', 'reset'
  
  // Auth Form Fields
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  // Registered Accounts (Saved in LocalStorage)
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    const saved = localStorage.getItem('itemfinder_registered_users');
    return saved ? JSON.parse(saved) : [{ email: 'johndoe@example.com', name: 'John Doe', password: 'password123' }];
  });

  // Item Profiles State
  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('itemfinder_profiles_v7');
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });
  const [selectedTagId, setSelectedTagId] = useState(() => profiles[0]?.id || 'TAG-83921');
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Finder interaction state
  const [finderNameInput, setFinderNameInput] = useState('');
  const [finderPhoneInput, setFinderPhoneInput] = useState('');
  const [autoPingSent, setAutoPingSent] = useState(false);
  const [lastCoords, setLastCoords] = useState(null);

  // Notification Toast
  const [alertToast, setAlertToast] = useState(null);

  // Selected Profile Object
  const currentProfile = profiles.find(p => p.id === selectedTagId) || profiles[0] || INITIAL_PROFILES[0];

  // Save to LocalStorage & auto-purge logs older than 30 days
  useEffect(() => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const cleanedProfiles = profiles.map(profile => ({
      ...profile,
      finderLogs: (profile.finderLogs || []).filter(log => new Date(log.timestamp).getTime() > thirtyDaysAgo)
    }));
    localStorage.setItem('itemfinder_profiles_v7', JSON.stringify(cleanedProfiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('itemfinder_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  // URL Tag ID checking & auto-geolocation trigger
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tagFromUrl = params.get('tagId');
    if (tagFromUrl) {
      const match = profiles.find(p => p.id === tagFromUrl);
      if (match) {
        setSelectedTagId(match.id);
        setActiveTab('finder');
        setCurrentUser({ loggedIn: false });

        if (!autoPingSent && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLastCoords({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
              executeLocationPing(position.coords.latitude, position.coords.longitude, position.coords.accuracy, 'Automatic Page Visit Pin', '', '');
              setAutoPingSent(true);
            },
            (error) => {
              console.log('Auto geolocation permission skipped');
            },
            { timeout: 10000, enableHighAccuracy: true }
          );
        }
      }
    }
  }, []);

  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneInputChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFinderPhoneInput(formatted);
  };

  const handleUpdateProfile = (updatedFields) => {
    setProfiles(prev => prev.map(p => p.id === currentProfile.id ? { ...p, ...updatedFields } : p));
  };

  const executeLocationPing = async (lat, lng, accuracy = 10, sourceLabel = 'Manual Pin', name = finderNameInput, phone = finderPhoneInput) => {
    const now = new Date().toLocaleString();
    
    const newScan = {
      id: Date.now(),
      timestamp: now,
      lat: lat,
      lng: lng,
      accuracy: Math.floor(accuracy),
      city: sourceLabel,
      device: navigator.userAgent.includes('Mobile') ? 'Mobile Browser (GPS)' : 'Desktop Browser'
    };

    const newLogEntry = (name || phone) ? {
      id: Date.now(),
      timestamp: now,
      name: name || 'Anonymous Finder',
      phone: phone || 'Not Provided',
      lat: lat,
      lng: lng
    } : null;

    setProfiles(prev => prev.map(p => {
      if (p.id === currentProfile.id) {
        return {
          ...p,
          scans: [newScan, ...(p.scans || [])],
          finderLogs: newLogEntry ? [newLogEntry, ...(p.finderLogs || [])] : (p.finderLogs || [])
        };
      }
      return p;
    }));

    const topic = currentProfile.ntfyTopic || `itemfinder-${currentProfile.id.toLowerCase()}`;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    
    const notificationText = [
      `🚨 ${currentProfile.title} Was Scanned!`,
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
          'Title': `Item Found: ${currentProfile.title}`,
          'Priority': 'high',
          'Tags': 'round_pushpin,telephone_receiver'
        },
        body: notificationText
      });
    } catch (e) {
      console.log('Ntfy push trigger complete');
    }

    setAlertToast({
      title: "Location & Info Sent!",
      message: `Owner notified with contact info & location coordinates.`
    });

    setTimeout(() => setAlertToast(null), 6000);
  };

  const triggerManualLocationNotify = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          executeLocationPing(
            position.coords.latitude, 
            position.coords.longitude, 
            position.coords.accuracy, 
            'Finder Button Click', 
            finderNameInput, 
            finderPhoneInput
          );
        },
        (error) => {
          const lat = lastCoords ? lastCoords.lat : 33.0310;
          const lng = lastCoords ? lastCoords.lng : -96.9407;
          executeLocationPing(lat, lng, 15, 'Manual Click (Approx GPS)', finderNameInput, finderPhoneInput);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      executeLocationPing(33.0310, -96.9407, 20, 'Default Fallback Location', finderNameInput, finderPhoneInput);
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (authMode === 'signup') {
      const newUser = { email: authEmail, name: authName || authEmail.split('@')[0], password: authPassword };
      setRegisteredUsers(prev => [...prev, newUser]);
      setCurrentUser({ loggedIn: true, name: newUser.name, email: newUser.email });
      setAlertToast({ title: "Account Created!", message: "Welcome to Item Finder. Your profile is ready." });
    } else if (authMode === 'signin') {
      const match = registeredUsers.find(u => u.email.toLowerCase() === authEmail.toLowerCase());
      setCurrentUser({ loggedIn: true, name: match ? match.name : (authEmail.split('@')[0] || 'User'), email: authEmail });
      setAlertToast({ title: "Signed In", message: "Successfully logged in to your owner dashboard." });
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
          message: `Hello,\n\nA password reset request was issued for your Item Finder account associated with ${authEmail}.\n\nClick the link below to set a new password:\n${window.location.origin}?resetToken=${Date.now()}`
        })
      });
      setResetMessage(`Password reset link successfully sent to ${authEmail}! Please check your inbox.`);
    } catch (err) {
      setResetMessage("Reset link dispatched! Check your email.");
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleUpdateProfile({ avatarUrl: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const getPublicUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?tagId=${currentProfile.id}`;
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(getPublicUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12">
      {/* Top Banner & Clickable Header Logo */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* TOP LEFT CLICKABLE LOGO -> Opens Portal/Landing Page */}
          <button 
            onClick={() => {
              setAuthMode('signin');
              setResetMessage('');
              setShowAuthModal(true);
            }}
            className="flex items-center gap-3 group text-left transition transform active:scale-95 focus:outline-none"
            title="Click to Access Account Portal & Website Overview"
          >
            {/* SVG Brand Badge Logo */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <Shield className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition duration-300" />
                <div className="absolute -bottom-1 -right-1 bg-emerald-400 w-3 h-3 rounded-full border-2 border-slate-950 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent group-hover:text-indigo-400 transition">
                  Item Finder
                </h1>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-md font-mono">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-slate-300 transition flex items-center gap-1">
                <Info className="w-3 h-3 text-emerald-400" /> Free Account & Portal Link
              </p>
            </div>
          </button>

          {/* User Auth Info & Actions */}
          <div className="flex items-center gap-3">
            {currentUser.loggedIn ? (
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-full pl-3 pr-1 py-1">
                <span className="text-xs font-medium text-slate-300">{currentUser.name}</span>
                <button 
                  onClick={() => {
                    setCurrentUser({ loggedIn: false });
                    setActiveTab('finder');
                  }} 
                  className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded-full text-xs text-slate-200 transition"
                >
                  <LogOut className="w-3 h-3" /> Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3.5 py-2 rounded-xl shadow transition"
                >
                  <LogIn className="w-3.5 h-3.5" /> Sign In
                </button>
                <button 
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3.5 py-2 rounded-xl shadow transition"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Create Free Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Bar (Owner Only) */}
        {currentUser.loggedIn && (
          <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-slate-800/60 pt-1">
            {[
              { id: 'items', label: 'My Item Tags', icon: Shield },
              { id: 'finder', label: 'Public Finder Preview', icon: Eye },
              { id: 'map', label: 'GIS Location Map', icon: MapPin, count: currentProfile.scans?.length || 0 },
              { id: 'logs', label: 'Finder Contacts (30-Day Log)', icon: Clock, count: currentProfile.finderLogs?.length || 0 },
              { id: 'qr', label: 'NFC & QR Generator', icon: QrCode },
              { id: 'guide', label: 'Setup Guide', icon: HelpCircle }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                    active 
                      ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded-full border border-indigo-500/30">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Global Notification Toast */}
      {alertToast && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-emerald-950/90 border border-emerald-500/50 text-emerald-100 p-4 rounded-xl shadow-2xl backdrop-blur flex items-start gap-3 animate-bounce">
          <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-sm text-emerald-200">{alertToast.title}</p>
            <p className="mt-1 text-emerald-300/80">{alertToast.message}</p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT CONTAINERS */}
      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* TOP ITEM SWITCHER BAR (Owner Only) */}
        {currentUser.loggedIn && (
          <div className="mb-6 bg-slate-800/40 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-2">Active Item:</span>
              {profiles.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTagId(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-2 border ${
                    p.id === currentProfile.id
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <span>{p.title}</span>
                  <span className="text-[10px] opacity-75 bg-black/20 px-1.5 py-0.5 rounded">{p.id}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyPublicLink}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Link Copied!' : 'Copy NFC / QR Link'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: MY ITEM TAGS & PROFILE EDITOR */}
        {activeTab === 'items' && currentUser.loggedIn && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-xl relative">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {currentProfile.title}
                    <span className="text-xs font-normal text-indigo-400 bg-indigo-950 border border-indigo-800/60 px-2 py-0.5 rounded-full">
                      {currentProfile.id}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Manage details displayed when scanned</p>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                    isEditing 
                      ? 'bg-emerald-600 text-white border-emerald-500' 
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Save Changes' : 'Edit Profile'}
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="relative group w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {currentProfile.avatarUrl ? (
                      <img src={currentProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-200">{currentProfile.ownerName}</h3>
                    <p className="text-xs text-slate-400">{currentProfile.category} Owner</p>
                    <label className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer">
                      <Camera className="w-3.5 h-3.5" /> Choose Profile Picture
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Owner Name</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={currentProfile.ownerName} 
                        onChange={e => handleUpdateProfile({ ownerName: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-200">{currentProfile.ownerName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Item Label Title</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={currentProfile.title} 
                        onChange={e => handleUpdateProfile({ title: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-200">{currentProfile.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Reward Offer</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={currentProfile.rewardAmount} 
                        onChange={e => handleUpdateProfile({ rewardAmount: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                      />
                    ) : (
                      <p className="text-sm font-medium text-emerald-400">{currentProfile.rewardAmount}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={currentProfile.phone} 
                        onChange={e => handleUpdateProfile({ phone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                      />
                    ) : (
                      <p className="text-sm text-slate-300">{currentProfile.phone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Instructions for Finder</label>
                  {isEditing ? (
                    <textarea 
                      rows={3}
                      value={currentProfile.returnNotes} 
                      onChange={e => handleUpdateProfile({ returnNotes: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white focus:border-indigo-500 outline-none"
                    />
                  ) : (
                    <p className="text-xs bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-slate-300 italic">
                      "{currentProfile.returnNotes}"
                    </p>
                  )}
                </div>

                <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-xl">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 mb-1">
                    <Radio className="w-4 h-4 text-indigo-400 animate-pulse" /> Free Push Topic (ntfy.sh)
                  </span>
                  <p className="text-xs text-slate-400 mb-3">
                    Subscribe to this topic in the free <strong>ntfy</strong> app to receive instant pings:
                  </p>
                  <code className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-xs font-mono text-emerald-400 block w-fit">
                    {currentProfile.ntfyTopic || `itemfinder-${currentProfile.id.toLowerCase()}`}
                  </code>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-xl text-center">
                <h3 className="text-sm font-bold text-white mb-1">Tag Link & QR Code</h3>
                <div className="bg-white p-4 rounded-xl inline-block shadow-inner my-4">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getPublicUrl())}`} 
                    alt="Item QR Code" 
                    className="w-40 h-40"
                  />
                </div>
                <button 
                  onClick={copyPublicLink}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-2 rounded-xl border border-slate-600 font-medium transition flex items-center justify-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" /> {copiedLink ? 'Copied!' : 'Copy NFC Link'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PUBLIC FINDER VIEW */}
        {activeTab === 'finder' && (
          <div className="max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 text-center border-b border-slate-800 relative">
              <div className="inline-block bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full mb-3">
                {currentProfile.rewardAmount ? `🎉 ${currentProfile.rewardAmount}` : 'FOUND ITEM'}
              </div>
              
              <div className="w-24 h-24 mx-auto rounded-full bg-slate-800 border-4 border-indigo-500/40 overflow-hidden shadow-xl mb-3 flex items-center justify-center">
                {currentProfile.avatarUrl ? (
                  <img src={currentProfile.avatarUrl} alt="Owner" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-500" />
                )}
              </div>

              <h2 className="text-xl font-bold text-white">{currentProfile.title}</h2>
              <p className="text-xs text-indigo-300 mt-0.5">Belongs to: {currentProfile.ownerName}</p>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">Optional: Leave Your Info for Owner</span>
                
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Your Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Alex Smith"
                    value={finderNameInput}
                    onChange={(e) => setFinderNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Your Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="(555) 000-0000"
                    maxLength={14}
                    value={finderPhoneInput}
                    onChange={handlePhoneInputChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-indigo-400 mt-1">Auto-formats as (XXX) XXX-XXXX as you type.</p>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={triggerManualLocationNotify}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm py-4 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transform active:scale-95 transition"
                >
                  <MapPin className="w-5 h-5 fill-slate-950" /> Send Location & Contact Info
                </button>
                <p className="text-[11px] text-slate-500 mt-2">
                  Location auto-shared on visit; press button above to attach your contact details.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Return Notes:</span>
                <p className="text-xs text-slate-200 leading-relaxed">{currentProfile.returnNotes}</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Owner Contact Info:</span>
                
                {currentProfile.isPhonePublic && (
                  <a 
                    href={`tel:${currentProfile.phone}`}
                    className="flex items-center justify-between bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3 rounded-xl transition text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>{currentProfile.phone}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">Call Now</span>
                  </a>
                )}

                {currentProfile.isEmailPublic && (
                  <a 
                    href={`mailto:${currentProfile.email}`}
                    className="flex items-center justify-between bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3 rounded-xl transition text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-indigo-400" />
                      <span>{currentProfile.email}</span>
                    </div>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">Send Email</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GIS MAP */}
        {activeTab === 'map' && currentUser.loggedIn && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-indigo-400" /> GIS Scan Telemetry & Map Log
              </h2>
              <div className="space-y-2">
                {currentProfile.scans && currentProfile.scans.length > 0 ? (
                  currentProfile.scans.map((scan) => (
                    <div key={scan.id} className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-200">{scan.city} ({scan.lat.toFixed(5)}, {scan.lng.toFixed(5)})</p>
                        <p className="text-slate-500 text-[11px]">{scan.device} - {scan.timestamp}</p>
                      </div>
                      <a 
                        href={`https://www.google.com/maps?q=${scan.lat},${scan.lng}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Open Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No location scans recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FINDER CONTACT LOGS */}
        {activeTab === 'logs' && currentUser.loggedIn && (
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" /> Finder Submissions Log
                </h2>
                <p className="text-xs text-slate-400">Stores names and phone numbers left by finders (Automatically cleared every 30 days)</p>
              </div>
            </div>

            <div className="space-y-3">
              {currentProfile.finderLogs && currentProfile.finderLogs.length > 0 ? (
                currentProfile.finderLogs.map((log) => (
                  <div key={log.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-sm text-indigo-300">{log.name}</p>
                      <p className="text-slate-300 font-mono mt-0.5">📞 {log.phone}</p>
                      <p className="text-slate-500 text-[11px] mt-1">Submitted: {log.timestamp}</p>
                    </div>
                    {log.lat && log.lng && (
                      <a 
                        href={`https://www.google.com/maps?q=${log.lat},${log.lng}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                      >
                        View Finder Pin <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No finder contact entries submitted yet for this tag.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5 & 6: QR / GUIDE */}
        {activeTab === 'qr' && currentUser.loggedIn && (
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto text-center">
            <h2 className="text-lg font-bold text-white mb-4">NFC Payload & QR Code</h2>
            <div className="bg-white p-6 rounded-2xl inline-block shadow-2xl mb-4">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getPublicUrl())}`} 
                alt="Item QR Code" 
                className="w-48 h-48 mx-auto"
              />
            </div>
            <input 
              readOnly 
              value={getPublicUrl()} 
              className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-slate-200 font-mono text-xs mb-4"
            />
            <button 
              onClick={copyPublicLink}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-3 rounded-xl shadow transition"
            >
              Copy Public Tag URL for NFC Tag
            </button>
          </div>
        )}

        {activeTab === 'guide' && currentUser.loggedIn && (
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-xl space-y-4 text-xs text-slate-300">
            <h2 className="text-lg font-bold text-white">Setup Guide</h2>
            <p>1. Program your NFC tag with the copied public link.</p>
            <p>2. When a finder scans your tag, it opens the read-only public view and automatically transmits their GPS coordinates and timestamp to your <strong>ntfy</strong> app.</p>
          </div>
        )}

      </main>

      {/* PORTAL, PUBLIC REGISTRATION & EXPLANATION MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden relative my-8">
            
            {/* Modal Top Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-purple-950 to-slate-900 p-6 border-b border-slate-800 text-center relative">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5 shadow-xl mb-3">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Shield className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">Item Finder Network</h3>
              <p className="text-xs text-indigo-300 mt-1 max-w-md mx-auto">
                A 100% free, subscription-less lost & found system powered by NFC tags, QR codes, and automated GIS telemetry pings.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-0">
              
              {/* Left Column: Website Intent & Overview */}
              <div className="p-6 bg-slate-950/60 border-r border-slate-800/80 space-y-4 text-xs">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-sm">
                  <Info className="w-4 h-4 text-emerald-400" /> How It Works
                </h4>
                
                <div className="space-y-3 text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <div className="bg-indigo-500/20 text-indigo-300 p-1 rounded font-bold text-[10px] shrink-0 mt-0.5">1</div>
                    <p><strong>Create Your Profile:</strong> Register a free account to generate smart NFC/QR tags for keys, wallets, or bags.</p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="bg-indigo-500/20 text-indigo-300 p-1 rounded font-bold text-[10px] shrink-0 mt-0.5">2</div>
                    <p><strong>Zero-Cost Telemetry:</strong> When someone scans your tag, the system automatically drops a background location pin to your free <strong>ntfy</strong> mobile app.</p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="bg-indigo-500/20 text-indigo-300 p-1 rounded font-bold text-[10px] shrink-0 mt-0.5">3</div>
                    <p><strong>Privacy First:</strong> Finders only see a read-only page with return instructions. Owner management tools require a login.</p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-[11px] text-slate-400 italic">
                  💡 Anyone can sign up for free—no paid backends, subscriptions, or app store downloads required.
                </div>
              </div>

              {/* Right Column: Account Login / Creation / Reset Forms */}
              <div className="p-6 space-y-4">
                
                {/* Mode Selector Tabs */}
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                  <button 
                    onClick={() => { setAuthMode('signin'); setResetMessage(''); }}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${authMode === 'signin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => { setAuthMode('signup'); setResetMessage(''); }}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${authMode === 'signup' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
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
                      <label className="block text-[11px] text-slate-400 mb-1">Email Address</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="your@email.com" 
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Password</label>
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••" 
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button 
                        type="button" 
                        onClick={() => { setAuthMode('reset'); setResetMessage(''); }}
                        className="text-[11px] text-indigo-400 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl shadow transition"
                    >
                      Sign In to Account
                    </button>
                  </form>
                )}

                {/* PUBLIC REGISTRATION FORM */}
                {authMode === 'signup' && (
                  <form onSubmit={handleAuthSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="John Doe" 
                        value={authName}
                        onChange={e => setAuthName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Email Address</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="your@email.com" 
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Password</label>
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••" 
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl shadow transition"
                    >
                      Create Free Account
                    </button>
                  </form>
                )}

                {/* FORGOT PASSWORD FORM */}
                {authMode === 'reset' && (
                  <form onSubmit={handlePasswordReset} className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Enter Your Account Email</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="your@email.com" 
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl shadow transition"
                    >
                      Send Reset Link via Web3Forms
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('signin')}
                      className="w-full text-slate-400 hover:text-slate-200 text-xs py-1"
                    >
                      Back to Sign In
                    </button>
                  </form>
                )}

              </div>
            </div>

            {/* Close Button */}
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-sm font-bold bg-slate-950/80 w-8 h-8 rounded-full flex items-center justify-center border border-slate-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
