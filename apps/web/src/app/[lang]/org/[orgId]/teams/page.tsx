'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/components/dictionary-provider';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useLocalePath } from '@/hooks/use-locale-path';
import { teams, orgs } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { SearchInput } from '@/components/ui/search-input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { Plus, Users, Check } from 'lucide-react';
import Link from 'next/link';

const ACCENT_COLORS = [
  'var(--color-accent-indigo)',
  'var(--color-accent-teal)',
  'var(--color-accent-pink)',
  'var(--color-primary)',
  'var(--color-warning)',
  'var(--color-error)',
];

const AVATAR_COLORS = [
  'var(--color-primary)',
  'var(--color-accent-teal)',
  'var(--color-accent-pink)',
  'var(--color-accent-indigo)',
  'var(--color-success)',
];

const LABELS = {
  projectCount: '{count} projects',
} as const;

function formatProjectCount(count: number) {
  return LABELS.projectCount.replace('{count}', String(count));
}

export default function TeamsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const { isAuthenticated } = useAuthGuard();
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useT('teams');
  const tc = useT('common');
  const lp = useLocalePath();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLead, setNewLead] = useState('');

  const { data: teamList = [], isLoading } = useQuery({
    queryKey: ['teams', orgId],
    queryFn: () => teams.list(orgId),
    enabled: isAuthenticated,
  });

  const { data: org } = useQuery({
    queryKey: ['org', orgId],
    queryFn: () => orgs.get(orgId),
    enabled: isAuthenticated && showCreate,
  });

  const createTeam = useMutation({
    mutationFn: () => teams.create(orgId, { name: newName, description: newDesc, leadId: newLead || undefined }),
    onSuccess: (team: any) => {
      queryClient.invalidateQueries({ queryKey: ['teams', orgId] });
      closeCreate();
      toast.add(t('teamCreated', { name: team.name }), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  function closeCreate() {
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    setNewLead('');
  }

  useEffect(() => {
    if (!showCreate) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeCreate(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showCreate]);

  const filtered = teamList.filter((team: any) =>
    team.name?.toLowerCase().includes(search.toLowerCase()),
  );

  if (!isAuthenticated) return null;

  const hasTeams = !isLoading && teamList.length > 0;
  const isEmpty = !isLoading && teamList.length === 0;

  return (
    <div className="flex h-full flex-col gap-6 px-10 py-8">
      <Breadcrumb homeHref="/" items={[{ label: tc('admin') }, { label: t('title') }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[28px] font-semibold tracking-tight text-foreground">
            {t('title')}
          </h1>
          {!hasTeams && (
            <p className="m-0 font-sans text-sm text-foreground-secondary">
              {t('subtitle')}
            </p>
          )}
        </div>
        {hasTeams && (
          <div className="flex shrink-0 items-center gap-3">
            <SearchInput
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> {t('createTeam')}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center pt-16"><Spinner size={24} /></div>
      ) : isEmpty || (filtered.length === 0 && search) ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface">
            <Users size={32} className="text-foreground-muted" />
          </div>
          <h2 className="m-0 font-display text-xl font-semibold text-foreground">
            {search ? t('noTeamsFound') : t('noTeamsYet')}
          </h2>
          <p className="m-0 w-[400px] max-w-full text-center font-sans text-sm text-foreground-secondary">
            {search ? t('searchEmpty') : t('noTeamsYetDesc')}
          </p>
          {!search && (
            <Button onClick={() => setShowCreate(true)}>
              {t('createFirstTeam')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {filtered.map((team: any, i: number) => (
            <Link
              key={team.id}
              href={lp(`/org/${orgId}/teams/${team.id}`)}
              className="no-underline"
            >
              <Card padding="none" className="overflow-hidden transition hover:shadow-md">
                <div className="h-1" style={{ backgroundColor: ACCENT_COLORS[i % ACCENT_COLORS.length] }} />
                <div className="flex flex-col gap-3 p-5">
                  <h3 className="m-0 font-sans text-base font-semibold text-foreground">
                    {team.name}
                  </h3>
                  <p className="m-0 font-sans text-sm text-foreground-secondary">
                    {team.description ?? tc('noDescription')}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex">
                      {Array.from({ length: Math.min(team.memberCount ?? 0, 4) }).map((_, j) => (
                        <div
                          key={j}
                          className={`flex h-7 w-7 items-center justify-center rounded-full shadow-[0_0_0_2px_var(--color-card)] ${j > 0 ? '-ml-2' : ''}`}
                          style={{ backgroundColor: AVATAR_COLORS[j % AVATAR_COLORS.length] }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-sans text-xs text-foreground-muted">
                        {formatProjectCount(team.projectCount ?? 0)}
                      </span>
                      <Badge variant={team.role === 'admin' ? 'primary' : team.role === 'member' ? 'success' : 'default'}>
                        {team.role ?? 'Viewer'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Team Popup */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-overlay" onClick={closeCreate} />
          <div className="relative w-[520px] rounded-xl bg-card p-8 shadow-dialog">
            <div className="mb-6 flex flex-col gap-1.5">
              <h2 className="m-0 font-display text-[22px] font-semibold text-foreground">
                {t('createTitle')}
              </h2>
              <p className="m-0 font-sans text-sm text-foreground-secondary">
                {t('createSubtitle')}
              </p>
            </div>
            <div className="flex flex-col gap-5">
              <Input
                label={t('teamName')}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('teamNamePlaceholder')}
                autoFocus
              />
              <Textarea
                label={t('description')}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={4}
              />
              <Select
                label={t('teamLead')}
                value={newLead}
                onChange={(e) => setNewLead(e.target.value)}
                placeholder={t('teamLeadPlaceholder')}
                options={(org?.members ?? []).map((m: any) => ({ value: m.id, label: m.name }))}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeCreate}>
                {tc('cancel')}
              </Button>
              <Button
                onClick={() => { if (newName.trim()) createTeam.mutate(); }}
                disabled={!newName.trim() || createTeam.isPending}
              >
                <Check size={16} /> {tc('save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
