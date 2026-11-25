'use client';

import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { updateProfile } from '@/store/slices/authSlice';
import { ChatLayout } from '@/components/layout/ChatLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, error } = useAppSelector((state) => state.auth);
  const { theme } = useAppSelector((state) => state.ui) || { mode: 'dark' };

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedName(user?.name || '');
    setSaveStatus('idle');
    setLocalError(null);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedName(user?.name || '');
    setSaveStatus('idle');
    setLocalError(null);
  };

  const handleSaveClick = async () => {
    // Validate name
    if (!editedName || editedName.trim().length === 0) {
      setLocalError('Name is required');
      setSaveStatus('error');
      return;
    }

    if (editedName.trim().length < 2) {
      setLocalError('Name must be at least 2 characters');
      setSaveStatus('error');
      return;
    }

    if (editedName.trim().length > 50) {
      setLocalError('Name must be less than 50 characters');
      setSaveStatus('error');
      return;
    }

    setSaveStatus('pending');
    setLocalError(null);

    try {
      const result = await dispatch(updateProfile({ name: editedName.trim() }));
      
      if (updateProfile.fulfilled.match(result)) {
        setSaveStatus('success');
        setIsEditing(false);
        // Clear success message after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        setLocalError(result.payload as string || 'Failed to update profile');
      }
    } catch (err) {
      setSaveStatus('error');
      setLocalError('An unexpected error occurred');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatLayout>
      <div className="h-full flex flex-col bg-black text-white overflow-hidden relative">
        {/* Simple Background */}
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
        <div className="flex-1 overflow-auto relative z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">
                Settings
              </h1>
              <p className="text-gray-300">
                Manage your account preferences and application settings.
              </p>
            </div>

            <div className="space-y-6">
              {/* Profile Settings */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">
                      Profile
                    </h3>
                    {!isEditing ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditClick}
                      >
                        Edit Profile
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelClick}
                          disabled={saveStatus === 'pending'}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSaveClick}
                          loading={saveStatus === 'pending'}
                          disabled={saveStatus === 'pending'}
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Success/Error Messages */}
                  {saveStatus === 'success' && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-green-400 text-sm">Profile updated successfully!</p>
                    </div>
                  )}
                  {localError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm">{localError}</p>
                    </div>
                  )}
                  {error && !localError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Input
                        label="Name"
                        value={isEditing ? editedName : user?.name || ''}
                        onChange={isEditing ? (e) => {
                          setEditedName(e.target.value);
                          // Clear error when user types
                          if (localError) {
                            setLocalError(null);
                            setSaveStatus('idle');
                          }
                        } : undefined}
                        disabled={!isEditing}
                        placeholder="Your display name"
                        error={localError && saveStatus === 'error' ? ' ' : undefined}
                      />
                    </div>
                    <div>
                      <Input
                        label="Email"
                        value={user?.email || ''}
                        disabled
                        placeholder="Your email address"
                      />
                    </div>
                    <div>
                      <Input
                        label="Wallet Address"
                        value={user?.address || ''}
                        disabled
                        placeholder="Your Starknet wallet address"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Appearance Settings */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <h3 className="text-lg font-medium text-white">
                      Appearance
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Theme
                      </label>
                      <div className="flex space-x-4">
                        <Button
                          variant={theme.mode === 'light' ? 'primary' : 'ghost'}
                          size="sm"
                        >
                          Light
                        </Button>
                        <Button
                          variant={theme.mode === 'dark' ? 'primary' : 'ghost'}
                          size="sm"
                        >
                          Dark
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Notifications */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <h3 className="text-lg font-medium text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Transaction Notifications
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Get notified when transactions complete
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Chat Notifications
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Get notified of new AI agent responses
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Security */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <h3 className="text-lg font-medium text-white">
                      Security
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <Button variant="ghost" className="w-full justify-start">
                      Change Password
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
