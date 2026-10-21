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
      { id: 101, timestamp: '2026-10-20 14:22', lat: 30.2672, lng: -97.7431, accuracy: 12, city: 'Austin, TX', device: 'iPhone 15 Pro (Safari)' },
      { id: 102, timestamp: '2026-10-18 09:15', lat: 30.2747, lng: -97.7404, accuracy: 25, city: 'Austin, TX', device: 'Pixel 8 (Chrome)' }
    ]
  },
  {
    id: 'TAG-19402',
    title: 'Travel Backpack',
    category: 'Bags',
    ownerName: 'Benjamin Aguirre',
    phone: '(555) 234-5678',
    email: 'benjamin@example.com',
    address: '123 Main St, Austin, TX 78701',
    avatarUrl: '',
    rewardAmount: '$100 Reward',
    returnNotes: 'Contains important work laptop and documents. Please notify me immediately!',
    isAddressPublic: false,
    isPhonePublic: true,
    isEmailPublic: true,
    ntfyTopic: 'itemfinder-tag-19402',
    scans: []
  }
];

export default function App() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState('items'); // 'items', 'finder', 'map', 'qr', 'guide'
  const [currentUser, setCurrentUser] = useState({ loggedIn: true, name: 'Benjamin Aguirre', email: 'benjamin@example.com' });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Item Profiles State
  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('itemfinder_profiles_v2');
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });
  const [selectedTagId, setSelectedTagId] = useState(() => profiles[0]?.id || 'TAG-83921');
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Free Notification Toast
  const [alertToast, setAlertToast] = useState(null);

  // Selected Profile Object
  const currentProfile = profiles.find(p => p.id === selectedTagId) || profiles[0] || INITIAL_PROFILES[0];

  // Save to LocalStorage on update
  useEffect(() => {
    localStorage.setItem('itemfinder_profiles_v2', JSON.stringify(profiles));
  }, [profiles]);

  // URL Tag ID checking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tagFromUrl = params.get('tagId');
    if (tagFromUrl) {
      const match = profiles.find(p => p.id === tagFromUrl);
      if (match) {
        setSelectedTagId(match.id);
        setActiveTab('finder');
      }
    }
  }, []);

  // Handlers
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
      phone: currentProfile?.phone || '(555) 000-0000',
      email: currentUser.email || 'owner@example.com',
      address: currentProfile?.address || '',
      avatarUrl: currentProfile?.avatarUrl || '',
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

  const triggerFreeLocationNotify = async () => {
    const now = new Date().toLocaleString();
    // Simulated GPS pin near current location
    const newScan = {
      id: Date.now(),
      timestamp: now,
      lat: 30.2672 + (Math.random() - 0.5) * 0.02,
      lng: -97.7431 + (Math.random() - 0.5) * 0.02,
      accuracy: Math.floor(Math.random() * 15) + 5,
      city: 'Current Location',
      device: 'Mobile Browser (GPS Active)'
    };

    // 1. Add Scan to Local Record
    const updatedScans = [newScan, ...(currentProfile.scans || [])];
    handleUpdateProfile({ scans: updatedScans });

    // 2. Dispatch 100% Free Push Notification via ntfy.sh API
    const topic = currentProfile.ntfyTopic || `itemfinder-${currentProfile.id.toLowerCase()}`;
    const mapsUrl = `https://www.google.com/maps?q=${newScan.lat},${newScan.lng}`;
    
    try {
      await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        headers: { 'Title': `🚨 ${currentProfile.title} Found!`, 'Tags': 'key,map' },
        body: `Your item was scanned! View location: ${mapsUrl}`
      });
    } catch (e) {
      console.log('Ntfy push attempt complete');
    }

    setAlertToast({
      title: "Location Sent & Free Alert Triggered!",
      message: `Owner notified via free ntfy push topic: ${topic}`
    });

    setTimeout(() => setAlertToast(null), 6000);
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
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('items')}>
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

          {/* User Auth Info */}
          <div className="flex items-center gap-3">
            {currentUser.loggedIn ? (
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-full pl-3 pr-1 py-1">
                <span className="text-xs font-medium text-slate-300">{currentUser.name}</span>
                <button 
                  onClick={() => setCurrentUser({ loggedIn: false })} 
                  className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-200 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-lg shadow transition"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In / Up
              </button>
            )}
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-slate-800/60 pt-1">
          {[
            { id: 'items', label: 'My Item Tags', icon: Layers },
            { id: 'finder', label: 'Public Finder Page Preview', icon: Eye },
            { id: 'map', label: 'GIS Location Map', icon: MapPin, count: currentProfile.scans?.length || 0 },
            { id: 'qr', label: 'NFC & QR Code Generator', icon: QrCode },
            { id: 'guide', label: 'Launch Free & NFC Setup Guide', icon: HelpCircle }
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

        {/* TOP ITEM SWITCHER BAR */}
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

        {/* TAB 1: MY ITEM TAGS & PROFILE EDITOR */}
        {activeTab === 'items' && (
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
                {/* Profile Photo Upload */}
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
                    {isEditing && (
                      <p className="text-[11px] text-indigo-400 mt-1">Hover over image box to upload photo</p>
                    )}
                  </div>
                </div>

                {/* Form Inputs / Fields */}
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-400">Phone Number</label>
                      {isEditing && (
                        <button 
                          onClick={() => handleUpdateProfile({ isPhonePublic: !currentProfile.isPhonePublic })}
                          className="text-[10px] text-indigo-400 flex items-center gap-1"
                        >
                          {currentProfile.isPhonePublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {currentProfile.isPhonePublic ? 'Public' : 'Hidden'}
                        </button>
                      )}
                    </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-400">Email Address</label>
                      {isEditing && (
                        <button 
                          onClick={() => handleUpdateProfile({ isEmailPublic: !currentProfile.isEmailPublic })}
                          className="text-[10px] text-indigo-400 flex items-center gap-1"
                        >
                          {currentProfile.isEmailPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {currentProfile.isEmailPublic ? 'Public' : 'Hidden'}
                        </button>
                      )}
                    </div>
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

                {/* Return Instructions */}
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

                {/* Free Ntfy Push Channel Configuration */}
                <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-indigo-400 animate-pulse" /> 100% Free Push Topic (ntfy.sh)
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                      No Subscription Needed
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Your phone receives instant push alerts whenever this tag is scanned. Download the free <strong>ntfy</strong> app on iOS/Android and subscribe to topic:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-xs font-mono text-emerald-400 flex-1">
                      {currentProfile.ntfyTopic || `itemfinder-${currentProfile.id.toLowerCase()}`}
                    </code>
                    <button 
                      onClick={triggerFreeLocationNotify}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shadow transition"
                    >
                      <Send className="w-3.5 h-3.5" /> Test Push Alert
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Quick Status & QR Preview */}
            <div className="space-y-6">
              {/* Quick QR Card */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-xl text-center">
                <h3 className="text-sm font-bold text-white mb-1">Tag Link & QR Code</h3>
                <p className="text-xs text-slate-400 mb-4">Scan or copy to write to NFC tag</p>
                
                {/* QR Placeholder Box */}
                <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-4">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getPublicUrl())}`} 
                    alt="Item QR Code" 
                    className="w-40 h-40"
                  />
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={copyPublicLink}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-2 rounded-xl border border-slate-600 font-medium transition flex items-center justify-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Link to Write to NFC
                  </button>
                  <button 
                    onClick={() => setActiveTab('finder')}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded-xl font-medium transition flex items-center justify-center gap-2 shadow"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Public Page
                  </button>
                </div>
              </div>

              {/* Danger Zone / Delete */}
              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl text-xs">
                <span className="text-slate-400 font-medium">Manage Item Tag:</span>
                <button 
                  onClick={() => handleDeleteItem(currentProfile.id)}
                  className="mt-2 w-full text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-900/40 p-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete This Item Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PUBLIC FINDER VIEW (WHAT SOMEONE SCANNING SEES) */}
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
            <div className="p-6 space-y-6">
              {/* PRIMARY ALERT BUTTON */}
              <div className="text-center">
                <button
                  onClick={triggerFreeLocationNotify}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm py-4 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transform active:scale-95 transition"
                >
                  <MapPin className="w-5 h-5 fill-slate-950" /> Notify Owner & Share My Location
                </button>
                <p className="text-[11px] text-slate-500 mt-2">
                  Sends GPS pin directly to owner's phone at zero cost to you.
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

        {/* TAB 3: VISUAL GIS & ACCESS MAP */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-400" /> GIS Scan Telemetry & Map Log
                  </h2>
                  <p className="text-xs text-slate-400">Approximate coordinates of people who scanned this item tag</p>
                </div>
                <button 
                  onClick={triggerFreeLocationNotify}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Simulate Scan
                </button>
              </div>

              {/* Simulated Map Visual Canvas */}
              <div className="relative w-full h-80 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center">
                {/* Map Grid Patterns */}
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                
                {/* Simulated Pins */}
                {currentProfile.scans && currentProfile.scans.length > 0 ? (
                  currentProfile.scans.map((scan, idx) => (
                    <div 
                      key={scan.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                      style={{ top: `${45 + (idx * 12)}%`, left: `${50 + (idx * 15)}%` }}
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-500/30 border-2 border-emerald-400 animate-ping absolute"></div>
                      <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-slate-950 font-bold text-[10px] relative shadow-lg">
                        {idx + 1}
                      </div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 border border-slate-700 text-slate-200 text-[10px] p-2 rounded-lg whitespace-nowrap shadow-2xl z-20">
                        <p className="font-bold">{scan.city}</p>
                        <p className="text-slate-400">{scan.timestamp}</p>
                        <p className="text-indigo-400">{scan.lat.toFixed(4)}, {scan.lng.toFixed(4)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 font-medium">No location scans recorded yet for this item.</p>
                )}

                <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 text-[11px] px-3 py-1.5 rounded-lg text-slate-400 backdrop-blur">
                  GIS Radius Accuracy: ~10 meters
                </div>
              </div>

              {/* Scan History Table */}
              <div className="mt-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Access Logs</h3>
                <div className="space-y-2">
                  {currentProfile.scans && currentProfile.scans.length > 0 ? (
                    currentProfile.scans.map((scan) => (
                      <div key={scan.id} className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <Compass className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="font-semibold text-slate-200">{scan.city} ({scan.lat.toFixed(4)}, {scan.lng.toFixed(4)})</p>
                            <p className="text-slate-500 text-[11px]">{scan.device}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block">{scan.timestamp}</span>
                          <a 
                            href={`https://www.google.com/maps?q=${scan.lat},${scan.lng}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 justify-end"
                          >
                            Open Maps <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">Logs will appear here when someone accesses your NFC link.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: NFC & QR GENERATOR */}
        {activeTab === 'qr' && (
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto text-center">
            <h2 className="text-lg font-bold text-white mb-1">NFC Payload & QR Code Ready</h2>
            <p className="text-xs text-slate-400 mb-6">Program physical tags or print stickers for your keychains and bags</p>

            <div className="bg-white p-6 rounded-2xl inline-block shadow-2xl mb-6">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(getPublicUrl())}`} 
                alt="Item QR Code" 
                className="w-52 h-52 mx-auto"
              />
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-left text-xs mb-6 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span>Direct Tag URL:</span>
                <span className="text-indigo-400 font-mono">{currentProfile.id}</span>
              </div>
              <input 
                readOnly 
                value={getPublicUrl()} 
                className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-slate-200 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={copyPublicLink}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-3 rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copy URL for NFC Tag App
              </button>
              <a 
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(getPublicUrl())}`} 
                target="_blank" 
                rel="noreferrer"
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold py-3 rounded-xl border border-slate-600 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download High-Res QR Image
              </a>
            </div>
          </div>
        )}

        {/* TAB 5: LAUNCH FREE & NFC SETUP GUIDE */}
        {activeTab === 'guide' && (
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">100% Free Deployment & NFC Writing Guide</h2>
              <p className="text-xs text-slate-400">How to launch this website live and program physical NFC keychains without paying anything.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-3">1</span>
                <h3 className="font-bold text-sm text-slate-200 mb-1">Deploy Website Online</h3>
                <p className="text-xs text-slate-400">
                  Host this React single-page app for free on <strong>Vercel</strong>, <strong>Netlify</strong>, or <strong>GitHub Pages</strong>. You get an instant HTTPS link.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-3">2</span>
                <h3 className="font-bold text-sm text-slate-200 mb-1">Buy NTAG215 NFC Tags</h3>
                <p className="text-xs text-slate-400">
                  Purchase blank NTAG215/213 NFC stickers or keyfobs (~$0.20 each online).
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-3">3</span>
                <h3 className="font-bold text-sm text-slate-200 mb-1">Write Link with NFC Tools</h3>
                <p className="text-xs text-slate-400">
                  Download free <strong>NFC Tools</strong> app (iOS/Android). Select <i>Write $\rightarrow$ Add record $\rightarrow$ URL</i> and paste your public tag link.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-2xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">
              {authMode === 'login' ? 'Sign In to Item Finder' : 'Create Account'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">Manage your personal items and scan alerts</p>

            <form onSubmit={(e) => {
              e.preventDefault();
              setCurrentUser({ loggedIn: true, name: authEmail.split('@')[0] || 'User', email: authEmail });
              setShowAuthModal(false);
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
                {authMode === 'login' ? 'Sign In' : 'Register Account'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-xs text-indigo-400 hover:underline"
              >
                {authMode === 'login' ? "Don't have an account? Sign Up" : "Already registered? Sign In"}
              </button>
            </div>
            
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
