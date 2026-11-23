import { describe, it, expect } from 'vitest';
import { evaluateEmergencyExpense } from '@/domain/rules/emergency-evaluator';

describe('Emergency Expense Evaluator (Wise Heuristics)', () => {
  it('flags genuine emergencies as OK', () => {
    const testCases = [
      { title: 'Biaya rawat inap rumah sakit', category: 'Kesehatan' },
      { title: 'Tebus obat resep dokter UGD', category: 'Kesehatan' },
      { title: 'Tambal ban dan derek darurat tol', category: 'Transportasi' },
      { title: 'Perbaikan genteng bocor parah saat badai', category: 'Rumah' },
    ];

    for (const tc of testCases) {
      const res = evaluateEmergencyExpense(tc.title, tc.category);
      expect(res.flag).toBe('OK');
      expect(res.isLikelyEmergency).toBe(true);
    }
  });

  it('flags non-emergencies as OUTSIDE_EMERGENCY with clear warning reason', () => {
    const testCases = [
      { title: 'Nongkrong kafe bareng teman', category: 'Gaya Hidup' },
      { title: 'Beli skin game mobile legend', category: 'Hiburan' },
      { title: 'Tiket nonton bioskop premier', category: 'Hiburan' },
      { title: 'Beli sepatu dan baju fashion diskon', category: 'Belanja' },
    ];

    for (const tc of testCases) {
      const res = evaluateEmergencyExpense(tc.title, tc.category);
      expect(res.flag).toBe('OUTSIDE_EMERGENCY');
      expect(res.isLikelyEmergency).toBe(false);
      expect(res.reason).toContain('di luar kebutuhan darurat');
    }
  });
});

