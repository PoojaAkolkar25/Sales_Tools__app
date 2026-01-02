import React from 'react';
import {
    Plus,
    Search,
} from 'lucide-react';

interface NavbarProps {
    user: any;
    onLogout: () => void;
    onCreateUser?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onCreateUser }) => {
    return (
        <header className="fixed top-0 right-0 left-[280px] h-[64px] bg-[#004A99] border-b border-[#0056b3] z-[90] px-6 flex items-center justify-between shadow-lg">
            {/* Left Section: Simple Search */}
            <div className="flex items-center gap-4">
                <div className="flex items-center bg-[#005cc5] border border-white/10 rounded-md px-3 py-1.5 w-[300px] group focus-within:border-white/30 transition-all">
                    <Search size={16} className="text-blue-200 mr-2" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent border-none p-0 text-sm text-white focus:ring-0 w-full placeholder:text-blue-200/50"
                    />
                </div>
            </div>

            {/* Right Section: Welcome, Create User, and Logout */}
            <div className="flex items-center gap-6">
                {/* Welcome and Create User Stack */}
                <div className="flex flex-col items-end gap-1">
                    <span className="text-white text-sm font-medium">
                        Welcome, {user?.username}
                    </span>
                    <button
                        onClick={onCreateUser}
                        className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-md transition-all text-[11px] font-bold border border-white/20 whitespace-nowrap"
                    >
                        <Plus size={12} />
                        <span>Create User</span>
                    </button>
                </div>

                {/* White Logout Button from Image */}
                <button
                    onClick={onLogout}
                    className="h-[40px] px-6 bg-white hover:bg-blue-50 text-[#004A99] rounded-xl transition-all text-base font-bold shadow-md border border-white"
                >
                    Logout
                </button>
            </div>
        </header>
    );
};

export default Navbar;
