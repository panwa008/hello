import { AnimatePresence, motion } from 'framer-motion'
import { Layout } from './components/Layout'
import { Toasts } from './components/ui'
import { useApp, type Screen } from './store/AppStore'
import Auth from './screens/Auth'
import Home from './screens/Home'
import Explorer from './screens/Explorer'
import Friends from './screens/Friends'
import Chat from './screens/Chat'
import Pets from './screens/Pets'
import PetShop from './screens/PetShop'
import Market from './screens/Market'
import Avatar from './screens/Avatar'
import AvatarShop from './screens/AvatarShop'
import Game from './screens/Game'
import Profile from './screens/Profile'
import Wallet from './screens/Wallet'
import More from './screens/More'
import Accessories from './screens/Accessories'

const SCREENS: Record<Screen, () => React.JSX.Element | null> = {
  home: Home, explorer: Explorer, friends: Friends, chat: Chat, pets: Pets, petshop: PetShop, market: Market,
  avatar: Avatar, avatarshop: AvatarShop, game: Game, accessories: Accessories, profile: Profile, wallet: Wallet, more: More,
}

export default function App() {
  const { screen, user, d, booting } = useApp()
  if (booting) return <div className="grid min-h-screen place-items-center text-plum-600"><div className="text-center"><div className="anim-float text-5xl">🐉</div><div className="mt-3 text-sm font-semibold">กำลังเชื่อมต่อ Hello…</div></div></div>
  if (!user || !d) return (<><Auth /><Toasts /></>)
  const View = SCREENS[screen] ?? Home
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div key={screen} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          <View />
        </motion.div>
      </AnimatePresence>
      <Toasts />
    </Layout>
  )
}
