"use client";

import { useEffect, useState } from "react";
import { SiteHeaderClient } from "@/components/site-header-client";
import { createClient } from "@/lib/supabase/client";

export function SiteHeader() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (active) setIsAdmin(profile?.role === "admin");
    }

    void loadRole();
    return () => {
      active = false;
    };
  }, []);

  return <SiteHeaderClient isAdmin={isAdmin} />;
}
