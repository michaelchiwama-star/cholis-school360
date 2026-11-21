import React, { useState, useEffect } from 'react';
import ResourceCards from '../ResourceCards';
import { PARENT_RESOURCES } from '../resources';

export default function ParentPage() {
  const [tab, setTab] = useState<'hub' | 'inquiry' | 'alliance'>('hub');
  const [form, setForm] = useState({ school_id: '', route_to: 'school', topic: '', contact_name: '', contact_phone: '', contact_email: '', message: '' });
  const [options, setOptions] = useState<{ schools: { id: string; name: string; district: string | null }[]; topics: string[] }>({ schools: [], topics: [] });
  const [doneMessage, setDoneMessage] = useState('');

  useEffect(() => {
    fetch('/api/public/parent-options').then(r => r.ok ? r.json() : null).then(d => { if (d) setOptions(d); }).catch(() => {});
  }, []);

  const notListed = form.school_id === 'none';
  const chooseSchool = (school_id: string) =>
    setForm(f => ({ ...f, school_id, route_to: school_id === 'none' ? 'cholis' : f.route_to }));
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.school_id) {
      setFormError("Please choose your child's school, or choose \"My child's school is not listed\".");
      return;
    }
    if (!form.topic) {
      setFormError('Please choose what your enquiry is about.');
      return;
    }
    if (!form.contact_name.trim() || !form.message.trim()) {
      setFormError('Please provide your name and message.');
      return;
    }
    if (!form.contact_phone.trim() && !form.contact_email.trim()) {
      setFormError('Please give a phone number or an email address so we can contact you.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/parent-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, school_id: notListed ? '' : form.school_id, route_to: notListed ? 'cholis' : form.route_to }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error ?? 'Submission failed.');
        return;
      }
      setDoneMessage(data.message ?? 'Thank you. Your enquiry has been received.');
      setSubmitted(true);
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div>
      {/* Public header */}
      <div style={{ background: '#002D43', color: '#fff', padding: '2rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <img src="/cholis-logo.png" alt="Center for Holistic Schools Global logo" style={{ width: 84, height: "auto", background: "#fff", borderRadius: 12, padding: 6, display: "inline-block" }} />
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>CHOLIS Parent Resource Hub</h1>
        <p style={{ color: '#A5B69D', fontSize: '0.9rem' }}>Empowering Learners! Strengthening Schools!</p>
        <p style={{ color: '#A5B69D', fontSize: '0.82rem', marginTop: '0.4rem' }}>Practical guidance and support for parents and guardians</p>
      </div>

      <div className="nav-tabs">
        <button className={`nav-tab ${tab === 'hub' ? 'active' : ''}`} onClick={() => setTab('hub')}>Resource Hub</button>
        <button className={`nav-tab ${tab === 'inquiry' ? 'active' : ''}`} onClick={() => setTab('inquiry')}>Ask for Support</button>
        <button className={`nav-tab ${tab === 'alliance' ? 'active' : ''}`} onClick={() => setTab('alliance')}>About CHOLIS</button>
      </div>

      {tab === 'hub' && (
        <div>
          <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
            <strong>Note:</strong> These are short, general tips for parents and guardians, approved by CHOLIS. They are not clinical advice. For a concern about your child, talk to your child's school.
          </div>
          <ResourceCards cards={PARENT_RESOURCES} />
        </div>
      )}

      {tab === 'inquiry' && (
        <div className="card" style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div className="card-title">Ask for Support</div>

          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            <div>
              <strong>Is a child in danger?</strong> Do not use this form. Contact the school's Child Protection Focal Person straight away, or call Childline Zambia on <strong>116</strong>. If a child is in immediate danger, call the police.
            </div>
          </div>

          <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
            <div>
              <strong>Privacy notice:</strong> Please do not include your child's name, date of birth, or any medical or sensitive details. Whoever you choose will contact you to arrange a private conversation.
            </div>
          </div>

          {submitted ? (
            <div className="alert alert-success">
              <div><strong>{doneMessage}</strong></div>
            </div>
          ) : (
            <form onSubmit={handleInquiry}>
              <div className="form-group">
                <label className="form-label" htmlFor="parent_school">Your child's school *</label>
                <select id="parent_school" className="form-control" value={form.school_id} onChange={e => chooseSchool(e.target.value)}>
                  <option value="">Choose a school…</option>
                  {options.schools.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.name}{sc.district ? ` (${sc.district})` : ''}</option>
                  ))}
                  <option value="none">My child's school is not listed</option>
                </select>
              </div>

              <div className="form-group">
                <span className="form-label">Who should respond? *</span>
                <div className="choice-group" role="radiogroup">
                  <label className={`choice ${form.route_to === 'school' && !notListed ? 'selected' : ''} ${notListed ? 'disabled' : ''}`}>
                    <input type="radio" name="route_to" value="school" disabled={notListed}
                      checked={form.route_to === 'school' && !notListed} onChange={() => setForm(f => ({ ...f, route_to: 'school' }))} />
                    <span>
                      <span className="choice-title">My child's school (recommended)</span><br/>
                      <span className="choice-sub">
                        {notListed ? 'Not available, because your school is not on School360 yet.'
                          : `The Counselling and Learner Support Department${form.school_id ? ` at ${options.schools.find(sc => sc.id === form.school_id)?.name}` : ''}. They know your child and can arrange to meet you.`}
                      </span>
                    </span>
                  </label>
                  <label className={`choice ${form.route_to === 'cholis' || notListed ? 'selected' : ''}`}>
                    <input type="radio" name="route_to" value="cholis"
                      checked={form.route_to === 'cholis' || notListed} onChange={() => setForm(f => ({ ...f, route_to: 'cholis' }))} />
                    <span>
                      <span className="choice-title">CHOLIS</span><br/>
                      <span className="choice-sub">The Center for Holistic Schools Global. Choose this for general questions, or if you would prefer to speak to someone outside the school.</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="parent_topic">What is your enquiry about? *</label>
                <select id="parent_topic" className="form-control" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}>
                  <option value="">Choose a topic…</option>
                  {options.topics.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="parent_name">Your name *</label>
                <input id="parent_name" type="text" className="form-control" placeholder="Your name"
                  value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="parent_phone">Phone number</label>
                <input id="parent_phone" type="tel" className="form-control" placeholder="+260 97…"
                  value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="parent_email">Email address</label>
                <input id="parent_email" type="email" className="form-control" placeholder="you@example.com"
                  value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
                <div className="form-hint" style={{ fontSize: '0.78rem', color: '#5a6a72', marginTop: '0.25rem' }}>Please give a phone number, an email address, or both.</div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="parent_msg">How can we help? *</label>
                <textarea id="parent_msg" className="form-control" rows={4}
                  placeholder="Describe generally what you would like help with. Do not include your child's name or sensitive details."
                  value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              </div>
              {formError && <div className="alert alert-danger">{formError}</div>}
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send Enquiry'}
              </button>
            </form>
          )}

          <hr className="divider"/>
          <div style={{ fontSize: '0.8rem', color: '#5a6a72' }}>
            <strong>Contact CHOLIS:</strong><br/>
            Website: <a href="https://allholisticschools.org" target="_blank" rel="noreferrer" style={{ color: '#57872F' }}>allholisticschools.org</a><br/>
            Center for Holistic Schools Global · Lusaka, Zambia
          </div>
        </div>
      )}

      {tab === 'alliance' && <AllianceSection />}
    </div>
  );
}

function AllianceSection() {
  const [form, setForm] = useState({
    school_name: '', contact_name: '', contact_email: '', contact_phone: '',
    district: '', province: '', message: '', inquiry_type: 'Consultation',
  });
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.school_name.trim() || !form.contact_name.trim() || !form.contact_email.trim()) {
      setFormError('School name, contact name, and email are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/consultation-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? 'Submission failed.');
        return;
      }
      setSubmitted(true);
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="alliance-hero">
        <h1>Join the Alliance for Holistic Schools</h1>
        <p>A professional membership network supporting Counselling, Learner Support and Pastoral Care Departments across Zambian schools</p>
        <div className="alliance-price">ZMW 15,000</div>
        <div className="alliance-price-label">Annual Alliance Membership</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-title">What Alliance Members Receive</div>
          <ul className="benefit-list">
            <li>Professional departmental establishment support</li>
            <li>Three CPD sessions per year</li>
            <li>Access to CHOLIS School360 platform</li>
            <li>Professional staff capacity building</li>
            <li>Ongoing CHOLIS professional consultation</li>
            <li>Access to approved resource library</li>
            <li>Leadership dashboard and reporting tools</li>
          </ul>
        </div>
        <div className="card">
          <div className="card-title">About CHOLIS</div>
          <p style={{ fontSize: '0.87rem', color: '#5a6a72', lineHeight: 1.6 }}>
            Center for Holistic Schools Global (CHOLIS) establishes and supports Counselling, Learner Support and Pastoral Care Departments in schools across Zambia. CHOLIS works to ensure every learner has access to professional wellbeing support within their school community.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a href="https://allholisticschools.org" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Visit CHOLIS Website</a>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '560px' }}>
        <div className="card-title">Request a School Consultation</div>
        {submitted ? (
          <div className="alert alert-success">
            <strong>Thank you!</strong> Your inquiry has been received. The CHOLIS team will contact you to discuss your school's needs. This is an inquiry only — membership is not yet confirmed.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Inquiry Type</label>
              <select className="form-control" value={form.inquiry_type}
                onChange={e => setForm(f => ({ ...f, inquiry_type: e.target.value }))}>
                <option value="Consultation">Request a School Consultation</option>
                <option value="Membership Application">Apply for Alliance Membership</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">School Name *</label>
              <input type="text" className="form-control" value={form.school_name}
                onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Name *</label>
              <input type="text" className="form-control" value={form.contact_name}
                onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Email *</label>
              <input type="email" className="form-control" value={form.contact_email}
                onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">District</label>
                <input type="text" className="form-control" value={form.district}
                  onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Province</label>
                <input type="text" className="form-control" value={form.province}
                  onChange={e => setForm(f => ({ ...f, province: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Message (optional)</label>
              <textarea className="form-control" rows={3} value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Tell us briefly about your school and what you are hoping CHOLIS can help with." />
            </div>
            {formError && <div className="alert alert-danger">{formError}</div>}
            <div className="alert alert-warning" style={{ marginBottom: '0.75rem' }}>
              Submitting this form does not activate Alliance membership. A CHOLIS representative will contact you to discuss next steps.
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Submit Inquiry'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
