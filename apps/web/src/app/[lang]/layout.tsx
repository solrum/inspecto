import { notFound } from 'next/navigation';
import { getDictionary, hasLocale } from './dictionaries';
import { DictionaryProvider } from '@/components/dictionary-provider';

export async function generateStaticParams() {
  return [{ lang: 'en' }];
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dictionary = await getDictionary(lang);

  return (
    <DictionaryProvider dictionary={dictionary}>
      {children}
    </DictionaryProvider>
  );
}
