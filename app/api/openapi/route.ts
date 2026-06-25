export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { generateOpenApiDocument } from "@/src/lib/openapi";
import { requireApiAuth } from "@/src/lib/require-auth";

export async function GET(request: Request) {
  const session = await requireApiAuth();
  if (session instanceof Response) {
    return session;
  }

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const spec = generateOpenApiDocument(baseUrl);

  return NextResponse.json(spec);
}
