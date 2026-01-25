/**
 * Integration test for /api/referrals endpoint
 * Tests the full request/response cycle with mocked Supabase
 */

import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/referrals/route';

// Mock Supabase client
jest.mock('@/lib/supabase-server', () => ({
    createServerSupabaseClient: jest.fn(() => ({
        auth: {
            getUser: jest.fn(() => ({
                data: {
                    user: {
                        id: '11111111-1111-1111-1111-111111111111',
                    },
                },
                error: null,
            })),
        },
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: jest.fn(() => ({
                        data: { id: '11111111-1111-1111-1111-111111111111', role: 'doctor' },
                        error: null,
                    })),
                })),
                order: jest.fn(() => ({
                    data: [
                        {
                            id: 'a0000001-0000-0000-0000-000000000001',
                            patient_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                            doctor_id: '11111111-1111-1111-1111-111111111111',
                            specialist_type: 'Cardiology',
                            status: 'ELIGIBILITY_CONFIRMED',
                            risk_level: 'LOW',
                            created_at: new Date().toISOString(),
                        },
                    ],
                    error: null,
                })),
            })),
            insert: jest.fn(() => ({
                select: jest.fn(() => ({
                    single: jest.fn(() => ({
                        data: {
                            id: 'new-referral-id',
                            status: 'CREATED',
                        },
                        error: null,
                    })),
                })),
            })),
        })),
    })),
}));

// Mock Redis rate limiting
jest.mock('@/lib/redis', () => ({
    checkRateLimit: jest.fn(() => Promise.resolve({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 })),
}));

describe('/api/referrals', () => {
    describe('GET', () => {
        it('should return referrals for authenticated doctor', async () => {
            const { req } = createMocks({
                method: 'GET',
                url: '/api/referrals',
            });

            const response = await GET(req as any);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
            expect(data[0]).toHaveProperty('specialist_type');
        });

        it('should filter by status when provided', async () => {
            const { req } = createMocks({
                method: 'GET',
                url: '/api/referrals?status=ELIGIBILITY_CONFIRMED',
            });

            const response = await GET(req as any);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.every((r: any) => r.status === 'ELIGIBILITY_CONFIRMED')).toBe(true);
        });
    });

    describe('POST', () => {
        it('should create a new referral with valid data', async () => {
            const { req } = createMocks({
                method: 'POST',
                url: '/api/referrals',
                body: {
                    patient_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    specialist_type: 'Cardiology',
                    diagnosis_codes: ['I10'],
                    clinical_summary: 'Test referral',
                    urgency_level: 'ROUTINE',
                },
            });

            const response = await POST(req as any);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data).toHaveProperty('id');
            expect(data.status).toBe('CREATED');
        });

        it('should reject invalid referral data', async () => {
            const { req } = createMocks({
                method: 'POST',
                url: '/api/referrals',
                body: {
                    // Missing required fields
                    specialist_type: 'Cardiology',
                },
            });

            const response = await POST(req as any);

            expect(response.status).toBe(400);
        });

        it('should enforce rate limiting', async () => {
            // Mock rate limit exceeded
            const { checkRateLimit } = require('@/lib/redis');
            checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

            const { req } = createMocks({
                method: 'POST',
                url: '/api/referrals',
                body: {
                    patient_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    specialist_type: 'Cardiology',
                    diagnosis_codes: ['I10'],
                    clinical_summary: 'Test referral',
                    urgency_level: 'ROUTINE',
                },
            });

            const response = await POST(req as any);

            expect(response.status).toBe(429);
        });
    });
});
