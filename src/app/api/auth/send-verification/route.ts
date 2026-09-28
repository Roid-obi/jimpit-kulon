import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    // 1. Generate Email Verification Link via Firebase Admin
    const actionCodeSettings = {
      // URL yang akan dibuka setelah verifikasi selesai (Bisa diarahkan ke dashboard/login)
      url: process.env.NEXT_PUBLIC_APP_URL || "https://jimpit-kulon.vercel.app/login",
      handleCodeInApp: false, // set true jika butuh handling di aplikasi
    };

    const verificationLink = await adminAuth.generateEmailVerificationLink(
      email,
      actionCodeSettings,
    );

    // 2. Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 3. Email HTML Template (Tampilan UI yang menarik)
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifikasi Email - Jimpit Kulon</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background-color: #1a1a1a; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
        .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
        .content p { margin-top: 0; font-size: 16px; }
        .btn-container { text-align: center; margin: 35px 0; }
        .btn { display: inline-block; background-color: #facc15; color: #000000; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; }
        .footer { background-color: #fafafa; padding: 20px; text-align: center; font-size: 13px; color: #888888; border-top: 1px solid #eeeeee; }
        .link-text { font-size: 12px; color: #666666; word-break: break-all; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Jimpit Kulon</h1>
        </div>
        <div class="content">
          <p>Halo!</p>
          <p>Terima kasih telah mendaftar di <strong>Jimpit Kulon</strong>. Untuk mulai menggunakan akun Anda, silakan verifikasi alamat email Anda dengan mengklik tombol di bawah ini:</p>
          
          <div class="btn-container">
            <a href="${verificationLink}" class="btn">Verifikasi Email Saya</a>
          </div>
          
          <p>Jika tombol di atas tidak berfungsi, Anda juga dapat menyalin dan menempelkan tautan berikut ke browser Anda:</p>
          <p class="link-text">${verificationLink}</p>
          
          <p style="margin-top: 30px; font-size: 14px;">Jika Anda tidak merasa mendaftar di Jimpit Kulon, Anda dapat mengabaikan email ini.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Jimpit Kulon. Semua hak cipta dilindungi.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // 4. Send Email
    const mailOptions = {
      from: `"Jimpit Kulon" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🔑 Verifikasi Email Anda - Jimpit Kulon",
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Verification email sent successfully" });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return NextResponse.json(
      { error: "Failed to send verification email", details: error.message },
      { status: 500 },
    );
  }
}
