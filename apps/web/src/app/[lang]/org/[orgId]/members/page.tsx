'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/components/dictionary-provider';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { orgs, teams as teamsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { EditRoleModal } from '@/components/edit-role-modal';
import { MemberProfileModal } from '@/components/member-profile-modal';
import { UserPlus, Ellipsis, Pencil, User, Trash2 } from 'lucide-react';

const ROLE_VARIANT: Record<string, 'primary' | 'success' | 'default'> = {
  admin: 'primary',
  member: 'success',
  viewer: 'default',
};

export default function MembersPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const { isAuthenticated } = useAuthGuard();
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useT('members');
  const tc = useT('common');

  const [removingMember, setRemovingMember] = useState<any>(null);
  const [editingRoleMember, setEditingRoleMember] = useState<any>(null);
  const [viewingProfile, setViewingProfile] = useState<any>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteTeam, setInviteTeam] = useState('');

  const { data: org, isLoading } = useQuery({
    queryKey: ['org', orgId],
    queryFn: () => orgs.get(orgId),
    enabled: isAuthenticated,
  });

  const { data: teamList = [] } = useQuery({
    queryKey: ['teams', orgId],
    queryFn: () => teamsApi.list(orgId),
    enabled: isAuthenticated && showInvite,
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      orgs.updateRole(orgId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId] });
      setEditingRoleMember(null);
      toast.add(t('roleUpdated'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  const inviteMember = useMutation({
    mutationFn: () => orgs.invite(orgId, inviteEmail, {
      role: inviteRole !== 'member' ? inviteRole : undefined,
      teamId: inviteTeam || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId] });
      setShowInvite(false);
      setInviteEmail('');
      setInviteRole('member');
      setInviteTeam('');
      toast.add(t('memberInvited'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => orgs.removeMember(orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId] });
      setRemovingMember(null);
      toast.add(t('memberRemoved'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  if (!isAuthenticated) return null;

  const members = org?.members ?? [];

  const roleOptions = [
    { value: 'admin', label: t('roleAdmin') },
    { value: 'member', label: t('roleMember') },
    { value: 'viewer', label: t('roleViewer') },
  ];

  const teamOptions = teamList.map((team: any) => ({
    value: team.id,
    label: team.name,
  }));

  const columns: DataTableColumn<any>[] = [
    {
      key: 'name',
      header: t('colName'),
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={m.name} imageUrl={m.avatarUrl} size="md" />
          <span className="font-sans text-[13px] font-medium text-foreground">{m.name}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('colRole'),
      render: (m) => (
        <Badge variant={ROLE_VARIANT[m.role] ?? 'default'}>{m.role}</Badge>
      ),
    },
    {
      key: 'email',
      header: t('colEmail'),
      render: (m) => (
        <span className="font-sans text-[13px] text-foreground-secondary">{m.email}</span>
      ),
    },
    {
      key: 'joined',
      header: t('colJoined'),
      render: (m) => (
        <span className="font-sans text-[13px] text-foreground-secondary">
          {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('colActions'),
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
              { key: 'edit-role', label: t('editRole'), icon: Pencil, onClick: () => setEditingRoleMember(m) },
              { key: 'view-profile', label: t('viewProfile'), icon: User, onClick: () => setViewingProfile(m) },
              { key: 'divider', type: 'divider' as const },
              { key: 'remove', label: t('removeMember'), icon: Trash2, danger: true, onClick: () => setRemovingMember(m) },
            ]}
          />
        </div>
      ),
    },
  ];

  function closeInvite() {
    setShowInvite(false);
    setInviteEmail('');
    setInviteRole('member');
    setInviteTeam('');
  }

  return (
    <div className="flex h-full flex-col gap-6 px-10 py-8">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus size={16} /> {t('inviteMember')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center pt-16"><Spinner size={24} /></div>
      ) : members.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface">
            <UserPlus size={32} className="text-foreground-muted" />
          </div>
          <h2 className="m-0 font-display text-xl font-semibold text-foreground">
            {t('noMembersYet')}
          </h2>
          <p className="m-0 w-[400px] max-w-full text-center font-sans text-sm text-foreground-secondary">
            {t('noMembersYetDesc')}
          </p>
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus size={16} /> {t('inviteFirstMember')}
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={members}
          rowKey={(m) => m.id ?? m.email}
        />
      )}

      {/* Invite Member Popup */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-overlay" onClick={closeInvite} />
          <div className="relative w-[520px] rounded-xl bg-card p-8 shadow-dialog">
            <div className="mb-6 flex flex-col gap-1.5">
              <h2 className="m-0 font-display text-[22px] font-semibold text-foreground">
                {t('inviteTitle')}
              </h2>
              <p className="m-0 font-sans text-sm text-foreground-secondary">
                {t('inviteSubtitle')}
              </p>
            </div>
            <div className="flex flex-col gap-5">
              <Input
                label={t('emailAddress')}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t('emailAddressPlaceholder')}
                autoFocus
              />
              <Select
                label={t('role')}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                options={roleOptions}
              />
              <Select
                label={t('teamAssignment')}
                value={inviteTeam}
                onChange={(e) => setInviteTeam(e.target.value)}
                placeholder={t('teamAssignmentPlaceholder')}
                options={teamOptions}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeInvite}>
                {tc('cancel')}
              </Button>
              <Button
                onClick={() => { if (inviteEmail.trim()) inviteMember.mutate(); }}
                disabled={!inviteEmail.trim() || inviteMember.isPending}
              >
                <UserPlus size={16} /> {t('sendInvite')}
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
          isPending={updateRole.isPending}
          title={t('editRoleTitle')}
          subtitle={t('editRoleSubtitle', { name: editingRoleMember.name })}
          saveLabel={t('saveRole')}
          cancelLabel={tc('cancel')}
          roleLabel={t('selectRole')}
          onSave={(role) => updateRole.mutate({ userId: editingRoleMember.id, role })}
          onCancel={() => setEditingRoleMember(null)}
        />
      )}

      {/* View Profile Modal */}
      {viewingProfile && (
        <MemberProfileModal
          member={viewingProfile}
          title={t('viewProfileTitle')}
          joinedLabel={t('joined')}
          closeLabel={tc('close')}
          onClose={() => setViewingProfile(null)}
        />
      )}

      {/* Remove Member Confirm */}
      {removingMember && (
        <ConfirmDialog
          title={t('removeMemberTitle')}
          description={t('removeMemberDesc', { name: removingMember.name })}
          confirmLabel={t('removeMember')}
          cancelLabel={tc('cancel')}
          onConfirm={() => removeMember.mutate(removingMember.id)}
          onCancel={() => setRemovingMember(null)}
        />
      )}
    </div>
  );
}
