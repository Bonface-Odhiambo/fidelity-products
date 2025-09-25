import { CommonModule } from '@angular/common';
import { Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'; // <-- Import FormsModule
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { interval, Subject, Subscription, takeUntil } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AuthenticationService, PendingQuote, StoredUser } from '../shared/services/auth.service';
import { UserService } from '../../../core/user/user.service';
import {
    KycShippingPaymentModalComponent,
    KycShippingPaymentModalData, PaymentModalComponent,
} from '../marine-cargo-quotation/marine-cargo.component';

// --- (All your interface and modal component definitions remain the same) ---
// --- TYPE DEFINITIONS ---
interface Policy {
  id: number;
  refno: string;
  erprefno: string;
  sumassured: number;
  netpremium: number;
  dateArrival: Date;
  dischageDate: Date;
  shippingModeName:string;
  importerType:string;
  vesselName:string;
  originPortName:string;
  destPortName:string;
  ucrNumber:string;
}
type ClaimStatus = 'Submitted' | 'Under Review' | 'More Information Required' | 'Approved' | 'Settled' | 'Rejected';
interface ClaimDocument { name: string; size: number; type: string; }
interface Claim {
  id: string; policyId: number; policyNumber: string; claimNumber: string; dateOfLoss: Date; typeOfLoss: string; description: string; estimatedLoss: number; status: ClaimStatus; submittedDate: Date; documents: ClaimDocument[];
}
interface DashboardStats { marinePolicies: number; travelPolicies: number; pendingQuotes: number; totalPremium: number; activeClaims: number; }
interface MpesaPayment { amount: number; phoneNumber: string; reference: string; description: string; }
interface NavigationItem { label: string; icon: string; route?: string;sectionId?: string; children?: NavigationItem[]; badge?: number; isExpanded?: boolean; }
interface Notification { id: string; title: string; message: string; timestamp: Date; read: boolean; actionUrl?: string; }
interface Activity { id: string; title: string; description: string; timestamp: Date; icon: string; iconColor: string; amount?: number; relatedId?: string; }
export interface PaymentResult { success: boolean; method: 'stk' | 'paybill' | 'card'; reference: string; mpesaReceipt?: string; }

// --- (Your MpesaPaymentModalComponent and ClaimRegistrationModalComponent code remains here) ---
@Component({
  selector: 'app-mpesa-payment-modal',
  standalone: true,
  imports: [ CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatProgressSpinnerModule, MatTabsModule ],
  template: `<div class="payment-modal-container"><div class="modal-header"><div class="header-icon-wrapper"><mat-icon>payment</mat-icon></div><div><h1 mat-dialog-title class="modal-title">Complete Your Payment</h1><p class="modal-subtitle">Pay KES {{ data.amount | number: '1.2-2' }} for {{ data.description }}</p></div><button mat-icon-button (click)="closeDialog()" class="close-button" aria-label="Close dialog"><mat-icon>close</mat-icon></button></div><mat-dialog-content class="modal-content"><mat-tab-group (selectedTabChange)="selectedPaymentMethod = $event.index === 0 ? 'mpesa' : 'card'" animationDuration="300ms" mat-stretch-tabs="true" class="payment-tabs"><mat-tab><ng-template mat-tab-label><div class="tab-label-content"><mat-icon>phone_iphone</mat-icon><span>M-PESA</span></div></ng-template><div class="tab-panel-content"><div class="sub-options"><button (click)="mpesaSubMethod = 'stk'" class="sub-option-btn" [class.active]="mpesaSubMethod === 'stk'"><mat-icon>tap_and_play</mat-icon><span>STK Push</span></button><button (click)="mpesaSubMethod = 'paybill'" class="sub-option-btn" [class.active]="mpesaSubMethod === 'paybill'"><mat-icon>article</mat-icon><span>Use Paybill</span></button></div><div *ngIf="mpesaSubMethod === 'stk'" class="option-view animate-fade-in"><p class="instruction-text">Enter your M-PESA phone number to receive a payment prompt.</p><form [formGroup]="stkForm"><mat-form-field appearance="outline"><mat-label>Phone Number</mat-label><input matInput formControlName="phoneNumber" placeholder="e.g., +254712345678" [disabled]="isProcessingStk"><mat-icon matSuffix>phone_iphone</mat-icon></mat-form-field></form><button class="btn-primary w-full" (click)="processStkPush()" [disabled]="stkForm.invalid || isProcessingStk"><mat-spinner *ngIf="isProcessingStk" diameter="24"></mat-spinner><span *ngIf="!isProcessingStk">Pay KES {{ data.amount | number: '1.0-0' }}</span></button></div><div *ngIf="mpesaSubMethod === 'paybill'" class="option-view animate-fade-in"><p class="instruction-text">Use the details below on your M-PESA App to complete payment.</p><div class="paybill-details"><div class="detail-item"><span class="label">Paybill Number:</span><span class="value">853338</span></div><div class="detail-item"><span class="label">Account Number:</span><span class="value account-number">{{ data.reference }}</span></div></div><button class="btn-primary w-full" (click)="verifyPaybillPayment()" [disabled]="isVerifyingPaybill"><mat-spinner *ngIf="isVerifyingPaybill" diameter="24"></mat-spinner><span *ngIf="!isVerifyingPaybill">Verify Payment</span></button></div></div></mat-tab><mat-tab><ng-template mat-tab-label><div class="tab-label-content"><mat-icon>credit_card</mat-icon><span>Credit/Debit Card</span></div></ng-template><div class="tab-panel-content animate-fade-in"><div class="card-redirect-info"><p class="instruction-text">You will be redirected to pay via <strong>I&M Bank</strong>, our reliable and trusted payment partner.</p><button class="btn-primary w-full" (click)="redirectToCardGateway()" [disabled]="isRedirectingToCard"><mat-spinner *ngIf="isRedirectingToCard" diameter="24"></mat-spinner><span *ngIf="!isRedirectingToCard">Pay Using Credit/Debit Card</span></button></div></div></mat-tab></mat-tab-group></mat-dialog-content></div>`,
  styles: [`
    :host { --pantone-306c: #04b2e1; --pantone-2758c: #21275c; --white-color: #ffffff; --light-gray: #f8f9fa; --medium-gray: #e9ecef; --dark-gray: #495057; }
    .payment-modal-container { background-color: var(--white-color); border-radius: 16px; overflow: hidden; max-width: 450px; }
    .modal-header { display: flex; align-items: center; padding: 20px 24px; background-color: var(--pantone-2758c); color: var(--white-color); position: relative; }
    .header-icon-wrapper { width: 48px; height: 48px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0; }
    .header-icon-wrapper mat-icon { color: var(--pantone-306c); font-size: 28px; width: 28px; height: 28px; }
    .modal-title { font-size: 22px; font-weight: 700; margin: 0; color: var(--white-color); text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
    .modal-subtitle { font-size: 14px; opacity: 0.8; margin-top: 4px; color: var(--white-color); }
    .close-button { position: absolute; top: 12px; right: 12px; color: var(--white-color); }
    .modal-content { padding: 0 !important; }
    .payment-tabs .tab-label-content { display: flex; align-items: center; gap: 8px; height: 60px; }
    .tab-panel-content { padding: 24px; }
    .sub-options { display: flex; gap: 12px; margin-bottom: 24px; border: 1px solid var(--medium-gray); border-radius: 12px; padding: 6px; background-color: var(--light-gray); }
    .sub-option-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 8px; border: none; background-color: transparent; font-weight: 600; cursor: pointer; transition: all 0.2s; color: var(--dark-gray); }
    .sub-option-btn.active { background-color: var(--white-color); color: var(--pantone-306c); }
    .instruction-text { text-align: center; color: var(--dark-gray); font-size: 15px; margin-bottom: 20px; }
    mat-form-field { width: 100%; }
    .paybill-details { background: var(--light-gray); border: 1px dashed var(--medium-gray); border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .detail-item { display: flex; justify-content: space-between; align-items: center; font-size: 16px; padding: 12px 0; }
    .detail-item + .detail-item { border-top: 1px solid var(--medium-gray); }
    .detail-item .label { color: var(--dark-gray); }
    .detail-item .value { font-weight: 700; }
    .detail-item .account-number { font-family: 'Courier New', monospace; background-color: var(--medium-gray); padding: 4px 8px; border-radius: 6px; }
    .card-redirect-info { text-align: center; }
    .animate-fade-in { animation: fadeIn 0.4s ease-in-out; }@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.75rem 1.5rem;
        font-weight: 500;
        color: white;
        background-color: #04b2e1;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: background-color 0.2s;
        height: 52px;
        font-size: 16px;
    }
    .btn-primary:hover:not(:disabled) {
        background-color: #21275c;
    }
    .btn-primary:disabled {
        background-color: #9ca3af;
        cursor: not-allowed;
        opacity: 0.7;
    }
    ::ng-deep .payment-tabs .mat-mdc-tab-header { --mat-tab-header-inactive-ripple-color: rgba(4, 178, 225, 0.1); --mat-tab-header-active-ripple-color: rgba(4, 178, 225, 0.2); }
    ::ng-deep .payment-tabs .mdc-tab__text-label { color: var(--dark-gray); font-weight: 600; }
    ::ng-deep .payment-tabs .mat-mdc-tab.mat-mdc-tab-active .mdc-tab__text-label { color: var(--pantone-306c); }
    ::ng-deep .payment-tabs .mat-mdc-tab-indicator-bar { background-color: var(--pantone-306c) !important; }
  `]
})
export class MpesaPaymentModalComponent implements OnInit { stkForm: FormGroup; selectedPaymentMethod: 'mpesa' | 'card' = 'mpesa'; mpesaSubMethod: 'stk' | 'paybill' = 'stk'; isProcessingStk = false; isVerifyingPaybill = false; isRedirectingToCard = false; constructor(private fb: FormBuilder, public dialogRef: MatDialogRef<MpesaPaymentModalComponent>, @Inject(MAT_DIALOG_DATA) public data: MpesaPayment) { this.stkForm = this.fb.group({ phoneNumber: [data.phoneNumber || '', [Validators.required, Validators.pattern(/^\+254[17]\d{8}$/)]], }); } ngOnInit(): void {} closeDialog(result: PaymentResult | null = null): void { this.dialogRef.close(result); } processStkPush(): void { if (this.stkForm.invalid) return; this.isProcessingStk = true; setTimeout(() => { this.isProcessingStk = false; this.closeDialog({ success: true, method: 'stk', reference: this.data.reference, mpesaReceipt: 'S' + Math.random().toString(36).substring(2, 12).toUpperCase() }); }, 3000); } verifyPaybillPayment(): void { this.isVerifyingPaybill = true; setTimeout(() => { this.isVerifyingPaybill = false; this.closeDialog({ success: true, method: 'paybill', reference: this.data.reference }); }, 3500); } redirectToCardGateway(): void { this.isRedirectingToCard = true; setTimeout(() => { this.isRedirectingToCard = false; console.log('Redirecting to I&M Bank payment gateway...'); this.closeDialog({ success: true, method: 'card', reference: this.data.reference }); }, 2000); } }

@Component({
  selector: 'app-claim-registration-modal',
  standalone: true,
  imports: [ CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatProgressSpinnerModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatDividerModule ],
  template: `
    <div class="claim-modal-container">
      <div class="modal-header">
        <div class="header-icon-wrapper"><mat-icon>assignment_late</mat-icon></div>
        <div>
          <h1 mat-dialog-title class="modal-title">Register a New Claim</h1>
          <p class="modal-subtitle">For Policy: {{ data.policy.erprefno }}</p>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="close-button" aria-label="Close dialog"><mat-icon>close</mat-icon></button>
      </div>
      <mat-dialog-content class="modal-content">
        <form [formGroup]="claimForm" (ngSubmit)="submitClaim()">
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Date of Loss / Incident</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="dateOfLoss" readonly>
              <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Type of Loss</mat-label>
              <mat-select formControlName="typeOfLoss">
                <mat-option value="Damage">Damage to Goods</mat-option>
                <mat-option value="Theft">Theft or Pilferage</mat-option>
                <mat-option value="Loss">Total Loss of Cargo</mat-option>
                <mat-option value="Other">Other</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Estimated Loss Amount (KES)</mat-label>
            <input matInput type="number" formControlName="estimatedLoss" placeholder="e.g., 50000">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Detailed Description of Incident</mat-label>
            <textarea matInput formControlName="description" rows="4" placeholder="Describe what happened, the items affected, and any other relevant details..."></textarea>
          </mat-form-field>

          <div class="file-upload-section">
            <h4 class="file-upload-title">Supporting Documents</h4>
            <p class="file-upload-subtitle">Upload photos, shipping documents, police reports, etc.</p>
            <button type="button" mat-stroked-button color="primary" (click)="fileInput.click()" class="upload-button">
              <mat-icon>attach_file</mat-icon> Select Files
            </button>
            <input hidden (change)="onFileSelected($event)" #fileInput type="file" multiple>

            <div *ngIf="selectedFiles.length > 0" class="file-list">
              <div *ngFor="let file of selectedFiles; let i = index" class="file-item">
                <mat-icon class="file-icon">description</mat-icon>
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">({{ file.size / 1024 | number:'1.0-0' }} KB)</span>
                <button mat-icon-button (click)="removeFile(i)" type="button" class="remove-file-btn" aria-label="Remove file">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button class="btn-primary" (click)="submitClaim()" [disabled]="claimForm.invalid || isSubmitting">
            <mat-spinner *ngIf="isSubmitting" diameter="24"></mat-spinner>
            <span *ngIf="!isSubmitting">Submit Claim</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    :host { --fidelity-primary: #007B7B; --fidelity-secondary: #B7DC78; --white-color: #ffffff; --light-gray: #f8f9fa; --medium-gray: #e9ecef; --dark-gray: #495057; }
    .claim-modal-container { max-width: 650px; }
    .modal-header { display: flex; align-items: center; padding: 20px 24px; background-color: var(--fidelity-secondary); color: var(--fidelity-primary); position: relative; }
    .header-icon-wrapper { width: 48px; height: 48px; background-color: rgba(0, 123, 123, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0; }
    .header-icon-wrapper mat-icon { color: var(--fidelity-primary); font-size: 28px; width: 28px; height: 28px; }
    .modal-title { font-size: 22px; font-weight: 700; margin: 0; color: var(--fidelity-primary); }
    .modal-subtitle { font-size: 14px; opacity: 0.8; margin-top: 4px; color: var(--fidelity-primary); }
    .close-button { position: absolute; top: 12px; right: 12px; color: var(--fidelity-primary); }
    .close-button:hover { color: rgba(0, 123, 123, 0.7); }
    .modal-content { padding: 24px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .full-width { width: 100%; margin-bottom: 16px; }
    .file-upload-section { margin-top: 16px; padding: 16px; border: 1px dashed rgba(183, 220, 120, 0.5); border-radius: 8px; background-color: rgba(183, 220, 120, 0.1); }
    .file-upload-title { font-weight: 600; color: var(--fidelity-primary); margin: 0 0 4px 0; }
    .file-upload-subtitle { font-size: 13px; color: var(--dark-gray); margin: 0 0 16px 0; }
    .upload-button { width: 100%; border-color: var(--fidelity-primary) !important; color: var(--fidelity-primary) !important; }
    .upload-button:hover { background-color: rgba(0, 123, 123, 0.05) !important; }
    .file-list { margin-top: 16px; }
    .file-item { display: flex; align-items: center; padding: 8px; background-color: var(--white-color); border-radius: 6px; margin-bottom: 8px; border: 1px solid rgba(183, 220, 120, 0.3); }
    .file-icon { color: var(--fidelity-primary); margin-right: 8px; }
    .file-name { flex-grow: 1; font-size: 14px; color: var(--fidelity-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file-size { font-size: 12px; color: var(--dark-gray); margin-left: 8px; }
    .remove-file-btn { margin-left: auto; color: #ef4444; }
    .remove-file-btn:hover { background-color: rgba(239, 68, 68, 0.1); }
    
    /* Material form field focus states */
    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-outline-thick {
        border-color: var(--fidelity-primary) !important;
    }
    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-floating-label {
        color: var(--fidelity-primary) !important;
    }
    ::ng-deep .mat-mdc-select-focused .mat-mdc-form-field-outline-thick {
        border-color: var(--fidelity-primary) !important;
    }
    ::ng-deep .mat-mdc-option.mat-mdc-option-active {
        background-color: rgba(183, 220, 120, 0.12) !important;
        color: var(--fidelity-primary) !important;
    }
    ::ng-deep .mat-mdc-option:hover:not(.mdc-list-item--disabled) {
        background-color: rgba(183, 220, 120, 0.04) !important;
    }
    
    .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.75rem 1.5rem;
        font-weight: 600;
        color: white;
        background-color: var(--fidelity-primary);
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: all 0.3s ease-in-out;
    }
    .btn-primary:hover:not(:disabled) {
        background-color: var(--fidelity-secondary);
        color: var(--fidelity-primary);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 123, 123, 0.2);
    }
    .btn-primary:disabled {
        background-color: #9ca3af;
        cursor: not-allowed;
        opacity: 0.7;
    }
  `]
})
export class ClaimRegistrationModalComponent {
  claimForm: FormGroup;
  selectedFiles: File[] = [];
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ClaimRegistrationModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { policy: Policy }
  ) {
    this.claimForm = this.fb.group({
      dateOfLoss: ['', Validators.required],
      typeOfLoss: ['', Validators.required],
      estimatedLoss: ['', [Validators.required, Validators.min(1)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles.push(...Array.from(input.files));
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  submitClaim(): void {
    if (this.claimForm.invalid) {
      return;
    }
    this.isSubmitting = true;
    setTimeout(() => {
      const formValue = this.claimForm.value;
      const newClaim: Claim = {
        id: 'CLM' + Date.now(),
         policyId: this.data.policy.id,
         policyNumber: this.data.policy.erprefno,
        claimNumber: `CLM/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`,
        dateOfLoss: formValue.dateOfLoss,
        typeOfLoss: formValue.typeOfLoss,
        description: formValue.description,
        estimatedLoss: formValue.estimatedLoss,
        status: 'Submitted',
        submittedDate: new Date(),
        documents: this.selectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
      };
      this.isSubmitting = false;
      this.dialogRef.close(newClaim);
    }, 2000);
  }
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
      CommonModule,
      RouterModule,
      MatIconModule,
      MatButtonModule,
      MatMenuModule,
      MatDividerModule,
      MatChipsModule,
      MatCardModule,
      MatDialogModule,
      MatBadgeModule,
      MatSnackBarModule,
      MpesaPaymentModalComponent,
      ClaimRegistrationModalComponent,
      FormsModule, // <-- Add FormsModule for ngModel
      MatFormFieldModule, // <-- Add modules for search input
      MatInputModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  user: StoredUser | null = null;
  pendingQuotes: PendingQuote[] = [];
  page = 0;
  pageSize = 2;
  currentIndex: number=0;
  pageLength: number=2;
  toastMessage: string = '';
  totalRecords = 0;
  totalPolicies = 0;
  navigationItems: NavigationItem[] = [];
  dashboardStats: DashboardStats = { marinePolicies: 0, travelPolicies: 0, pendingQuotes: 0, totalPremium: 0, activeClaims: 0 };
  private readonly STORAGE_KEYS = { USER_DATA: 'fidelity_user_data' };

  // --- MODIFIED/NEW PROPERTIES FOR SEARCH ---
  activePolicies: Policy[] = [];
  filteredPolicies: Policy[] = []; // Used to display policies in the template
  policySearchTerm: string = '';   // Bound to the policy search input

  claims: Claim[] = [];
  filteredClaims: Claim[] = []; // Used to display claims in the template
  claimSearchTerm: string = '';   // Bound to the claim search input

  recentActivities: Activity[] = [];
  notifications: Notification[] = [ { id: 'N001', title: 'Quotes Awaiting Payment', message: 'You have quotes that need payment to activate your policy.', timestamp: new Date(), read: false, actionUrl: '#pending-quotes' }, { id: 'N002', title: 'Certificates Ready', message: 'Your new policy certificates are ready for download.', timestamp: new Date(), read: false, actionUrl: '#active-policies' } ];
  isMobileSidebarOpen = false;
  expandedPolicyId: number | null = null;
  expandedClaimId: string | null = null;
    private statusCheckSubs: { [id: string]: Subscription } = {};
  constructor(
    private dialog: MatDialog,
    public router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthenticationService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
          if(user){
              this.user = user;
              this.setupNavigationBasedOnRole('C');
          }
          else{
              this.router.navigate(['/sign-in']);
          }
      });
    this.loadUserData();
    this.loadDashboardData();
    this.loadUserPolicies();
    this.loadUserClaims();
    this.generateRecentActivities();
  }

  loadUserData(): void {
    // Load user data from storage or service
    const storedUser = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
    if (storedUser) {
      this.user = JSON.parse(storedUser);
    }
  }

  loadUserPolicies(): void {
    // Load user policies - this calls updateDashboardStats which loads policies
    this.updateDashboardStats();
  }

  loadUserClaims(): void {
    // Load user claims data
    this.loadClaimsData();
  }

  generateRecentActivities(): void {
    this.recentActivities = [];
    
    // Add login activity
    this.addActivity('Login', 'Logged into dashboard', 'login', '#04b2e1', new Date());
    
    // Generate activities based on pending quotes
    this.pendingQuotes.slice(0, 3).forEach(quote => {
      if (quote.status === 'DRAFT') {
        this.addActivity(
          'Quote Created', 
          `${quote.productType} quote ${quote.refno || quote.id}`, 
          'description', 
          '#04b2e1',
          quote.createdDate || new Date()
        );
      } else if (quote.status === 'PAID') {
        this.addActivity(
          'Payment Successful', 
          `Payment for ${quote.productType} quote ${quote.refno || quote.id}`, 
          'payment', 
          '#10b981',
          quote.createdDate || new Date()
        );
      }
    });
    
    // Generate activities based on active policies
    this.activePolicies.slice(0, 2).forEach(policy => {
      this.addActivity(
        'Policy Activated', 
        `Marine policy ${policy.refno}`, 
        'verified', 
        '#10b981',
        new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time within last week
      );
    });
    
    // Sort activities by timestamp (newest first)
    this.recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Keep only the 5 most recent activities
    this.recentActivities = this.recentActivities.slice(0, 5);
  }

  private addActivity(title: string, description: string, icon: string, iconColor: string, timestamp: Date): void {
    this.recentActivities.push({
      id: 'A' + Date.now() + Math.random(),
      title,
      description,
      timestamp,
      icon,
      iconColor,
      relatedId: ''
    });
  }

  loadDashboardData(): void {
      const offset = this.page * this.pageSize;
      this.userService.getClientQuotes(offset, this.pageSize).subscribe({
          next: (res) => {
             this.pendingQuotes = res.pageItems;
             console.log( this.pendingQuotes );
             this.totalRecords = res.totalFilteredRecords || res.totalElements || 0;
             
             // Load all insurance quotes from localStorage and merge them
             this.loadPersonalAccidentQuotes();
             this.loadTravelQuotes();
             this.loadGolfQuotes();
             
             this.updateDashboardStats();
             this.generateRecentActivities(); // Generate activities after data is loaded
              // this.pendingQuotes.forEach(q => {
              //     if (q.status === 'PAID') {
              //         this.checkQuoteStatusPeriodically(q);
              //     }
              // });
          },
          error: (err) => console.error('Error loading quotes', err)
      });
  }

  private loadPersonalAccidentQuotes(): void {
    try {
      // Load Personal Accident quotes from localStorage
      const paQuotes = JSON.parse(localStorage.getItem('personalAccidentQuotes') || '[]');
      
      // Convert Personal Accident quotes to PendingQuote format
      const convertedPAQuotes: PendingQuote[] = paQuotes.map((paQuote: any) => ({
        id: paQuote.reference || paQuote.id,
        quoteId: paQuote.reference || paQuote.id,
        refno: paQuote.reference,
        status: paQuote.status === 'pending_payment' ? 'DRAFT' : paQuote.status,
        premium: paQuote.calculatedPremium,
        sumassured: paQuote.calculatedPremium, // Using premium as sum assured for display
        createdDate: paQuote.timestamp ? new Date(paQuote.timestamp) : new Date(),
        productType: 'PERSONAL_ACCIDENT',
        customerName: paQuote.formData?.personalDetails?.firstName + ' ' + paQuote.formData?.personalDetails?.surname || 'Personal Accident Quote',
        customerEmail: paQuote.formData?.personalDetails?.email || '',
        customerPhone: paQuote.formData?.personalDetails?.mobileNumber || '',
        // Additional fields for Personal Accident
        coverageOption: paQuote.coverOption,
        ageRange: paQuote.ageRange,
        beneficiaryName: paQuote.formData?.beneficiaryDetails?.beneficiaryName || '',
        // Marine-specific fields (set to defaults for PA quotes)
        originCountry: 'N/A',
        shippingmodeId: 0,
        pinNo: '',
        idNo: paQuote.formData?.personalDetails?.passportIdNo || ''
      }));

      // Merge with existing marine quotes
      this.pendingQuotes = [...this.pendingQuotes, ...convertedPAQuotes];
      this.totalRecords += convertedPAQuotes.length;
      
      console.log('Loaded Personal Accident quotes:', convertedPAQuotes);
    } catch (error) {
      console.error('Error loading Personal Accident quotes from localStorage:', error);
    }
  }

  private loadTravelQuotes(): void {
    try {
      // Load Travel quotes from localStorage
      const travelQuotes = JSON.parse(localStorage.getItem('travelQuotes') || '[]');
      
      // Convert Travel quotes to PendingQuote format
      const convertedTravelQuotes: PendingQuote[] = travelQuotes.map((travelQuote: any) => ({
        id: travelQuote.reference || travelQuote.id,
        quoteId: travelQuote.reference || travelQuote.id,
        refno: travelQuote.reference,
        status: travelQuote.status === 'pending_payment' ? 'DRAFT' : travelQuote.status,
        premium: travelQuote.calculatedPremium || travelQuote.premium,
        sumassured: travelQuote.calculatedPremium || travelQuote.premium,
        createdDate: travelQuote.timestamp ? new Date(travelQuote.timestamp) : new Date(),
        productType: 'TRAVEL',
        customerName: travelQuote.formData?.personalDetails?.firstName + ' ' + travelQuote.formData?.personalDetails?.lastName || 'Travel Insurance Quote',
        customerEmail: travelQuote.formData?.personalDetails?.email || '',
        customerPhone: travelQuote.formData?.personalDetails?.phone || '',
        // Travel-specific fields
        destination: travelQuote.formData?.travelDetails?.destination || '',
        travelDates: {
          departure: travelQuote.formData?.travelDetails?.departureDate || '',
          return: travelQuote.formData?.travelDetails?.returnDate || ''
        },
        travelPurpose: travelQuote.formData?.travelDetails?.purpose || '',
        numberOfTravelers: travelQuote.formData?.travelDetails?.travelers || 1,
        // Default fields
        originCountry: 'N/A',
        shippingmodeId: 0,
        pinNo: '',
        idNo: travelQuote.formData?.personalDetails?.idNumber || ''
      }));

      // Merge with existing quotes
      this.pendingQuotes = [...this.pendingQuotes, ...convertedTravelQuotes];
      this.totalRecords += convertedTravelQuotes.length;
      
      console.log('Loaded Travel quotes:', convertedTravelQuotes);
    } catch (error) {
      console.error('Error loading Travel quotes from localStorage:', error);
    }
  }

  private loadGolfQuotes(): void {
    try {
      // Load Golf quotes from localStorage
      const golfQuotes = JSON.parse(localStorage.getItem('golfQuotes') || '[]');
      
      // Convert Golf quotes to PendingQuote format
      const convertedGolfQuotes: PendingQuote[] = golfQuotes.map((golfQuote: any) => ({
        id: golfQuote.reference || golfQuote.id,
        quoteId: golfQuote.reference || golfQuote.id,
        refno: golfQuote.reference,
        status: golfQuote.status === 'pending_payment' ? 'DRAFT' : golfQuote.status,
        premium: golfQuote.calculatedPremium || golfQuote.premium,
        sumassured: golfQuote.calculatedPremium || golfQuote.premium,
        createdDate: golfQuote.timestamp ? new Date(golfQuote.timestamp) : new Date(),
        productType: 'GOLF',
        customerName: golfQuote.formData?.personalDetails?.firstName + ' ' + golfQuote.formData?.personalDetails?.lastName || 'Golf Insurance Quote',
        customerEmail: golfQuote.formData?.personalDetails?.email || '',
        customerPhone: golfQuote.formData?.personalDetails?.phone || '',
        // Golf-specific fields
        golfClub: golfQuote.formData?.golfDetails?.clubName || '',
        handicap: golfQuote.formData?.golfDetails?.handicap || 0,
        equipmentValue: golfQuote.formData?.golfDetails?.equipmentValue || 0,
        tournamentCover: golfQuote.formData?.golfDetails?.tournamentCover || false,
        // Default fields
        originCountry: 'N/A',
        shippingmodeId: 0,
        pinNo: '',
        idNo: golfQuote.formData?.personalDetails?.idNumber || ''
      }));

      // Merge with existing quotes
      this.pendingQuotes = [...this.pendingQuotes, ...convertedGolfQuotes];
      this.totalRecords += convertedGolfQuotes.length;
      
      console.log('Loaded Golf quotes:', convertedGolfQuotes);
      console.log('Total merged quotes (all products):', this.pendingQuotes);
    } catch (error) {
      console.error('Error loading Golf quotes from localStorage:', error);
    }
  }

    checkQuoteStatusPeriodically(quote: any) {
      console.log(quote);
        if (this.statusCheckSubs[quote.quoteId]) return; // already polling

        this.statusCheckSubs[quote.quoteId] = interval(5000).subscribe(() => {
            this.userService.getQuoteStatus(quote.quoteId).subscribe(latestStatus => {
                console.log('checking status....',latestStatus);
                if (latestStatus !== quote.status) {
                    quote.status = latestStatus;
                }

                if (latestStatus === 'COMPLETED') {
                    // stop polling this quote
                    this.statusCheckSubs[quote.id]?.unsubscribe();
                    delete this.statusCheckSubs[quote.quoteId];
                    this.currentIndex = 0;
                    // refresh whole pendingQuotes list
                    this.loadDashboardData();
                }
            });
        });
    }

    updateDashboardStats(): void {
        const offset = this.currentIndex * this.pageLength;
        this.userService.getClientPolicies(offset, this.pageLength).subscribe({
            next: (res) => {
                if (this.currentIndex === 0) {
                    this.activePolicies = res.pageItems;
                } else {
                    this.activePolicies = [...this.activePolicies, ...res.pageItems];
                }
                this.totalPolicies = res.totalFilteredRecords || res.totalElements || 0;
                this.applyPolicyFilter(); // Apply filter after data is loaded
            },
            error: (err) => console.error('Error loading policies', err)
        });
    }

    // Example method to load claims data
    loadClaimsData(): void {
        // In a real app, this would be a service call. Here we use mock data.
        this.claims = [ /* ... your mock claim objects ... */ ];
        this.applyClaimFilter(); // Apply filter after data is loaded
    }

    // --- NEW SEARCH FILTER METHODS ---
    applyPolicyFilter(): void {
        const searchTerm = this.policySearchTerm.toLowerCase().trim();
        if (!searchTerm) {
            this.filteredPolicies = [...this.activePolicies];
        } else {
            this.filteredPolicies = this.activePolicies.filter(policy =>
                policy.refno.toLowerCase().includes(searchTerm) ||
                policy.erprefno.toLowerCase().includes(searchTerm) ||
                policy.vesselName.toLowerCase().includes(searchTerm)
            );
        }
    }

    applyClaimFilter(): void {
        const searchTerm = this.claimSearchTerm.toLowerCase().trim();
        if (!searchTerm) {
            this.filteredClaims = [...this.claims];
        } else {
            this.filteredClaims = this.claims.filter(claim =>
                claim.claimNumber.toLowerCase().includes(searchTerm) ||
                claim.policyNumber.toLowerCase().includes(searchTerm) ||
                claim.status.toLowerCase().includes(searchTerm)
            );
        }
    }

    loadMore(): void {
        this.currentIndex += this.pageLength-1;
        this.updateDashboardStats();
    }

    loadLess(): void {
        this.currentIndex = 0;
        this.updateDashboardStats();
    }

    hasLess(): boolean { return this.currentIndex > 0; }
    hasMore(): boolean { return (this.currentIndex + 1) * this.pageLength < this.totalPolicies; }

    nextPage() {
        if ((this.page + 1) * this.pageSize < this.totalRecords) {
            this.page++;
            this.loadDashboardData();
        }
    }

    prevPage() {
        if (this.page > 0) {
            this.page--;
            this.loadDashboardData();
        }
    }

    scrollToSection(sectionId: string): void {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (this.isMobileSidebarOpen) this.isMobileSidebarOpen = false;
    }

    initiatePayment(quoteId: number,originCountry:string,shippingmodeId:number,sumassured:number,pinNo: string,idNo: string,status:string,phone:string,prem:number,refno:string): void {
      this.openKycShippingPaymentModal(quoteId,originCountry,shippingmodeId,sumassured,pinNo,idNo,status,phone,prem,refno);
  }

  initiatePersonalAccidentPayment(quote: PendingQuote): void {
    // For Personal Accident quotes, we'll use a simpler payment flow
    const premium = quote.premium || quote.netprem || 0;
    const phoneNumber = quote.customerPhone || quote.phoneNo || '';
    
    this.openPaymentModal(premium, phoneNumber, quote.refno);
  }

  initiateGenericPayment(quote: PendingQuote): void {
    // For all non-marine quotes (Personal Accident, Travel, Golf), use simplified payment flow
    const premium = quote.premium || quote.netprem || 0;
    const phoneNumber = quote.customerPhone || quote.phoneNo || '';
    
    this.openPaymentModal(premium, phoneNumber, quote.refno);
  }

  getQuoteTitle(quote: PendingQuote): string {
    switch (quote.productType) {
      case 'PERSONAL_ACCIDENT':
        return 'PERSONAL ACCIDENT INSURANCE';
      case 'TRAVEL':
        return 'TRAVEL INSURANCE';
      case 'GOLF':
        return 'GOLF INSURANCE';
      case 'MARINE_CARGO':
        return quote.prodName || 'MARINE CARGO INSURANCE';
      default:
        return quote.prodName || 'MARINE CARGO INSURANCE';
    }
  }

  getEditRoute(productType?: string): string {
    switch (productType) {
      case 'PERSONAL_ACCIDENT':
        return '/personal-accident-quote';
      case 'TRAVEL':
        return '/travel-quote';
      case 'GOLF':
        return '/golfers-quote';
      case 'MARINE_CARGO':
      default:
        return '/marine-quote';
    }
  }

  showOption(status):boolean{
      return status!=='PAID';
  }

    private openKycShippingPaymentModal(quoteId: number,originCountry:string,shippingmodeId:number,sumassured:number,pinNo: string,idNo: string,status:string,phone:string,prem:number,refno:string): void {
  const isMobile = window.innerWidth <= 480;

  // Add body class to prevent background scrolling on mobile
  if (isMobile) {
    document.body.classList.add('modal-open');
  }
  if(status==='DRAFT'){
  const dialogRef = this.dialog.open(KycShippingPaymentModalComponent, {
    width: isMobile ? '100vw' : '800px',
    maxWidth: isMobile ? '100vw' : '90vw',
    height: isMobile ? '100vh' : 'auto',
    maxHeight: isMobile ? '100vh' : '90vh',
    panelClass: ['payment-modal', ...(isMobile ? ['mobile-modal'] : [])],
    data: {quoteId:quoteId,originCountry:originCountry,shippingmodeId:shippingmodeId,sumassured:sumassured,pinNo:pinNo,idNo:idNo},
    disableClose: true,
    hasBackdrop: true,
    backdropClass: 'payment-modal-backdrop',
    // Add these mobile-specific options
    ...(isMobile && {
      position: { top: '0px', left: '0px' },
      autoFocus: false,
      restoreFocus: false
    })
  });

  dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
    // Remove body class when modal closes
    if (isMobile) {
      document.body.classList.remove('modal-open');
    }
   this.loadDashboardData();
  });
  }
  else if(status==='PENDING'){
      this.openPaymentModal(prem,phone,refno);
  }
}



    private openPaymentModal(premium,phoneNo,ref): void {
        const dialogRef = this.dialog.open(PaymentModalComponent, {
            width: '450px',
            data: {
                amount: premium,
                phoneNumber: phoneNo,
                reference: ref,
                description: `Marine Cargo Insurance for Quote ${ref}`
            },
            disableClose: true
        });

        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((paymentResult: PaymentResult | null) => {
            if (paymentResult?.success) {
                this.showToast('Payment successful!');
            } else {
                this.showToast('Payment cancelled or failed. Your quote has been saved.');
            }
        });
    }

    private showToast(message: string): void { this.toastMessage = message; setTimeout(() => (this.toastMessage = ''), 5000); }

    editQuote(quoteId: string): void {
        this.router.navigate(['/marine-quote'], { queryParams: { editId: quoteId } });
    }

   deleteQuote(quoteId: string, quoteIndex?: number): void {
  if (confirm('Are you sure you want to delete this saved quote?')) {
    console.log('Deleting quote with ID:', quoteId, 'at index:', quoteIndex);

    if (quoteIndex !== undefined && quoteIndex >= 0 && quoteIndex < this.pendingQuotes.length) {
      // Delete by index (more reliable when IDs are duplicated)
      console.log('Deleting quote at index:', quoteIndex);
      this.pendingQuotes.splice(quoteIndex, 1);
      this.totalRecords = Math.max(0, this.totalRecords - 1);

      this.snackBar.open('Quote deleted successfully.', 'OK', {
        duration: 3000,
        panelClass: ['fidelity-toast-panel']
      });

      // Handle pagination
      if (this.pendingQuotes.length === 0 && this.page > 0) {
        this.page--;
        this.loadDashboardData();
      }
    } else {
      // Fallback: try to delete by ID but only the first match
      console.log('No index provided, deleting first quote with ID:', quoteId);
      const indexToDelete = this.pendingQuotes.findIndex(q => q.id === quoteId);

      if (indexToDelete !== -1) {
        this.pendingQuotes.splice(indexToDelete, 1);
        this.totalRecords = Math.max(0, this.totalRecords - 1);

        this.snackBar.open('Quote deleted successfully.', 'OK', {
          duration: 3000,
          panelClass: ['fidelity-toast-panel']
        });

        // Handle pagination
        if (this.pendingQuotes.length === 0 && this.page > 0) {
          this.page--;
          this.loadDashboardData();
        }
      } else {
        console.error('Quote not found');
        this.snackBar.open('Quote not found.', 'OK', {
          duration: 3000,
          panelClass: ['fidelity-toast-panel']
        });
      }
    }
  }
}

  logout(): void {
     this.authService.logout();
     this.router.navigate(['/sign-in'], { replaceUrl: true });
  }

  goToMarineQuote() { this.router.navigate(['/marine-quote']); }

  openClaimModal(policy: Policy): void {
  const isMobile = window.innerWidth <= 480;

  // Add body class to prevent background scrolling on mobile
  if (isMobile) {
    document.body.classList.add('modal-open');
  }

  const dialogRef = this.dialog.open(ClaimRegistrationModalComponent, {
    data: { policy },
    panelClass: ['claim-modal-panel', ...(isMobile ? ['mobile-modal'] : [])],
    width: isMobile ? '100vw' : '650px',
    maxWidth: isMobile ? '100vw' : '90vw',
    height: isMobile ? '100vh' : 'auto',
    maxHeight: isMobile ? '100vh' : '90vh',
    autoFocus: false,
    // Add these mobile-specific options
    ...(isMobile && {
      position: { top: '0px', left: '0px' },
      restoreFocus: false,
      disableClose: false
    })
  });

  dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((newClaim: Claim | null) => {
    // Remove body class when modal closes
    if (isMobile) {
      document.body.classList.remove('modal-open');
    }

    if (newClaim) {
      this.claims.unshift(newClaim);
      this.applyClaimFilter();
      this.updateDashboardStats();
      this.snackBar.open(`Claim ${newClaim.claimNumber} submitted successfully.`, 'OK', {
        duration: 7000, panelClass: ['geminia-toast-panel']
      });
    }
  });
}

// Also add this method to handle mobile back button/escape key
@HostListener('window:resize', ['$event'])
onResize(event: Event) {
  const newWidth = (event.target as Window).innerWidth;

  if (newWidth >= 1024) {
    this.isMobileSidebarOpen = false;
  }

  if (this.dialog.openDialogs.length > 0) {
    // The variable was likely just mistyped.
    const wasMobile = newWidth > 480 && window.innerWidth <= 480; // Example of a state change
    const isMobile = newWidth <= 480;


    if (wasMobile) { // A simplified logic to check if a change occurred
      this.dialog.closeAll();
    }
  }
}

// Add this lifecycle hook to clean up when component is destroyed
ngOnDestroy(): void {
  // Remove body class if component is destroyed while modal is open
  document.body.classList.remove('modal-open');

  this.destroy$.next();
  this.destroy$.complete();
}
  setupNavigationBasedOnRole(role: 'C' | 'A'): void {
    this.navigationItems = [
        { label: 'Dashboard', icon: 'dashboard', sectionId: 'main-dashboard-area' },
        { label: 'My Claims', icon: 'assignment_late', sectionId: 'my-claims-section' },
        {
            label: 'Marine Insurance', icon: 'directions_boat', isExpanded: true,
            children: [ { label: 'New Quote', route: '/marine-quote', icon: 'add_circle' } ]
        },
        {
            label: 'Personal Accident', icon: 'personal_injury', isExpanded: true,
            children: [ { label: 'New Quote', route: '/personal-accident-quote', icon: 'add_circle' } ]
        },
        {
            label: 'Travel Insurance', icon: 'flight', isExpanded: true,
            children: [ { label: 'New Quote', route: '/travel-quote', icon: 'add_circle' } ]
        },
        {
            label: 'Golf Insurance', icon: 'golf_course', isExpanded: true,
            children: [ { label: 'New Quote', route: '/golfers-quote', icon: 'add_circle' } ]
        },
        { label: 'My Policies', icon: 'shield', sectionId: 'my-policies-section' },
        { label: 'Receipts', icon: 'receipt_long', route: '/receipts' }
    ];
  }

  // --- Utility and Display Methods ---
  @HostListener('window:resize', ['$event'])
  togglePolicyDetails(policyId: number): void { this.expandedPolicyId = this.expandedPolicyId === policyId ? null : policyId; }
  toggleClaimDetails(claimId: string): void { this.expandedClaimId = this.expandedClaimId === claimId ? null : claimId; }
  getInitials(name: string): string { return name?.split(' ').map((n) => n[0]).join('').substring(0, 2) || ''; }
  getUnreadNotificationCount(): number { return this.notifications.filter((n) => !n.read).length; }
  toggleNavItem(item: NavigationItem): void { if (item.children) item.isExpanded = !item.isExpanded; }
  toggleMobileSidebar(): void { this.isMobileSidebarOpen = !this.isMobileSidebarOpen; }
  downloadCertificate(policy: Policy): void {
    if (!policy || !policy.id) {
        this.snackBar.open('Invalid policy information', 'OK', { duration: 3000 });
        return;
    }

    // Show loading state
    this.snackBar.open('Downloading certificate...', '', { duration: 2000 });

    this.userService.downloadCertificate(policy.id).subscribe({
        next: (response: Blob) => {
            // Create a blob URL for the file
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary link and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `Certificate_${policy.refno || policy.erprefno}.pdf`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Show success message
            this.snackBar.open('Certificate downloaded successfully!', 'OK', { 
                duration: 3000,
                panelClass: ['success-snackbar']
            });
            
            // Log the download activity
            this.recentActivities.unshift({
                id: 'A' + Date.now(),
                title: 'Certificate Downloaded',
                description: `Certificate for policy ${policy.refno || policy.erprefno} downloaded`,
                timestamp: new Date(),
                icon: 'file_download',
                iconColor: '#04b2e1',
                relatedId: policy.erprefno.toString()
            });
        },
        error: (error) => {
            console.error('Error downloading policy:', error);
            this.snackBar.open('Error downloading policy. Please try again later.', 'OK', { duration: 5000 });
        }
    });
}
  markNotificationAsRead(notification: Notification): void { notification.read = true; if (notification.actionUrl) document.querySelector(notification.actionUrl)?.scrollIntoView({ behavior: 'smooth' }); }
  getClaimStatusClass(status: ClaimStatus): string {
    const statusMap: { [key in ClaimStatus]: string } = {
      'Submitted': 'status-submitted', 'Under Review': 'status-review', 'More Information Required': 'status-info-required', 'Approved': 'status-approved', 'Settled': 'status-settled', 'Rejected': 'status-rejected'
    };
    return statusMap[status] || '';
  }

    protected readonly Math = Math;
}
