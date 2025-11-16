'use client';

import { useState } from 'react';

export default function ProfilePage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // TODO: Implement profile update
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

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
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg bg-card border border-border">
            <h2 className="font-display text-xl font-semibold mb-4">
              AI Settings
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Your documents are stored securely and used to generate tailored resumes.
              Gemini File Search store: <code className="text-primary">Not configured</code>
            </p>
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

