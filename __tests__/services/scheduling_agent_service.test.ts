import { parseAvailability, findMatchingSlots } from '@/services/scheduling_agent_service';
import { Specialist } from '@/types';

describe('Scheduling Agent Service', () => {
    describe('parseAvailability', () => {
        it('should parse "weekday mornings" correctly', () => {
            const slots = parseAvailability('weekday mornings');

            expect(slots.length).toBeGreaterThan(0);
            expect(slots.every(s => s.start_time === '09:00' && s.end_time === '12:00')).toBe(true);
            expect(slots.some(s => s.day === 'monday')).toBe(true);
            expect(slots.some(s => s.day === 'friday')).toBe(true);
        });

        it('should parse "Monday afternoons" correctly', () => {
            const slots = parseAvailability('Monday afternoons');

            expect(slots.length).toBeGreaterThan(0);
            expect(slots.every(s => s.day === 'monday')).toBe(true);
            expect(slots.every(s => s.start_time === '12:00' && s.end_time === '17:00')).toBe(true);
        });

        it('should default to weekdays any time for vague input', () => {
            const slots = parseAvailability('flexible');

            expect(slots.length).toBeGreaterThan(0);
            expect(slots.some(s => s.day === 'monday')).toBe(true);
            expect(slots.every(s => s.start_time === '09:00' && s.end_time === '17:00')).toBe(true);
        });
    });

    describe('findMatchingSlots', () => {
        const mockSpecialist: Specialist = {
            npi: '1234567890',
            first_name: 'John',
            last_name: 'Doe',
            specialty: 'Cardiology',
            city: 'Boston',
            state: 'MA',
            estimated_wait_days: 7,
        };

        it('should find slots matching patient availability', () => {
            const patientAvailability = [
                { day: 'monday', start_time: '09:00', end_time: '12:00' },
            ];

            const slots = findMatchingSlots(patientAvailability, mockSpecialist);

            expect(slots.length).toBeGreaterThan(0);
            expect(slots[0].start_time).toBe('09:00');
        });

        it('should respect estimated wait days', () => {
            const patientAvailability = [
                { day: 'monday', start_time: '09:00', end_time: '17:00' },
            ];

            const slots = findMatchingSlots(patientAvailability, mockSpecialist);

            const firstSlotDate = slots[0].date;
            const daysDiff = Math.floor((firstSlotDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

            expect(daysDiff).toBeGreaterThanOrEqual(7);
        });

        it('should limit results to maxSlots parameter', () => {
            const patientAvailability = [
                { day: 'monday', start_time: '09:00', end_time: '17:00' },
                { day: 'tuesday', start_time: '09:00', end_time: '17:00' },
                { day: 'wednesday', start_time: '09:00', end_time: '17:00' },
            ];

            const slots = findMatchingSlots(patientAvailability, mockSpecialist, undefined, 3);

            expect(slots.length).toBeLessThanOrEqual(3);
        });
    });
});
