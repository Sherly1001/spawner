import { setupMessaging } from "./messaging";
import { SessionStore } from "./sessions";
import { setupWebRequest } from "./webrequest";

async function main(): Promise<void> {
  const store = new SessionStore();
  await store.load();
  setupWebRequest(store);
  setupMessaging(store);
}

void main();
