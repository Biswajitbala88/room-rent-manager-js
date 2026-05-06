import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { User, Lock, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  const updateProfile = useMutation({
    mutationFn: () => apiFetch('/profile', { method: 'PATCH', json: { name, email } }),
    onSuccess: () => setProfileMsg('Profile updated successfully!'),
    onError: (err: Error) => setProfileMsg(err.message),
  });

  const updatePassword = useMutation({
    mutationFn: () => apiFetch('/profile/password', { method: 'PATCH', json: { currentPassword, password: newPassword } }),
    onSuccess: () => { setPasswordMsg('Password updated successfully!'); setCurrentPassword(''); setNewPassword(''); },
    onError: (err: Error) => setPasswordMsg(err.message),
  });

  const deleteAccount = useMutation({
    mutationFn: () => apiFetch('/profile', { method: 'DELETE' }),
    onSuccess: () => logout(),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Profile</h1>
        <p className="text-sm text-steel">Manage your account settings.</p>
      </div>

      {/* Profile Info */}
      <form
        onSubmit={(e) => { e.preventDefault(); setProfileMsg(null); updateProfile.mutate(); }}
        className="rounded-lg border border-slate-200 bg-white p-6 space-y-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-mint/10 text-mint"><User className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold text-ink">Account Information</h2>
            <p className="text-xs text-steel uppercase tracking-wide">{user?.userType === 'SA' ? 'Super Admin' : 'Owner'}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20" />
          </label>
        </div>
        {profileMsg && <p className={`text-sm ${profileMsg.includes('success') ? 'text-emerald-600' : 'text-coral'}`}>{profileMsg}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={updateProfile.isPending} className="h-10 rounded-md bg-mint px-6 text-sm font-semibold text-white hover:bg-mint/90 disabled:opacity-70">
            {updateProfile.isPending ? 'Saving...' : 'Update Profile'}
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form
        onSubmit={(e) => { e.preventDefault(); setPasswordMsg(null); updatePassword.mutate(); }}
        className="rounded-lg border border-slate-200 bg-white p-6 space-y-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-amber-100 text-amber-600"><Lock className="h-5 w-5" /></div>
          <h2 className="font-semibold text-ink">Change Password</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">Current Password</span>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">New Password</span>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20" />
          </label>
        </div>
        {passwordMsg && <p className={`text-sm ${passwordMsg.includes('success') ? 'text-emerald-600' : 'text-coral'}`}>{passwordMsg}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={updatePassword.isPending} className="h-10 rounded-md bg-mint px-6 text-sm font-semibold text-white hover:bg-mint/90 disabled:opacity-70">
            {updatePassword.isPending ? 'Updating...' : 'Change Password'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-red-100 text-red-500"><Trash2 className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold text-red-600">Danger Zone</h2>
            <p className="text-sm text-steel">Permanently delete your account and all associated data.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { if (confirm('Are you sure? This action cannot be undone.')) deleteAccount.mutate(); }}
          className="h-10 rounded-md bg-red-500 px-6 text-sm font-semibold text-white hover:bg-red-600"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
