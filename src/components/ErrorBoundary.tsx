import { Component, type ReactNode } from 'react';
import { getStoredExpeditionRaw } from '../game/storage';
import { downloadExpeditionRaw } from './CampaignTransfer';

/** Keep a rendering failure away from the saved original and provide a recovery export. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; notice: string }> {
  state = { failed: false, notice: '' };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    const raw = getStoredExpeditionRaw();
    return <main className="recovery-screen"><h1>The journey could not be displayed.</h1><p>Your stored progress has not been deliberately reset. Export it before trying to reload.</p>{raw !== null && <button onClick={() => { try { downloadExpeditionRaw(raw); this.setState({ notice: 'Stored original exported.' }); } catch { this.setState({ notice: 'Export could not complete. Keep this browser’s stored data for recovery.' }); } }}>Export stored original</button>}<button onClick={() => window.location.reload()}>Reload journey</button><p role="status">{this.state.notice}</p></main>;
  }
}
