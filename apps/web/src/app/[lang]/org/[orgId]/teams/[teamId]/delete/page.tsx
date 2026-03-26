'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/dictionary-provider';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useLocalePath } from '@/hooks/use-locale-path';
import { teams } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { TriangleAlert, Trash2 } from 'lucide-react';

export default function DeleteTeamPage({
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

  const [confirmText, setConfirmText] = useState('');

  const { data: team, isLoading } = useQuery({
    queryKey: ['teams', orgId, teamId],
    queryFn: () => teams.get(orgId, teamId),
    enabled: isAuthenticated,
  });

  const deleteTeam = useMutation({
    mutationFn: () => teams.remove(orgId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', orgId] });
      toast.add(t('teamDeleted', { name: team?.name ?? '' }), 'success');
      router.push(lp(`/org/${orgId}/teams`));
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  if (!isAuthenticated) return null;
  if (isLoading) return <div className="flex justify-center pt-16"><Spinner size={24} /></div>;

  const teamName = team?.name ?? '';
  const canConfirm = confirmText === teamName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-overlay"
        onClick={() => router.push(lp(`/org/${orgId}/teams/${teamId}`))}
      />
      <div className="relative w-[480px] rounded-xl bg-card shadow-dialog">
        {/* Icon */}
        <div className="flex justify-center px-8 pt-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-light">
            <TriangleAlert size={28} className="text-error" />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2 px-8 pt-5">
          <h2 className="m-0 font-display text-xl font-semibold text-foreground">
            {t('deleteTeamTitle')}
          </h2>
          <p className="m-0 text-center font-sans text-sm leading-relaxed text-foreground-secondary">
            {t('deleteTeamDesc', { name: teamName })}
          </p>
        </div>

        {/* Confirm input */}
        <div className="flex flex-col gap-2 px-8 pt-4">
          <label className="font-sans text-[13px] text-foreground-secondary">
            {t('deleteTeamConfirmLabel', { name: teamName })}
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={teamName}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-8 pb-8 pt-5">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => router.push(lp(`/org/${orgId}/teams/${teamId}`))}
          >
            {tc('cancel')}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={!canConfirm || deleteTeam.isPending}
            onClick={() => deleteTeam.mutate()}
          >
            <Trash2 size={16} /> {t('deleteTeam')}
          </Button>
        </div>
      </div>
    </div>
  );
}
