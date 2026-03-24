import { randomUUID } from 'crypto';

export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface Offer {
  id:            string;
  candidateId:   string;
  candidateName: string;
  jobId:         string;
  jobTitle:      string;
  department:    string;
  salary:        number;
  currency:      string;
  startDate:     string;
  expiryDate:    string;
  equity:        string | null;
  benefits:      string;
  notes:         string;
  status:        OfferStatus;
  sentAt:        string | null;
  respondedAt:   string | null;
  signatureUrl:  string | null;
  createdAt:     string;
  createdBy:     string;
}

// ── Seed ──────────────────────────────────────────────────────────────────────

const offers = new Map<string, Offer>([
  ['of-1', {
    id: 'of-1', candidateId: 'c-5', candidateName: 'Aisha Kamara',
    jobId: 'j-4', jobTitle: 'UX Designer', department: 'Design',
    salary: 85_000, currency: 'GBP', startDate: '2026-05-01', expiryDate: '2026-04-07',
    equity: '0.05% over 4 years', benefits: 'Private health, 25 days annual leave, £1,000 L&D budget, hybrid working',
    notes: 'Exceptional candidate — top of our range is justified.',
    status: 'sent', sentAt: '2026-03-20T10:00:00Z', respondedAt: null,
    signatureUrl: null, createdAt: '2026-03-18T09:00:00Z', createdBy: 'Alex Johnson',
  }],
  ['of-2', {
    id: 'of-2', candidateId: 'c-3', candidateName: 'Sophia Okonkwo',
    jobId: 'j-3', jobTitle: 'Data Analyst', department: 'Analytics',
    salary: 65_000, currency: 'GBP', startDate: '2026-04-14', expiryDate: '2026-03-28',
    equity: null, benefits: 'Private health, 25 days annual leave, flexible hours',
    notes: '', status: 'accepted', sentAt: '2026-03-15T11:00:00Z', respondedAt: '2026-03-17T14:30:00Z',
    signatureUrl: 'https://docusign.example.com/signed/abc123', createdAt: '2026-03-13T10:00:00Z', createdBy: 'Sarah Chen',
  }],
  ['of-3', {
    id: 'of-3', candidateId: 'c-12', candidateName: 'Jordan Mills',
    jobId: 'j-6', jobTitle: 'Marketing Manager', department: 'Marketing',
    salary: 72_000, currency: 'GBP', startDate: '2026-04-28', expiryDate: '2026-03-31',
    equity: null, benefits: 'Private health, 25 days annual leave, annual bonus up to 10%',
    notes: 'Counter-offer risk — candidate has competing offer.',
    status: 'rejected', sentAt: '2026-03-12T09:00:00Z', respondedAt: '2026-03-16T10:00:00Z',
    signatureUrl: null, createdAt: '2026-03-10T08:00:00Z', createdBy: 'Alex Johnson',
  }],
  ['of-4', {
    id: 'of-4', candidateId: 'c-13', candidateName: 'Laura Bennet',
    jobId: 'j-7', jobTitle: 'Finance Analyst', department: 'Finance',
    salary: 58_000, currency: 'GBP', startDate: '2026-05-06', expiryDate: '2026-03-20',
    equity: null, benefits: 'Private health, 25 days annual leave, pension 6%',
    notes: '', status: 'expired', sentAt: '2026-03-06T10:00:00Z', respondedAt: null,
    signatureUrl: null, createdAt: '2026-03-04T09:00:00Z', createdBy: 'James Okafor',
  }],
  ['of-5', {
    id: 'of-5', candidateId: 'c-1', candidateName: 'Emily Carter',
    jobId: 'j-1', jobTitle: 'Senior Frontend Engineer', department: 'Engineering',
    salary: 110_000, currency: 'GBP', startDate: '2026-05-01', expiryDate: '2026-04-10',
    equity: '0.1% over 4 years', benefits: 'Private health, 30 days annual leave, remote-first, £2,000 equipment budget',
    notes: 'Senior band — approved by VP Eng.',
    status: 'draft', sentAt: null, respondedAt: null,
    signatureUrl: null, createdAt: '2026-03-23T14:00:00Z', createdBy: 'Alex Johnson',
  }],
  ['of-6', {
    id: 'of-6', candidateId: 'c-14', candidateName: 'Hassan Ali',
    jobId: 'j-8', jobTitle: 'Sales Executive', department: 'Sales',
    salary: 55_000, currency: 'GBP', startDate: '2026-04-21', expiryDate: '2026-04-04',
    equity: null, benefits: 'Private health, 25 days annual leave, OTE £80k',
    notes: 'OTE is the main draw — emphasise during signing.',
    status: 'sent', sentAt: '2026-03-21T09:30:00Z', respondedAt: null,
    signatureUrl: null, createdAt: '2026-03-19T10:00:00Z', createdBy: 'Sarah Chen',
  }],
  ['of-7', {
    id: 'of-7', candidateId: 'c-15', candidateName: 'Priya Sharma',
    jobId: 'j-2', jobTitle: 'Product Manager', department: 'Product',
    salary: 95_000, currency: 'GBP', startDate: '2026-04-14', expiryDate: '2026-03-29',
    equity: '0.075% over 4 years', benefits: 'Private health, 25 days annual leave, equity, MacBook Pro',
    notes: '',
    status: 'accepted', sentAt: '2026-03-14T10:00:00Z', respondedAt: '2026-03-17T09:00:00Z',
    signatureUrl: 'https://docusign.example.com/signed/def456', createdAt: '2026-03-12T09:00:00Z', createdBy: 'Priya Patel',
  }],
  ['of-8', {
    id: 'of-8', candidateId: 'c-16', candidateName: 'Oliver Grant',
    jobId: 'j-5', jobTitle: 'Backend Engineer', department: 'Engineering',
    salary: 92_000, currency: 'GBP', startDate: '2026-05-12', expiryDate: '2026-04-07',
    equity: '0.08% over 4 years', benefits: 'Private health, 25 days annual leave, remote-first, £1,500 L&D',
    notes: '',
    status: 'draft', sentAt: null, respondedAt: null,
    signatureUrl: null, createdAt: '2026-03-24T08:00:00Z', createdBy: 'Marcus Williams',
  }],
]);

// ── Service ───────────────────────────────────────────────────────────────────

export const offersService = {
  getAll(status?: OfferStatus): Offer[] {
    let list = Array.from(offers.values());
    if (status) list = list.filter((o) => o.status === status);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getById(id: string): Offer | null {
    return offers.get(id) ?? null;
  },

  create(data: {
    candidateId: string; candidateName: string;
    jobId: string; jobTitle: string; department: string;
    salary: number; currency: string;
    startDate: string; expiryDate: string;
    equity?: string; benefits: string; notes?: string;
    createdBy: string;
  }): Offer {
    const id = `of-${randomUUID().slice(0, 8)}`;
    const offer: Offer = {
      id,
      candidateId:   data.candidateId,
      candidateName: data.candidateName,
      jobId:         data.jobId,
      jobTitle:      data.jobTitle,
      department:    data.department,
      salary:        data.salary,
      currency:      data.currency,
      startDate:     data.startDate,
      expiryDate:    data.expiryDate,
      equity:        data.equity ?? null,
      benefits:      data.benefits,
      notes:         data.notes ?? '',
      status:        'draft',
      sentAt:        null,
      respondedAt:   null,
      signatureUrl:  null,
      createdAt:     new Date().toISOString(),
      createdBy:     data.createdBy,
    };
    offers.set(id, offer);
    return offer;
  },

  send(id: string): Offer | null {
    const offer = offers.get(id);
    if (!offer || offer.status !== 'draft') return null;
    offer.status = 'sent';
    offer.sentAt = new Date().toISOString();
    return offer;
  },

  updateStatus(id: string, status: OfferStatus): Offer | null {
    const offer = offers.get(id);
    if (!offer) return null;
    offer.status = status;
    if (status === 'accepted' || status === 'rejected') {
      offer.respondedAt = new Date().toISOString();
    }
    return offer;
  },

  update(id: string, patch: Partial<Omit<Offer, 'id' | 'createdAt' | 'createdBy'>>): Offer | null {
    const offer = offers.get(id);
    if (!offer) return null;
    Object.assign(offer, patch);
    return offer;
  },

  getStats() {
    const list = Array.from(offers.values());
    return {
      total:    list.length,
      draft:    list.filter((o) => o.status === 'draft').length,
      sent:     list.filter((o) => o.status === 'sent').length,
      accepted: list.filter((o) => o.status === 'accepted').length,
      rejected: list.filter((o) => o.status === 'rejected').length,
      expired:  list.filter((o) => o.status === 'expired').length,
      acceptanceRate: (() => {
        const decided = list.filter((o) => o.status === 'accepted' || o.status === 'rejected');
        if (!decided.length) return 0;
        return Math.round((decided.filter((o) => o.status === 'accepted').length / decided.length) * 100);
      })(),
    };
  },
};
