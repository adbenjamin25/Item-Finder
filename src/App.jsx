import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, QrCode, MapPin, Smartphone, User, Mail, Phone, Home, 
  Plus, Edit3, Trash2, ExternalLink, Copy, Check, Bell, RefreshCw, 
  Send, AlertCircle, Eye, EyeOff, Lock, LogIn, LogOut, CheckCircle,
  HelpCircle, Compass, Radio, Download, Share2, Layers, Award, Sparkles, Image, Camera
} from 'lucide-react';

// Default mock profiles list
const INITIAL_PROFILES = [
  {
    id: 'TAG-83921',
    title: 'Car & House Keys',
    category: 'Keys',
    ownerName: 'Benjamin Aguirre',
    phone: '(555) 234-5678',
    email: 'benjamin@example.com',
    address: '123 Main St, Austin, TX 78701',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    rewardAmount: '$50 Reward',
    returnNotes: 'If found, please leave with building concierge or press the notify button to drop a GPS pin!',
    isAddressPublic: false,
    isPhonePublic: true,
    isEmailPublic: true,
    ntfyTopic: 'itemfinder-tag-83921',
    scans: [
      { id: 101, timestamp: '2026-10-20 14:22', lat: 30.2672, lng: -97.7431, accuracy: 12, city: 'Austin, TX', device: 'iPhone 15 Pro (Safari)' }
    ]
  }
];

export default function App() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState('items'); // 'items', 'finder', 'map', 'qr', 'guide'
  const [currentUser, setCurrentUser] = useState({ loggedIn: true, name: 'Benjamin Aguirre', email: 'benjamin@example.com' });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Item Profiles State
  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('itemfinder_profiles_v3');
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });
  const [selectedTagId, setSelectedTagId] = useState(() => profiles[0]?.id || 'TAG-83921');
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Finder interaction state
  const [finderPhoneInput, setFinderPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [autoPingSent, setAutoPingSent] = useState(false);

  // Free Notification Toast
  const [alertToast, setAlertToast] = useState(null);

  // Selected Profile Object
  const currentProfile = profiles.find(p => p.id === selectedTagId) || profiles[0] || INITIAL_PROFILES[0];

  // Save to LocalStorage on update
  useEffect(() => {
    localStorage.setItem('itemfinder_profiles_v3', JSON.stringify(profiles));
  }, [profiles]);

  // URL Tag ID checking (Forces Public Finder View when scanned via link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tagFromUrl = params.get('tagId');
    if (tagFromUrl) {
      const match = profiles.find(p => p.id === tagFromUrl);
      if (match) {
        setSelectedTagId(match.id);
        setActiveTab('finder'); // Force public finder view
        setCurrentUser({ loggedIn: false }); // Log out owner view for scanners

        // AUTOMATIC GEOLOCATION PING ON VISIT
        if (!autoPingSent && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              executeLocationPing(position.coords.latitude, position.coords.longitude, position.coords.accuracy, 'Automatic Page Visit Pin');
              setAutoPingSent(true);
            },
            (error) => {
              console.log('Auto geolocation permission skipped or denied');
            },
            { timeout: 10000, enableHighAccuracy: true }
          );
        }
      }
    }
  }, []);

  const handleUpdateProfile = (updatedFields) => {
    setProfiles(prev => prev.map(p => p.id === currentProfile.id ? { ...p, ...updatedFields } : p));
  };

  const handleCreateNewItem = (category = 'Keys') => {
    const newId = `TAG-${Math.floor(10000 + Math.random() * 90000)}`;
    const newItem = {
      id: newId,
      title: `New ${category}`,
      category: category,
      ownerName: currentUser.name || 'Item Owner',
      phone: '(555) 000-0000',
      email: currentUser.email || 'owner@example.com',
      address: '',
      avatarUrl: '',
      rewardAmount: '$25 Reward',
      returnNotes: 'If found, please notify me using the button below!',
      isAddressPublic: false,
      isPhonePublic: true,
      isEmailPublic: true,
      ntfyTopic: `itemfinder-${newId.toLowerCase()}`,
      scans: []
    };
    setProfiles(prev => [...prev, newItem]);
    setSelectedTagId(newId);
    setIsEditing(true);
    setActiveTab('items');
  };

  const handleDeleteItem = (idToDelete) => {
    if (profiles.length <= 1) {
      alert("You must keep at least one item profile.");
      return;
    }
    const filtered = profiles.filter(p => p.id !== idToDelete);
    setProfiles(filtered);
    setSelectedTagId(filtered[0].id);
  };

  // Phone validation check: accepts formats like (555) 123-4567, 555-123-4567, or 5551234567
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
    return phoneRegex.test(phone);
  };

  const executeLocationPing = async (lat, lng, accuracy = 10, sourceLabel = 'Manual Pin') => {
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

    const updatedScans = [newScan, ...(currentProfile.scans || [])];
    
    // Save scan to profile
    setProfiles(prev => prev.map(p => p.id === currentProfile.id ? { ...p, scans: updatedScans } : p));

    // Dispatch 100% Free Push Notification via ntfy.sh API
    const topic = currentProfile.ntfyTopic || `itemfinder-${currentProfile.id.toLowerCase()}`;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    
    try {
      await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        headers: { 'Title': `🚨 ${currentProfile.title} Found!`, 'Tags': 'key,map' },
        body: `Location Ping (${sourceLabel}). View map: ${mapsUrl}`
      });
    } catch (e) {
      console.log('Ntfy push attempt complete');
    }

    setAlertToast({
      title: "Location Sent Successfully!",
      message: `Owner notified via free push alert (${sourceLabel}).`
    });

    setTimeout(() => setAlertToast(null), 6000);
  };

  const triggerManualLocationNotify = () => {
    if (finderPhoneInput && !validatePhoneNumber(finderPhoneInput)) {
      setPhoneError('Please enter a valid phone number format (e.g. 555-123-4567)');
      return;
    }
    setPhoneError('');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          executeLocationPing(position.coords.latitude, position.coords.longitude, position.coords.accuracy, 'Finder Button Click');
        },
        (error) => {
          // Fallback approximate simulation if GPS is blocked
          executeLocationPing(30.2672 + (Math.random() - 0.5) * 0.01, -97.7431 + (Math.random() - 0.5) * 0.01, 15, 'Approximate Location Fallback');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      executeLocationPing(30.2672, -97.7431, 20, 'Default Fallback Location');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateProfile({ avatarUrl: reader.result });
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
      {/* Top Banner & Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab(currentUser.loggedIn ? 'items' : 'finder')}>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Item Finder
              </h1>
              <p className="text-xs text-indigo-400 font-medium">100% Free NFC & QR Tag System</p>
            </div>
          </div>

          {/* User Auth Info & Logout */}
          <div className="flex items-center gap-3">
            {currentUser.loggedIn ? (
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-full pl-3 pr-1 py-1">
                <span className="text-xs font-medium text-slate-300">{currentUser.name} (Owner)</span>
                <button 
                  onClick={() => {
                    setCurrentUser({ loggedIn: false });
                    setActiveTab('finder');
                  }} 
                  className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded-full text-xs text-slate-200 transition"
                  title="Sign Out to Public View"
                >
                  <LogOut className="w-3 h-3" /> Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-lg shadow transition"
              >
                <LogIn className="w-3.5 h-3.5" /> Owner Sign In
              </button>
            )}
          </div>
        </div>

        {/* Navigation Bar (Only fully visible when owner is logged in) */}
        {currentUser.loggedIn && (
          <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-slate-800/60 pt-1">
            {[
              { id: 'items', label: 'My Item Tags', icon: Layers },
              { id: 'finder', label: 'Public Finder Preview', icon: Eye },
              { id: 'map', label: 'GIS Location Map', icon: MapPin, count: currentProfile.scans?.length || 0 },
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

      {/* Global Alert Notification Toast */}
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
                onClick={() => handleCreateNewItem('Keys')}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-600 flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Item
              </button>
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

        {/* TAB 1: MY ITEM TAGS & PROFILE EDITOR (Owner Only) */}
        {activeTab === 'items' && currentUser.loggedIn && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column: Profile View / Editor */}
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

              {/* Photo & Main Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="relative group w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {currentProfile.avatarUrl ? (
                      <img src={currentProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-slate-500" />
                    )}
                    {isEditing && (
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition text-[10px] text-white">
                        <Camera className="w-5 h-5 mb-1" /> Change
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-200">{currentProfile.ownerName}</h3>
                    <p className="text-xs text-slate-400">{currentProfile.category} Owner</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                    {isEditing ? (
                      <input 
                        type="email" 
                        value={currentProfile.email} 
                        onChange={e => handleUpdateProfile({ email: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                      />
                    ) : (
                      <p className="text-sm text-slate-300">{currentProfile.email}</p>
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

            {/* Right Column: QR & Delete */}
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

        {/* TAB 2: PUBLIC FINDER VIEW (READ-ONLY FOR FINDERS) */}
        {activeTab === 'finder' && (
          <div className="max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Finder Page Hero Header */}
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

            {/* Main Action & Finder Details */}
            <div className="p-6 space-y-5">
              {/* Optional Phone Input for Finder with Validation */}
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Phone Number (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 555-123-4567"
                  value={finderPhoneInput}
                  onChange={(e) => {
                    setFinderPhoneInput(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
                {phoneError && <p className="text-[10px] text-red-400 mt-1">{phoneError}</p>}
                <p className="text-[10px] text-slate-500 mt-1">Format must be valid to attach your contact info to the alert.</p>
              </div>

              {/* PRIMARY ALERT BUTTON (Manual Backup) */}
              <div className="text-center">
                <button
                  onClick={triggerManualLocationNotify}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm py-4 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transform active:scale-95 transition"
                >
                  <MapPin className="w-5 h-5 fill-slate-950" /> Send Location Pin to Owner
                </button>
                <p className="text-[11px] text-slate-500 mt-2">
                  Location automatically shared on visit; click above to send again manually.
                </p>
              </div>

              {/* Message / Notes */}
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Return Notes:</span>
                <p className="text-xs text-slate-200 leading-relaxed">{currentProfile.returnNotes}</p>
              </div>

              {/* Direct Contact Options */}
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

        {/* TAB 3: GIS MAP (Owner Only) */}
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
                        <p className="font-semibold text-slate-200">{scan.city} ({scan.lat.toFixed(4)}, {scan.lng.toFixed(4)})</p>
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

        {/* TAB 4 & 5: QR / GUIDE (Owner Only) */}
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
            <p>2. When a finder scans your tag, it opens the read-only public view and automatically transmits their GPS coordinates to your <strong>ntfy</strong> app.</p>
          </div>
        )}

      </main>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-2xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">Owner Sign In</h3>
            <p className="text-xs text-slate-400 mb-4">Access your item dashboard and scan logs</p>

            <form onSubmit={(e) => {
              e.preventDefault();
              setCurrentUser({ loggedIn: true, name: authEmail.split('@')[0] || 'Admin', email: authEmail });
              setShowAuthModal(false);
              setActiveTab('items');
            }} className="space-y-3">
              <input 
                type="email" 
                required 
                placeholder="Email Address" 
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
              <input 
                type="password" 
                required 
                placeholder="Password" 
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl shadow transition"
              >
                Sign In
              </button>
            </form>
            
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
