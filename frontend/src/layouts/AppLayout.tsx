import React, { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'

type Props = {
  children: React.ReactNode
}

export const AppLayout: React.FC<Props> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="min-h-screen flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full overflow-auto animate-fade-in">{children}</main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout
