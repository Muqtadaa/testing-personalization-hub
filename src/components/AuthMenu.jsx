'use client';

// Signed-in identity + sign-out control for the nav. Also bridges the Supabase
// session into the existing localStorage identity (storeAuthedUser) so the
// intake/drafts tools adopt the signed-in user without a second prompt.
// Renders nothing when auth isn't configured or no one is signed in (e.g. /login).

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { authConfigured } from '@/lib/supabase/env';
import { clearAuthedUser, storeAuthedUser } from '@/lib/intake/auth';
import { nameFromEmail } from '@/lib/auth/displayName';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal';

function nameFromUser(user) {
  return (
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    nameFromEmail(user.email)
  );
}

export default function AuthMenu({ variant = 'desktop' }) {
  const [email, setEmail] = useState(null);

  useEffect(() => {
    if (!authConfigured()) return;
    const supabase = createClient();
    const sync = (user) => {
      if (user?.email) {
        setEmail(user.email);
        storeAuthedUser({ name: nameFromUser(user), email: user.email });
      } else {
        setEmail(null);
        clearAuthedUser();
      }
    };
    supabase.auth.getUser().then(({ data }) => sync(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      sync(session?.user ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!email) return null;

  if (variant === 'mobile') {
    return (
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-charcoal-alt pt-3">
        <span className="text-caption text-on-dark-muted truncate" title={email}>
          {email}
        </span>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium text-on-dark/85 hover:bg-charcoal-alt hover:text-lime ${FOCUS}`}
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="ml-2 flex items-center gap-2 border-l border-charcoal-alt pl-3">
      <span
        className="hidden lg:inline max-w-[180px] truncate text-caption text-on-dark-muted"
        title={email}
      >
        {email}
      </span>
      <form action="/api/auth/signout" method="post">
        <button
          type="submit"
          className={`rounded-md px-3 py-2 text-body-sm font-medium text-on-dark/85 transition hover:bg-charcoal-alt hover:text-lime ${FOCUS}`}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
