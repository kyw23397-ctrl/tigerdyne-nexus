// 임시 진단용 — Netlify Blobs 쓰기/읽기 동작 확인. 진단 후 삭제할 것.
// ADMIN_PASSWORD 로 보호된다.
import { getStore } from "@netlify/blobs";

export default async (request) => {
  const url = new URL(request.url);
  if (url.searchParams.get("password") !== process.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const steps = [];
  const record = (label, fn) =>
    fn().then(
      (v) => steps.push({ step: label, ok: true, value: v }),
      (e) => steps.push({ step: label, ok: false, error: String(e && e.message || e), name: e && e.name })
    );

  let store;
  await record("getStore", async () => {
    store = getStore("members");
    return "created";
  });

  if (store) {
    await record("setJSON", async () => {
      await store.setJSON("diag@example.com", { email: "diag@example.com", status: "pending" });
      return "written";
    });
    await record("get", async () => {
      const v = await store.get("diag@example.com", { type: "json" });
      return v;
    });
    await record("list", async () => {
      const { blobs } = await store.list();
      return blobs.map((b) => b.key);
    });
  }

  return new Response(JSON.stringify({ ok: true, steps }, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
