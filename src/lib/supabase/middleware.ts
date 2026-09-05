import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || null;
}

function threatReason(request: NextRequest) {
  const target = `${request.nextUrl.pathname}?${request.nextUrl.search}`.toLowerCase();
  const decoded = (() => {
    try {
      return decodeURIComponent(target);
    } catch {
      return target;
    }
  })();

  if (/<\s*script|javascript\s*:|on(?:error|load|click)\s*=|<\s*iframe/i.test(decoded)) return "xss_payload";
  if (/(?:union\s+select|select\s+.+\s+from|insert\s+into|drop\s+(?:table|database)|update\s+.+\s+set|delete\s+from|--|\/\*)/i.test(decoded)) return "sql_injection_payload";
  if (/(?:\.\.\/|\.\.\\|%2e%2e|wp-admin|phpmyadmin|xmlrpc\.php|\.env(?:\.|$))/i.test(decoded)) return "path_traversal_or_scanner";
  return null;
}

async function reportThreat(request: NextRequest, userId: string | null, ip: string | null, reason: string, immediate: boolean) {
  const secret = process.env.SECURITY_REPORT_SECRET;
  if (!secret) return;
  const timestamp = String(Date.now());
  const payload = `${timestamp}.${userId ?? ""}.${ip ?? ""}.${reason}.${immediate}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  let binary = "";
  signatureBytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  const signature = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await fetch(new URL("/api/security/report", request.url), {
    method: "POST",
    headers: { "content-type": "application/json", "x-security-timestamp": timestamp, "x-security-signature": signature },
    body: JSON.stringify({ userId, ip, reason, immediate }),
  }).catch(() => undefined);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ip = clientIp(request);

  async function blockRequest() {
    await supabase.auth.signOut().catch(() => undefined);
    const blocked = NextResponse.rewrite(new URL("/forbidden", request.url), { status: 403 });
    response.cookies.getAll().forEach(({ name, value }) => blocked.cookies.set(name, value));
    return blocked;
  }

  const { data: alreadyBanned } = await supabase.rpc("is_request_banned", {
    p_user_id: user?.id ?? null,
    p_ip_address: ip,
  });
  if (alreadyBanned === true) return blockRequest();

  const detectedThreat = threatReason(request);
  if (detectedThreat) {
    await reportThreat(request, user?.id ?? null, ip, detectedThreat, true);
    return blockRequest();
  }

  const isAuthPage = ["/login", "/register", "/signup", "/forgot-password"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isProtected =
    pathname.startsWith("/account") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin");

  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/account";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/admin") && !user) {
    await reportThreat(request, null, ip, "unauthenticated_admin_access", true);
    return blockRequest();
  }

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/admin") && user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    // Fail closed: only the persisted database role grants admin route access.
    if (profileError || profile?.role !== "admin") {
      await reportThreat(request, user.id, ip, "unauthorized_admin_access", true);
      return blockRequest();
    }
  }

  return response;
}
