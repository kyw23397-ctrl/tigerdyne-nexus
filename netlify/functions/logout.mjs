// POST /api/logout — 회원 쿠키 삭제

const COOKIE_NAME = "tigerdyne_member";
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      ...JSON_HEADERS,
      "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
};
