'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/components/dictionary-provider';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useLocalePath } from '@/hooks/use-locale-path';
import { orgs, teams } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PageHeader } from '@/components/ui/page-header';
import { UnderlineTabs } from '@/components/ui/underline-tabs';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { EditRoleModal } from '@/components/edit-role-modal';
import { MemberProfileModal } from '@/components/member-profile-modal';
import { Settings, UserPlus, Ellipsis, Pencil, User, Trash2, Shield, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ROLE_VARIANT: Record<string, 'primary' | 'success' | 'default'> = {
  admin: 'primary',
  member: 'success',
  viewer: 'default',
};

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; teamId: string }>;
}) {
  const { orgId, teamId } = use(params);
  const { isAuthenticated } = useAuthGuard();
  const toast = useToast();
  const t = useT('teams');
  const tm = useT('members');
  const tc = useT('common');
  const lp = useLocalePath();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('members');
  const [removingMember, setRemovingMember] = useState<any>(null);
  const [editingRoleMember, setEditingRoleMember] = useState<any>(null);
  const [viewingProfile, setViewingProfile] = useState<any>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  const { data: team, isLoading } = useQuery({
    queryKey: ['teams', orgId, teamId],
    queryFn: () => teams.get(orgId, teamId),
    enabled: isAuthenticated,
  });

  const { data: org } = useQuery({
    queryKey: ['org', orgId],
    queryFn: () => orgs.get(orgId),
    enabled: isAuthenticated && showAddMember,
  });

  const updateMemberRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      teams.updateMemberRole(orgId, teamId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', orgId, teamId] });
      setEditingRoleMember(null);
      toast.add(tm('roleUpdated'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  const addMember = useMutation({
    mutationFn: () => teams.addMember(orgId, teamId, selectedUserId, selectedRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', orgId, teamId] });
      setShowAddMember(false);
      setSelectedUserId('');
      setSelectedRole('member');
      toast.add(t('memberAdded'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => teams.removeMember(orgId, teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', orgId, teamId] });
      setRemovingMember(null);
      toast.add(tm('memberRemoved'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  if (!isAuthenticated) return null;
  if (isLoading) return <div className="flex justify-center pt-16"><Spinner size={24} /></div>;

  const members = team?.members ?? [];
  const orgMembers = org?.members ?? [];
  const teamMemberIds = new Set(members.map((m: any) => m.id));
  const availableMembers = orgMembers.filter((m: any) => !teamMemberIds.has(m.id));

  const tabs = [
    { key: 'members', label: t('tabMembers') },
    { key: 'projects', label: t('tabProjects') },
    { key: 'activity', label: t('tabActivity') },
  ];

  const roleOptions = [
    { value: 'admin', label: tm('roleAdmin') },
    { value: 'member', label: tm('roleMember') },
    { value: 'viewer', label: tm('roleViewer') },
  ];

  const memberColumns: DataTableColumn<any>[] = [
    {
      key: 'name',
      header: tm('colName'),
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={m.name} imageUrl={m.avatarUrl} size="md" />
          <span className="font-sans text-[13px] font-medium text-foreground">{m.name}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: tm('colRole'),
      render: (m) => (
        <Badge variant={ROLE_VARIANT[m.role] ?? 'default'}>{m.role}</Badge>
      ),
    },
    {
      key: 'email',
      header: tm('colEmail'),
      render: (m) => (
        <span className="font-sans text-[13px] text-foreground-secondary">{m.email}</span>
      ),
    },
    {
      key: 'joined',
      header: tm('colJoined'),
      render: (m) => (
        <span className="font-sans text-[13px] text-foreground-secondary">
          {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: tm('colActions'),
      width: 60,
      headerClassName: 'text-center',
      render: (m) => (
        <div className="flex justify-center">
          <DropdownMenu
            trigger={
              <button className="cursor-pointer rounded-md border-none bg-transparent p-1 text-foreground-secondary hover:text-foreground">
                <Ellipsis size={18} />
              </button>
            }
            items={[
              { key: 'edit-role', label: tm('editRole'), icon: Pencil, onClick: () => setEditingRoleMember(m) },
              { key: 'view-profile', label: tm('viewProfile'), icon: User, onClick: () => setViewingProfile(m) },
              { key: 'divider', type: 'divider' as const },
              { key: 'remove', label: tm('removeMember'), icon: Trash2, danger: true, onClick: () => setRemovingMember(m) },
            ]}
          />
        </div>
      ),
    },
  ];

  const settingsItems = [
    { key: 'edit', label: t('editTeam'), icon: Pencil, onClick: () => router.push(lp(`/org/${orgId}/teams/${teamId}/edit`)) },
    { key: 'permissions', label: t('teamPermissions'), icon: Shield, onClick: () => router.push(lp(`/org/${orgId}/teams/${teamId}/permissions`)) },
    { key: 'notifications', label: t('notifications'), icon: Bell, onClick: () => router.push(lp(`/org/${orgId}/teams/${teamId}/notifications`)) },
    { key: 'divider', type: 'divider' as const },
    { key: 'delete', label: t('deleteTeam'), icon: Trash2, danger: true, onClick: () => router.push(lp(`/org/${orgId}/teams/${teamId}/delete`)) },
  ];

  return (
    <div className="flex flex-col gap-6 px-10 py-8">
      <Breadcrumb
        homeHref="/"
        items={[
          { label: tc('admin'), href: lp(`/org/${orgId}/overview`) },
          { label: t('title'), href: lp(`/org/${orgId}/teams`) },
          { label: team?.name ?? '' },
        ]}
      />

      <PageHeader
        title={team?.name ?? ''}
        subtitle={t('createdInfo', {
          count: members.length,
          date: team?.createdAt
            ? new Date(team.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '',
        })}
        action={
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAddMember(true)}>
              <UserPlus size={16} /> {t('addMember')}
            </Button>
            <DropdownMenu
              trigger={
                <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border-none bg-transparent inset-shadow-border text-foreground-secondary hover:text-foreground">
                  <Settings size={18} />
                </button>
              }
              items={settingsItems}
            />
          </div>
        }
      />

      <UnderlineTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'members' && (
        <DataTable
          columns={memberColumns}
          data={members}
          rowKey={(m) => m.id ?? m.email}
        />
      )}

      {/* Add Member Popup */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-overlay" onClick={() => { setShowAddMember(false); setSelectedUserId(''); }} />
          <div className="relative w-[480px] rounded-xl bg-card p-8 shadow-dialog">
            <div className="mb-6 flex flex-col gap-1.5">
              <h2 className="m-0 font-display text-xl font-semibold text-foreground">
                {t('addMemberTitle')}
              </h2>
              <p className="m-0 font-sans text-sm text-foreground-secondary">
                {t('addMemberSubtitle')}
              </p>
            </div>
            <div className="flex flex-col gap-5">
              <Select
                label={t('selectMember')}
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                placeholder={t('selectMemberPlaceholder')}
                options={availableMembers.map((m: any) => ({
                  value: m.id,
                  label: `${m.name} (${m.email})`,
                }))}
              />
              <Select
                label={t('memberRole')}
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                options={roleOptions}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowAddMember(false); setSelectedUserId(''); }}>
                {tc('cancel')}
              </Button>
              <Button
                onClick={() => { if (selectedUserId) addMember.mutate(); }}
                disabled={!selectedUserId || addMember.isPending}
              >
                <UserPlus size={16} /> {t('addToTeam')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingRoleMember && (
        <EditRoleModal
          member={editingRoleMember}
          roleOptions={roleOptions}
          isPending={updateMemberRole.isPending}
          title={tm('editRoleTitle')}
          subtitle={tm('editRoleSubtitle', { name: editingRoleMember.name })}
          saveLabel={tm('saveRole')}
          cancelLabel={tc('cancel')}
          roleLabel={tm('selectRole')}
          onSave={(role) => updateMemberRole.mutate({ userId: editingRoleMember.id, role })}
          onCancel={() => setEditingRoleMember(null)}
        />
      )}

      {/* View Profile Modal */}
      {viewingProfile && (
        <MemberProfileModal
          member={viewingProfile}
          title={tm('viewProfileTitle')}
          joinedLabel={tm('joined')}
          closeLabel={tc('close')}
          onClose={() => setViewingProfile(null)}
        />
      )}

      {/* Remove Member Confirm */}
      {removingMember && (
        <ConfirmDialog
          title={tm('removeMemberTitle')}
          description={tm('removeMemberDesc', { name: removingMember.name })}
          confirmLabel={tm('removeMember')}
          cancelLabel={tc('cancel')}
          onConfirm={() => removeMember.mutate(removingMember.id)}
          onCancel={() => setRemovingMember(null)}
        />
      )}
    </div>
  );
}
