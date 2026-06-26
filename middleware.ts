import { NextResponse, type NextRequest } from "next/server";
import {
  readPrivateToolAccessTokenFromHeaders,
  verifyPrivateToolAccessTokenForMiddleware,
} from "./src/lib/security/private-tool-access-edge";

export async function middleware(request: NextRequest) {
  const accessToken = readPrivateToolAccessTokenFromHeaders(request.headers);

  if (!(await verifyPrivateToolAccessTokenForMiddleware(accessToken))) {
    return NextResponse.json({ error: "access_denied" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/lucas/stock-decision/:path*"],
};
