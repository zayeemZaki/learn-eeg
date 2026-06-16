/**
 * Admin-only token route for client-direct EEG image uploads to Vercel Blob.
 *
 * The browser's `upload()` (from @vercel/blob/client) calls this route to get a
 * short-lived client token, then streams the file bytes straight to Blob —
 * never through this serverless function — so we sidestep the request-body size
 * limit. The bytes are large; the trust decision is small and lives HERE.
 *
 * SECURITY BOUNDARY: this endpoint must never issue a token to a non-admin.
 * `onBeforeGenerateToken` runs auth() and throws unless role === "ADMIN", and
 * the issued token is constrained to image content types and a max size so even
 * a leaked token can't be used to upload arbitrary/huge payloads.
 */
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { auth } from "@/auth";
import { env } from "@/env";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/validations/question";

export async function POST(request: Request): Promise<NextResponse> {
  // Gate FIRST, before anything else: a non-admin must always get 401 and learn
  // nothing about whether Blob is configured. (onBeforeGenerateToken re-checks
  // below as defence in depth.)
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fail clearly (not cryptically) if Blob isn't configured for this deploy.
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Image uploads are not configured (missing BLOB_READ_WRITE_TOKEN)." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      request,
      body,
      token: env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => {
        // The gate. Anyone can POST here; only admins leave with a token.
        const session = await auth();
        if (session?.user?.role !== "ADMIN") {
          throw new Error("Unauthorized");
        }
        return {
          allowedContentTypes: [...ALLOWED_IMAGE_TYPES],
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          // A random suffix avoids collisions when two images share a name.
          addRandomSuffix: true,
        };
      },
      // No DB write on completion: the resulting URL is returned to the client,
      // which puts it on the form and persists it via the question action.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    // Refused tokens (non-admin) read as 401; everything else as a 400.
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
