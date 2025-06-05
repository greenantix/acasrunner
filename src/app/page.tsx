import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
  // The redirect function should be sufficient, but Next.js might require a returned component.
  // Return null or a simple loading state if necessary.
  return null;
}
