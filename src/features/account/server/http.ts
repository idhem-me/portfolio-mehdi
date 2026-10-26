import { NextResponse, type NextRequest } from "next/server";
/** Site accounts are independent from a particular game's publication flags. */
export function accountGate(request: NextRequest, mutation = false) {
  if (
    mutation &&
    request.headers.get("origin") !==
      `${request.nextUrl.protocol}//${request.headers.get("host")}`
  )
    return new NextResponse("Forbidden", { status: 403 });
}
