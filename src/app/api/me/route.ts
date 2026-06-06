import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { authedUserFromRequest } from "@/lib/auth/verify-id-token";
import { newUserDoc, serializeUserDoc } from "@/lib/user/user-doc";

const GET = async (request: Request) => {
  const authed = await authedUserFromRequest(request);
  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const ref = db.collection("users").doc(authed.uid);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set(
      newUserDoc({
        uid: authed.uid,
        displayName: authed.name ?? authed.email ?? "Anonymous",
        photoURL: authed.picture,
      }),
    );
    const created = await ref.get();
    return NextResponse.json(serializeUserDoc(created.data() as never));
  }

  return NextResponse.json(serializeUserDoc(snap.data() as never));
};

export { GET };
