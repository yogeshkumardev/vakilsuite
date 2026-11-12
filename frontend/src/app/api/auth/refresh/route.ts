import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL || `${process.env.NEXT_BACKEND_URL || "http://localhost:8000"}/api/v1`;

export async function POST(request: NextRequest) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
        return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
    }
    const refreshToken = request.cookies.get("refresh_token")?.value;

    if (!refreshToken) {
        return NextResponse.json(
            { error: "No refresh token" },
            { status: 401 },
        );
    }

    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            cache: "no-store",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: `refresh_token=${refreshToken}`,
            },
        });

        if (!res.ok) {
            const response = NextResponse.json(
                { error: "Refresh failed" },
                { status: res.status },
            );
            if (res.status === 401) {
                response.cookies.delete("refresh_token");
                response.cookies.delete("access_token");
            }
            return response;
        }

        const data = await res.json();
        
        // BUG FIX: data.data.access_token, not data.access_token
        const accessToken = data?.data?.access_token;

        if (!accessToken) {
            return NextResponse.json(
                { error: "No token in response" },
                { status: 401 },
            );
        }

        const response = NextResponse.json({ access_token: accessToken });
        response.headers.set("Cache-Control", "no-store");
        for (const cookie of res.headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
        return response;
    } catch {
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
