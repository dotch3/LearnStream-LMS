'use client';

import { useState } from 'react';
import { api } from '@/lib/axios';

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [nameMsg, setNameMsg] = useState('');
  const [nameError, setNameError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameMsg('');
    setNameError('');
    try {
      await api.patch('/api/users/me/profile', { name });
      setNameMsg('Name updated successfully.');
      setName('');
    } catch {
      setNameError('Failed to update name.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    try {
      await api.patch('/api/users/me/password', { currentPassword, newPassword });
      setPwMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) setPwError('Current password is incorrect.');
      else if (status === 400) setPwError('New password must be at least 6 characters.');
      else setPwError('Failed to change password.');
    }
  };

  return (
    <div className="p-6 max-w-md flex flex-col gap-10">
      <section>
        <h2 className="text-xl font-semibold mb-4">Update Display Name</h2>
        {nameError && <p className="mb-2 text-red-600">{nameError}</p>}
        {nameMsg && <p className="mb-2 text-green-600">{nameMsg}</p>}
        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="New display name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Update Name
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Change Password</h2>
        {pwError && <p className="mb-2 text-red-600">{pwError}</p>}
        {pwMsg && <p className="mb-2 text-green-600">{pwMsg}</p>}
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <input
            type="password"
            className="border rounded px-3 py-2"
            placeholder="Current password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            className="border rounded px-3 py-2"
            placeholder="New password (min 6 chars)"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Change Password
          </button>
        </form>
      </section>
    </div>
  );
}
