"use client";

import Link from "next/link";
import { useRouter } from "next/navigation"; 
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter(); 
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    
    if (password !== confirmPassword) {
      alert("Oops! Password dan Konfirmasi Password tidak cocok.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("https://rag-backend-skripsi.vercel.app/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email, 
          password: password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Pendaftaran berhasil! Silakan login pakai akun barumu.");
        router.push("/login"); 
      } else {
        alert("Gagal mendaftar: " + (data.error || "Mungkin email sudah digunakan."));
      }
    } catch (error) {
      console.error("Register Error:", error);
      alert("Gagal terhubung ke server. Pastikan uvicorn Python menyala.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-neutralBg">
      {/* Register Card */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-secondary mb-2">Buat Akun</h1>
          <p className="text-tertiary text-sm">Mulai belajar lebih cerdas dengan AI</p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleRegister}>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Nama Lengkap</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ketik Nama Lengkap"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@gmail.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Password</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            />
            <p className="text-xs text-tertiary mt-1 ml-1">Minimal 6 karakter</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Konfirmasi Password</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md mt-6 disabled:opacity-50"
          >
            {isLoading ? "Memproses..." : "Daftar Akun"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-secondary mt-8">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
