"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl">
        <h1 className="text-5xl font-bold text-secondary mb-6">Asisten Akademik AI</h1>
        <p className="text-tertiary text-xl mb-10 leading-relaxed">
          Platform cerdas untuk membantu mahasiswa menganalisis jurnal, 
          membuat ringkasan, dan belajar lebih efektif dengan teknologi RAG.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login" className="px-8 py-3 bg-primary text-white rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg">
            Mulai Sekarang
          </Link>
          <button className="px-8 py-3 border border-gray-300 text-secondary rounded-full font-semibold hover:bg-gray-50 transition-all">
            Pelajari Lebih Lanjut
          </button>
        </div>
      </div>
      <footer className="absolute bottom-10 text-gray-400 text-sm">
        © 2026 Project Skripsi Alsyabella Saputra - Informatics - Gunadarma University
      </footer>
    </div>
  );
}