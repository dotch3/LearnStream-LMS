import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import en from '../../messages/en.json';
import pt from '../../messages/pt.json';

const messages = { en, pt } as const;
const SUPPORTED = Object.keys(messages);

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = raw && SUPPORTED.includes(raw) ? raw : 'en';

  return {
    locale,
    messages: messages[locale as keyof typeof messages],
  };
});
