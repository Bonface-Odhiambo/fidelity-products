import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of, Subject, throwError } from 'rxjs';
import { catchError, delay, takeUntil, tap } from 'rxjs/operators';
import { Injectable } from '@angular/core';

// --- Mock M-PESA Service (for demonstration) ---
// In a real application, this would be in its own file and make actual HTTP calls.
@Injectable({ providedIn: 'root' })
export class MpesaService {
  stkPush(amount: number, phoneNumber: string, reference: string): Observable<{ success: boolean; message: string }> {
    console.log(`Initiating STK Push for KES ${amount} to ${phoneNumber} with reference ${reference}`);

    // Simulate a network delay
    return of(null).pipe(
      delay(3000), // 3-second delay to simulate API call
      tap(() => {
        // Randomly decide if the payment succeeds or fails
        if (Math.random() > 0.2) { // 80% success rate
          console.log('M-PESA API Simulation: Success');
        } else {
          console.error('M-PESA API Simulation: Failure');
          throw new Error('The transaction was cancelled by the user.');
        }
      }),
      // Map to a success response
      // Note: In a real app, you'd poll a callback URL to confirm the transaction status.
      // This is a simplified success simulation.
      () => of({ success: true, message: 'Payment completed successfully.' }),
      catchError((error) => {
        return throwError(() => new Error(error.message || 'An unknown error occurred.'));
      })
    );
  }
}
// --- End of Mock Service ---


/**
 * Interface for the data passed TO the dialog.
 */
export interface PaymentData {
  amount: number;
  phoneNumber: string;
  reference: string;
  description: string;
}

/**
 * Interface for the result passed FROM the dialog when it closes.
 */
export interface PaymentResult {
  success: boolean;
}

@Component({
  selector: 'app-mpesa-payment-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  template: `
    <div class="payment-modal-container">
      <!-- Close Button -->
      <button mat-icon-button (click)="close(false)" class="close-button" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
      </button>

      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">M-PESA Payment</h2>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner-container">
          <mat-spinner diameter="60" class="fidelity-spinner"></mat-spinner>
        </div>
        <h3 class="loading-title">Processing Payment</h3>
        <p class="loading-subtitle">Please check your phone and enter your M-PESA PIN to complete the payment.</p>
        <div class="loading-steps">
          <div class="step">
            <mat-icon class="step-icon">phone_iphone</mat-icon>
            <span>Check your phone</span>
          </div>
          <div class="step">
            <mat-icon class="step-icon">lock</mat-icon>
            <span>Enter M-PESA PIN</span>
          </div>
          <div class="step">
            <mat-icon class="step-icon">check_circle</mat-icon>
            <span>Confirm payment</span>
          </div>
        </div>
      </div>

      <!-- Success State -->
      <div *ngIf="paymentStatus === 'success'" class="success-state">
        <div class="success-icon-container">
          <mat-icon class="success-icon">check_circle</mat-icon>
        </div>
        <h3 class="success-title">Payment Successful!</h3>
        <p class="success-subtitle">Your golf insurance policy has been activated and will be sent to your email shortly.</p>
        <button mat-flat-button class="success-button" (click)="close(true)">
          <mat-icon>email</mat-icon>
          Done
        </button>
      </div>

      <!-- Error State -->
      <div *ngIf="paymentStatus === 'failed'" class="error-state">
        <div class="error-icon-container">
          <mat-icon class="error-icon">error</mat-icon>
        </div>
        <h3 class="error-title">Payment Failed</h3>
        <p class="error-subtitle">{{ errorMessage }}</p>
        <div class="error-actions">
            <button mat-stroked-button class="cancel-button" (click)="close(false)">Cancel</button>
            <button mat-flat-button class="retry-button" (click)="resetAndTryAgain()">
              <mat-icon>refresh</mat-icon>
              Try Again
            </button>
        </div>
      </div>

      <!-- Initial State -->
      <div *ngIf="!isLoading && paymentStatus === 'pending'" class="payment-form">
        <!-- Amount Display -->
        <div class="amount-display">
            <p class="amount-label">Total Amount Payable</p>
            <p class="amount-value">KES {{ data.amount | number:'1.2-2' }}</p>
            <p class="amount-description">{{ data.description }}</p>
        </div>

        <!-- Payment Form -->
        <form [formGroup]="paymentForm" (ngSubmit)="initiatePayment()" class="form-container">
            <div class="instruction-text">
              Enter your M-PESA number to receive a payment prompt.
            </div>
            
            <div class="input-group">
              <div class="input-container">
                <mat-icon class="input-icon">phone</mat-icon>
                <input 
                  class="payment-input font-bold" 
                  formControlName="phoneNumber" 
                  placeholder="0706242439" 
                  type="tel"
                  required>
              </div>
              <div *ngIf="paymentForm.get('phoneNumber')?.hasError('required') && paymentForm.get('phoneNumber')?.touched" 
                   class="error-message">
                Phone number is required
              </div>
            </div>

            <button 
              type="submit" 
              class="pay-button" 
              [disabled]="paymentForm.invalid || isLoading">
              <mat-icon>payment</mat-icon>
              Pay Now
            </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .payment-modal-container {
      position: relative;
      background: white;
      border-radius: 1rem;
      overflow: hidden;
      min-width: 400px;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }

    .close-button {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 10;
      background: rgba(255, 255, 255, 0.9);
      color: #6b7280;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      
      &:hover {
        background: rgba(255, 255, 255, 1);
        color: #374151;
      }
    }

    .modal-header {
      background: linear-gradient(135deg, #007B7B 0%, rgba(0, 123, 123, 0.9) 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    .modal-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .loading-state, .success-state, .error-state, .payment-form {
      padding: 2rem;
    }

    /* Loading State */
    .loading-state {
      text-align: center;
      min-height: 300px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .spinner-container {
      margin-bottom: 1.5rem;
    }

    .fidelity-spinner ::ng-deep circle {
      stroke: #007B7B;
    }

    .loading-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.5rem 0;
    }

    .loading-subtitle {
      color: #6b7280;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .loading-steps {
      display: flex;
      justify-content: space-around;
      gap: 1rem;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .step-icon {
      color: #B8D87A;
      font-size: 1.5rem;
      width: 1.5rem;
      height: 1.5rem;
    }

    /* Success State */
    .success-state {
      text-align: center;
      min-height: 250px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .success-icon-container {
      margin-bottom: 1.5rem;
    }

    .success-icon {
      color: #10b981;
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
    }

    .success-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.5rem 0;
    }

    .success-subtitle {
      color: #6b7280;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .success-button {
      background: linear-gradient(135deg, #007B7B 0%, rgba(0, 123, 123, 0.9) 100%);
      color: white;
      border-radius: 0.75rem;
      padding: 0.75rem 2rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      
      &:hover {
        background: linear-gradient(135deg, #B8D87A 0%, rgba(184, 216, 122, 0.9) 100%);
        color: #1f2937;
      }
    }

    /* Error State */
    .error-state {
      text-align: center;
      min-height: 250px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .error-icon-container {
      margin-bottom: 1.5rem;
    }

    .error-icon {
      color: #ef4444;
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
    }

    .error-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.5rem 0;
    }

    .error-subtitle {
      color: #6b7280;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .error-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .cancel-button {
      border-color: #d1d5db;
      color: #6b7280;
      border-radius: 0.75rem;
      padding: 0.75rem 1.5rem;
      
      &:hover {
        border-color: #9ca3af;
        background: #f9fafb;
      }
    }

    .retry-button {
      background: linear-gradient(135deg, #007B7B 0%, rgba(0, 123, 123, 0.9) 100%);
      color: white;
      border-radius: 0.75rem;
      padding: 0.75rem 1.5rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      
      &:hover {
        background: linear-gradient(135deg, #B8D87A 0%, rgba(184, 216, 122, 0.9) 100%);
        color: #1f2937;
      }
    }

    /* Payment Form */
    .amount-display {
      background: linear-gradient(135deg, rgba(184, 216, 122, 0.1) 0%, rgba(184, 216, 122, 0.05) 100%);
      border: 2px solid rgba(184, 216, 122, 0.3);
      border-radius: 1rem;
      padding: 1.5rem;
      text-align: center;
      margin-bottom: 2rem;
    }

    .amount-label {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 0.5rem 0;
      font-weight: 500;
    }

    .amount-value {
      font-size: 2.25rem;
      font-weight: 800;
      color: #007B7B;
      margin: 0 0 0.25rem 0;
      line-height: 1;
    }

    .amount-description {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .instruction-text {
      font-size: 0.875rem;
      color: #6b7280;
      text-align: center;
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .input-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 1rem;
      color: #6b7280;
      z-index: 1;
      font-size: 1.25rem;
    }

    .payment-input {
      width: 100%;
      padding: 1rem 1rem 1rem 3rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      font-size: 1rem;
      font-weight: 500;
      transition: all 0.2s ease;
      background: white;
      
      &:focus {
        outline: none;
        border-color: #B8D87A;
        box-shadow: 0 0 0 4px rgba(184, 216, 122, 0.2);
      }
      
      &::placeholder {
        color: #9ca3af;
      }
    }

    .error-message {
      font-size: 0.875rem;
      color: #ef4444;
      font-weight: 500;
    }

    .pay-button {
      background: linear-gradient(135deg, #007B7B 0%, rgba(0, 123, 123, 0.9) 100%);
      color: white;
      border: none;
      border-radius: 0.75rem;
      padding: 1rem 2rem;
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 123, 123, 0.3);
      
      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #B8D87A 0%, rgba(184, 216, 122, 0.9) 100%);
        color: #1f2937;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(184, 216, 122, 0.4);
      }
      
      &:disabled {
        background: #9ca3af;
        color: #d1d5db;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
    }

    @media (max-width: 480px) {
      .payment-modal-container {
        min-width: 320px;
        margin: 1rem;
      }
      
      .loading-steps {
        flex-direction: column;
        gap: 1rem;
      }
      
      .step {
        flex-direction: row;
        justify-content: flex-start;
        text-align: left;
      }
    }
  `]
})
export class MpesaPaymentModalComponent implements OnInit, OnDestroy {
  isLoading = false;
  paymentStatus: 'pending' | 'success' | 'failed' = 'pending';
  errorMessage: string | null = null;
  paymentForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<MpesaPaymentModalComponent, PaymentResult>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentData,
    private fb: FormBuilder,
    private mpesaService: MpesaService // Using the mock service
  ) {}

  ngOnInit(): void {
    this.paymentForm = this.fb.group({
      phoneNumber: [this.data.phoneNumber, [
        Validators.required
        // Validators.pattern(/^0[17]\d{8}$/)
      ]]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initiatePayment(): void {
    if (this.paymentForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const formValue = this.paymentForm.value;

    this.mpesaService.stkPush(this.data.amount, formValue.phoneNumber, this.data.reference)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Payment response:', response);
          this.isLoading = false;
          this.paymentStatus = 'success';
        },
        error: (err) => {
          console.error('Payment error:', err);
          this.isLoading = false;
          this.paymentStatus = 'failed';
          this.errorMessage = err.message || 'An unexpected error occurred.';
        }
      });
  }

  resetAndTryAgain(): void {
    this.paymentStatus = 'pending';
    this.errorMessage = null;
    this.isLoading = false;
  }

  close(isSuccess: boolean): void {
    this.dialogRef.close({ success: isSuccess });
  }
}
