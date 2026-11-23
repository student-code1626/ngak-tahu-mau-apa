export interface EmergencyEvaluationResult {
  isLikelyEmergency: boolean;
  flag: 'OK' | 'OUTSIDE_EMERGENCY';
  reason: string;
}

const EMERGENCY_KEYWORDS = [
  'rumah sakit',
  'dokter',
  'obat',
  'klinik',
  'rawat inap',
  'ugd',
  'darurat',
  'ambulans',
  'ambulance',
  'kecelakaan',
  'operasi',
  'bencana',
  'banjir',
  'genteng bocor',
  'pipa bocor',
  'rusak mendadak',
  'servis mendesak',
  'tambal ban',
  'derek',
  'operasi gigi',
  'medis',
];

const NON_EMERGENCY_KEYWORDS = [
  'nongkrong',
  'kafe',
  'kopi',
  'baju',
  'sepatu',
  'fashion',
  'liburan',
  'hotel',
  'staycation',
  'nonton',
  'bioskop',
  'konser',
  'game',
  'topup',
  'skin',
  'gadget baru',
  'upgrade',
  'shopping',
  'jajan',
  'jalan-jalan',
  'belanja mall',
];

/**
 * Section 5.4: Evaluates whether an expense from EMERGENCY pos is genuinely an emergency.
 * If not, Wise displays a warning label 'di luar kebutuhan darurat', but still allows it to be saved.
 */
export function evaluateEmergencyExpense(
  title: string,
  categoryName?: string,
  note?: string
): EmergencyEvaluationResult {
  const text = `${title} ${categoryName || ''} ${note || ''}`.toLowerCase();

  // Check explicit non-emergency keywords first
  for (const keyword of NON_EMERGENCY_KEYWORDS) {
    if (text.includes(keyword)) {
      return {
        isLikelyEmergency: false,
        flag: 'OUTSIDE_EMERGENCY',
        reason: `Pengeluaran ini terdeteksi sebagai "${keyword}", yang biasanya di luar kebutuhan darurat.`,
      };
    }
  }

  // Check emergency keywords
  for (const keyword of EMERGENCY_KEYWORDS) {
    if (text.includes(keyword)) {
      return {
        isLikelyEmergency: true,
        flag: 'OK',
        reason: 'Pengeluaran sesuai dengan kriteria kebutuhan darurat.',
      };
    }
  }

  // If unclear, default to OK with soft check
  return {
    isLikelyEmergency: true,
    flag: 'OK',
    reason: 'Pengeluaran dicatat dari Dana Darurat.',
  };
}

