/**
 * Module-level flag for social auth in progress.
 * This survives React component remounts (which happen when the app
 * returns from Chrome Custom Tab on Android) because it exists
 * outside the React tree.
 */
let _socialAuthInProgress = false;
let _socialAuthTimestamp = 0;

const SOCIAL_AUTH_TIMEOUT = 15000; // 15 seconds max

export function setSocialAuthInProgress(value: boolean) {
    _socialAuthInProgress = value;
    _socialAuthTimestamp = value ? Date.now() : 0;
}

export function isSocialAuthInProgress(): boolean {
    if (!_socialAuthInProgress) return false;
    // Auto-expire after timeout
    if (Date.now() - _socialAuthTimestamp > SOCIAL_AUTH_TIMEOUT) {
        _socialAuthInProgress = false;
        return false;
    }
    return true;
}
