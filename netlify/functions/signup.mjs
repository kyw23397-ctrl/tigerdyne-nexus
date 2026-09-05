// POST /api/signup — 리서치 열람 신청 (무비밀번호 · 오너 승인 방식)
// 본문: { email, name, organization, purpose }
// 응답: 항상 200 {"ok":true} — 이메일 등록 여부를 절대 노출하지 않는다.

import { getStore } from "@netlify/blobs";

const MAX_FIELD = 500;
const MAX_PURPOSE = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const OK = () =>
  new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });

function clean(v, max) {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// RESEND_API_KEY가 아직 없어도 흐름이 깨지지 않도록 조용히 건너뛴다.
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

  const email = clean(body.email, MAX_FIELD).toLowerCase();
  const name = clean(body.name, MAX_FIELD);
  const organization = clean(body.organization, MAX_FIELD);
  const purpose = clean(body.purpose, MAX_PURPOSE);

  if (!email || !EMAIL_RE.test(email)) return OK();

  try {
    const store = getStore("members");
    const existing = await store.get(email, { type: "json" });

    // 이미 approved 또는 pending 이면 새로 만들지 않는다.
    if (existing && (existing.status === "approved" || existing.status === "pending")) {
      return OK();
    }

    const record = {
      email,
      name,
      organization,
      purpose,
      status: "pending",
      requestedAt: new Date().toISOString(),
      decidedAt: null,
    };
    await store.setJSON(email, record);

    const owner = process.env.OWNER_EMAIL;
    if (owner) {
      await sendEmail({
        to: owner,
        subject: `[TIGERDYNE NEXUS] 리서치 열람 신청 — ${name || email}`,
        html: `<div style="font-family:-apple-system,'Noto Sans KR',sans-serif;line-height:1.7">
  <h2 style="margin:0 0 16px">리서치 열람 신청이 접수되었습니다</h2>
  <table cellpadding="6" style="border-collapse:collapse">
    <tr><td><b>이름</b></td><td>${escapeHtml(name)}</td></tr>
    <tr><td><b>이메일</b></td><td>${escapeHtml(email)}</td></tr>
    <tr><td><b>소속</b></td><td>${escapeHtml(organization)}</td></tr>
    <tr><td valign="top"><b>열람 목적</b></td><td>${escapeHtml(purpose).replace(/\n/g, "<br>")}</td></tr>
    <tr><td><b>신청 시각</b></td><td>${record.requestedAt}</td></tr>
  </table>
  <p style="margin-top:20px">
    승인/거부는 관리자 페이지에서 처리하세요 —
    <a href="https://tigerdynenexus.com/account/admin.html">https://tigerdynenexus.com/account/admin.html</a>
  </p>
</div>`,
      });
    } else {
      console.log("[signup] OWNER_EMAIL 미설정 — 알림 메일 생략");
    }
  } catch (err) {
    console.log(`[signup] 처리 오류: ${err && err.message}`);
  }

  return OK();
};
