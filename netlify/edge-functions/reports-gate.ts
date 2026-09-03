// 일일보고서(reports/)·주간 전략 종합(insights/)·깊이보기(deepdive/) 경로 비밀번호 게이트.
// 안내 페이지(index.html)는 공개로 두고, 실제 날짜별/주제별 콘텐츠 파일만 막는다.
// 무료 플랜 대안 — Netlify Pro 유료 Password Protection 없이 Edge Function으로 직접 구현.
// (imt-global-website의 동일 기능을 이관 — 비밀번호는 별도의 새 값으로 REPORTS_PASSWORD에 설정할 것.)

export default async (request: Request, context: any) => {
  const url = new URL(request.url);
  const path = url.pathname;

  const publicPaths = [
    "/reports/", "/reports", "/reports/index.html",
    "/insights/", "/insights", "/insights/index.html",
    "/deepdive/", "/deepdive", "/deepdive/index.html",
  ];
  if (publicPaths.includes(path)) {
    return context.next();
  }

  const password = Netlify.env.get("REPORTS_PASSWORD");
  const cookieName = "tigerdyne_gate";
  const validValue = "granted";

  const cookieHeader = request.headers.get("cookie") || "";
  const authed = cookieHeader
    .split(";")
    .some((c) => c.trim() === `${cookieName}=${validValue}`);

  if (authed) {
    return context.next();
  }

  if (request.method === "POST") {
    const form = await request.formData();
    const submitted = form.get("password");
    if (submitted && password && submitted === password) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: path,
          "Set-Cookie": `${cookieName}=${validValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      });
    }
    return new Response(gateHTML(true), {
      status: 401,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new Response(gateHTML(false), {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};

function gateHTML(showError: boolean) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>승인된 대상 전용 — TIGERDYNE NEXUS</title>
<style>
  body { font-family: 'Inter', -apple-system, "Noto Sans KR", sans-serif; background:#08131f; color:#f3f5f8; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
  .box { max-width:360px; padding:40px; border:1px solid rgba(196,154,60,0.18); background:#0d1b2a; text-align:center; border-radius:2px; }
  h1 { font-size:1.1rem; margin:0 0 8px; color:#fff; }
  p { color:rgba(255,255,255,0.65); font-size:0.9rem; margin:0 0 24px; }
  input[type=password] { width:100%; padding:10px; border:1px solid rgba(196,154,60,0.18); margin-bottom:12px; box-sizing:border-box; background:#142234; color:#fff; border-radius:2px; }
  button { width:100%; padding:10px; background:#c49a3c; color:#08131f; border:none; cursor:pointer; font-weight:600; border-radius:2px; }
  .error { color:#dbb55a; font-size:0.85rem; margin-bottom:12px; }
</style>
</head>
<body>
  <div class="box">
    <h1>승인된 대상 전용</h1>
    <p>TIGERDYNE NEXUS 일일보고서·주간 전략 종합·깊이보기는 승인된 대상만 열람할 수 있습니다.</p>
    ${showError ? '<div class="error">비밀번호가 올바르지 않습니다.</div>' : ""}
    <form method="POST">
      <input type="password" name="password" placeholder="비밀번호" required autofocus>
      <button type="submit">입장</button>
    </form>
  </div>
</body>
</html>`;
}

export const config = { path: ["/reports/*", "/insights/*", "/deepdive/*"] };
