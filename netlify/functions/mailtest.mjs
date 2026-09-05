// 임시 진단용 — Resend 발송이 왜 실패하는지 응답을 그대로 확인한다. 진단 후 삭제할 것.
// ADMIN_PASSWORD 로 보호된다. API 키 자체는 절대 응답에 넣지 않는다.

export default async (request) => {
  const url = new URL(request.url);
  if (url.searchParams.get("password") !== process.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const key = process.env.RESEND_API_KEY;
  const owner = process.env.OWNER_EMAIL;
  const from =
    url.searchParams.get("from") ||
    process.env.RESEND_FROM ||
    "TIGERDYNE NEXUS <noreply@tigerdynenexus.com>";

  const diag = {
    hasKey: Boolean(key),
    keyPrefix: key ? key.slice(0, 3) + "..." : null, // 키 노출 금지 — 접두사만
    keyLength: key ? key.length : 0,
    ownerSet: Boolean(owner),
    from,
  };

  if (!key || !owner) {
    return new Response(JSON.stringify({ ok: false, diag }, null, 2), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // ?action=adddomain — Resend에 도메인을 등록하고 필요한 DNS 레코드를 돌려받는다.
  if (url.searchParams.get("action") === "adddomain") {
    const name = url.searchParams.get("domain") || "tigerdynenexus.com";
    try {
      const res = await fetch("https://api.resend.com/domains", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return new Response(
        JSON.stringify({ ok: true, status: res.status, body: await res.text() }, null, 2),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err && err.message) }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
  }

  // ?action=listdomains — 등록된 도메인과 인증 상태 확인
  if (url.searchParams.get("action") === "listdomains") {
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return new Response(
        JSON.stringify({ ok: true, status: res.status, body: await res.text() }, null, 2),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err && err.message) }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
  }

  let status = null;
  let body = null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [owner],
        subject: "[TIGERDYNE NEXUS] 발송 진단 테스트",
        html: "<p>Resend 발송 경로 진단용 메일입니다.</p>",
      }),
    });
    status = res.status;
    body = await res.text();
  } catch (err) {
    body = `fetch error: ${err && err.message}`;
  }

  return new Response(JSON.stringify({ ok: true, diag, status, body }, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
