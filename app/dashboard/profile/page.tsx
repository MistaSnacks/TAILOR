'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      console.log('👤 Loading profile for user:', user.email);
      setEmail(user.email || '');
      setFullName(user.name || '');
      // Load additional profile data
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      // TODO: Implement API to fetch full profile from database
      // For now, just use auth data
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // TODO: Implement profile update API
      console.log('💾 Saving profile:', {
        fullName,
        email,
        phone,
        location,
        linkedin,
      });
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert('Profile saved! (Note: Full profile API coming soon)');
    } catch (error) {
      console.error('❌ Profile update error:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-bold mb-6">Profile</h1>

      <div className="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="p-6 rounded-lg bg-card border border-border">
            <h2 className="font-display text-xl font-semibold mb-4">
              Personal Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="john@example.com"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email is linked to your Google account
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="San Francisco, CA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg bg-card border border-border">
            <h2 className="font-display text-xl font-semibold mb-4">
              Account Information
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account ID</span>
                <span className="font-mono text-primary">{user?.id?.substring(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sign-in Method</span>
                <span>Google OAuth</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Status</span>
                <span className="text-green-400">Active</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg bg-card border border-border">
            <h2 className="font-display text-xl font-semibold mb-4">
              AI & Document Settings
            </h2>
            <p className="text-muted-foreground text-sm mb-3">
              Your documents are securely stored and processed by Gemini AI to generate tailored resumes.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Document parsing enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Gemini File API integrated</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>ATS optimization active</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-slate-950 font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

