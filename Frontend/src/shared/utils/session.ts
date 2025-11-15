import { v4 as uuid } from "uuid";

const SID_KEY = "kleem:sessionId";
export function getSessionId(): string {
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = `sess_${uuid()}`;
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}
