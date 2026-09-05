import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const reportSchema = z.object({
  userId: z.string().uuid().nullable(),
  ip: z.string().max(64).nullable(),
  reason: z.string().min(1).max(500),
  immediate: z.boolean(),
});

function validSignature(payload: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const secret = process.env.SECURITY_REPORT_SECRET;
  const timestamp = request.headers.get("x-security-timestamp") ?? "";
  const signature = request.headers.get("x-security-signature") ?? "";
  const timestampNumber = Number(timestamp);
  if (!secret || !Number.isFinite(timestampNumber) || Math.abs(Date.now() - timestampNumber) > 30_000) {
    return new NextResponse(null, { status: 401 });
  }

  const body = reportSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return new NextResponse(null, { status: 400 });
  const payload = `${timestamp}.${body.data.userId ?? ""}.${body.data.ip ?? ""}.${body.data.reason}.${body.data.immediate}`;
  if (!validSignature(payload, signature, secret)) return new NextResponse(null, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin.rpc("record_security_violation", {
    p_user_id: body.data.userId,
    p_ip_address: body.data.ip,
    p_reason: body.data.reason,
    p_immediate: body.data.immediate,
  });
  return new NextResponse(null, { status: error ? 503 : 204 });
}
