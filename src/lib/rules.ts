import type { Person, StatusKey } from '../data/types'

/** Interaction rules per status (from product brief). Viewer = current user. */
export function canMessage(p: Person, opts: { isFriend: boolean; myGender: 'f' | 'm'; myStatus: StatusKey }) {
  switch (p.status) {
    case 'open': return true
    case 'single': return p.gender !== opts.myGender
    case 'heartbroken': return opts.isFriend
    case 'taken': return opts.isFriend || p.gender === opts.myGender
    case 'family': return opts.isFriend || opts.myStatus === 'family'
    case 'hidden': return false
  }
}
export function canViewInfo(p: Person, isFriend: boolean) {
  if (p.status === 'open') return true
  if (p.status === 'hidden' || p.status === 'single') return false
  return isFriend
}
export function canAddFriend(p: Person, myGender: 'f' | 'm') {
  if (p.status === 'open') return true
  if (p.status === 'single') return p.gender !== myGender
  return false
}
export function zone(d: number): 'near' | 'mid' | 'far' {
  return d <= 200 ? 'near' : d <= 500 ? 'mid' : 'far'
}
