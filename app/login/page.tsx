"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; 

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.user_id) {
        localStorage.setItem("user_id", data.user_id);
        router.push("/dashboard");
      } else {
        alert("Login Gagal: " + (data.error || "Cek email/password atau Register dulu."));
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("Tidak dapat terhubung ke server. Pastikan uvicorn sudah menyala di 127.0.0.1:8000");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutralBg flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <h2 className="text-3xl font-bold text-secondary mb-2 text-center">Selamat Datang</h2>
        <p className="text-tertiary mb-8 text-sm text-center">Masuk untuk mengakses asisten akademikmu.</p>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Email</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              placeholder="nama@kampus.ac.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 mt-2"
          >
            {isLoading ? "Memproses..." : "Masuk ke Dashboard"}
          </button>
        </form>

        {/* Register */}
        <p className="text-center text-sm text-secondary mt-8">
          Belum punya akun?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}