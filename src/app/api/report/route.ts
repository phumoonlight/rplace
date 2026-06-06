import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { authedUserFromRequest } from "@/lib/auth/verify-id-token";

type ReportBody = {
  title?: unknown;
  desc?: unknown;
};

const MAX_TITLE_LEN = 200;
const MAX_DESC_LEN = 5000;

const POST = async (request: Request) => {
  const authed = await authedUserFromRequest(request);
  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ReportBody;
  try {
    body = (await request.json()) as ReportBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, desc } = body;
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LEN) {
    return NextResponse.json({ error: `Title too long (max ${MAX_TITLE_LEN})` }, { status: 400 });
  }
  if (typeof desc !== "string" || desc.trim().length === 0) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  if (desc.length > MAX_DESC_LEN) {
    return NextResponse.json({ error: `Description too long (max ${MAX_DESC_LEN})` }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = await db.collection("reports").add({
    uid: authed.uid,
    title: title.trim(),
    desc: desc.trim(),
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id });
};

export { POST };
