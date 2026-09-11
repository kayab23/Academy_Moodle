import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale && ['es', 'en'].includes(cookieLocale) ? cookieLocale : 'es';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
