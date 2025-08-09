import { NextRequest } from 'next/server';
import { API } from '../../../lib/sync/engine';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const input = Object.fromEntries(url.searchParams.entries());
  const result = await API.request({ method: 'GET', path: url.pathname, ...input });
  const response = await API._waitForResponse({ request: result.request });
  return Response.json(response);
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const result = await API.request({ method: 'POST', path: url.pathname, ...body });
  const response = await API._waitForResponse({ request: result.request });
  return Response.json(response);
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const input = Object.fromEntries(url.searchParams.entries());
  const result = await API.request({ method: 'DELETE', path: url.pathname, ...input });
  const response = await API._waitForResponse({ request: result.request });
  return Response.json(response);
}


