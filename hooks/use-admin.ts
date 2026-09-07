import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export function useAdminSession() {
  const [state, setState] = useState<{
    loading: boolean;
    email: string | null;
    isAdmin: boolean;
  }>({ loading: true, email: null, isAdmin: false });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        if (active) setState({ loading: false, email: null, isAdmin: false });
        return;
      }
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (active)
        setState({ loading: false, email: user.email ?? null, isAdmin: Boolean(isAdmin) });
    };
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void load();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
