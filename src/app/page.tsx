import { redirect } from 'next/navigation';

// Root route redirects to login.
// Authenticated users will be sent to /dashboard from the login page
// once the session check completes.
export default function RootPage() {
  redirect('/login');
}
