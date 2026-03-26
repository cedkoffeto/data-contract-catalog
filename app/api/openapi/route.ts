import { NextResponse } from "next/server";

import { generateOpenApiDocument } from "@/src/lib/openapi";

export function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const spec = generateOpenApiDocument(baseUrl);

  return NextResponse.json(spec);
}
