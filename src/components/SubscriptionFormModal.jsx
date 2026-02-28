import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

const FormSection = ({ title, children }) => (
  <div className="mb-6">
    {title && <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-4">{title}</h2>}
    <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5">
      {children}
    </div>
  </div>
);

const FormRow = ({ label, children, border = true }) => (
  <div className={`flex items-center justify-between p-4 ${border ? 'border-b border-gray-800' : ''}`}>
    <span className="font-medium text-white shrink-0">{label}</span>
    <div className="flex items-center text-right justify-end flex-1 ml-4 overflow-hidden">
      {children}
    </div>
  </div>
);

export default function SubscriptionFormModal({ isOpen, onClose, initialData = null }) {
  const { subjects, saveSubscription } = useData();
  
  const isEditMode = !!initialData;

  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [subjectId, setSubjectId] = useState('');
  
  const [cost, setCost] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [cycle, setCycle] = useState('monthly');
  
  const [billingDate, setBillingDate] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  
  const [isActive, setIsActive] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setProvider(initialData.provider || '');
        setSubjectId(initialData.subject_id || '');
        setCost(initialData.cost ? initialData.cost.toString() : '');
        setCurrency(initialData.currency || 'PLN');
        setCycle(initialData.billing_cycle || 'monthly');
        setBillingDate(initialData.billing_date || '');
        setHasExpiry(!!initialData.expiry_date);
        setExpiryDate(initialData.expiry_date || '');
        setIsActive(initialData.is_active !== false); // default true
        setNote(initialData.note || '');
      } else {
        setName('');
        setProvider('');
        setSubjectId('');
        setCost('');
        setCurrency('PLN');
        setCycle('monthly');
        setBillingDate(new Date().toISOString().split('T')[0]);
        setHasExpiry(false);
        setExpiryDate('');
        setIsActive(true);
        setNote('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name) return;
    
    await saveSubscription({
      id: initialData?.id,
      name,
      provider,
      subject_id: subjectId || null,
      cost: cost,
      currency,
      billing_cycle: cycle,
      billing_date: billingDate || null,
      expiry_date: hasExpiry ? (expiryDate || null) : null,
      note,
      is_active: isActive
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 md:bg-black/60 md:backdrop-blur-sm transition-opacity p-0 md:p-4">
      <div className="bg-[#121212] md:bg-[#1c1c1e] w-full h-[90vh] md:h-auto md:max-h-[85vh] md:w-full md:max-w-lg flex flex-col md:rounded-3xl md:border md:border-white/10 shadow-2xl animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 md:zoom-in-95 rounded-t-3xl">
        
        <header className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0 mt-2 md:mt-0">
          <button onClick={onClose} className="text-[#3498db] font-medium text-lg px-2">Cancel</button>
          <h1 className="text-lg font-bold text-white">{isEditMode ? 'Edit Subscription' : 'New Subscription'}</h1>
          <button onClick={handleSave} disabled={!name} className="text-[#3498db] font-bold text-lg px-2 disabled:opacity-50">Save</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-32 md:pb-8">
          
          <FormSection>
            <FormRow label="Name">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. ChatGPT Plus" className="w-full bg-transparent text-right text-white focus:outline-none" autoFocus />
            </FormRow>
            <FormRow label="Provider">
              <input type="text" value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. OpenAI" className="w-full bg-transparent text-right text-white focus:outline-none" />
            </FormRow>
            <FormRow label="Subject" border={false}>
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="bg-transparent text-[#3498db] text-right focus:outline-none appearance-none" dir="rtl">
                <option value="">None (Personal)</option>
                {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormRow>
          </FormSection>

          <FormSection title="Billing Details">
            <FormRow label="Cost">
              <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" className="w-24 bg-transparent text-right text-white focus:outline-none" />
            </FormRow>
            <FormRow label="Currency">
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-transparent text-[#3498db] text-right focus:outline-none appearance-none" dir="rtl">
                <option value="PLN">PLN</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </FormRow>
            <FormRow label="Cycle" border={false}>
              <select value={cycle} onChange={e => setCycle(e.target.value)} className="bg-transparent text-[#3498db] text-right focus:outline-none appearance-none" dir="rtl">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
                <option value="one-time">One-time</option>
              </select>
            </FormRow>
          </FormSection>

          <FormSection title="Timeline">
            <FormRow label="Start/Billing Date">
              <input type="date" value={billingDate} onChange={e => setBillingDate(e.target.value)} className="bg-transparent text-[#3498db] focus:outline-none text-right [color-scheme:dark]" />
            </FormRow>
            <FormRow label="Has Expiry Date" border={hasExpiry}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={hasExpiry} onChange={(e) => setHasExpiry(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </FormRow>
            {hasExpiry && (
              <FormRow label="Expiry Date" border={false}>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="bg-transparent text-red-400 focus:outline-none text-right [color-scheme:dark]" />
              </FormRow>
            )}
          </FormSection>

          <FormSection title="Status">
            <FormRow label="Is Active" border={false}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3498db]"></div>
              </label>
            </FormRow>
          </FormSection>

          <FormSection title="Note (Optional)">
            <div className="p-4">
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Account emails, keys, renewal details..."
                className="w-full h-24 bg-transparent text-gray-300 placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </FormSection>

        </div>
      </div>
    </div>
  );
}