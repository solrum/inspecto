'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { auth as authApi } from '@/lib/api';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useAuth } from '@/stores/auth';
import { useT } from '@/components/dictionary-provider';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Toggle } from '@/components/ui/toggle';
import { SettingsSection } from '@/components/settings-section';

export default function AccountSettingsPage() {
  const { isAuthenticated } = useAuthGuard();
  const { user, setUser } = useAuth();
  const t = useT('accountSettings');
  const tc = useT('common');
  const toast = useToast();

  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [commentNotifications, setCommentNotifications] = useState(true);

  useEffect(() => {
    if (user) setName(user.name ?? '');
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: () => authApi.updateProfile({ name }),
    onSuccess: (updated: any) => {
      setUser(updated);
      toast.add(t('profileUpdated'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.add(t('passwordUpdated'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  const canChangePassword =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col gap-8 p-10">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* Profile */}
      <SettingsSection title={t('profile')}>
        <div className="flex flex-col gap-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar name={user?.name ?? 'U'} imageUrl={user?.avatarUrl} size="lg" />
              <button
                type="button"
                onClick={() => toast.add(tc('underDevelopmentDesc'), 'info')}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
              >
                <Camera size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-sans text-sm font-medium text-foreground">{user?.name}</p>
              <button
                type="button"
                onClick={() => toast.add(tc('underDevelopmentDesc'), 'info')}
                className="cursor-pointer border-none bg-transparent p-0 font-sans text-xs text-primary"
              >
                {t('changePhoto')}
              </button>
            </div>
          </div>

          {/* Fields */}
          <Input
            id="full-name"
            label={t('fullName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="email"
            label={t('emailAddress')}
            value={user?.email ?? ''}
            disabled
            className="opacity-60"
          />

          <div className="flex justify-end">
            <Button
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending || !name.trim()}
            >
              {t('saveChanges' as any)}
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* Change Password */}
      <SettingsSection title={t('changePassword')}>
        <div className="flex flex-col gap-4">
          <Input
            id="current-password"
            type="password"
            label={t('currentPassword')}
            placeholder={t('currentPasswordPlaceholder')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            id="new-password"
            type="password"
            label={t('newPassword')}
            placeholder={t('newPasswordPlaceholder')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            id="confirm-password"
            type="password"
            label={t('confirmPassword')}
            placeholder={t('confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
          />
          <div className="flex justify-start">
            <Button
              onClick={() => changePasswordMutation.mutate()}
              disabled={changePasswordMutation.isPending || !canChangePassword}
            >
              {changePasswordMutation.isPending ? t('updating') : t('updatePassword')}
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection title={t('notifications')}>
        <div className="flex flex-col divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-0.5">
              <p className="font-sans text-sm font-medium text-foreground">{t('emailNotifications')}</p>
              <p className="font-sans text-xs text-foreground-muted">{t('emailNotificationsDesc')}</p>
            </div>
            <Toggle checked={emailNotifications} onChange={setEmailNotifications} />
          </div>
          <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-0.5">
              <p className="font-sans text-sm font-medium text-foreground">{t('commentNotifications')}</p>
              <p className="font-sans text-xs text-foreground-muted">{t('commentNotificationsDesc')}</p>
            </div>
            <Toggle checked={commentNotifications} onChange={setCommentNotifications} />
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
