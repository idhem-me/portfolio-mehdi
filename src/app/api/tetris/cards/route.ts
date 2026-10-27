import { NextResponse } from "next/server";
/** Historical whole-save endpoint is retired: economic state only changes through RPC. */
const retired = () =>
  NextResponse.json(
    { error: "Cette version de sauvegarde a été remplacée. Recharge le jeu." },
    { status: 410, headers: { "Cache-Control": "private, no-store" } },
  );
export const GET = retired;
export const PUT = retired;
