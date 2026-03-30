'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/components/dictionary-provider';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useLocalePath } from '@/hooks/use-locale-path';
import { teams } from '@/lib/api';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PageHeader } from '@/components/ui/page-header';
import { Toggle } from '@/components/ui/toggle';
import { RadioGroup } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';

interface ToggleRow {
  key: string;
  label: string;
  desc: string;
}

function NotificationCard({
  title, description, rows, values, onToggle,
}: {
  title: string; description: string; rows: ToggleRow[];
  values: Record<string, boolean>; onToggle: (key: string, val: boolean) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-card inset-shadow-border">
      <div className="flex flex-col gap-1 px-6 py-5 inset-shadow-border-b">
        <h3 className="m-0 font-display text-base font-semibold text-foreground">{title}</h3>
        <p className="m-0 font-sans text-[13px] text-foreground-muted">{description}</p>
      </div>
      {rows.map((row, i) => (
        <div key={row.key} className={`flex items-center justify-between px-6 py-4 ${i < rows.length - 1 ? 'inset-shadow-border-b' : ''}`}>
          <div className="min-w-0 flex-1">
            <p className="m-0 font-sans text-sm font-medium text-foreground">{row.label}</p>
            <p className="m-0 mt-0.5 font-sans text-xs text-foreground-muted">{row.desc}</p>
          </div>
          <Toggle checked={values[row.key] ?? false} onChange={(v) => onToggle(row.key, v)} />
        </div>
      ))}
    </div>
  );
}

export default function TeamNotificationsPage({
  params,
}: {
  params: Promise<{ orgId: string; teamId: string }>;
}) {
  const { orgId, teamId } = use(params);
  const { isAuthenticated } = useAuthGuard();
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useT('teams');
  const tc = useT('common');
  const lp = useLocalePath();

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['teams', orgId, teamId],
    queryFn: () => teams.get(orgId, teamId),
    enabled: isAuthenticated,
  });

  const { data: savedNotifs, isLoading: notifsLoading } = useQuery({
    queryKey: ['teams', orgId, teamId, 'notifications'],
    queryFn: () => teams.getNotifications(orgId, teamId),
    enabled: isAuthenticated,
  });

  const [notifs, setNotifs] = useState<Record<string, boolean>>({});
  const [delivery, setDelivery] = useState('inApp');

  useEffect(() => {
    if (savedNotifs) {
      setNotifs(savedNotifs.settings);
      setDelivery(savedNotifs.delivery);
    }
  }, [savedNotifs]);

  const saveNotifs = useMutation({
    mutationFn: () => teams.updateNotifications(orgId, teamId, { settings: notifs, delivery }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', orgId, teamId, 'notifications'] });
      toast.add(t('notificationsSaved'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  const toggle = (key: string, val: boolean) => setNotifs((prev) => ({ ...prev, [key]: val }));

  if (!isAuthenticated) return null;
  if (teamLoading || notifsLoading) return <div className="flex justify-center pt-16"><Spinner size={24} /></div>;

  const activityRows: ToggleRow[] = [
    { key: 'newUpload', label: t('notifNewUpload'), desc: t('notifNewUploadDesc') },
    { key: 'fileUpdate', label: t('notifFileUpdate'), desc: t('notifFileUpdateDesc') },
    { key: 'newComment', label: t('notifNewComment'), desc: t('notifNewCommentDesc') },
    { key: 'commentReply', label: t('notifCommentReply'), desc: t('notifCommentReplyDesc') },
  ];

  const memberRows: ToggleRow[] = [
    { key: 'memberJoined', label: t('notifMemberJoined'), desc: t('notifMemberJoinedDesc') },
    { key: 'memberLeft', label: t('notifMemberLeft'), desc: t('notifMemberLeftDesc') },
  ];

  const deliveryOptions = [
    { value: 'inApp', label: t('notifInApp'), description: t('notifInAppDesc') },
    { value: 'emailImportant', label: t('notifEmailImportant'), description: t('notifEmailImportantDesc') },
    { value: 'emailAll', label: t('notifEmailAll'), description: t('notifEmailAllDesc') },
  ];

  return (
    <div className="flex flex-col gap-6 px-10 py-8">
      <Breadcrumb
        homeHref="/"
        items={[
          { label: tc('admin'), href: lp(`/org/${orgId}/overview`) },
          { label: t('title'), href: lp(`/org/${orgId}/teams`) },
          { label: team?.name ?? '', href: lp(`/org/${orgId}/teams/${teamId}`) },
          { label: t('notifications') },
        ]}
      />

      <PageHeader title={t('notificationSettings')} subtitle={t('notificationSettingsSubtitle')} />

      <div className="flex flex-col gap-6">
        <NotificationCard title={t('notifActivity')} description={t('notifActivityDesc')} rows={activityRows} values={notifs} onToggle={toggle} />
        <NotificationCard title={t('notifMember')} description={t('notifMemberDesc')} rows={memberRows} values={notifs} onToggle={toggle} />

        <div className="overflow-hidden rounded-lg bg-card inset-shadow-border">
          <div className="flex flex-col gap-1 px-6 py-5 inset-shadow-border-b">
            <h3 className="m-0 font-display text-base font-semibold text-foreground">{t('notifDelivery')}</h3>
            <p className="m-0 font-sans text-[13px] text-foreground-muted">{t('notifDeliveryDesc')}</p>
          </div>
          <RadioGroup name="delivery" options={deliveryOptions} value={delivery} onChange={setDelivery} />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => saveNotifs.mutate()} disabled={saveNotifs.isPending}>
            {saveNotifs.isPending ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      </div>
    </div>
  );
}
