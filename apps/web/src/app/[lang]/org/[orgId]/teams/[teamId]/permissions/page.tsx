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
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';

interface PermRow {
  key: string;
  label: string;
  desc: string;
}

function PermissionSection({
  title, rows, values, onToggle,
}: {
  title: string; rows: PermRow[]; values: Record<string, boolean>; onToggle: (key: string, val: boolean) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg inset-shadow-border">
      <div className="bg-surface px-5 py-4 inset-shadow-border-b">
        <h3 className="m-0 font-display text-base font-semibold text-foreground">{title}</h3>
      </div>
      {rows.map((row, i) => (
        <div key={row.key} className={`flex items-center justify-between px-5 py-3.5 ${i < rows.length - 1 ? 'inset-shadow-border-b' : ''}`}>
          <div className="min-w-0 flex-1">
            <p className="m-0 font-sans text-sm font-medium text-foreground">{row.label}</p>
            <p className="m-0 mt-0.5 font-sans text-xs text-foreground-muted">{row.desc}</p>
          </div>
          <Toggle checked={values[row.key] ?? true} onChange={(v) => onToggle(row.key, v)} />
        </div>
      ))}
    </div>
  );
}

export default function TeamPermissionsPage({
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

  const { data: savedPerms, isLoading: permsLoading } = useQuery({
    queryKey: ['teams', orgId, teamId, 'permissions'],
    queryFn: () => teams.getPermissions(orgId, teamId),
    enabled: isAuthenticated,
  });

  const [perms, setPerms] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (savedPerms) setPerms(savedPerms);
  }, [savedPerms]);

  const savePerms = useMutation({
    mutationFn: () => teams.updatePermissions(orgId, teamId, perms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', orgId, teamId, 'permissions'] });
      toast.add(t('permissionsSaved'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  const toggle = (key: string, val: boolean) => setPerms((prev) => ({ ...prev, [key]: val }));

  if (!isAuthenticated) return null;
  if (teamLoading || permsLoading) return <div className="flex justify-center pt-16"><Spinner size={24} /></div>;

  const designFilesRows: PermRow[] = [
    { key: 'viewFiles', label: t('permViewFiles'), desc: t('permViewFilesDesc') },
    { key: 'editFiles', label: t('permEditFiles'), desc: t('permEditFilesDesc') },
    { key: 'deleteFiles', label: t('permDeleteFiles'), desc: t('permDeleteFilesDesc') },
    { key: 'uploadFiles', label: t('permUploadFiles'), desc: t('permUploadFilesDesc') },
  ];

  const commentsRows: PermRow[] = [
    { key: 'addComments', label: t('permAddComments'), desc: t('permAddCommentsDesc') },
    { key: 'deleteComments', label: t('permDeleteComments'), desc: t('permDeleteCommentsDesc') },
    { key: 'resolveComments', label: t('permResolveComments'), desc: t('permResolveCommentsDesc') },
  ];

  const teamMgmtRows: PermRow[] = [
    { key: 'inviteMembers', label: t('permInviteMembers'), desc: t('permInviteMembersDesc') },
    { key: 'removeMembers', label: t('permRemoveMembers'), desc: t('permRemoveMembersDesc') },
    { key: 'changeRoles', label: t('permChangeRoles'), desc: t('permChangeRolesDesc') },
  ];

  return (
    <div className="flex flex-col gap-6 px-10 py-8">
      <Breadcrumb
        homeHref="/"
        items={[
          { label: tc('admin'), href: lp(`/org/${orgId}/overview`) },
          { label: t('title'), href: lp(`/org/${orgId}/teams`) },
          { label: team?.name ?? '', href: lp(`/org/${orgId}/teams/${teamId}`) },
          { label: t('teamPermissions') },
        ]}
      />

      <PageHeader title={t('teamPermissions')} subtitle={t('teamPermissionsSubtitle')} />

      <div className="flex flex-col gap-6">
        <PermissionSection title={t('permDesignFiles')} rows={designFilesRows} values={perms} onToggle={toggle} />
        <PermissionSection title={t('permComments')} rows={commentsRows} values={perms} onToggle={toggle} />
        <PermissionSection title={t('permTeamManagement')} rows={teamMgmtRows} values={perms} onToggle={toggle} />

        <div className="flex justify-end">
          <Button onClick={() => savePerms.mutate()} disabled={savePerms.isPending}>
            {savePerms.isPending ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      </div>
    </div>
  );
}
