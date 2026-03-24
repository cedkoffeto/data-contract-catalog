import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Data Product Contract Catalog API",
      version: "1.0.0",
      description: "OpenAPI documentation for the Next.js data contract catalog project."
    },
    servers: [{ url: baseUrl, description: "Current server" }],
    paths: {
      "/": {
        get: {
          summary: "Catalog page",
          description: "Returns the HTML catalog page listing all data contracts.",
          responses: {
            "200": {
              description: "Catalog HTML page",
              content: { "text/html": { schema: { type: "string" } } }
            }
          }
        }
      },
      "/{slug}": {
        get: {
          summary: "Contract detail page",
          description: "Returns the HTML page for one data contract.",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Contract slug (for example: crm_ov)"
            }
          ],
          responses: {
            "200": {
              description: "Contract HTML page",
              content: { "text/html": { schema: { type: "string" } } }
            },
            "404": { description: "Contract not found" }
          }
        }
      },
      "/api/contracts": {
        get: {
          summary: "List contracts",
          description: "Returns contract metadata used by the catalog.",
          responses: {
            "200": {
              description: "Contracts list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            slug: { type: "string" },
                            title: { type: "string" },
                            version: { type: "string" },
                            owner: { type: "string" },
                            description: { type: "string" },
                            maturity: { type: "string" },
                            domain: { type: "string" },
                            url: { type: "string" }
                          },
                          required: ["slug", "title", "version", "owner", "description", "maturity", "domain", "url"]
                        }
                      }
                    },
                    required: ["items"]
                  }
                }
              }
            }
          }
        }
      },
      "/api/healthz": {
        get: {
          summary: "Health check",
          responses: {
            "200": {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { status: { type: "string", example: "ok" } },
                    required: ["status"]
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  return NextResponse.json(spec);
}
