// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReceiveModal, buildPaymentRequest } from './ReceiveModal';

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async (value: string) => `data:image/png,${value}`) } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

describe('ReceiveModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a QR code and regenerates the SEP-0007 request when amount changes', async () => {
    render(React.createElement(ReceiveModal, { isOpen: true, onClose: vi.fn(), address: 'GABC123', isAccountReady: true }));
    const qr = await screen.findByAltText('QR code for the Stellar payment request');
    expect(qr.getAttribute('src')).toContain('destination=GABC123');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.5' } });
    await waitFor(() => expect(screen.getByAltText('QR code for the Stellar payment request').getAttribute('src')).toContain('amount=12.5'));
  });

  it('includes amount and text memo parameters and warns for an inactive account', () => {
    expect(buildPaymentRequest('GABC123', '1.25', 'invoice 9')).toContain('memo_type=MEMO_TEXT');
    expect(buildPaymentRequest('GABC123', '1.25', 'invoice 9')).toContain('memo=invoice+9');
    render(React.createElement(ReceiveModal, { isOpen: true, onClose: vi.fn(), address: 'GABC123', isAccountReady: false }));
    expect(screen.getByRole('status').textContent).toMatch(/not deployed or funded/i);
  });
});
