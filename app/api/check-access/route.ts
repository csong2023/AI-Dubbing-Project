import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAllowedEmail } from "../../lib/allowed-users";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { allowed: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const allowed = await isAllowedEmail(session.user.email);

    return NextResponse.json({
      allowed,
      email: session.user.email,
    });
  } catch (error) {
    console.error("check-access route error:", error);

    return NextResponse.json(
      {
        allowed: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}