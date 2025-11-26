import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  Home, 
  Phone, 
  Users, 
  BarChart3, 
  Target, 
  FileText, 
  Database, 
  Settings, 
  Calendar,
  Menu,
  X,
  Linkedin,
  Instagram,
  Globe,
  LogOut,
  ChevronDown,
  Bell
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  const menuItems = [
    { name: 'Home', icon: Home, page: 'Home' },
    { name: 'Interações', icon: Phone, page: 'Interactions' },
    { name: 'Cadastros', icon: Users, page: 'Clients' },
    { name: 'Agenda Comercial', icon: Calendar, page: 'Schedule' },
    { name: 'Dashboard', icon: BarChart3, page: 'Dashboard' },
    { name: 'Campanhas', icon: Target, page: 'Campaigns' },
    { name: 'Relatórios', icon: FileText, page: 'Reports' },
    { name: 'Banco de Dados', icon: Database, page: 'DataImport' },
    { name: 'Administração', icon: Settings, page: 'Admin' },
  ];

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <style>{`
        :root {
          --asuaid-purple: #6B2D8B;
          --asuaid-purple-light: #8B4DAB;
          --asuaid-purple-dark: #4A1D5B;
          --asuaid-magenta: #C71585;
          --asuaid-yellow: #FFD700;
          --asuaid-yellow-light: #FFF3B0;
        }
      `}</style>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex-col z-40 shadow-lg">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#C71585] flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="font-bold text-[#6B2D8B] text-xl tracking-tight">SUA.ID</h1>
              <p className="text-xs text-slate-500">CRM Digital</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#6B2D8B] to-[#8B4DAB] text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#6B2D8B]'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#6B2D8B]'}`} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Social Links */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center justify-center gap-3 mb-4">
            <a
              href="https://www.linkedin.com/in/asuaid/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-[#0077B5] flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href="https://instagram.com/asuaidcertificadora"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm"
            >
              <Instagram className="w-5 h-5" />
            </a>
          </div>
          <a
            href="https://www.asuaiddigital.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-[#6B2D8B] hover:underline"
          >
            <Globe className="w-4 h-4" />
            Nosso Site
          </a>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed left-0 top-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 shadow-2xl ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#C71585] flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <span className="font-bold text-[#6B2D8B]">SUA.ID</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#6B2D8B] to-[#8B4DAB] text-white' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {menuItems.find(m => m.page === currentPageName)?.name || 'CRM'}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-slate-500">Online</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#C71585] rounded-full" />
              </Button>

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 hover:bg-slate-50 rounded-xl p-2 transition-colors">
                      <Avatar className="w-9 h-9 border-2 border-[#6B2D8B]/20">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-[#6B2D8B] to-[#C71585] text-white text-sm">
                          {user.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden md:block text-left">
                        <p className="text-sm font-medium text-slate-700">{user.full_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{user.role || 'Agente'}</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}