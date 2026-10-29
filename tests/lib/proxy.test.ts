import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const handleLocale = vi.hoisted(() => vi.fn());
vi.mock('next-intl/middleware', () => ({ default: vi.fn(() => handleLocale) }));
vi.mock('@/lib/auth/config', () => ({ isAuthEnabled: vi.fn() }));
vi.mock('@/lib/supabase/proxy', () => ({ refreshSession: vi.fn() }));

import { isAuthEnabled } from '@/lib/auth/config';
import { refreshSession } from '@/lib/supabase/proxy';
import proxy, { config } from '@/proxy';

const request = new NextRequest('http://localhost:3000/ko');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('proxy', () => {
  it('with accounts off, answers with the language handling alone', async () => {
    vi.mocked(isAuthEnabled).mockReturnValue(false);
    const intlResponse = NextResponse.next();
    handleLocale.mockReturnValue(intlResponse);

    expect(await proxy(request)).toBe(intlResponse);
    expect(handleLocale).toHaveBeenCalledWith(request);
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('with accounts on, refreshes the session on the response the language handling made', async () => {
    vi.mocked(isAuthEnabled).mockReturnValue(true);
    const intlResponse = NextResponse.next();
    const refreshed = NextResponse.next();
    handleLocale.mockReturnValue(intlResponse);
    vi.mocked(refreshSession).mockResolvedValue(refreshed);

    expect(await proxy(request)).toBe(refreshed);
    expect(refreshSession).toHaveBeenCalledWith(request, intlResponse);
  });

  it('keeps skipping API routes, framework files and anything with a file extension', () => {
    expect(config.matcher).toBe('/((?!api|trpc|_next|_vercel|.*\\..*).*)');
  });
});
