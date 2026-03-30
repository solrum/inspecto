'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/dictionary-provider';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useLocalePath } from '@/hooks/use-locale-path';
import { teams } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';

export default function EditTeamPage({
  params,
}: {
  params: Promise<{ orgId: string; teamId: string }>;
}) {
  const { orgId, teamId } = use(params);
  const { isAuthenticated } = useAuthGuard();
  const queryClient = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  const t = useT('teams');
  const tc = useT('common');
  const lp = useLocalePath();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamLead, setTeamLead] = useState('');

  const { data: team, isLoading } = useQuery({
    queryKey: ['teams', orgId, teamId],
    queryFn: () => teams.get(orgId, teamId),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (team) {
      setName(team.name ?? '');
      setDescription(team.description ?? '');
      setTeamLead(team.leadId ?? '');
    }
  }, [team]);

  const updateTeam = useMutation({
    mutationFn: () => teams.update(orgId, teamId, { name, description, leadId: teamLead || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', orgId, teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams', orgId] });
      toast.add(t('teamUpdated'), 'success');
      router.push(lp(`/org/${orgId}/teams/${teamId}`));
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  if (!isAuthenticated) return null;
  if (isLoading) return <div className="flex justify-center pt-16"><Spinner size={24} /></div>;

  const members = team?.members ?? [];
  const memberOptions = members.map((m: any) => ({ value: m.id, label: m.name }));

  return (
    <div className="flex flex-col gap-6 px-10 py-8">
      <Breadcrumb
        homeHref="/"
        items={[
          { label: tc('admin'), href: lp(`/org/${orgId}/overview`) },
          { label: t('title'), href: lp(`/org/${orgId}/teams`) },
          { label: team?.name ?? '', href: lp(`/org/${orgId}/teams/${teamId}`) },
          { label: t('editTeam') },
        ]}
      />

      <PageHeader title={t('editTeam')} subtitle={t('editTeamSubtitle')} />

      <Card>
        <div className="flex flex-col gap-5">
          <Input
            label={t('teamName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('teamNamePlaceholder')}
          />
          <Textarea
            label={t('description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            rows={5}
          />
          <Select
            label={t('teamLead')}
            value={teamLead}
            onChange={(e) => setTeamLead(e.target.value)}
            placeholder={t('teamLeadPlaceholder')}
            options={memberOptions}
          />

          <div className="h-px bg-border" />

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push(lp(`/org/${orgId}/teams/${teamId}`))}
            >
              {tc('cancel')}
            </Button>
            <Button
              onClick={() => { if (name.trim()) updateTeam.mutate(); }}
              disabled={!name.trim() || updateTeam.isPending}
            >
              {t('saveChanges')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
