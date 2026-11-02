import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";

interface AdminContext {
  uid: string;
  email: string;
  name: string;
}

async function verifyAdminCaller(req: Request): Promise<{ admin: AdminContext } | { errorResponse: NextResponse }> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      errorResponse: NextResponse.json(
        { error: "Autentikasi diperlukan. Token tidak ditemukan." },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7).trim();
  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Token tidak valid";
    return {
      errorResponse: NextResponse.json(
        { error: `Sesi login tidak valid atau kadaluarsa: ${message}` },
        { status: 401 }
      ),
    };
  }

  // Check role & active status from Firestore
  const adminDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
  if (!adminDoc.exists) {
    return {
      errorResponse: NextResponse.json(
        { error: "Data pengguna admin tidak ditemukan di database." },
        { status: 403 }
      ),
    };
  }

  const adminData = adminDoc.data();
  if (adminData?.role !== "admin" || adminData?.isActive !== true) {
    return {
      errorResponse: NextResponse.json(
        { error: "Akses ditolak. Tindakan ini memerlukan hak akses Admin aktif." },
        { status: 403 }
      ),
    };
  }

  return {
    admin: {
      uid: decodedToken.uid,
      email: decodedToken.email || adminData.email || "",
      name: adminData.name || "Admin",
    },
  };
}

// POST: Create a new user with Firebase Auth & Firestore
export async function POST(req: Request) {
  const authResult = await verifyAdminCaller(req);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const role = body.role === "admin" ? "admin" : body.role === "warga" ? "warga" : "petugas";
    const isActive = body.isActive !== false;

    if (!name || name.length < 3) {
      return NextResponse.json({ error: "Nama lengkap minimal 3 karakter." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password akun minimal 6 karakter." }, { status: 400 });
    }

    // Check if user already exists in Firestore users
    const existingSnap = await adminDb.collection("users").where("email", "==", email).get();
    if (!existingSnap.empty) {
      return NextResponse.json({ error: "Email sudah terdaftar pada pengguna lain." }, { status: 400 });
    }

    // 1. Create User in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
      disabled: !isActive,
    });

    // 2. Write User Document in Firestore with Auth UID
    await adminDb.collection("users").doc(userRecord.uid).set({
      name,
      email,
      role,
      isActive,
      emailVerified: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna ${name} berhasil dibuat.`,
      user: {
        id: userRecord.uid,
        name,
        email,
        role,
        isActive,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    console.error("Error creating user:", err);
    return NextResponse.json({ error: `Gagal membuat pengguna: ${message}` }, { status: 500 });
  }
}

// PATCH: Update user profile, role, status, or reset password
export async function PATCH(req: Request) {
  const authResult = await verifyAdminCaller(req);
  if ("errorResponse" in authResult) return authResult.errorResponse;
  const currentAdmin = authResult.admin;

  try {
    const body = await req.json();
    const targetUserId = String(body.targetUserId || "").trim();

    if (!targetUserId) {
      return NextResponse.json({ error: "ID target pengguna diperlukan." }, { status: 400 });
    }

    const targetDocRef = adminDb.collection("users").doc(targetUserId);
    const targetDoc = await targetDocRef.get();
    if (!targetDoc.exists) {
      return NextResponse.json({ error: "Data pengguna target tidak ditemukan." }, { status: 404 });
    }
    const currentTargetData = targetDoc.data();

    const isSelf = targetUserId === currentAdmin.uid;

    // Self-Protection Invariants
    if (isSelf) {
      if (body.role !== undefined && body.role !== "admin") {
        return NextResponse.json(
          { error: "Pencegahan keamanan: Anda tidak dapat menurunkan role akun admin Anda sendiri." },
          { status: 400 }
        );
      }
      if (body.isActive !== undefined && body.isActive === false) {
        return NextResponse.json(
          { error: "Pencegahan keamanan: Anda tidak dapat menonaktifkan akun Anda sendiri." },
          { status: 400 }
        );
      }
    }

    // Role count safety: prevent demoting the last active admin
    if (body.role !== undefined && body.role !== "admin" && currentTargetData?.role === "admin") {
      const adminUsersSnap = await adminDb
        .collection("users")
        .where("role", "==", "admin")
        .where("isActive", "==", true)
        .get();

      if (adminUsersSnap.size <= 1) {
        return NextResponse.json(
          { error: "Tidak dapat mengubah role admin ini: sistem harus memiliki minimal satu admin aktif." },
          { status: 400 }
        );
      }
    }

    // Status count safety: prevent deactivating the last active admin
    if (body.isActive === false && currentTargetData?.role === "admin" && currentTargetData?.isActive === true) {
      const adminUsersSnap = await adminDb
        .collection("users")
        .where("role", "==", "admin")
        .where("isActive", "==", true)
        .get();

      if (adminUsersSnap.size <= 1) {
        return NextResponse.json(
          { error: "Tidak dapat menonaktifkan admin ini: sistem harus memiliki minimal satu admin aktif." },
          { status: 400 }
        );
      }
    }

    const firestoreUpdates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    const authUpdates: { displayName?: string; disabled?: boolean; password?: string } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 3) {
        return NextResponse.json({ error: "Nama lengkap minimal 3 karakter." }, { status: 400 });
      }
      firestoreUpdates.name = name;
      authUpdates.displayName = name;
    }

    if (body.role !== undefined) {
      if (!["admin", "petugas", "warga"].includes(body.role)) {
        return NextResponse.json({ error: "Role yang dipilih tidak valid." }, { status: 400 });
      }
      firestoreUpdates.role = body.role;
    }

    if (body.isActive !== undefined) {
      const nextActive = Boolean(body.isActive);
      firestoreUpdates.isActive = nextActive;
      authUpdates.disabled = !nextActive;
    }

    if (body.password !== undefined && String(body.password).trim() !== "") {
      const password = String(body.password).trim();
      if (password.length < 6) {
        return NextResponse.json({ error: "Password baru minimal 6 karakter." }, { status: 400 });
      }
      authUpdates.password = password;
    }

    // 1. Update Firebase Auth if needed (catch if auth user doesn't exist)
    if (Object.keys(authUpdates).length > 0) {
      try {
        await adminAuth.updateUser(targetUserId, authUpdates);
      } catch (authErr: unknown) {
        console.warn(`Auth user not found or error for ${targetUserId}, updating Firestore only:`, authErr);
      }
    }

    // 2. Update Firestore Document
    await targetDocRef.update(firestoreUpdates);

    return NextResponse.json({
      success: true,
      message: "Data pengguna berhasil diperbarui.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    console.error("Error updating user:", err);
    return NextResponse.json({ error: `Gagal memperbarui pengguna: ${message}` }, { status: 500 });
  }
}

// DELETE: Safely delete user from Firebase Auth & Firestore
export async function DELETE(req: Request) {
  const authResult = await verifyAdminCaller(req);
  if ("errorResponse" in authResult) return authResult.errorResponse;
  const currentAdmin = authResult.admin;

  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("targetUserId") || "";

    if (!targetUserId) {
      return NextResponse.json({ error: "ID target pengguna diperlukan." }, { status: 400 });
    }

    if (targetUserId === currentAdmin.uid) {
      return NextResponse.json(
        { error: "Pencegahan keamanan: Anda tidak dapat menghapus akun Anda sendiri." },
        { status: 400 }
      );
    }

    const targetDocRef = adminDb.collection("users").doc(targetUserId);
    const targetDoc = await targetDocRef.get();
    if (!targetDoc.exists) {
      return NextResponse.json({ error: "Data pengguna tidak ditemukan." }, { status: 404 });
    }
    const targetData = targetDoc.data();

    // Prevent deleting the last active admin
    if (targetData?.role === "admin" && targetData?.isActive === true) {
      const adminUsersSnap = await adminDb
        .collection("users")
        .where("role", "==", "admin")
        .where("isActive", "==", true)
        .get();

      if (adminUsersSnap.size <= 1) {
        return NextResponse.json(
          { error: "Tidak dapat menghapus admin ini: sistem harus memiliki minimal satu admin aktif." },
          { status: 400 }
        );
      }
    }

    // 1. Delete from Firebase Auth if exists
    try {
      await adminAuth.deleteUser(targetUserId);
    } catch (authErr: unknown) {
      console.warn(`Auth user ${targetUserId} not found or failed to delete:`, authErr);
    }

    // 2. Delete Firestore Document
    await targetDocRef.delete();

    return NextResponse.json({
      success: true,
      message: `Akun pengguna ${targetData?.name || targetUserId} berhasil dihapus.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    console.error("Error deleting user:", err);
    return NextResponse.json({ error: `Gagal menghapus pengguna: ${message}` }, { status: 500 });
  }
}
