/**
 * TeamTalent Job Feed Widget — Version B (React Component)
 *
 * Usage:
 *   import { JobFeedWidget } from './JobFeedWidget';
 *   <JobFeedWidget apiUrl="https://teamtalent-api.onrender.com/api" />
 */
import { useState, useEffect } from 'react';

interface FeedJob {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  apply_url: string;
  posted_at: string;
}

interface JobFeedWidgetProps {
  /** Full URL to your TeamTalent API, e.g. "https://teamtalent-api.onrender.com/api" */
  apiUrl: string;
  /** Optional max number of jobs to show */
  limit?: number;
}

export function JobFeedWidget({ apiUrl, limit }: JobFeedWidgetProps) {
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/feed`)
      .then((res) => res.json())
      .then((body) => {
        const items: FeedJob[] = body.data?.jobs ?? [];
        setJobs(limit ? items.slice(0, limit) : items);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [apiUrl, limit]);

  if (loading) {
    return <p style={styles.muted}>Loading open positions…</p>;
  }

  if (error) {
    return <p style={styles.muted}>Unable to load positions. Please try again later.</p>;
  }

  if (jobs.length === 0) {
    return <p style={styles.muted}>No open positions right now. Check back soon!</p>;
  }

  return (
    <div style={styles.container}>
      {jobs.map((job) => (
        <div key={job.id} style={styles.card}>
          <h3 style={styles.title}>{job.title}</h3>
          <div style={styles.meta}>
            <span>📍 {job.location}</span>
            <span>🏢 {job.department}</span>
            <span>⏱ {job.type}</span>
          </div>
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer" style={styles.button}>
            Apply Now →
          </a>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    maxWidth: 720,
    margin: '0 auto',
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    background: '#fff',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  button: {
    display: 'inline-block',
    background: '#2563eb',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: 8,
    textDecoration: 'none',
  },
  muted: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#9ca3af',
    fontSize: 14,
  },
};
