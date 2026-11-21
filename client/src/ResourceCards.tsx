import React, { useState } from 'react';
import { ResourceCard, REVIEW_STATUS } from './resources';

/** At-a-glance resource cards with a category filter and "Read more". */
export default function ResourceCards({ cards }: { cards: ResourceCard[] }) {
  const categories = ['All', ...Array.from(new Set(cards.map(c => c.cat)))];
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const shown = cards.map((c, i) => ({ c, i })).filter(({ c }) => cat === 'All' || c.cat === cat);

  return (
    <div>
      <div className="resource-filter" role="group" aria-label="Filter by topic">
        {categories.map(c => (
          <button key={c} type="button" className={`resource-chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="resource-grid">
        {shown.map(({ c, i }) => {
          const isOpen = !!open[i];
          const extra = (c.more?.length ?? 0) > 0;
          return (
            <div key={i} className={`resource-card ${c.cat === 'Safeguarding' ? 'resource-card-urgent' : ''}`}>
              <div className="resource-category">{c.cat} <span className="approved-label">✓ {REVIEW_STATUS}</span></div>
              <div className="resource-title">{c.title}</div>
              <div className="resource-body">{c.summary}</div>
              <ul className="resource-tips">
                {c.tips.map((t, k) => <li key={k}>{t}</li>)}
                {isOpen && c.more?.map((t, k) => <li key={`m${k}`}>{t}</li>)}
              </ul>
              {extra && (
                <button type="button" className="resource-more" onClick={() => setOpen(o => ({ ...o, [i]: !isOpen }))}>
                  {isOpen ? 'Show less' : 'Read more'}
                </button>
              )}
              <div className="resource-help"><strong>Get help:</strong> {c.help}</div>
              <div className="resource-source">Source: {c.source}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
