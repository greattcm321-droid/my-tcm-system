import React from 'react';

interface ClinicalNotesData {
    chiefComplaint: string;
    tongue: string;
    pulse: string;
    hpi: string;
    currentSymptoms: string;
    diagnosis: string;
    pathogenesis: string;
    treatmentPrinciple: string;
}

interface ClinicalNotesProps {
    data: ClinicalNotesData;
    onChange: (field: keyof ClinicalNotesData, value: string) => void;
    highlightField?: string | null;
}

const ClinicalNotes: React.FC<ClinicalNotesProps> = ({ data, onChange, highlightField }) => {
    const getInputClass = (field: string) => `
        py-1 text-xs h-7 w-full bg-theme-bg border border-theme-border rounded px-2 text-theme-text outline-none transition-all duration-500
        focus:border-theme-primary
        ${highlightField === 'all' || highlightField === field ? 'bg-theme-primary/10 border-theme-primary ring-2 ring-theme-primary/20 scale-[1.01]' : ''}
    `;

    const getTextareaClass = (field: string) => `
        py-1 text-xs min-h-[40px] resize-none w-full bg-theme-bg border border-theme-border rounded px-2 text-theme-text outline-none transition-all duration-500
        focus:border-theme-primary
        ${highlightField === 'all' || highlightField === field ? 'bg-theme-primary/10 border-theme-primary ring-2 ring-theme-primary/20 scale-[1.01]' : ''}
    `;

    return (
        <div className="shrink-0 bg-theme-surface border border-theme-border rounded-sm p-3 shadow-sm transition-all duration-300">
            <div className="grid grid-cols-4 gap-x-4 gap-y-2">
                {/* Row 1 */}
                <div className="col-span-2 flex flex-col gap-0.5">
                    <label className="text-[11px] font-bold text-theme-text-muted">主訴 (Chief Complaint)</label>
                    <input
                        type="text"
                        className={getInputClass('chiefComplaint')}
                        value={data.chiefComplaint}
                        onChange={e => onChange('chiefComplaint', e.target.value)}
                        placeholder="..."
                    />
                </div>
                <div className="col-span-1 flex flex-col gap-0.5">
                    <label className="text-[11px] font-bold text-theme-text-muted">舌象</label>
                    <input
                        type="text"
                        className={getInputClass('tongue')}
                        value={data.tongue}
                        onChange={e => onChange('tongue', e.target.value)}
                        placeholder="..."
                    />
                </div>
                <div className="col-span-1 flex flex-col gap-0.5">
                    <label className="text-[11px] font-bold text-theme-text-muted">脈象</label>
                    <input
                        type="text"
                        className={getInputClass('pulse')}
                        value={data.pulse}
                        onChange={e => onChange('pulse', e.target.value)}
                        placeholder="..."
                    />
                </div>

                {/* Row 2 */}
                <div className="col-span-2 flex flex-col gap-0.5">
                    <label className="text-[11px] font-bold text-theme-text-muted">現病史 (HPI)</label>
                    <textarea
                        className={getTextareaClass('hpi')}
                        value={data.hpi}
                        onChange={e => onChange('hpi', e.target.value)}
                        placeholder="..."
                    ></textarea>
                </div>
                <div className="col-span-2 flex flex-col gap-0.5">
                    <label className="text-[11px] font-bold text-theme-text-muted">現在症</label>
                    <textarea
                        className={getTextareaClass('currentSymptoms')}
                        value={data.currentSymptoms}
                        onChange={e => onChange('currentSymptoms', e.target.value)}
                        placeholder="..."
                    ></textarea>
                </div>

                {/* Row 3 */}
                <div className="col-span-1 flex flex-col gap-0.5">
                    <label className="text-[11px] font-bold text-theme-text-muted">診斷</label>
                    <input
                        type="text"
                        className={getInputClass('diagnosis')}
                        value={data.diagnosis}
                        onChange={e => onChange('diagnosis', e.target.value)}
                        placeholder="..."
                    />
                </div>
                <div className="col-span-1 flex flex-col gap-0.5">
                    <label className="text-[11px] font-bold text-theme-text-muted">病機</label>
                    <input
                        type="text"
                        className={getInputClass('pathogenesis')}
                        value={data.pathogenesis}
                        onChange={e => onChange('pathogenesis', e.target.value)}
                        placeholder="..."
                    />
                </div>
                <div className="col-span-2 flex flex-col gap-0.5">
                    <label className="text-[11px] font-bold text-theme-text-muted">治則</label>
                    <input
                        type="text"
                        className={getInputClass('treatmentPrinciple')}
                        value={data.treatmentPrinciple}
                        onChange={e => onChange('treatmentPrinciple', e.target.value)}
                        placeholder="..."
                    />
                </div>
            </div>
        </div>
    );
};

export default ClinicalNotes;