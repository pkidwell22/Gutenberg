const prefix = 'scripture-library:';
export const preferences = {
  get(key:string, fallback:string):string {
    try { return localStorage.getItem(prefix + key) || fallback; } catch { return fallback; }
  },
  set(key:string, value:string):void {
    try { localStorage.setItem(prefix + key, value); } catch { /* Reading works without storage. */ }
  },
};
