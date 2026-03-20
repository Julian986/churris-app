import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserName } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userName = getAuthenticatedUserName(request);

  if (!userName) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  return NextResponse.json({ userName });
}
