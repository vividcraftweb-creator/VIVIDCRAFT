import { redirect } from 'next/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const queryString = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        queryString.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => queryString.append(key, v));
      }
    });
  }

  const query = queryString.toString();
  redirect(`/auth/login${query ? `?${query}` : ''}`);
}
