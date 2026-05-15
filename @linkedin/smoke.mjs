import assert from "node:assert/strict";
import { plugin } from "./api-emulator.mjs";

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: "GET", path, handler }),
  post: (path, handler) => routes.push({ method: "POST", path, handler }),
};
const store = {
  data: new Map(),
  getData(key) {
    return this.data.get(key);
  },
  setData(key, value) {
    this.data.set(key, value);
  },
};

plugin.register(app, store);

function match(routePath, requestPath) {
  const routeParts = routePath.split("/").filter(Boolean);
  const requestParts = requestPath.split("/").filter(Boolean);
  if (routeParts.length !== requestParts.length) return null;
  const params = {};
  for (let i = 0; i < routeParts.length; i += 1) {
    if (routeParts[i].startsWith(":"))
      params[routeParts[i].slice(1)] = decodeURIComponent(requestParts[i]);
    else if (routeParts[i] !== requestParts[i]) return null;
  }
  return params;
}

async function request(method, path, body) {
  const url = new URL(`http://localhost${path}`);
  const route = routes.find(
    (item) => item.method === method && match(item.path, url.pathname),
  );
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      param: (name) => params[name],
      query: (name) => url.searchParams.get(name) ?? undefined,
      json: async () => body ?? {},
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

const token = await request("POST", "/oauth/v2/accessToken");
assert.equal(token.payload.access_token, "linkedin_emulator_access_token");
const me = await request("GET", "/v2/me");
assert.equal(me.payload.id, "linkedin_member_seed");
const post = await request("POST", "/v2/ugcPosts", {
  author: "urn:li:person:linkedin_member_seed",
  lifecycleState: "PUBLISHED",
  specificContent: {
    "com.linkedin.ugc.ShareContent": { shareCommentary: { text: "hello" } },
  },
});
assert.equal(post.status, 201);
assert.match(post.payload.id, /urn:li:share:emulator_/);
const organizations = await request("GET", "/v2/organizations?count=1");
assert.equal(
  organizations.payload.elements[0].vanityName,
  "linkedin-emulator-company",
);
const adAccounts = await request("GET", "/rest/adAccounts");
assert.equal(
  adAccounts.payload.elements[0].name,
  "LinkedIn Emulator Ad Account",
);

console.log("linkedin smoke ok");
