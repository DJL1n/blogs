const STORAGE_KEY = 'kb-diary-hash';
const SESSION_KEY = 'kb-diary-authed';

/** SHA-256 hash */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Check if a password matches the stored hash */
export async function verifyPassword(password: string): Promise<boolean> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  const hash = await hashPassword(password);
  return hash === stored;
}

/** Store a new password hash */
export async function setPassword(password: string): Promise<void> {
  const hash = await hashPassword(password);
  localStorage.setItem(STORAGE_KEY, hash);
}

/** Check if a password has been set up */
export function hasPassword(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

/** Mark the current session as authenticated */
export function setSessionAuthed(): void {
  sessionStorage.setItem(SESSION_KEY, Date.now().toString());
}

/** Check if current session is authenticated (within 2 hours) */
export function isSessionAuthed(): boolean {
  const ts = sessionStorage.getItem(SESSION_KEY);
  if (!ts) return false;
  const elapsed = Date.now() - Number(ts);
  return elapsed < 2 * 60 * 60 * 1000; // 2 hours
}

/** Clear session auth (lock) */
export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/** Full login flow: verify password + start session */
export async function login(password: string): Promise<boolean> {
  const ok = await verifyPassword(password);
  if (ok) setSessionAuthed();
  return ok;
}

/** Full logout */
export function logout(): void {
  clearSession();
}
