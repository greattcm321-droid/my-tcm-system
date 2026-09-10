import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppShell() {
    return (
        <div className="flex flex-col h-screen bg-theme-bg overflow-hidden text-theme-text">
            {/* Top Navigation */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-5 lg:p-6 animate-fade-in relative">
                <Outlet />
            </main>
        </div>
    )
}
