import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simplified middleware - no auth checks for demo mode
export async function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};
