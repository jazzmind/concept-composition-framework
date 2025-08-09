import { API } from "@/lib/sync/engine";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const input: Record<string, any> = {};
  
  // Get query parameters
  url.searchParams.forEach((value, key) => {
    input[key] = value;
  });
  
  // Get path parameters from URL
  const pathSegments = url.pathname.split('/api/')[1]?.split('/') || [];
  if (pathSegments.length > 1) {
    // Handle path parameters like /api/quizzes/:quiz
    if (pathSegments[0] === 'quizzes' && pathSegments.length >= 2) {
      input.quiz = pathSegments[1];
    }
    if (pathSegments[0] === 'questions' && pathSegments.length >= 2) {
      input.question = pathSegments[1];
    }
    if (pathSegments[0] === 'options' && pathSegments.length >= 2) {
      input.option = pathSegments[1];
    }
    if (pathSegments[0] === 'activations' && pathSegments.length >= 2) {
      input.activation = pathSegments[1];
    }
  }

  const result = await API.request({
    method: 'GET',
    path: url.pathname,
    ...input
  });

  const response = await API._waitForResponse({ request: result.request });
  return Response.json(response);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const url = new URL(request.url);

  // Get path parameters from URL
  const pathSegments = url.pathname.split('/api/')[1]?.split('/') || [];
  if (pathSegments.length > 1) {
    if (pathSegments[0] === 'quizzes' && pathSegments.length >= 2) {
      body.quiz = pathSegments[1];
    }
    if (pathSegments[0] === 'questions' && pathSegments.length >= 2) {
      body.question = pathSegments[1];
    }
    if (pathSegments[0] === 'options' && pathSegments.length >= 2) {
      body.option = pathSegments[1];
    }
    if (pathSegments[0] === 'activations' && pathSegments.length >= 2) {
      body.activation = pathSegments[1];
    }
  }

  const result = await API.request({
    method: 'POST',
    path: url.pathname,
    ...body
  });

  const response = await API._waitForResponse({ request: result.request });
  return Response.json(response);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const url = new URL(request.url);

  // Get path parameters from URL
  const pathSegments = url.pathname.split('/api/')[1]?.split('/') || [];
  if (pathSegments.length > 1) {
    if (pathSegments[0] === 'quizzes' && pathSegments.length >= 2) {
      body.quiz = pathSegments[1];
    }
    if (pathSegments[0] === 'questions' && pathSegments.length >= 2) {
      body.question = pathSegments[1];
    }
    if (pathSegments[0] === 'options' && pathSegments.length >= 2) {
      body.option = pathSegments[1];
    }
    if (pathSegments[0] === 'activations' && pathSegments.length >= 2) {
      body.activation = pathSegments[1];
    }
  }

  const result = await API.request({
    method: 'PUT',
    path: url.pathname,
    ...body
  });

  const response = await API._waitForResponse({ request: result.request });
  return Response.json(response);
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const input: Record<string, any> = {};

  // Get path parameters from URL
  const pathSegments = url.pathname.split('/api/')[1]?.split('/') || [];
  if (pathSegments.length > 1) {
    if (pathSegments[0] === 'quizzes' && pathSegments.length >= 2) {
      input.quiz = pathSegments[1];
    }
    if (pathSegments[0] === 'questions' && pathSegments.length >= 2) {
      input.question = pathSegments[1];
    }
    if (pathSegments[0] === 'options' && pathSegments.length >= 2) {
      input.option = pathSegments[1];
    }
    if (pathSegments[0] === 'activations' && pathSegments.length >= 2) {
      input.activation = pathSegments[1];
    }
  }

  const result = await API.request({
    method: 'DELETE',
    path: url.pathname,
    ...input
  });

  const response = await API._waitForResponse({ request: result.request });
  return Response.json(response);
}
