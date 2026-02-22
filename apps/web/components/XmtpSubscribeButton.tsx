'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageCircleMore } from 'lucide-react';
import {
    getXmtpInboxPreview,
    getXmtpSubscriptionStatus,
    subscribeXmtp,
    unsubscribeXmtp,
} from '@/lib/api';

type InboxPreviewItem = {
    id: number;
    card_name: string;
    orientation: 'upright' | 'reversed';
    date: string;
    message_text: string;
    sent_at: string;
};

export default function XmtpSubscribeButton() {
    const [loading, setLoading] = useState(true);
    const [subscribed, setSubscribed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(true);
    const [preview, setPreview] = useState<InboxPreviewItem[]>([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void loadState();
    }, []);

    async function loadState() {
        try {
            const [result, inbox] = await Promise.all([
                getXmtpSubscriptionStatus(),
                getXmtpInboxPreview(),
            ]);
            setSubscribed(result.subscribed);
            setPreview(inbox);
        } catch (err: any) {
            setError(err?.message || 'Failed to load XMTP status');
        } finally {
            setLoading(false);
            setPreviewLoading(false);
        }
    }

    async function onToggle() {
        setSaving(true);
        setError(null);
        try {
            if (subscribed) {
                const result = await unsubscribeXmtp();
                setSubscribed(result.subscribed);
            } else {
                const result = await subscribeXmtp();
                setSubscribed(result.subscribed);
            }
            const inbox = await getXmtpInboxPreview();
            setPreview(inbox);
        } catch (err: any) {
            setError(err?.message || 'Failed to update XMTP subscription');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-white/5 text-foreground/50">
                <Loader2 size={14} className="animate-spin" />
                Checking XMTP subscription...
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl flex flex-col items-center gap-2">
            <button
                onClick={onToggle}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-accent-purple text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <MessageCircleMore size={14} />}
                {subscribed ? 'Subscribed via XMTP' : 'Subscribe via XMTP'}
            </button>
            <p className="text-xs text-foreground/40 text-center">
                Receive the Card of the Day broadcast at 12:02 AM IST.
            </p>

            <div className="w-full mt-2 glass-card p-3 text-left">
                <button
                    onClick={() => setPreviewOpen((value) => !value)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-foreground/75"
                >
                    <span>Inbox Preview</span>
                    <span className="text-foreground/45">{previewOpen ? 'Hide' : 'Show'}</span>
                </button>

                {previewOpen && (
                    <div className="mt-2">
                        {previewLoading ? (
                            <p className="text-xs text-foreground/40">Loading messages...</p>
                        ) : preview.length === 0 ? (
                            <p className="text-xs text-foreground/40">No broadcasts received yet.</p>
                        ) : (
                            <ul className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                {preview.map((item) => (
                                    <li key={item.id} className="rounded-lg bg-white/5 px-2.5 py-2">
                                        <p className="text-xs text-foreground/85 font-medium">
                                            {item.card_name} ({item.orientation}) · {item.date}
                                        </p>
                                        <p className="text-[11px] text-foreground/50 mt-0.5 line-clamp-2">{item.message_text}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {error && <p className="text-xs text-accent-red">{error}</p>}
        </div>
    );
}
