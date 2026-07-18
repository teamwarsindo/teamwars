"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function loginAdmin(formData: FormData) {
  const email = formData.get("email")
  const password = formData.get("password")

  // Ambil dari variabel environment
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  // Validasi kredensial
  if (email === adminEmail && password === adminPassword) {
    // Set cookie sesi (contoh sederhana)
    cookies().set("admin_session", "true", { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 // 1 hari
    })
    
    return { success: true }
  }

  return { success: false, error: "Email atau password salah!" }
}
