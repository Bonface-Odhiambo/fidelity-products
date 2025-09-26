import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ShareModalData {
    quoteText: string;
    shareLink: string; // Kept in interface for compatibility, but not used in this modal
    quoteId: string;
}

@Component({
    selector: 'app-share-modal',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
    template: `
        <div class="share-modal-container">
            <div class="modal-header">
                <div class="header-icon-wrapper">
                    <mat-icon>share</mat-icon>
                </div>
                <div class="header-text-content">
                    <h1 mat-dialog-title class="modal-title">Share Quote</h1>
                    <p class="modal-subtitle">Share your marine cargo insurance quote</p>
                </div>
                <button mat-icon-button (click)="closeDialog()" class="close-button" aria-label="Close dialog">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <mat-dialog-content class="modal-content">
                <!-- Specific Share Options -->
                <div class="share-options">
                    <h3 class="section-title">Share via</h3>
                    <div class="share-buttons-grid">
                        <!-- WhatsApp Button -->
                        <button (click)="shareViaWhatsApp()" class="share-button whatsapp" matTooltip="Share via WhatsApp">
                            <svg class="share-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                            </svg>
                            <span>WhatsApp</span>
                        </button>

                        <!-- Gmail Button -->
                        <button (click)="shareViaGmail()" class="share-button gmail" matTooltip="Share via Gmail">
                             <svg class="share-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22 5.88V18c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-.55.22-1.05.59-1.41L12 12l9.41-7.41C21.78 4.95 22 5.45 22 6v-.12zM12 10.5L3.5 4.25h17L12 10.5z"/>
                            </svg>
                            <span>Gmail</span>
                        </button>

                        <!-- Outlook Button -->
                        <button (click)="shareViaOutlook()" class="share-button outlook" matTooltip="Share via Outlook">
                            <svg class="share-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21 5H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-2 12H5V9.92l7 4.38 7-4.38V17zM12 12.5L5 8h14l-7 4.5z"/>
                            </svg>
                            <span>Outlook</span>
                        </button>

                        <!-- Yahoo Button -->
                        <button (click)="shareViaYahoo()" class="share-button yahoo" matTooltip="Share via Yahoo Mail">
                            <svg class="share-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.5 2.5c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10zm0 1.5c-4.7 0-8.5 3.8-8.5 8.5s3.8 8.5 8.5 8.5 8.5-3.8 8.5-8.5-3.8-8.5-8.5-8.5zm-1.8 3.2l2.4 4.2 2.4-4.2h2.1l-3.5 5.8v3.5h-1.8v-3.5l-3.5-5.8h1.9z"/>
                            </svg>
                            <span>Yahoo</span>
                        </button>
                    </div>
                </div>

                <!-- Preview Section -->
                <div class="preview-section">
                    <h3 class="section-title">Premium Summary</h3>
                    <div class="premium-summary-card">
                        <div class="premium-header">
                            <mat-icon class="premium-icon">receipt_long</mat-icon>
                            <span class="premium-title">Your Quote Summary</span>
                        </div>
                        <div class="premium-details">
                            <div class="premium-row">
                                <span class="premium-label">Base Premium:</span>
                                <span class="premium-value">{{ extractBasePremium() }}</span>
                            </div>
                            <div class="premium-row">
                                <span class="premium-label">PHCF (0.25%):</span>
                                <span class="premium-value">{{ extractPHCF() }}</span>
                            </div>
                            <div class="premium-row">
                                <span class="premium-label">Training Levy (0.25%):</span>
                                <span class="premium-value">{{ extractTrainingLevy() }}</span>
                            </div>
                            <div class="premium-row">
                                <span class="premium-label">Stamp Duty:</span>
                                <span class="premium-value">{{ extractStampDuty() }}</span>
                            </div>
                        </div>
                        <div class="total-payable">
                            <span class="total-label">Total Payable</span>
                            <span class="total-amount">{{ extractTotalPayable() }}</span>
                        </div>
                    </div>
                </div>
            </mat-dialog-content>
        </div>
    `,
    styles: [`
        /* ... all the modal container, header, and content styles remain the same ... */
        .share-modal-container {
            border-radius: 16px;
            overflow: hidden;
            max-width: 500px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            width: 100%;
        }

        .modal-header {
            display: flex;
            align-items: center;
            padding: 20px 24px;
            background-color: #007B7B;
            color: white;
            position: relative;
        }

        .header-icon-wrapper {
            width: 48px;
            height: 48px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
        }

        .header-text-content {
            flex-grow: 1;
        }

        .modal-title {
            color: white;
            font-size: 20px;
            font-weight: 600;
            margin: 0;
        }

        .modal-subtitle {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 2px;
        }

        .close-button {
            position: absolute;
            top: 12px;
            right: 12px;
            color: rgba(255, 255, 255, 0.7);
        }

        .modal-content {
            padding: 24px !important;
            background-color: #f9fafb;
        }
        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 16px;
            text-align: center;
        }

        .share-options {
            margin-bottom: 24px;
        }

        .share-buttons-grid {
            display: grid;
            /* Updated to fit 4 items gracefully */
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }

        .share-button {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 16px 12px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            background: white;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #374151;
            font-size: 14px;
            font-weight: 500;
            text-align: center;
        }

        .share-button:hover {
            transform: translateY(-2px);
        }

        .share-button.whatsapp:hover {
            border-color: #25d366;
            background-color: #f0fdf4;
            color: #25d366;
        }

        /* NEW STYLES for Gmail, Outlook, and Yahoo */
        .share-button.gmail:hover {
            border-color: #EA4335;
            background-color: #fef2f2;
            color: #EA4335;
        }

        .share-button.outlook:hover {
            border-color: #0078D4;
            background-color: #f0f9ff;
            color: #0078D4;
        }

        .share-button.yahoo:hover {
            border-color: #6001D2;
            background-color: #faf5ff;
            color: #6001D2;
        }

        .share-icon {
            width: 28px;
            height: 28px;
            margin-bottom: 8px;
        }

        .preview-section {
            margin-top: 24px;
        }

        .premium-summary-card {
            background: linear-gradient(135deg, #B7DC78 0%, #9BC53D 100%);
            border-radius: 16px;
            padding: 20px;
            color: white;
            box-shadow: 0 8px 25px rgba(183, 220, 120, 0.4);
        }

        .premium-header {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .premium-icon {
            margin-right: 8px;
            font-size: 20px;
        }

        .premium-title {
            font-size: 16px;
            font-weight: 600;
        }

        .premium-details {
            margin-bottom: 16px;
        }

        .premium-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .premium-label {
            opacity: 0.9;
        }

        .premium-value {
            font-weight: 600;
        }

        .total-payable {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-top: 2px solid rgba(255, 255, 255, 0.3);
            margin-top: 8px;
        }

        .total-label {
            font-size: 16px;
            font-weight: 600;
        }

        .total-amount {
            font-size: 20px;
            font-weight: 700;
        }

        @media (max-width: 480px) {
            .share-buttons-grid {
                /* Stack them on small screens */
                grid-template-columns: 1fr;
            }
            
            .premium-summary-card {
                padding: 16px;
            }
            
            .total-amount {
                font-size: 18px;
            }
        }
    `]
})
export class ShareModalComponent {

    constructor(
        public dialogRef: MatDialogRef<ShareModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ShareModalData
    ) {}

    closeDialog(): void {
        this.dialogRef.close();
    }

    shareViaWhatsApp(): void {
        // Share the full quote text without the site URL
        const text = encodeURIComponent(this.data.quoteText);
        const whatsappUrl = `https://wa.me/?text=${text}`;
        window.open(whatsappUrl, '_blank');
        this.closeDialog();
    }

    shareViaGmail(): void {
        const subject = encodeURIComponent('Marine Cargo Insurance Quote - Fidelity');
        // Share the full quote text without the site URL
        const body = encodeURIComponent(this.data.quoteText);

        // This URL structure opens a new compose window in Gmail
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');
        this.closeDialog();
    }

    shareViaOutlook(): void {
        const subject = encodeURIComponent('Marine Cargo Insurance Quote - Fidelity');
        // Share the full quote text without the site URL
        const body = encodeURIComponent(this.data.quoteText).replace(/%0A/g, '%0D%0A');

        // This URL structure opens a new compose window in Outlook
        const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?subject=${subject}&body=${body}`;
        window.open(outlookUrl, '_blank');
        this.closeDialog();
    }

    shareViaYahoo(): void {
        const subject = encodeURIComponent('Marine Cargo Insurance Quote - Fidelity');
        // Share the full quote text without the site URL
        const body = encodeURIComponent(this.data.quoteText);

        // This URL structure opens a new compose window in Yahoo Mail
        const yahooUrl = `https://compose.mail.yahoo.com/?subject=${subject}&body=${body}`;
        window.open(yahooUrl, '_blank');
        this.closeDialog();
    }

    getPreviewText(): string {
        const lines = this.data.quoteText.split('\n');
        // Show a slightly shorter preview
        return lines.slice(0, 8).join('\n') + (lines.length > 8 ? '\n...' : '');
    }

    extractBasePremium(): string {
        const lines = this.data.quoteText.split('\n');
        const premiumLine = lines.find(line => line.includes('Base Premium') || line.includes('Premium:'));
        if (premiumLine) {
            const match = premiumLine.match(/KES\s*([\d,]+(?:\.\d{2})?)/i);
            return match ? `KES ${match[1]}` : 'KES 0.00';
        }
        return 'KES 0.00';
    }

    extractPHCF(): string {
        const lines = this.data.quoteText.split('\n');
        const phcfLine = lines.find(line => line.includes('PHCF'));
        if (phcfLine) {
            const match = phcfLine.match(/KES\s*([\d,]+(?:\.\d{2})?)/i);
            return match ? `KES ${match[1]}` : 'KES 0.00';
        }
        return 'KES 0.00';
    }

    extractTrainingLevy(): string {
        const lines = this.data.quoteText.split('\n');
        const tlLine = lines.find(line => line.includes('Training Levy') || line.includes('TL'));
        if (tlLine) {
            const match = tlLine.match(/KES\s*([\d,]+(?:\.\d{2})?)/i);
            return match ? `KES ${match[1]}` : 'KES 0.00';
        }
        return 'KES 0.00';
    }

    extractStampDuty(): string {
        const lines = this.data.quoteText.split('\n');
        const sdLine = lines.find(line => line.includes('Stamp Duty') || line.includes('SD'));
        if (sdLine) {
            const match = sdLine.match(/KES\s*([\d,]+(?:\.\d{2})?)/i);
            return match ? `KES ${match[1]}` : 'KES 0.00';
        }
        return 'KES 0.00';
    }

    extractTotalPayable(): string {
        const lines = this.data.quoteText.split('\n');
        
        // First try to find explicit total lines
        const totalLine = lines.find(line => 
            line.includes('Total Payable') || 
            line.includes('Total Premium') || 
            line.includes('Net Premium') ||
            line.includes('Grand Total')
        );
        
        if (totalLine) {
            const match = totalLine.match(/KES\s*([\d,]+(?:\.\d{2})?)/i);
            if (match) {
                return `KES ${match[1]}`;
            }
        }
        
        // If no explicit total found, calculate from individual components
        const basePremium = this.parseAmount(this.extractBasePremium());
        const phcf = this.parseAmount(this.extractPHCF());
        const trainingLevy = this.parseAmount(this.extractTrainingLevy());
        const stampDuty = this.parseAmount(this.extractStampDuty());
        
        const total = basePremium + phcf + trainingLevy + stampDuty;
        
        if (total > 0) {
            return `KES ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        
        return 'KES 0.00';
    }
    
    private parseAmount(amountString: string): number {
        const match = amountString.match(/([\d,]+(?:\.\d{2})?)/);
        if (match) {
            return parseFloat(match[1].replace(/,/g, ''));
        }
        return 0;
    }
}