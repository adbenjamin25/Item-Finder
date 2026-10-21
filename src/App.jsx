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
    ownerName: 'John Doe',
    phone: '(555) 234-5678',
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
      { id: 101, timestamp: '2026-10-20 14:22', lat: 30.2672, lng: -97.7431, accuracy: 12, city: 'Austin, TX', device: 'iPhone 15 Pro (Safari)' }
    ]
  }
];

export default function App() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState('items'); // 'items', 'finder', 'map', 'qr', 'guide'
  const [currentUser, setCurrentUser] = useState({ loggedIn: true, name: 'John Doe', email: 'johndoe@example.com' });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Item Profiles State
  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('itemfinder_profiles_v5');
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
    localStorage.setItem('itemfinder_profiles_v5', JSON.stringify(profiles));
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
      ownerName: currentUser.name || 'John Doe',
      phone: '(555) 000-0000',
      email: currentUser.email || 'johndoe@example.com',
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

  // Phone validation check
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^(\+\d{1,2}\s?)
