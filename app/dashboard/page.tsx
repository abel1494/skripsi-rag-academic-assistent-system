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
  
  // State Utama
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User"); 
  const [sessionId, setSessionId] = useState(""); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isQuizSidebarOpen, setIsQuizSidebarOpen] = useState(false); 
  
  // State Chat
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // State File & Upload
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Quiz
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

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const checkDevice = () => {
      if (window.innerWidth >= 1024) { 
        setIsQuizSidebarOpen(true); 
      } else {
        setIsQuizSidebarOpen(false); 
      }
    };
    checkDevice();
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isChatLoading, isQuizSidebarOpen]);

  const fetchData = async (uid: string, sid: string) => {
    if (!sid || sid === "default-session") return;
    try {
      const resFiles = await fetch(`https://rag-backend-skripsi.vercel.app/files?user_id=${uid}`);
      if (resFiles.ok) {
        const data = await resFiles.json();
        setUploadedFiles(data && data.length > 0 ? Array.from(new Set(data.map((item: any) => item.file_name))) as string[] : []);
      }
      const resHist = await fetch(`https://rag-backend-skripsi.vercel.app/chat-history?session_id=${sid}`);
      if (resHist.ok) {
        const data = await resHist.json();
        setChatHistory(data ? data.map((item: any) => ({ role: item.role, content: item.content })) : []);
      }
      const resQuiz = await fetch(`https://rag-backend-skripsi.vercel.app/quiz-history?session_id=${sid}`);
      if (resQuiz.ok) {
        const quizData = await resQuiz.json();
        setQuizSessionHistory(quizData || []);
      }
    } catch (error) {
      console.warn("Koneksi backend terputus.");
    }
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserName = localStorage.getItem("user_name");

    if (!storedUserId) {
      router.push("/login");
      return;
    }
    setUserId(storedUserId);
    
    if (storedUserName) {
      setUserName(storedUserName);
    }

    const urlSessionId = searchParams.get("session_id") || localStorage.getItem("current_session_id");
    if (urlSessionId) {
      setSessionId(urlSessionId);
      localStorage.setItem("current_session_id", urlSessionId);
      fetchData(storedUserId, urlSessionId);
    }
  }, [searchParams]);

  // LOGIKA AUTO-TITLE TERBARU
  const updateSessionTitle = async (aiFirstResponse: string) => {
    try {
      const res = await fetch("https://rag-backend-skripsi.vercel.app/update-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          session_id: sessionId, 
          ai_response: aiFirstResponse, // Judul diambil dari sini
          max_words: 5 
        })
      });
      if (res.ok) {
        console.log("Judul berhasil diperbarui otomatis berdasarkan respon AI.");
      }
    } catch (err) {
      console.error("Gagal update judul.");
    }
  };

  const handleNewChat = () => {
    setChatHistory([]);
    setQuizQuestions([]);
    setQuizMode("setup");
    setQuizFeedback(null);
    setQuizScores([]);
    setQuizReviewData([]);
    setQuestion("");
    const newSessionId = crypto.randomUUID(); 
    setSessionId(newSessionId);
    localStorage.setItem("current_session_id", newSessionId);
    router.replace(`/dashboard?session_id=${newSessionId}`);
  };
  
  const startQuiz = async () => {
    if (selectedFiles.length === 0) {
      alert("Maaf, pilih dokumen di sidebar kiri dulu ya untuk membuat kuis! 😊");
      return;
    }
    setQuizQuestions([]); setQuizFeedback(null); setQuizScores([]); setQuizReviewData([]); setCurrentIdx(0); setUserAnswer("");
    setIsQuizLoading(true);
    try {
      const res = await fetch("https://rag-backend-skripsi.vercel.app/generate-quiz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: selectedFiles, user_id: userId, num_questions: numQuestions, quiz_type: quizType })
      });
      const data = await res.json();
      if (data.quiz && data.quiz.length > 0) {
        setQuizQuestions(data.quiz);
        setQuizMode("playing");
      }
    } catch (e) { alert("Gagal buat kuis."); } finally { setIsQuizLoading(false); }
  };

  const handleCheck = async (selectedOption?: string) => {
    const answerToProcess = quizType === "pg" ? selectedOption : userAnswer;
    if (!answerToProcess) return;
    setIsChecking(true);
    try {
      const res = await fetch("https://rag-backend-skripsi.vercel.app/check-answer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, file_name: selectedFiles[0], question_id: quizQuestions[currentIdx].id, user_answer: answerToProcess, quiz: quizQuestions })
      });
      const data = await res.json();
      setQuizScores(prev => [...prev, data.similarity]);
      setQuizFeedback({ ...data, user_ans: answerToProcess });
      setQuizReviewData(prev => [...prev, { question: quizQuestions[currentIdx].question, user_answer: answerToProcess, reference: data.reference_answer || data.reference, similarity: data.similarity, feedback: data.feedback }]);
    } catch (e) { alert("Gagal evaluasi."); } finally { setIsChecking(false); }
  };

  const handleNext = async () => {
    if (currentIdx < quizQuestions.length - 1) {
      setQuizFeedback(null); setUserAnswer(""); setCurrentIdx(prev => prev + 1);
    } else {
      const finalScore = Math.round(quizScores.reduce((a, b) => a + b, 0) / quizQuestions.length);
      try {
        await fetch("https://rag-backend-skripsi.vercel.app/save-quiz-history", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, session_id: sessionId, quiz_type: quizType, num_questions: quizQuestions.length, score: finalScore, review_data: quizReviewData })
        });
        fetchData(userId!, sessionId);
      } catch (err) { console.error("Gagal simpan riwayat."); }
      setQuizMode("result");
    }
  };

  const handleFileUpload = async (e: any) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("user_id", userId!);
    Array.from(e.target.files as FileList).forEach(f => formData.append("files", f));
    try {
      const res = await fetch("https://rag-backend-skripsi.vercel.app/upload", { method: "POST", body: formData });
      const data = await res.json();
      setUploadedFiles(prev => Array.from(new Set([...prev, ...data.files])));
    } catch (err) { alert("Gagal unggah."); } finally { setIsUploading(false); }
  };

  const handleAsk = async (e: any) => {
    e.preventDefault(); 
    if (!question.trim()) return;
    const q = question; setQuestion(""); 
    
    // Simpan status apakah ini chat pertama
    const isFirstChat = chatHistory.length === 0;
    
    setChatHistory(p => [...p, {role: "user", content: q}]); 
    setIsChatLoading(true);
    try {
      const res = await fetch("https://rag-backend-skripsi.vercel.app/chat", {
        method: "POST", headers: {"Content-Type": "application/json"},
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
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 text-gray-500 hover:bg-gray-50 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold cursor-pointer hover:bg-blue-700 shadow-sm" onClick={() => router.push("/home")}>
              {userName.substring(0, 1).toUpperCase()}
            </div>
            <h1 className="text-gray-900 font-bold text-sm md:text-lg hidden sm:block">Asisten Akademik</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => setIsQuizSidebarOpen(!isQuizSidebarOpen)} className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-all" title="Buka Evaluasi">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z"/></svg>
          </button>
          <button onClick={handleNewChat} className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-md active:scale-90 transition-all" title="Percakapan Baru">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          </button>
          <button onClick={() => router.push("/home")} className="p-2.5 bg-gray-50 text-gray-500 rounded-full border border-gray-100 hover:bg-blue-50 transition-all shadow-sm" title="Kembali ke Beranda">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {(isSidebarOpen || (isQuizSidebarOpen && window.innerWidth < 1024)) && (
          <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => {setIsSidebarOpen(false); setIsQuizSidebarOpen(false);}} />
        )}

        <aside className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative w-72 h-[calc(100vh-64px)] bg-white border-r border-gray-100 flex flex-col z-20 transition-transform duration-300 shadow-xl md:shadow-none`}>
          <div className="p-5">
            <h2 className="font-bold text-xs text-gray-400 uppercase tracking-widest mb-4">Materi Anda</h2>
            <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 p-4 rounded-2xl text-xs font-bold text-gray-500 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
              {isUploading ? "MENGUNGGAH..." : "+ UPLOAD DOKUMEN"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 custom-scrollbar">
            {uploadedFiles.map(f => (
              <label key={f} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer border border-transparent group transition-all">
                <input type="checkbox" checked={selectedFiles.includes(f)} onChange={e => e.target.checked ? setSelectedFiles(p => [...p, f]) : setSelectedFiles(p => p.filter(x => x !== f))} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-xs font-semibold text-gray-600 truncate group-hover:text-blue-600">{f}</span>
              </label>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative bg-[#F9FAFB] w-full min-w-0 transition-all duration-300 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-4 pt-6 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              {chatHistory.length === 0 && (
                <div className="text-center mt-20">
                  <div className="inline-block p-4 bg-white rounded-3xl shadow-sm border border-gray-100 mb-6">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight text-center">Halo, {userName}!</h2>
                  <p className="text-gray-500 text-sm mt-2 text-center">Silakan pilih dokumen di kiri untuk mulai belajar.</p>
                </div>
              )}
              {chatHistory.map((c, i) => (
                <div key={i} className={`flex ${c.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-4 md:p-5 rounded-2xl text-[14px] shadow-sm max-w-[85%] ${c.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]"}`}>
                    {c.role === "user" ? <p className="whitespace-pre-wrap">{c.content}</p> : <div className="prose prose-sm max-w-none space-y-4 [&>ul]:list-disc [&>ul]:ml-5 [&>ol]:list-decimal [&>ol]:ml-5"><ReactMarkdown>{c.content}</ReactMarkdown></div>}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="text-[11px] font-bold text-blue-600 animate-pulse bg-white px-4 py-2 rounded-full border w-fit">AI sedang menganalisis...</div>
              )}
              <div ref={chatEndRef} className="h-4" />
            </div>
          </div>
          <div className="p-4 bg-[#F9FAFB] z-10">
            <form onSubmit={handleAsk} className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-2 flex gap-2">
              <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Tanyakan sesuatu..." className="flex-1 px-4 py-3 outline-none text-sm text-gray-700 bg-transparent" />
              <button type="submit" disabled={isChatLoading || !question.trim()} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black hover:bg-blue-700 transition-all shrink-0 uppercase tracking-widest">KIRIM</button>
            </form>
          </div>
        </main>

        {isQuizSidebarOpen && (
          <aside className="w-80 md:w-96 h-[calc(100vh-64px)] bg-white border-l border-gray-100 flex flex-col z-20 transition-all duration-300 animate-in slide-in-from-right shrink-0">
            <div className="p-6 flex flex-col h-full overflow-hidden">
               <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-3">
                 <h2 className="font-black text-xs text-gray-400 uppercase tracking-widest">Evaluasi Belajar</h2>
                 <button onClick={() => setIsQuizSidebarOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                 </button>
               </div>

               {quizMode === "setup" && (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="space-y-6 shrink-0">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Format Kuis</label>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setQuizType("essay")} className={`flex-1 py-3 rounded-2xl text-[10px] font-black border transition-all ${quizType === "essay" ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-gray-50 text-gray-500'}`}>ESSAY</button>
                        <button onClick={() => setQuizType("pg")} className={`flex-1 py-3 rounded-2xl text-[10px] font-black border transition-all ${quizType === "pg" ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-gray-50 text-gray-500'}`}>PILIHAN GANDA</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jumlah Soal</label>
                      <input 
                        type="number" 
                        value={numQuestions} 
                        onChange={(e) => setNumQuestions(Math.max(1, Math.min(parseInt(e.target.value)||1, quizType === "pg" ? 40 : 20)))} 
                        className="w-full mt-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-center outline-none" 
                      />
                      <p className="text-[9px] text-gray-400 mt-2 italic text-center">
                        * Maksimal {quizType === "pg" ? "40 soal untuk Pilihan Ganda" : "20 soal untuk Essay"}
                      </p>
                    </div>
                    <button onClick={startQuiz} disabled={isQuizLoading} className={`w-full py-4 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all uppercase tracking-widest mt-4 ${selectedFiles.length === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-black"}`}>{isQuizLoading ? "MEMPROSES..." : "MULAI KUIS"}</button>
                  </div>

                  {quizSessionHistory.length > 0 && (
                    <div className="mt-8 flex-1 overflow-y-auto custom-scrollbar pr-1">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Riwayat Terakhir</h3>
                      <div className="space-y-3 pb-6">
                        {quizSessionHistory.map((hist, idx) => {
                          const score = hist.score ?? 0;
                          const getScoreColor = (val: number) => {
                            if (val >= 80) return "text-emerald-500"; 
                            if (val >= 60) return "text-orange-500";  
                            return "text-rose-500";                   
                          };
                          const getBorderColor = (val: number) => {
                            if (val >= 80) return "border-emerald-100 bg-emerald-50/20";
                            if (val >= 60) return "border-orange-100 bg-orange-50/20";
                            return "border-rose-100 bg-rose-50/20";
                          };

                          return (
                            <div key={hist.id || idx} onClick={() => { if (hist.review_data) { setQuizReviewData(hist.review_data); setQuizMode("result"); } }} className={`p-4 rounded-2xl border flex justify-between items-center hover:shadow-md cursor-pointer transition-all group ${getBorderColor(score)}`}>
                              <div className="min-w-0">
                                <p className="text-[10px] font-black text-gray-800 uppercase truncate">{hist.quiz_type} • {hist.num_questions} Soal</p>
                                <p className="text-[9px] font-bold text-gray-400 mt-1">Selesai</p>
                              </div>
                              <div className={`text-xl font-black ${getScoreColor(score)}`}>{score}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {quizMode === "playing" && quizQuestions.length > 0 && (
                <div className="flex flex-col h-full overflow-hidden space-y-5 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-blue-600 p-5 rounded-3xl shadow-lg min-h-[140px] flex flex-col justify-between shrink-0 text-white">
                    <span className="text-[10px] font-black opacity-70 uppercase tracking-wider">Soal {currentIdx + 1} / {quizQuestions.length}</span>
                    <p className="text-sm font-bold leading-relaxed">{quizQuestions[currentIdx]?.question}</p>
                  </div>
                  {!quizFeedback ? (
                    <div className="flex-1 overflow-y-auto space-y-4 pb-4 custom-scrollbar">
                      {quizQuestions[currentIdx].options ? (
                        <div className="grid gap-2">
                          {quizQuestions[currentIdx].options.map((opt: string) => (
                            <button key={opt} onClick={() => handleCheck(opt)} className="text-left p-4 border border-gray-100 rounded-2xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all bg-white">{opt}</button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} className="w-full h-44 p-4 border border-gray-100 rounded-3xl text-sm outline-none bg-gray-50 resize-none" placeholder="Jawabanmu..." />
                          <button onClick={() => handleCheck()} disabled={isChecking || !userAnswer.trim()} className="w-full bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest">{isChecking ? "ANALISIS..." : "SUBMIT"}</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-4 pb-4 custom-scrollbar">
                      <div className={`p-5 rounded-3xl border ${quizFeedback.similarity >= 80 ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : quizFeedback.similarity >= 60 ? 'bg-orange-50 border-orange-100 text-orange-900' : 'bg-rose-50 border-rose-100 text-rose-900'}`}>
                        <span className="text-xl font-black">{quizFeedback.similarity}%</span>
                        <p className="text-xs font-bold mt-2 italic leading-relaxed">"{quizFeedback.feedback}"</p>
                      </div>
                      <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 text-[12px]">
                        <p className="font-black text-gray-400 uppercase text-[9px] mb-2 tracking-widest">Kunci:</p>
                        <p className="text-gray-700 italic leading-relaxed">{quizFeedback.reference_answer || quizFeedback.reference}</p>
                      </div>
                      <button onClick={handleNext} className="w-full bg-gray-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shrink-0">{currentIdx === quizQuestions.length - 1 ? "SELESAI" : "NEXT"}</button>
                    </div>
                  )}
                </div>
              )}

              {quizMode === "result" && (
                <div className="flex flex-col h-full overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="text-center pb-6 border-b border-gray-100 shrink-0">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Skor Akhir</h3>
                    <div className={`text-6xl font-black ${(quizReviewData.reduce((a, b) => a + b.similarity, 0) / (quizReviewData.length || 1)) >= 80 ? 'text-emerald-500' : (quizReviewData.reduce((a, b) => a + b.similarity, 0) / (quizReviewData.length || 1)) >= 60 ? 'text-orange-500' : 'text-rose-500'}`}>
                      {Math.round(quizReviewData.reduce((a, b) => a + b.similarity, 0) / (quizReviewData.length || 1))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
                    {quizReviewData.map((item, idx) => (
                      <div key={idx} className="bg-white p-4 border border-gray-100 rounded-2xl shadow-sm space-y-2">
                        <p className="text-xs font-bold text-gray-800 leading-snug">{item.question}</p>
                        <div className="bg-gray-50 p-2 rounded-xl text-[11px] text-gray-600 italic">"{item.user_answer}"</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { if (userId && sessionId) fetchData(userId, sessionId); setQuizQuestions([]); setQuizMode("setup"); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase mt-4">UTAMA</button>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #E5E7EB; border-radius: 10px; }`}} />
    </div>
  );
}
