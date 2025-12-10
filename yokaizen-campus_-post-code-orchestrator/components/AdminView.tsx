







import React, { useEffect, useState } from 'react';
import { User, AdminStats, UserRole, Language } from '../types';
import { AdminService } from '../services/admin';
import { TERMS } from '../translations';
import { ShieldCheck, Users, Activity, Settings, Key, Search, Trash2, LogOut, Globe } from 'lucide-react';

interface AdminViewProps {
  user: User;
  onLogout: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ user, onLogout, language, setLanguage }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [schoolKey, setSchoolKey] = useState("");
  
  const T = TERMS[language].ADMIN;
  const TC = TERMS[language].COMMON;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await AdminService.getStats();
    setStats(s);
    setUsers(AdminService.getAllUsers());
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    AdminService.updateUserRole(userId, newRole);
    loadData();
  };

  const handleDelete = (userId: string) => {
    if (confirm(T.DELETE_CONFIRM || TC.CONFIRM)) {
      AdminService.deleteUser(userId);
      loadData();
    }
  };

  const handleLicenseSave = () => {
    AdminService.setSchoolLicense(schoolKey);
    alert(TC.SAVED_MSG);
    loadData();
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col">
      {/* Top Bar */}
      <div className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-900/20 rounded border border-red-500/50">
            <ShieldCheck className="w-5 h-5 text-red-500" />
          </div>
          <span className="font-bold tracking-widest text-sm">{T.COMMAND}</span>
        </div>
        <div className="flex items-center gap-4">
           {/* Admin Lang Selector */}
           <div className="relative group z-50">
              <button className="text-xs font-bold text-slate-500 hover:text-white flex items-center gap-2">
                 <Globe className="w-3 h-3" /> {language}
              </button>
              <div className="absolute top-full right-0 mt-2 w-32 bg-slate-900 border border-slate-700 rounded shadow-xl hidden group-hover:block">
                 {Object.values(Language).map((lang) => (
                   <button key={lang} onClick={() => setLanguage(lang as Language)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800">{lang}</button>
                 ))}
              </div>
           </div>

           <span className="text-xs text-slate-500">{user.email}</span>
           <button onClick={onLogout} className="text-slate-400 hover:text-white"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
               <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-2 uppercase"><Users className="w-4 h-4" /> {T.TOTAL_USERS}</div>
               <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
               <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-2 uppercase"><Activity className="w-4 h-4" /> {T.ACTIVE_SESSIONS}</div>
               <div className="text-3xl font-bold text-emerald-400">{stats.activeSessions}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
               <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-2 uppercase"><Settings className="w-4 h-4" /> {T.SYSTEM_HEALTH}</div>
               <div className="text-3xl font-bold text-blue-400">{stats.systemHealth}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
               <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-2 uppercase"><Key className="w-4 h-4" /> {T.LICENSE_MODE}</div>
               <div className={`text-3xl font-bold ${stats.schoolLicenseActive ? 'text-purple-400' : 'text-slate-400'}`}>
                 {stats.schoolLicenseActive ? T.SCHOOL_PROXY : T.BYO_KEY}
               </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-8">
          
          {/* User Management */}
          <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
             <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <h3 className="font-bold flex items-center gap-2"><Users className="w-4 h-4" /> {T.USERS}</h3>
                <div className="relative">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                   <input 
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     placeholder={T.SEARCH_PLACEHOLDER} 
                     className="bg-slate-950 border border-slate-700 rounded-full pl-9 pr-4 py-1.5 text-xs w-64 focus:outline-none focus:border-slate-500"
                   />
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-slate-950 text-slate-500 text-xs uppercase sticky top-0">
                      <tr>
                         <th className="p-4">User</th>
                         <th className="p-4">{T.ROLE}</th>
                         <th className="p-4">{T.LEVEL}</th>
                         <th className="p-4 text-right">{T.ACTIONS}</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                      {filteredUsers.map(u => (
                         <tr key={u.id} className="hover:bg-white/5">
                            <td className="p-4">
                               <div className="font-bold text-white">{u.name}</div>
                               <div className="text-xs text-slate-500">{u.email}</div>
                            </td>
                            <td className="p-4">
                               <select 
                                 value={u.role} 
                                 onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                 className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none"
                               >
                                  <option value={UserRole.STUDENT}>STUDENT</option>
                                  <option value={UserRole.TEACHER}>TEACHER</option>
                                  <option value={UserRole.ADMIN}>ADMIN</option>
                               </select>
                            </td>
                            <td className="p-4 font-mono text-slate-400">LVL {u.level}</td>
                            <td className="p-4 text-right">
                               <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          {/* Configuration */}
          <div className="space-y-6">
             {/* School License Config */}
             <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Key className="w-4 h-4 text-purple-400" /> {T.SCHOOL_PROXY}</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Set a centralized Gemini API Key here.
                </p>
                <input 
                  type="password"
                  value={schoolKey}
                  onChange={(e) => setSchoolKey(e.target.value)}
                  placeholder="Paste AIza... Key"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white text-xs font-mono mb-4 focus:border-purple-500 focus:outline-none"
                />
                <button 
                  onClick={handleLicenseSave}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-sm transition-colors"
                >
                  {T.UPDATE_PROXY}
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
