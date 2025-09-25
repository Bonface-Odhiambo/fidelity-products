import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

export interface ShareQuoteData {
  formData: any;
  coverOption: any;
  calculatedPremium: number;
  benefits: any[];
  reference: string;
}

@Component({
  selector: 'share-quote-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="share-modal-container">
      <div class="modal-header">
        <div class="header-content">
          <div class="fidelity-logo">
            <img src="https://pbs.twimg.com/profile_images/1767198674373734400/R9lqG20r_400x400.jpg" 
                 alt="Fidelity Insurance" 
                 class="logo-image"/>
          </div>
          <div class="header-text">
            <h2 class="modal-title">Share Your Quote</h2>
            <p class="modal-subtitle">Share your Personal Accident Insurance quote with others</p>
          </div>
        </div>
        <button mat-icon-button (click)="closeModal()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="modal-content">
        <!-- Quote Summary -->
        <div class="quote-summary-card">
          <div class="summary-header">
            <h3 class="summary-title">Quote Summary</h3>
            <div class="quote-reference">Ref: {{ data.reference }}</div>
          </div>
          
          <div class="summary-content">
            <div class="summary-row">
              <span class="label">Insured:</span>
              <span class="value">{{ data.formData.personalDetails.firstName }} {{ data.formData.personalDetails.surname }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Coverage:</span>
              <span class="value">Option {{ data.coverOption.id }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Premium:</span>
              <span class="value premium-amount">KES {{ data.calculatedPremium | number:'1.0-0' }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Period:</span>
              <span class="value">{{ data.formData.periodOfInsurance.fromDate | date:'shortDate' }} - {{ data.formData.periodOfInsurance.toDate | date:'shortDate' }}</span>
            </div>
          </div>
        </div>

        <!-- Share Options -->
        <div class="share-options">
          <h3 class="options-title">Share via:</h3>
          
          <div class="share-buttons">
            <button mat-raised-button class="share-btn email-btn" (click)="shareViaEmail()">
              <mat-icon>email</mat-icon>
              Email
            </button>
            
            <button mat-raised-button class="share-btn whatsapp-btn" (click)="shareViaWhatsApp()">
              <mat-icon>message</mat-icon>
              WhatsApp
            </button>
            
            <button mat-raised-button class="share-btn sms-btn" (click)="shareViaSMS()">
              <mat-icon>sms</mat-icon>
              SMS
            </button>
            
            <button mat-raised-button class="share-btn copy-btn" (click)="copyToClipboard()">
              <mat-icon>content_copy</mat-icon>
              Copy Link
            </button>
          </div>
        </div>

        <!-- Email Form -->
        <div class="email-form" *ngIf="showEmailForm">
          <form [formGroup]="emailForm" (ngSubmit)="sendEmail()">
            <h4 class="form-title">Send via Email</h4>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Recipient Email</mat-label>
              <input matInput formControlName="recipientEmail" placeholder="Enter email address">
              <mat-error *ngIf="emailForm.get('recipientEmail')?.hasError('required')">
                Email is required
              </mat-error>
              <mat-error *ngIf="emailForm.get('recipientEmail')?.hasError('email')">
                Please enter a valid email
              </mat-error>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Message (Optional)</mat-label>
              <textarea matInput formControlName="message" rows="3" placeholder="Add a personal message"></textarea>
            </mat-form-field>
            
            <div class="form-actions">
              <button type="button" mat-button (click)="cancelEmail()">Cancel</button>
              <button type="submit" mat-raised-button class="send-btn" [disabled]="emailForm.invalid">
                <mat-icon>send</mat-icon>
                Send Email
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-footer">
        <button mat-button (click)="closeModal()" class="cancel-btn">
          Close
        </button>
      </div>
    </div>
  `,
  styles: [`
    .share-modal-container {
      max-width: 600px;
      width: 100%;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(135deg, #007B7B 0%, #B7DC78 100%);
      color: white;
      border-radius: 0.5rem 0.5rem 0 0;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .fidelity-logo .logo-image {
      width: 3rem;
      height: 3rem;
      border-radius: 0.5rem;
      object-fit: cover;
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.875rem;
      opacity: 0.9;
      margin: 0.25rem 0 0 0;
    }

    .close-button {
      color: white;
    }

    .modal-content {
      padding: 1.5rem;
    }

    .quote-summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .summary-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #007B7B;
      margin: 0;
    }

    .quote-reference {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 500;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .label {
      font-weight: 500;
      color: #374151;
    }

    .value {
      font-weight: 600;
      color: #1f2937;
    }

    .premium-amount {
      color: #007B7B;
      font-size: 1.125rem;
    }

    .options-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 1rem;
    }

    .share-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .share-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 0.75rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .email-btn {
      background-color: #3b82f6;
      color: white;
    }

    .whatsapp-btn {
      background-color: #25d366;
      color: white;
    }

    .sms-btn {
      background-color: #8b5cf6;
      color: white;
    }

    .copy-btn {
      background-color: #6b7280;
      color: white;
    }

    .share-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .email-form {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-top: 1rem;
    }

    .form-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 1rem;
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1rem;
    }

    .send-btn {
      background-color: #007B7B;
      color: white;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
    }

    .cancel-btn {
      color: #6b7280;
    }

    @media (max-width: 640px) {
      .share-buttons {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .header-content {
        flex-direction: column;
        text-align: center;
        gap: 0.5rem;
      }
    }
  `]
})
export class ShareQuoteModalComponent implements OnInit {
  emailForm: FormGroup;
  showEmailForm = false;

  constructor(
    public dialogRef: MatDialogRef<ShareQuoteModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ShareQuoteData,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.emailForm = this.fb.group({
      recipientEmail: ['', [Validators.required, Validators.email]],
      message: ['']
    });
  }

  ngOnInit(): void {
    // Initialize component
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  shareViaEmail(): void {
    this.showEmailForm = true;
  }

  shareViaWhatsApp(): void {
    const message = this.generateShareMessage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  shareViaSMS(): void {
    const message = this.generateShareMessage();
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
  }

  copyToClipboard(): void {
    const message = this.generateShareMessage();
    navigator.clipboard.writeText(message).then(() => {
      this.snackBar.open('Quote details copied to clipboard!', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }).catch(() => {
      this.snackBar.open('Failed to copy to clipboard', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    });
  }

  sendEmail(): void {
    if (this.emailForm.valid) {
      // Here you would typically call an email service
      console.log('Sending email to:', this.emailForm.value.recipientEmail);
      console.log('Message:', this.emailForm.value.message);
      console.log('Quote data:', this.data);
      
      this.snackBar.open('Email sent successfully!', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
      
      this.showEmailForm = false;
      this.emailForm.reset();
    }
  }

  cancelEmail(): void {
    this.showEmailForm = false;
    this.emailForm.reset();
  }

  private generateShareMessage(): string {
    const { formData, coverOption, calculatedPremium, reference } = this.data;
    
    return `🛡️ Personal Accident Insurance Quote - Fidelity Insurance

👤 Insured: ${formData.personalDetails.firstName} ${formData.personalDetails.surname}
📋 Coverage: Option ${coverOption.id}
💰 Premium: KES ${calculatedPremium.toLocaleString()}
📅 Period: ${new Date(formData.periodOfInsurance.fromDate).toLocaleDateString()} - ${new Date(formData.periodOfInsurance.toDate).toLocaleDateString()}
🔖 Reference: ${reference}

Key Benefits:
• Death: KES ${coverOption.death.toLocaleString()}
• Permanent Total Disability: KES ${coverOption.permanentTotalDisability.toLocaleString()}
• Medical Expenses: KES ${coverOption.medicalExpense.toLocaleString()}

Get your quote today! Visit Fidelity Insurance for comprehensive coverage.

#FidelityInsurance #PersonalAccident #Insurance`;
  }
}
