// GET /api/verify?token=... — 매직링크 검증 후 회원 쿠키 발급
// 성공: tigerdyne_member 쿠키 설정 + 302 /reports/
// 실패: 302 /account/login.html?error=expired

import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const COOKIE_NAME = "tigerdyne_member";
const COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일
const COOKIE_MAX_AGE = 2592000;

function b64url(str) {
  return Buffer.from(str).toString("base64url");
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function fail() {
  return new Response(null, {
    status: 302,
    headers: { Location: "/account/login.html?error=expired" },
  });
}

export default async (request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const secret = process.env.MEMBER_TOKEN_SECRET;

  if (!token || !secret) return fail();

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return fail();
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (!timingSafeEqualStr(sig, expected)) return fail();

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return fail();
  }
  const email = typeof data?.e === "string" ? data.e.trim().toLowerCase() : "";
  const exp = Number(data?.x);
  if (!email || !Number.isFinite(exp) || exp <= Date.now()) return fail();

  // 토큰이 유효해도 그 사이 승인이 철회되었을 수 있다.
  try {
    const store = getStore("members");
    const record = await store.get(email, { type: "json" });
    if (!record || record.status !== "approved") return fail();
  } catch (err) {
    console.log(`[verify] 저장소 조회 오류: ${err && err.message}`);
    return fail();
  }

  // 쿠키: base64url(email) . expiryEpochMs . HMAC-SHA256-hex(secret, "base64url(email).expiryEpochMs")
  const emailB64 = b64url(email);
  const cookieExp = Date.now() + COOKIE_TTL_MS;
  const base = `${emailB64}.${cookieExp}`;
  const cookieSig = crypto.createHmac("sha256", secret).update(base).digest("hex");
  const cookieValue = `${base}.${cookieSig}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/reports/",
      "Set-Cookie": `${COOKIE_NAME}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`,
    },
  });
};
