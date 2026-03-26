'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';
import { orgs, projects } from '@/lib/api';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useAuth } from '@/stores/auth';
import { Spinner } from '@/components/ui/spinner';
import {
  Briefcase,
  FileText,
  Users,
  MessageCircle,
  Upload,
  FolderOpen,
} from 'lucide-react';

export default function OverviewPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const { isAuthenticated } = useAuthGuard();
  const { user } = useAuth();
  const t = useT('overview');
  const lp = useLocalePath();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['org-stats', orgId],
    queryFn: () => orgs.stats(orgId),
    enabled: isAuthenticated,
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['org-activity', orgId],
    queryFn: () => orgs.activity(orgId, 10),
    enabled: isAuthenticated,
  });

  const { data: projectList = [] } = useQuery({
    queryKey: ['projects', orgId],
    queryFn: () => projects.list(orgId),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          {t('welcomeUser', { name: user?.name?.split(' ')[0] ?? 'there' })}
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          {t('subtitle')}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={Briefcase} iconColor="text-primary" label={t('projects')} value={stats?.projectCount ?? 0} />
            <StatCard icon={FileText} iconColor="text-accent-teal" label={t('files')} value={stats?.fileCount ?? 0} />
            <StatCard icon={Users} iconColor="text-accent-indigo" label={t('teamMembers')} value={stats?.memberCount ?? 0} />
            <StatCard icon={MessageCircle} iconColor="text-accent-pink" label={t('comments')} value={stats?.commentCount ?? 0} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-lg font-semibold text-foreground">{t('recentActivity')}</h2>
              {activity.length === 0 ? (
                <p className="text-sm text-foreground-muted">{t('noActivity')}</p>
              ) : (
                activity.slice(0, 4).map((item: any, i: number) => {
                  const colors = ['text-accent-pink', 'text-accent-teal', 'text-accent-indigo', 'text-primary'];
                  return (
                    <ActivityItem
                      key={i}
                      icon={item.type === 'comment' ? MessageCircle : Upload}
                      iconColor={colors[i % colors.length]}
                      text={
                        item.type === 'comment'
                          ? t('commentedOn', { user: item.userName, file: item.fileName })
                          : t('uploadedVersion', { user: item.userName, version: item.versionNumber, file: item.fileName })
                      }
                      time={formatRelative(item.timestamp)}
                    />
                  );
                })
              )}
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="font-display text-lg font-semibold text-foreground">{t('recentProjects')}</h2>
              {projectList.length === 0 ? (
                <p className="text-sm text-foreground-muted">{t('noProjects')}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {projectList.slice(0, 3).map((project: any) => (
                    <Link
                      key={project.id}
                      href={lp(`/projects/${project.id}`)}
                      className="group block overflow-hidden rounded-lg bg-card inset-shadow-border transition hover:inset-shadow-border hover:shadow-md"
                    >
                      <div className="flex h-[120px] items-center justify-center bg-gradient-to-br from-primary-light to-surface">
                        <FolderOpen size={28} className="text-primary/40" />
                      </div>
                      <div className="px-4 py-3">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">{project.name}</p>
                        <p className="mt-1 text-xs text-foreground-muted">
                          Updated {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, label, value }: {
  icon: any; iconColor: string; label: string; value: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-card p-5 inset-shadow-border">
      <Icon size={18} className={iconColor} />
      <p className="font-display text-[28px] font-bold text-foreground">{value}</p>
      <p className="text-[13px] text-foreground-secondary">{label}</p>
    </div>
  );
}

function ActivityItem({ icon: Icon, iconColor, text, time }: {
  icon: any; iconColor: string; text: React.ReactNode; time: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-card px-4 py-3 inset-shadow-border">
      <Icon size={18} className={`shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{text}</p>
        <p className="mt-0.5 text-xs text-foreground-muted">{time}</p>
      </div>
    </div>
  );
}

function formatRelative(dateStr: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} minutes ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString();
}
