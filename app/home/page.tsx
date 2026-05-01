"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (!storedUserId) {
      router.push("/login");
    } else {
      setUserId(storedUserId);
      fetchSessions(storedUserId);
    }
  }, [router]);

  //session
  const fetchSessions = async (uid: string) => {
    try {
      const res = await fetch(`https://rag-backend-skripsi.vercel.app/sessions?user_id=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data || []);
      }
    } catch (error) { 
      console.error("Gagal menarik sesi:", error); 
    }
  };

  const handleNewSession = async () => {
      setIsLoading(true);
      const newSessionId = crypto.randomUUID(); 
  
      try {
        const res = await fetch(`https://rag-backend-skripsi.vercel.app/create-session`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            session_id: newSessionId,
            title: "Sesi Belajar Baru"
          })
        });
  
        if (res.ok) {
          localStorage.setItem("current_session_id", newSessionId);
          router.push(`/dashboard?session_id=${newSessionId}`);
        } else {
          alert("Gagal membuat sesi di database.");
        }
      } catch (error) {
        alert("Gagal membuat percakapan baru.");
      } finally {
        setIsLoading(false);
      }
    };

  const deleteSession = async (sessionId: string) => {
  if (!confirm("Apakah Anda yakin ingin menghapus percakapan ini?")) return;

  try {
    const res = await fetch("https://rag-backend-skripsi.vercel.app/delete-session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      alert("Sesi berhasil dihapus.");
    } else {
      alert("Gagal menghapus sesi.");
    }
  } catch (error) {
    console.error("Error delete:", error);
    alert("Koneksi bermasalah.");
  }
};
  
  const openSession = async (sessionId: string) => {
    localStorage.setItem("current_session_id", sessionId);
    router.push(`/dashboard?session_id=${sessionId}`);
    
    try {
      await fetch(`https://rag-backend-skripsi.vercel.app/update-session-time?session_id=${sessionId}`, { method: "POST" });
    } catch (error) {
      console.error("Gagal update waktu:", error);
    }
  };

  if (!userId) return <div className="h-screen flex items-center justify-center bg-[#F9FAFB]">Memuat...</div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-[#1F2937] p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex justify-between items-end border-b border-gray-200 pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">Beranda Asisten</h1>
            <p className="text-gray-500 font-medium">Lanjutkan percakapan belajarmu atau mulai topik baru.</p>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* CARD NEW SESSION */}
          <div 
            onClick={handleNewSession}
            className={`bg-blue-600 rounded-3xl p-8 flex flex-col justify-between cursor-pointer hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] min-h-[200px] ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
          >
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-1">{isLoading ? "Membuat..." : "Mulai Percakapan Baru"}</h3>
              <p className="text-blue-100 text-sm">Buka ruang kerja kosong</p>
            </div>
          </div>
          {sessions.map((session) => (
            <div key={session.id} className="relative group">
              {/* Kotak Sesi Utama */}
              <div onClick={() => openSession(session.id)} className="cursor-pointer ...">
                 <h3>{session.title}</h3>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation(); 
                  deleteSession(session.id);
                }}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                🗑️
              </button>
            </div>
          ))}

            {/* LIST SESI LAMA */}
            {sessions.map((ses, idx) => {
            const timeToUse = ses.updated_at || ses.created_at;
            const utcDateStr = timeToUse.endsWith('Z') ? timeToUse : `${timeToUse}Z`;
            const dateObj = new Date(utcDateStr);
            const dateStr = !isNaN(dateObj.getTime()) 
                ? dateObj.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                : timeToUse;

            return (
                <div 
                key={ses.id || idx}
                onClick={() => openSession(ses.id)}
                className="bg-white border border-gray-100 rounded-3xl p-8 flex flex-col justify-between cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all active:scale-[0.98] min-h-[200px] group"
                >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all mb-6">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                </div>
                <div>
                    {/* Auto title */}
                    <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors capitalize">
                    {ses.title && ses.title !== "New Chat" ? ses.title : `Sesi Belajar ${sessions.length - idx}`}
                    </h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{dateStr} WIB</p>
                </div>
                </div>
            )
            })}        
            </div>
      </div>
    </div>
  );
}
