import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ date: string }> } // <- Make params a Promise
) {
  const { date } = await context.params; // <- Await it here
  const apiUrl = `https://onewordsearch.com/${date}.json`;

  const options = {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://onewordsearch.com/",
    },
  };

  try {
    const response = await fetch(apiUrl, options);
    if (!response.ok) throw new Error("Failed to fetch puzzle");

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 }
    );
  }
}
