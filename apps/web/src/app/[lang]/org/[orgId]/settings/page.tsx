'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import { orgs as orgsApi } from '@/lib/api';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useLocalePath } from '@/hooks/use-locale-path';
import { useT } from '@/components/dictionary-provider';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SettingsSection } from '@/components/settings-section';

export default function OrgSettingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const { isAuthenticated } = useAuthGuard();
  const router = useRouter();
  const lp = useLocalePath();
  const t = useT('orgSettings');
  const tc = useT('common');
  const toast = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: org } = useQuery({
    queryKey: ['org', orgId],
    queryFn: () => orgsApi.get(orgId),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (org) {
      setName(org.name ?? '');
      setDescription(org.description ?? '');
    }
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: () => orgsApi.update(orgId, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId] });
      queryClient.invalidateQueries({ queryKey: ['orgs'] });
      toast.add(t('changesSaved'), 'success');
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => orgsApi.delete(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs'] });
      router.push(lp('/'));
    },
    onError: (err: any) => toast.add(err.message, 'error'),
  });

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col gap-8 p-10">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* General */}
      <SettingsSection title={t('general')}>
        <div className="flex flex-col gap-4">
          <Input
            id="org-name"
            label={t('organizationName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            id="org-description"
            label={t('description')}
            placeholder={t('descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !name.trim()}
            >
              {updateMutation.isPending ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* Branding */}
      <SettingsSection title={t('branding')}>
        <div className="flex flex-col gap-3">
          <p className="font-sans text-[13px] font-medium text-foreground">{t('organizationLogo')}</p>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-surface inset-shadow-border">
              <ImagePlus size={24} className="text-foreground-muted" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-sans text-sm text-foreground">{t('logoHint')}</p>
              <p className="font-sans text-xs text-foreground-muted">{t('logoFormat')}</p>
              <Button variant="secondary" size="sm" className="mt-1 w-fit" onClick={() => toast.add(tc('underDevelopmentDesc'), 'info')}>
                {t('saveChanges')}
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection title={t('dangerZone')} danger>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="font-sans text-sm font-semibold text-foreground">{t('deleteOrg')}</p>
            <p className="font-sans text-sm text-foreground-secondary">{t('deleteOrgDesc')}</p>
          </div>
          <Button
            variant="danger"
            size="sm"
            className="shrink-0"
            onClick={() => setConfirmDelete(true)}
          >
            {t('deleteOrgBtn')}
          </Button>
        </div>
      </SettingsSection>

      {confirmDelete && (
        <ConfirmDialog
          title={t('deleteOrgConfirmTitle')}
          description={t('deleteOrgConfirmDesc')}
          confirmLabel={t('deleteOrgBtn')}
          onConfirm={() => { setConfirmDelete(false); deleteMutation.mutate(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
