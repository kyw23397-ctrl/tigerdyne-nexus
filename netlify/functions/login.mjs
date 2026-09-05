// POST /api/login — 매직링크 로그인 요청
// 본문: { email }
// 승인(approved)된 회원에게만 20분짜리 매직링크 메일을 보낸다.
// 응답: 항상 200 {"ok":true} — 가입 여부를 절대 노출하지 않는다.

import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const MAX_FIELD = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOKEN_TTL_MS = 20 * 60 * 1000; // 20분

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const OK = () =>
  new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function makeToken(email, secret) {
  const payload = b64url(JSON.stringify({ e: email, x: Date.now() + TOKEN_TTL_MS }));
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      `[mail] RESEND_API_KEY 미설정 — 발송 생략. to=${to} subject=${subject}`
    );
    return false;
  }
  const from = process.env.RESEND_FROM || "TIGERDYNE NEXUS <noreply@tigerdynenexus.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.log(`[mail] Resend 응답 실패 status=${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.log(`[mail] Resend 호출 오류: ${err && err.message}`);
    return false;
  }
}

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return OK();
  }
  if (!body || typeof body !== "object") return OK();

  const email =
    typeof body.email === "string" ? body.email.trim().slice(0, MAX_FIELD).toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email)) return OK();

  try {
    const secret = process.env.MEMBER_TOKEN_SECRET;
    if (!secret) {
      console.log("[login] MEMBER_TOKEN_SECRET 미설정 — 토큰 발급 생략");
      return OK();
    }

    const store = getStore("members");
    const record = await store.get(email, { type: "json" });

    // approved 인 경우에만 메일 발송. 그 외(없음/pending/revoked)는 아무것도 하지 않는다.
    if (record && record.status === "approved") {
      const token = makeToken(email, secret);
      const link = `https://tigerdynenexus.com/api/verify?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: email,
        subject: "[TIGERDYNE NEXUS] 로그인 링크",
        html: `<div style="font-family:-apple-system,'Noto Sans KR',sans-serif;line-height:1.7">
  <h2 style="margin:0 0 16px">TIGERDYNE NEXUS 로그인</h2>
  <p>아래 링크를 눌러 리서치 열람을 시작하세요. 이 링크는 <b>20분간</b>만 유효합니다.</p>
  <p style="margin:24px 0">
    <a href="${escapeHtml(link)}"
       style="display:inline-block;padding:12px 20px;background:#c49a3c;color:#08131f;text-decoration:none;font-weight:600;border-radius:2px">
      로그인하기
    </a>
  </p>
  <p style="font-size:0.85rem;color:#666">버튼이 동작하지 않으면 아래 주소를 브라우저에 붙여넣으세요.<br>${escapeHtml(link)}</p>
  <p style="font-size:0.85rem;color:#666">본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
</div>`,
      });
    }
  } catch (err) {
    console.log(`[login] 처리 오류: ${err && err.message}`);
  }

  return OK();
};
