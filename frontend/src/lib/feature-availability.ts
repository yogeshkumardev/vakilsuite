// These backend features were removed during the reset. Do not mount their UI
// until a later sprint ships a replacement contract. This is not authorization.
export function isDeferredPage(pathname: string): boolean {
    if (/^\/cases\/[^/]+\/drafts(?:\/new\/[^/]+)?\/?$/.test(pathname)) return false;
    return /\/(cause-list|context|drafts|courtroom|notifications)(\/|$)/.test(pathname);
}
