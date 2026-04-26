"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-sans bg-[#F9FAFB]">Memuat Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(""); 
  
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [quizMode, setQuizMode] = useState<"setup" | "playing" | "result">("setup");
  const [quizType, setQuizType] = useState<"essay" | "pg">("essay");
  const [numQuestions, setNumQuestions] = useState(5);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizScores, setQuizScores] = useState<number[]>([]); 
  const [quizFeedback, setQuizFeedback] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [quizReviewData, setQuizReviewData] = useState<any[]>([]); 
  const [quizSessionHistory, setQuizSessionHistory] = useState<any[]>([]);

// Fetch
  const fetchData = async (uid: string, sid: string) => {
    if (!sid || sid === "default-session") return;
    
    try {
      // Fetch Files
      const resFiles = await fetch(`/api/files?user_id=${uid}`);
      if (resFiles.ok) {
        const data = await resFiles.json();
        setUploadedFiles(data && data.length > 0 ? Array.from(new Set(data.map((item: any) => item.file_name))) as string[] : []);
      }

      // Fetch Chat History
      const resHist = await fetch(`/api/chat-history?session_id=${sid}`);
      if (resHist.ok) {
        const data = await resHist.json();
        setChatHistory(data ? data.map((item: any) => ({ role: item.role, content: item.content })) : []);
      }

      // Fetch Quiz History
      const resQuiz = await fetch(`/api/quiz-history?session_id=${sid}`);
      if (resQuiz.ok) {
        const quizData = await resQuiz.json();
        setQuizSessionHistory(quizData || []);
      }

    } catch (error) {
      console.warn("Koneksi ke backend terputus atau gagal:", error);
    }
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (!storedUserId) {
      router.push("/login");
      return;
    }
    
    setUserId(storedUserId);
    
    const urlSessionId = searchParams.get("session_id");
    
    if (urlSessionId) {
      setSessionId(urlSessionId);
      localStorage.setItem("current_session_id", urlSessionId);
      
      setQuizMode("setup");
      setQuizQuestions([]);
      setQuizFeedback(null);
      setUserAnswer("");
      setQuizScores([]);
      setQuizReviewData([]);
      setCurrentIdx(0);
      setSelectedFiles([]);
      setChatHistory([]);

      fetchData(storedUserId, urlSessionId);
    }
  }, [searchParams]);

  // logika kuis 
  const startQuiz = async () => {
    if (selectedFiles.length === 0) return alert("Pilih dokumen di sidebar kiri!");
    setIsQuizLoading(true);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          file_name: selectedFiles, 
          user_id: userId,
          num_questions: numQuestions,
          quiz_type: quizType 
        })
      });
      const data = await res.json();
      if (data.quiz && data.quiz.length > 0) {
        setQuizQuestions(data.quiz);
        setQuizMode("playing");
      }
    } catch (e) { alert("Gagal membuat kuis."); }
    finally { setIsQuizLoading(false); }
  };

  const handleCheck = async (selectedOption?: string) => {
    const answerToProcess = quizType === "pg" ? selectedOption : userAnswer;
    if (!answerToProcess) return;
    setIsChecking(true);
    try {
      const res = await fetch("/api/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          file_name: selectedFiles[0],
          question_id: quizQuestions[currentIdx].id,
          user_answer: answerToProcess,
          quiz: quizQuestions
        })
      });
      const data = await res.json();
      setQuizScores(prev => [...prev, data.similarity]);
      setQuizFeedback({ ...data, user_ans: answerToProcess });
      setQuizReviewData(prev => [...prev, {
        question: quizQuestions[currentIdx].question,
        user_answer: answerToProcess,
        reference: data.reference_answer || data.reference,
        similarity: data.similarity,
        feedback: data.feedback
      }]);
    } catch (e) { alert("Gagal mengevaluasi."); }
    finally { setIsChecking(false); }
  };

  const handleNext = async () => {
    if (currentIdx < quizQuestions.length - 1) {
      setQuizFeedback(null);
      setUserAnswer("");
      setCurrentIdx(prev => prev + 1);
    } else {
      const finalScore = Math.round(quizScores.reduce((a, b) => a + b, 0) / quizQuestions.length);
      try {
        await fetch("/api/save-quiz-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            session_id: sessionId,
            quiz_type: quizType,
            num_questions: quizQuestions.length,
            score: finalScore,
            review_data: quizReviewData
          })
        });
      } catch (err) { console.error("Gagal menyimpan riwayat kuis:", err); }
      setQuizMode("result");
    }
  };

  const handleNewChat = () => router.push("/home");

  const handleFileUpload = async (e: any) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("user_id", userId!);
    Array.from(e.target.files as FileList).forEach(f => formData.append("files", f));
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    setUploadedFiles(prev => Array.from(new Set([...prev, ...data.files])));
    setIsUploading(false);
  };

  const handleAsk = async (e: any) => {
    e.preventDefault(); if (!question.trim()) return;
    const q = question; setQuestion(""); setChatHistory(p => [...p, {role: "user", content: q}]); setIsChatLoading(true);
    try {
      const res = await fetch("api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ question: q, file_name: selectedFiles, user_id: userId, session_id: sessionId })
      });
      const data = await res.json();
      setChatHistory(p => [...p, {role: "ai", content: data.answer}]);
    } catch (e) { setChatHistory(p => [...p, {role: "ai", content: "Koneksi terputus."}]); }
    finally { setIsChatLoading(false); }
  };

  if (!userId) return null;

  return (
    <div className="flex flex-col h-screen bg-[#F9FAFB] font-sans overflow-hidden text-[#1F2937]">
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold cursor-pointer" onClick={() => router.push("/home")}>A</div>
          <h1 className="text-gray-900 font-bold text-lg tracking-tight">Asisten Akademik AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/home")} className="px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm">
             Percakapan Baru
          </button>
          <button onClick={() => router.push("/home")} className="p-2 rounded-full bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 border border-gray-100 transition-all shadow-sm" title="Ke Beranda">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          </button>
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 shadow-sm">
            {userId.substring(0, 1).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 bg-white border-r border-gray-100 flex flex-col z-10 shadow-[2px_0_8_rgba(0,0,0,0.02)]">
          <div className="p-5">
            <h2 className="font-bold text-xs text-gray-400 uppercase tracking-widest mb-4">Dokumen</h2>
            <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 p-4 rounded-2xl text-xs font-bold text-gray-500 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
              {isUploading ? "SEDANG MENGUNGGAH..." : "+ UPLOAD MATERI"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 custom-scrollbar">
            {uploadedFiles.map(f => (
              <label key={f} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer border border-transparent hover:border-gray-100 transition-all">
                <input type="checkbox" checked={selectedFiles.includes(f)} onChange={e => e.target.checked ? setSelectedFiles(p => [...p, f]) : setSelectedFiles(p => p.filter(x => x !== f))} className="rounded text-blue-600" />
                <span className="text-xs font-semibold text-gray-600 truncate w-40">{f}</span>
              </label>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative bg-[#F9FAFB]">
          <div className="flex-1 overflow-y-auto px-8 pb-32 pt-10 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6">
              {chatHistory.length === 0 && (
                <div className="text-center mt-24 py-10">
                  <div className="inline-block p-4 bg-white rounded-3xl shadow-sm mb-6 border border-gray-100">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Halo, Selamat Datang!</h2>
                  <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">Pilih dokumen di sebelah kiri untuk mulai bertanya atau buat evaluasi kuis di sebelah kanan.</p>
                </div>
              )}
              {chatHistory.map((c, i) => (
                <div key={i} className={`flex ${c.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-5 rounded-2xl text-[14px] shadow-sm max-w-[85%] ${c.role === "user" ? "bg-blue-600 text-white rounded-br-none whitespace-pre-wrap" : "bg-white border border-gray-200 text-gray-800 rounded-bl-none leading-relaxed shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]"}`}>
                    {c.role === "user" ? c.content : <div className="space-y-4 [&>ul]:list-disc [&>ul]:ml-5 [&>ol]:list-decimal [&>ol]:ml-5 [&>h1]:text-lg [&>h1]:font-bold [&>h2]:font-semibold"><ReactMarkdown>{c.content}</ReactMarkdown></div>}
                  </div>
                </div>
              ))}
              {isChatLoading && <div className="text-[11px] font-bold text-blue-600 animate-pulse bg-white inline-block px-4 py-2 rounded-full border border-blue-100 shadow-sm mt-2">AI sedang menganalisis dokumen...</div>}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#F9FAFB] via-[#F9FAFB] to-transparent pointer-events-none">
            <form onSubmit={handleAsk} className="max-w-3xl mx-auto bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 p-2 flex gap-3 pointer-events-auto">
              <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Tanyakan isi dokumen..." className="flex-1 px-5 py-3 bg-transparent outline-none text-sm text-gray-700" />
              <button type="submit" disabled={isChatLoading || !question.trim()} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black hover:bg-blue-700 disabled:opacity-40 transition-all uppercase tracking-widest">KIRIM</button>
            </form>
          </div>
        </main>

        <aside className="w-96 h-full overflow-hidden bg-white border-l border-gray-100 p-6 flex flex-col z-10 shadow-[-2px_0_8px_rgba(0,0,0,0.02)] relative">
          <h2 className="font-black text-xs text-gray-400 uppercase tracking-[0.2em] mb-6 border-b border-gray-50 pb-3 text-center shrink-0">Active Recall Quiz</h2>

          {quizMode === "setup" && (
            <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
              <div className="space-y-6 shrink-0">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Format Kuis</label>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setQuizType("essay")} className={`flex-1 py-3 rounded-2xl text-[11px] font-black border transition-all ${quizType === "essay" ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>ESSAY</button>
                    <button onClick={() => setQuizType("pg")} className={`flex-1 py-3 rounded-2xl text-[11px] font-black border transition-all ${quizType === "pg" ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>PILIHAN GANDA</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jumlah Soal (Max {quizType==='essay'?20:40})</label>
                  <input type="number" value={numQuestions} onChange={(e) => setNumQuestions(Math.max(1, Math.min(parseInt(e.target.value)||1, quizType==='essay'?20:40)))} className="w-full mt-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-center focus:ring-2 ring-blue-100 outline-none transition-all" />
                </div>
                <button onClick={startQuiz} disabled={isQuizLoading || selectedFiles.length === 0} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xs shadow-xl active:scale-[0.98] transition-all disabled:opacity-30 uppercase tracking-[0.1em]">
                  {isQuizLoading ? "MEMPROSES..." : "MULAI EVALUASI"}
                </button>
              </div>

              {quizSessionHistory.length > 0 && (
                <div className="mt-8 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 pb-2">Riwayat Kuis Terakhir</h3>
                  <div className="space-y-3">
                    {quizSessionHistory.map((hist, idx) => {
                      const utcDateStr = hist.created_at.endsWith('Z') ? hist.created_at : `${hist.created_at}Z`;
                      const dateObj = new Date(utcDateStr);
                      const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : hist.created_at;
                      return (
                        <div key={hist.id || idx} onClick={() => { if (hist.review_data) { setQuizReviewData(hist.review_data); setQuizMode("result"); } }} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex justify-between items-center hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group">
                          <div>
                            <p className="text-[10px] font-black text-gray-800 uppercase tracking-wide group-hover:text-blue-600 transition-all">{hist.quiz_type || 'Kuis'} • {hist.num_questions || '0'} Soal</p>
                            <p className="text-[9px] font-bold text-gray-400 mt-1">{dateStr} WIB</p>
                          </div>
                          <div className={`text-xl font-black ${hist.score >= 70 ? 'text-emerald-500' : 'text-orange-500'}`}>{hist.score ?? 0}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {quizMode === "playing" && quizQuestions.length > 0 && quizQuestions[currentIdx] && (
            <div className="flex flex-col h-full overflow-hidden space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-600 p-5 rounded-3xl shadow-lg shadow-blue-100 min-h-[140px] flex flex-col justify-between shrink-0">
                <div className="flex justify-between items-center mb-3">
                   <span className="text-[10px] font-black text-white/70 uppercase">Soal {currentIdx + 1} / {quizQuestions.length}</span>
                   <span className="text-[9px] font-black bg-white/20 text-white px-3 py-1 rounded-full">{quizType.toUpperCase()}</span>
                </div>
                <p className="text-sm font-bold text-white leading-relaxed flex-1 flex items-center">{quizQuestions[currentIdx].question}</p>
              </div>

              {!quizFeedback ? (
                <div className="flex-1 overflow-y-auto space-y-4 pb-4 custom-scrollbar">
                  {quizQuestions[currentIdx].options ? (
                    <div className="grid gap-2 pr-1">
                      {quizQuestions[currentIdx].options.map((opt: string) => (
                        <button key={opt} onClick={() => handleCheck(opt)} className="text-left p-4 border border-gray-100 rounded-2xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all bg-white shadow-sm">{opt}</button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4 pr-1">
                      <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} className="w-full h-44 p-4 border border-gray-100 rounded-3xl text-sm outline-none focus:ring-4 ring-blue-50 bg-gray-50 transition-all resize-none" placeholder="Tuliskan jawaban lengkapmu..." />
                      <button onClick={() => handleCheck()} disabled={isChecking || !userAnswer.trim()} className="w-full bg-blue-600 text-white py-4 rounded-2xl text-xs font-black shadow-lg">{isChecking ? "MENGANALISIS..." : "KIRIM JAWABAN"}</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pb-4 animate-in fade-in zoom-in-95 duration-300 custom-scrollbar pr-1">
                  <div className={`p-5 rounded-3xl border shadow-sm ${quizFeedback.similarity > 70 ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-orange-50 border-orange-100 text-orange-900'}`}>
                    <div className="flex justify-between items-center mb-2"><p className="text-[10px] font-black uppercase tracking-widest">Skor Akurasi</p><span className="text-xl font-black">{quizFeedback.similarity}%</span></div>
                    <p className="text-xs font-bold italic leading-relaxed">"{quizFeedback.feedback}"</p>
                  </div>
                  <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 text-[12px]">
                    <p className="font-black text-gray-400 uppercase text-[9px] mb-2 tracking-widest">Kunci Jawaban:</p>
                    <p className="text-gray-700 leading-relaxed italic">{quizFeedback.reference_answer || quizFeedback.reference}</p>
                  </div>
                  <button onClick={handleNext} className="w-full bg-gray-900 text-white py-4 rounded-2xl text-xs font-black shadow-md hover:bg-black transition-all uppercase tracking-widest mt-2 shrink-0">{currentIdx === quizQuestions.length - 1 ? "LIHAT REVIEW AKHIR" : "LANJUT"}</button>
                </div>
              )}
            </div>
          )}

          {quizMode === "result" && (
            <div className="flex flex-col h-full overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="text-center pb-6 border-b border-gray-100 shrink-0">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Evaluasi Selesai</h3>
                <div className={`text-6xl font-black mb-2 ${quizReviewData.reduce((a, b) => a + b.similarity, 0) / (quizReviewData.length || 1) >= 70 ? 'text-emerald-500' : 'text-blue-600'}`}>{Math.round(quizReviewData.reduce((a, b) => a + b.similarity, 0) / (quizReviewData.length || 1))}</div>
              </div>
              <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar pr-2 pb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Review Jawabanmu</p>
                {quizReviewData.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 border border-gray-100 rounded-2xl shadow-sm space-y-3">
                    <div className="flex gap-2 items-start"><span className="bg-gray-100 text-gray-500 text-[9px] font-black px-2 py-1 rounded-md shrink-0">Q{idx + 1}</span><p className="text-xs font-bold text-gray-800 leading-snug">{item.question}</p></div>
                    <div className="flex flex-col gap-2 pl-8">
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-1"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Jawabanmu</p><span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.similarity > 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{item.similarity}%</span></div>
                        <p className={`text-[11px] font-medium ${item.similarity > 70 ? 'text-emerald-700' : 'text-orange-700'}`}>{item.user_answer}</p>
                      </div>
                      <div className="p-3 rounded-xl"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Kunci Jawaban AI</p><p className="text-[11px] text-gray-600 italic leading-relaxed">{item.reference}</p></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 shrink-0 bg-white border-t border-gray-50 mt-2">
                <button onClick={() => { if (userId && sessionId) fetchData(userId, sessionId); setQuizQuestions([]); setQuizMode("setup"); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]">KEMBALI KE MENU KUIS</button>
              </div>
            </div>
          )}
        </aside>
      </div>
      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #E5E7EB; border-radius: 10px; } .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #D1D5DB; }`}} />
    </div>
  );
}