/** Games domain — Hello Arcade (digital). Owns the hub + arcade mini-games. */
export { default as GameHub } from './GameHub'
export { Adventure } from './arcade/Adventure'
export { Battle } from './arcade/Battle'
export { Runner } from './arcade/Runner'
export const REALM = 'digital' as const
