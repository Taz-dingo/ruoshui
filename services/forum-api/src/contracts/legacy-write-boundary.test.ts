import assert from "node:assert/strict";
import test from "node:test";

import type { ForumRepository } from "../lib/forum-repository.js";
import { createNoopStorageProvider } from "../lib/storage.js";
import { createForumRoute } from "../routes/forum-route.js";
import { createStorageRoute } from "../routes/storage-route.js";

function createLegacyForumRoute() {
  const repository = {} as ForumRepository;
  return createForumRoute({ forumRepository: repository });
}

test("legacy forum compatibility route remains read-only", async () => {
  const route = createLegacyForumRoute();

  const bootstrap = await route.request("/bootstrap");
  assert.equal(bootstrap.status, 200);
  const bootstrapPayload = (await bootstrap.json()) as { deprecated?: boolean };
  assert.equal(bootstrapPayload.deprecated, true);

  const writeRequests: Array<[string, RequestInit]> = [
    ["/scenes/ruoshui-main", { method: "PUT", body: "{}", headers: { "content-type": "application/json" } }],
    ["/posts", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }],
    ["/pins", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }],
    ["/media/confirm", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }],
  ];

  for (const [path, init] of writeRequests) {
    const response = await route.request(path, init);
    assert.equal(response.status, 404, `${init.method} ${path} must stay unregistered`);
  }
});

test("generic storage no longer issues anonymous upload tickets", async () => {
  const route = createStorageRoute({ storageProvider: createNoopStorageProvider() });

  const status = await route.request("/status");
  assert.equal(status.status, 200);

  const ticketResponse = await route.request("/upload-requests", {
    method: "POST",
    body: JSON.stringify({
      fileName: "legacy.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 128,
      category: "post-cover",
    }),
    headers: { "content-type": "application/json" },
  });
  assert.equal(ticketResponse.status, 404);

  const signedObjectUploadRoute = await route.request("/objects/story-drafts%2Fuser%2Fasset.jpg", {
    method: "PUT",
  });
  assert.equal(
    signedObjectUploadRoute.status,
    501,
    "signed object PUT route must remain registered for authenticated Story upload tickets",
  );
});
