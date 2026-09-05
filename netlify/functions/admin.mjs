// POST /api/admin — 오너 전용 회원 관리
// 본문: { password, action: "list" | "approve" | "revoke", email? }
// 비밀번호 불일치 시 401 {"ok":false}

import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const MAX_FIELD = 500;
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

const DENY = () => json({ ok: false }, 401);

// 길이 노출을 막기 위해 다이제스트끼리 상수시간 비교한다.
function constantTimeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
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
  if (request.method !== "POST") return json({ ok: false }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return DENY();
  }
  if (!body || typeof body !== "object") return DENY();

  const adminPassword = process.env.ADMIN_PASSWORD;
  const supplied = typeof body.password === "string" ? body.password : "";
  if (!adminPassword || !constantTimeEqual(supplied, adminPassword)) return DENY();

  const action = typeof body.action === "string" ? body.action : "";
  const email =
    typeof body.email === "string" ? body.email.trim().slice(0, MAX_FIELD).toLowerCase() : "";

  let store;
  try {
    store = getStore("members");
  } catch (err) {
    console.log(`[admin] 저장소 초기화 오류: ${err && err.message}`);
    return json({ ok: false, error: "storage_unavailable" }, 500);
  }

  if (action === "list") {
    try {
      const { blobs } = await store.list();
      const members = [];
      for (const b of blobs) {
        const rec = await store.get(b.key, { type: "json" });
        if (rec) members.push(rec);
      }
      members.sort(
        (a, b) =>
          new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime()
      );
      return json({ ok: true, members });
    } catch (err) {
      console.log(`[admin] list 오류: ${err && err.message}`);
      return json({ ok: false, error: "list_failed" }, 500);
    }
  }

  // 기록 자체를 지운다(테스트·오기입 정리용). 승인 취소는 revoke 를 쓸 것.
  if (action === "delete") {
    if (!email) return json({ ok: false, error: "email_required" }, 400);
    try {
      await store.delete(email);
      return json({ ok: true });
    } catch (err) {
      console.log(`[admin] delete 오류: ${err && err.message}`);
      return json({ ok: false, error: "delete_failed" }, 500);
    }
  }

  if (action === "approve" || action === "revoke") {
    if (!email) return json({ ok: false, error: "email_required" }, 400);
    try {
      const record = await store.get(email, { type: "json" });
      if (!record) return json({ ok: false, error: "not_found" }, 404);

      record.status = action === "approve" ? "approved" : "revoked";
      record.decidedAt = new Date().toISOString();
      await store.setJSON(email, record);

      if (action === "approve") {
        await sendEmail({
          to: email,
          subject: "[TIGERDYNE NEXUS] 리서치 열람이 승인되었습니다",
          html: `<div style="font-family:-apple-system,'Noto Sans KR',sans-serif;line-height:1.7">
  <h2 style="margin:0 0 16px">승인되었습니다</h2>
  <p>${escapeHtml(record.name || "")}님, TIGERDYNE NEXUS 리서치 열람 신청이 <b>승인되었습니다</b>.</p>
  <p>아래 페이지에서 이메일 주소를 입력하시면 로그인 링크를 보내드립니다. 비밀번호는 필요하지 않습니다.</p>
  <p style="margin:24px 0">
    <a href="https://tigerdynenexus.com/account/login.html"
       style="display:inline-block;padding:12px 20px;background:#c49a3c;color:#08131f;text-decoration:none;font-weight:600;border-radius:2px">
      로그인 페이지로 이동
    </a>
  </p>
  <p style="font-size:0.85rem;color:#666">https://tigerdynenexus.com/account/login.html</p>
</div>`,
        });
      }

      return json({ ok: true });
    } catch (err) {
      console.log(`[admin] ${action} 오류: ${err && err.message}`);
      return json({ ok: false, error: "update_failed" }, 500);
    }
  }

  return json({ ok: false, error: "unknown_action" }, 400);
};
