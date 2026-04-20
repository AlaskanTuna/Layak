/**
 * Compile-time feature flags. Flip to `true` once the backing implementation
 * lands. These exist so the SaaS surface (application history, activity feed,
 * etc.) can ship its UI layer behind a single switch while the DB + auth lanes
 * are still being built by PO1.
 */

export const PERSISTENCE_ENABLED = false
