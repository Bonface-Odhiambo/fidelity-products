import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { Router, RouterModule } from '@angular/router';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import { Subject, takeUntil, take } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MpesaPaymentModalComponent, PaymentResult } from '../shared/payment-modal.component';
import { QuoteSummaryModalComponent } from './quote-summary-modal.component';
import { ShareQuoteModalComponent } from './share-quote-modal.component';
import { AuthService } from 'app/core/auth/auth.service';

// Custom validators for personal accident
function noLeadingTrailingSpacesValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const trimmedValue = control.value.trim();
  if (control.value !== trimmedValue) {
    return { hasLeadingTrailingSpaces: true };
  }
  return null;
}

function phoneValidatorPA(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const trimmedValue = control.value.trim();
  if (control.value !== trimmedValue) {
    return { hasLeadingTrailingSpaces: true };
  }
  // More comprehensive phone validation for Kenyan numbers
  const phonePattern = /^(\+254|254|0)?[17]\d{8}$/;
  return phonePattern.test(trimmedValue) ? null : { invalidPhoneNumber: true };
}

// Additional validator for date range
function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const selectedDate = new Date(control.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
  const maxDate = new Date();
  maxDate.setFullYear(today.getFullYear() + 1);
  
  if (selectedDate < today) {
    return { pastDate: true };
  }
  if (selectedDate > maxDate) {
    return { futureDate: true };
  }
  return null;
}

// Specific validator for start date
function startDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const selectedDate = new Date(control.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
  
  if (selectedDate < today) {
    return { startDateInPast: true };
  }
  return null;
}

// Validator for ID/Passport number
function idPassportValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const trimmedValue = control.value.trim();
  if (control.value !== trimmedValue) {
    return { hasLeadingTrailingSpaces: true };
  }
  // Basic validation for Kenyan ID (8 digits) or passport format
  const idPattern = /^\d{8}$/; // Kenyan ID
  const passportPattern = /^[A-Z]\d{7}$/; // Basic passport format
  
  if (!idPattern.test(trimmedValue) && !passportPattern.test(trimmedValue)) {
    return { invalidIdPassport: true };
  }
  return null;
}

@Component({
  selector: 'personal-accident-quote',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatCheckboxModule,
    FuseAlertComponent,
    CurrencyPipe // For formatting currency in HTML
  ],
  templateUrl: './personal-accident-quote.component.html',
  styleUrl: './personal-accident-quote.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalAccidentQuoteComponent implements OnInit, OnDestroy { // <-- Implement OnDestroy
  private _formBuilder = inject(FormBuilder);
  private _router = inject(Router);
  private _cd = inject(ChangeDetectorRef);
  private _dialog = inject(MatDialog);
  private _authService = inject(AuthService);
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  personalAccidentForm!: FormGroup;
  showAlert: boolean = false;
  alert: { type: FuseAlertType; message: string } = {
    type: 'error',
    message: '',
  };
  calculatedPremium: number | null = null;
  currentStep: number = 1;

  // Data for the Cover Selected table
  benefits = [
    { name: 'Death', key: 'death' },
    { name: 'Accidental Permanent Total Disability', key: 'permanentTotalDisability' },
    { name: 'Hospital Cash', key: 'hospitalCash' },
    { name: 'Accidental Temporary Total Disability', key: 'temporaryTotalDisability' },
    { name: 'Accidental Medical Expense', key: 'medicalExpense' },
    { name: 'Artificial Appliances', key: 'artificialAppliances' },
    { name: 'Funeral Expenses', key: 'funeralExpenses' },
  ];

  // Define the options A-H and their corresponding values and premiums
  coverOptions = [
    {
      id: 'A',
      death: 250000, permanentTotalDisability: 250000, hospitalCash: 0,
      temporaryTotalDisability: 0, medicalExpense: 30000, artificialAppliances: 5000,
      funeralExpenses: 0,
      premiums: { '19-40': 1697, '41-70': 2702 }
    },
    {
      id: 'B',
      death: 500000, permanentTotalDisability: 500000, hospitalCash: 1500,
      temporaryTotalDisability: 2000, medicalExpense: 50000, artificialAppliances: 10000,
      funeralExpenses: 5000,
      premiums: { '19-40': 2702, '41-70': 3501 }
    },
    {
      id: 'C',
      death: 1000000, permanentTotalDisability: 1000000, hospitalCash: 3500,
      temporaryTotalDisability: 2500, medicalExpense: 100000, artificialAppliances: 10000,
      funeralExpenses: 10000,
      premiums: { '19-40': 5063, '41-70': 6569 }
    },
    {
      id: 'D',
      death: 2000000, permanentTotalDisability: 2000000, hospitalCash: 5500,
      temporaryTotalDisability: 3500, medicalExpense: 150000, artificialAppliances: 15000,
      funeralExpenses: 15000,
      premiums: { '19-40': 8779, '41-70': 11401 }
    },
    {
      id: 'E',
      death: 4000000, permanentTotalDisability: 4000000, hospitalCash: 8000,
      temporaryTotalDisability: 5000, medicalExpense: 200000, artificialAppliances: 20000,
      funeralExpenses: 20000,
      premiums: { '19-40': 15108, '41-70': 19628 }
    },
    {
      id: 'F',
      death: 6000000, permanentTotalDisability: 6000000, hospitalCash: 9000,
      temporaryTotalDisability: 8000, medicalExpense: 300000, artificialAppliances: 30000,
      funeralExpenses: 30000,
      premiums: { '19-40': 23144, '41-70': 27764 }
    },
    {
      id: 'G',
      death: 8000000, permanentTotalDisability: 8000000, hospitalCash: 10000,
      temporaryTotalDisability: 10000, medicalExpense: 400000, artificialAppliances: 40000,
      funeralExpenses: 40000,
      premiums: { '19-40': 31180, '41-70': 40521 }
    },
    {
      id: 'H',
      death: 10000000, permanentTotalDisability: 10000000, hospitalCash: 22000,
      temporaryTotalDisability: 15000, medicalExpense: 500000, artificialAppliances: 50000,
      funeralExpenses: 50000,
      premiums: { '19-40': 40220, '41-70': 52274 }
    }
  ];

  ageRanges = [
    { id: '19-40', label: 'Age 19 to 40' },
    { id: '41-70', label: 'Age 41 to 70' },
  ];

  ngOnInit(): void {
    this.personalAccidentForm = this._formBuilder.group({
      personalDetails: this._formBuilder.group({
        surname: ['', [Validators.required, noLeadingTrailingSpacesValidator]],
        firstName: ['', [Validators.required, noLeadingTrailingSpacesValidator]],
        middleName: ['', [noLeadingTrailingSpacesValidator]],
        address: ['', [Validators.required, noLeadingTrailingSpacesValidator]],
        postalCode: ['', [Validators.required, noLeadingTrailingSpacesValidator]],
        email: ['', [Validators.required, Validators.email, noLeadingTrailingSpacesValidator]],
        mobileNumber: ['', [Validators.required, phoneValidatorPA]],
        ageLastBirthday: ['', [Validators.required, Validators.min(18), Validators.max(70)]],
        passportIdNo: ['', [Validators.required, idPassportValidator]],
      }),
      beneficiaryDetails: this._formBuilder.group({
        beneficiaryName: ['', [Validators.required, noLeadingTrailingSpacesValidator]],
        beneficiaryRelationship: ['', [Validators.required, noLeadingTrailingSpacesValidator]],
      }),
      periodOfInsurance: this._formBuilder.group({
        fromDate: ['', [Validators.required, startDateValidator]],
        toDate: ['', [Validators.required, dateRangeValidator]],
      }),
      occupationClass: ['', Validators.required],
      hazardousActivities: ['', Validators.required],
      sustainedInjury: ['', Validators.required],
      injuryDetails: [''], // Conditionally required
      insurerDeclined: ['', Validators.required],
      freeFromIllness: ['', Validators.required],
      illnessDetails: [''], // Conditionally required
      engagedInExcludedActivities: ['', Validators.required],
      extensionOfCover: [''], // Conditionally required
      coverOption: ['', Validators.required], // User selects A-H
      ageRange: ['', Validators.required], // User selects age bracket
      signature: ['', Validators.required],
      declarationDate: ['', Validators.required],
      agreementAccepted: [false, Validators.requiredTrue],
    });

    this.setupConditionalValidators();

    // Subscribe to changes in coverOption and ageRange to recalculate premium
    this.personalAccidentForm.get('coverOption')?.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => this.calculatePremium());
    this.personalAccidentForm.get('ageRange')?.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => this.calculatePremium());

    // Subscribe to form changes to update button states in real-time
    this.personalAccidentForm.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this._cd.markForCheck(); // Trigger change detection for button state updates
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(undefined); // FIX: Provide an argument here
    this._unsubscribeAll.complete();
  }

  private setupConditionalValidators(): void {
    const injuryControl = this.personalAccidentForm.get('sustainedInjury');
    const injuryDetailsControl = this.personalAccidentForm.get('injuryDetails');
    const illnessControl = this.personalAccidentForm.get('freeFromIllness');
    const illnessDetailsControl = this.personalAccidentForm.get('illnessDetails');
    const engagedActivitiesControl = this.personalAccidentForm.get('engagedInExcludedActivities');
    const extensionOfCoverControl = this.personalAccidentForm.get('extensionOfCover');

    injuryControl?.valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe((value) => {
      if (value === true) {
        injuryDetailsControl?.setValidators(Validators.required);
      } else {
        injuryDetailsControl?.clearValidators();
        injuryDetailsControl?.setValue('');
      }
      injuryDetailsControl?.updateValueAndValidity();
      this._cd.markForCheck();
    });

    illnessControl?.valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe((value) => {
      if (value === false) { // "If No, please give details"
        illnessDetailsControl?.setValidators(Validators.required);
      } else {
        illnessDetailsControl?.clearValidators();
        illnessDetailsControl?.setValue('');
      }
      illnessDetailsControl?.updateValueAndValidity();
      this._cd.markForCheck();
    });

    engagedActivitiesControl?.valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe((value) => {
      if (value === true) {
        extensionOfCoverControl?.setValidators(Validators.required);
      } else {
        extensionOfCoverControl?.clearValidators();
        extensionOfCoverControl?.setValue(''); // Clear value if "No"
      }
      extensionOfCoverControl?.updateValueAndValidity();
      this._cd.markForCheck();
    });
  }

  calculatePremium(): void {
    const coverOptionId = this.personalAccidentForm.get('coverOption')?.value;
    const ageRangeId = this.personalAccidentForm.get('ageRange')?.value;
    const engagedInExcludedActivities = this.personalAccidentForm.get('engagedInExcludedActivities')?.value;
    const extensionOfCover = this.personalAccidentForm.get('extensionOfCover')?.value;

    if (coverOptionId && ageRangeId) {
      const selectedCover = this.coverOptions.find(opt => opt.id === coverOptionId);
      if (selectedCover) {
        let basePremium = selectedCover.premiums[ageRangeId];

        if (engagedInExcludedActivities === true && extensionOfCover === true) {
          // Add 25% to the basic premium if extension is selected
          basePremium = basePremium * 1.25;
        }
        this.calculatedPremium = basePremium;
      }
    } else {
      this.calculatedPremium = null;
    }
    this._cd.markForCheck();
  }

  getQuote(): void {
    this.showAlert = false;
    this.personalAccidentForm.markAllAsTouched();

    if (this.personalAccidentForm.invalid) {
      this.triggerAlert('error', 'Please fill in all required fields correctly to get a quote.', 'inline');
      return;
    }

    if (!this.calculatedPremium) {
      this.triggerAlert('error', 'Please select a cover option and age range to calculate premium.', 'inline');
      return;
    }

    // Show quote summary modal instead of payment modal
    this.showQuoteSummary();
  }

  private showQuoteSummary(): void {
    const formData = this.personalAccidentForm.getRawValue();
    const reference = this.generateQuoteReference();
    const selectedCover = this.coverOptions.find(opt => opt.id === formData.coverOption);
    
    if (!selectedCover) {
      this.triggerAlert('error', 'Invalid cover option selected.', 'inline');
      return;
    }

    const dialogRef = this._dialog.open(QuoteSummaryModalComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        formData: formData,
        coverOption: selectedCover,
        ageRange: formData.ageRange,
        calculatedPremium: this.calculatedPremium,
        benefits: this.benefits,
        reference: reference
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.action === 'payment') {
        // User clicked "Proceed to Payment" and is authenticated
        this.openPaymentModal(result.quoteData);
      } else if (result?.action === 'redirect') {
        // User was redirected to homepage for login
        // Toast message already shown in the modal
      }
      // If action is 'edit', user just closes modal to edit the form
    });
  }

  private openPaymentModal(quoteData?: any): void {
    const formData = quoteData?.formData || this.personalAccidentForm.getRawValue();
    const reference = quoteData?.reference || this.generateQuoteReference();
    
    const dialogRef = this._dialog.open(MpesaPaymentModalComponent, {
      width: '450px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        amount: this.calculatedPremium,
        phoneNumber: formData.personalDetails.mobileNumber,
        reference: reference,
        description: 'Personal Accident Insurance Premium'
      }
    });

    dialogRef.afterClosed().subscribe((result: PaymentResult | null) => {
      if (result && result.success) {
        this.handlePaymentSuccess(result, reference);
      } else {
        this.triggerAlert('info', 'Payment was cancelled. You can try again anytime.', 'inline');
      }
    });
  }

  private generateQuoteReference(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PA${timestamp.slice(-6)}${random}`;
  }

  private handlePaymentSuccess(result: PaymentResult, reference: string): void {
    // Here you would typically send the form data and payment info to your backend
    const formData = this.personalAccidentForm.getRawValue();
    
    console.log('Personal Accident Quote Form Submitted:', formData);
    console.log('Payment Result:', result);
    console.log('Quote Reference:', reference);
    console.log('Premium Paid:', this.calculatedPremium);

    // Show success message
    let successMessage = `Payment successful! Your Personal Accident Insurance quote has been processed. Quote Reference: ${reference}`;

    this.triggerAlert('success', successMessage, 'inline');

    // Reset form for new quote
    setTimeout(() => {
      this.resetForm();
    }, 3000);
  }

  resetForm(): void {
    this.personalAccidentForm.reset();
    this.personalAccidentForm.get('personalDetails.ageLastBirthday')?.setValue(''); // To clear number input default 0
    this.personalAccidentForm.get('ageRange')?.setValue(''); // Clear radio button
    this.personalAccidentForm.get('coverOption')?.setValue(''); // Clear radio button
    this.personalAccidentForm.get('agreementAccepted')?.setValue(false);
    this.calculatedPremium = null;
    this.showAlert = false;
    this.setupConditionalValidators(); // Re-apply conditional validators after reset
    this._cd.markForCheck();
  }

  private triggerAlert(type: FuseAlertType, message: string, position: 'inline'): void {
    this.alert = { type, message };
    this.showAlert = true;
    this._cd.markForCheck();
    // Hide alert after 5 seconds
    setTimeout(() => {
      this.showAlert = false;
      this._cd.markForCheck();
    }, 5000);
  }

  // Step navigation methods
  nextStep(): void {
    if (this.currentStep === 1 && !this.isStep1Valid()) {
      this.markStep1AsTouched();
      const missingFields = this.getMissingStep1Fields();
      this.triggerAlert('error', `Please complete the following: ${missingFields.join(', ')}`, 'inline');
      return;
    }
    
    if (this.currentStep === 2 && !this.isStep2Valid()) {
      this.markStep2AsTouched();
      const missingFields = this.getMissingStep2Fields();
      this.triggerAlert('error', `Please complete the following: ${missingFields.join(', ')}`, 'inline');
      return;
    }
    
    if (this.currentStep < 3) {
      this.currentStep++;
      this.showAlert = false; // Clear any existing alerts
      this._cd.markForCheck();
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this._cd.markForCheck();
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= 3) {
      this.currentStep = step;
      this._cd.markForCheck();
    }
  }

  closeForm(): void {
    this._router.navigate(['/']);
  }

  // Coverage selection methods
  selectCoverageOption(optionId: string): void {
    this.personalAccidentForm.get('coverOption')?.setValue(optionId);
    this.calculatePremium();
  }

  getSelectedPremium(plan: any): number {
    const ageRangeId = this.personalAccidentForm.get('ageRange')?.value || '19-40';
    return plan.premiums[ageRangeId] || plan.premiums['19-40'];
  }

  getSelectedCoverOption(): any {
    const selectedId = this.personalAccidentForm.get('coverOption')?.value;
    return this.coverOptions.find(option => option.id === selectedId);
  }

  // Step validation methods
  isStep1Valid(): boolean {
    const coverOption = this.personalAccidentForm.get('coverOption')?.value;
    const ageRange = this.personalAccidentForm.get('ageRange')?.value;
    return !!coverOption && !!ageRange;
  }

  // Getters for reactive button states
  get isStep1FormValid(): boolean {
    return this.isStep1Valid();
  }

  get isStep2FormValid(): boolean {
    return this.isStep2Valid();
  }
  
  isStep2Valid(): boolean {
    const personalDetails = this.personalAccidentForm.get('personalDetails');
    const beneficiaryDetails = this.personalAccidentForm.get('beneficiaryDetails');
    const periodOfInsurance = this.personalAccidentForm.get('periodOfInsurance');
    const occupationClass = this.personalAccidentForm.get('occupationClass');
    const hazardousActivities = this.personalAccidentForm.get('hazardousActivities');
    const sustainedInjury = this.personalAccidentForm.get('sustainedInjury');
    const insurerDeclined = this.personalAccidentForm.get('insurerDeclined');
    const freeFromIllness = this.personalAccidentForm.get('freeFromIllness');
    const engagedInExcludedActivities = this.personalAccidentForm.get('engagedInExcludedActivities');
    
    // Check if all required fields are valid
    const isPersonalDetailsValid = personalDetails?.valid;
    const isBeneficiaryDetailsValid = beneficiaryDetails?.valid;
    const isPeriodValid = periodOfInsurance?.valid;
    const isOccupationValid = occupationClass?.valid;
    const isHazardousActivitiesValid = hazardousActivities?.value !== null && hazardousActivities?.value !== '';
    const isSustainedInjuryValid = sustainedInjury?.value !== null && sustainedInjury?.value !== '';
    const isInsurerDeclinedValid = insurerDeclined?.value !== null && insurerDeclined?.value !== '';
    const isFreeFromIllnessValid = freeFromIllness?.value !== null && freeFromIllness?.value !== '';
    const isEngagedActivitiesValid = engagedInExcludedActivities?.value !== null && engagedInExcludedActivities?.value !== '';
    
    // Check conditional validations
    const injuryDetailsValid = sustainedInjury?.value === true ? 
      this.personalAccidentForm.get('injuryDetails')?.valid : true;
    const illnessDetailsValid = freeFromIllness?.value === false ? 
      this.personalAccidentForm.get('illnessDetails')?.valid : true;
    const extensionOfCoverValid = engagedInExcludedActivities?.value === true ? 
      this.personalAccidentForm.get('extensionOfCover')?.value !== null && this.personalAccidentForm.get('extensionOfCover')?.value !== '' : true;
    
    return isPersonalDetailsValid && isBeneficiaryDetailsValid && isPeriodValid && 
           isOccupationValid && isHazardousActivitiesValid && 
           isSustainedInjuryValid && isInsurerDeclinedValid && isFreeFromIllnessValid && 
           isEngagedActivitiesValid && injuryDetailsValid && illnessDetailsValid && extensionOfCoverValid;
  }
  
  getMissingStep1Fields(): string[] {
    const missingFields: string[] = [];
    
    if (!this.personalAccidentForm.get('ageRange')?.value) {
      missingFields.push('Age Range');
    }
    
    if (!this.personalAccidentForm.get('coverOption')?.value) {
      missingFields.push('Coverage Plan');
    }
    
    return missingFields;
  }

  getMissingStep2Fields(): string[] {
    const missingFields: string[] = [];
    
    // Check personal details
    const personalDetails = this.personalAccidentForm.get('personalDetails');
    if (personalDetails?.get('firstName')?.invalid) {
      missingFields.push('First Name');
    }
    if (personalDetails?.get('surname')?.invalid) {
      missingFields.push('Last Name');
    }
    if (personalDetails?.get('ageLastBirthday')?.invalid) {
      missingFields.push('Age');
    }
    if (personalDetails?.get('passportIdNo')?.invalid) {
      missingFields.push('ID/Passport Number');
    }
    if (personalDetails?.get('postalCode')?.invalid) {
      missingFields.push('Postal Code');
    }
    if (personalDetails?.get('email')?.invalid) {
      missingFields.push('Email Address');
    }
    if (personalDetails?.get('mobileNumber')?.invalid) {
      missingFields.push('Mobile Number');
    }
    if (personalDetails?.get('address')?.invalid) {
      missingFields.push('Address');
    }
    
    // Check beneficiary details
    const beneficiaryDetails = this.personalAccidentForm.get('beneficiaryDetails');
    if (beneficiaryDetails?.get('beneficiaryName')?.invalid) {
      missingFields.push('Beneficiary Name');
    }
    if (beneficiaryDetails?.get('beneficiaryRelationship')?.invalid) {
      missingFields.push('Beneficiary Relationship');
    }
    
    // Check period of insurance
    const periodOfInsurance = this.personalAccidentForm.get('periodOfInsurance');
    if (periodOfInsurance?.get('fromDate')?.invalid) {
      const fromDateErrors = periodOfInsurance?.get('fromDate')?.errors;
      if (fromDateErrors?.['required']) {
        missingFields.push('Start Date');
      } else if (fromDateErrors?.['startDateInPast']) {
        missingFields.push('Valid Start Date (cannot be in the past)');
      }
    }
    if (periodOfInsurance?.get('toDate')?.invalid) {
      const toDateErrors = periodOfInsurance?.get('toDate')?.errors;
      if (toDateErrors?.['required']) {
        missingFields.push('End Date');
      } else if (toDateErrors?.['pastDate']) {
        missingFields.push('Valid End Date (cannot be in the past)');
      } else if (toDateErrors?.['futureDate']) {
        missingFields.push('Valid End Date (cannot be more than 1 year in the future)');
      }
    }
    
    // Check other required fields
    if (!this.personalAccidentForm.get('occupationClass')?.value) {
      missingFields.push('Occupation Class');
    }
    if (this.personalAccidentForm.get('hazardousActivities')?.value === null || this.personalAccidentForm.get('hazardousActivities')?.value === '') {
      missingFields.push('Hazardous Activities');
    }
    if (this.personalAccidentForm.get('sustainedInjury')?.value === null || this.personalAccidentForm.get('sustainedInjury')?.value === '') {
      missingFields.push('Past Injury');
    }
    if (this.personalAccidentForm.get('insurerDeclined')?.value === null || this.personalAccidentForm.get('insurerDeclined')?.value === '') {
      missingFields.push('Insurer Declined');
    }
    if (this.personalAccidentForm.get('freeFromIllness')?.value === null || this.personalAccidentForm.get('freeFromIllness')?.value === '') {
      missingFields.push('Free from Illness');
    }
    if (this.personalAccidentForm.get('engagedInExcludedActivities')?.value === null || this.personalAccidentForm.get('engagedInExcludedActivities')?.value === '') {
      missingFields.push('Excluded Activities');
    }
    
    // Check conditional fields
    if (this.personalAccidentForm.get('sustainedInjury')?.value === true && this.personalAccidentForm.get('injuryDetails')?.invalid) {
      missingFields.push('Injury Details');
    }
    if (this.personalAccidentForm.get('freeFromIllness')?.value === false && this.personalAccidentForm.get('illnessDetails')?.invalid) {
      missingFields.push('Illness Details');
    }
    if (this.personalAccidentForm.get('engagedInExcludedActivities')?.value === true && 
        (this.personalAccidentForm.get('extensionOfCover')?.value === null || this.personalAccidentForm.get('extensionOfCover')?.value === '')) {
      missingFields.push('Extension of Cover');
    }
    
    return missingFields;
  }

  markStep1AsTouched(): void {
    this.personalAccidentForm.get('coverOption')?.markAsTouched();
    this.personalAccidentForm.get('ageRange')?.markAsTouched();
  }
  
  markStep2AsTouched(): void {
    // Mark all step 2 fields as touched
    const personalDetails = this.personalAccidentForm.get('personalDetails') as FormGroup;
    if (personalDetails) {
      Object.keys(personalDetails.controls).forEach(key => {
        personalDetails.get(key)?.markAsTouched();
      });
    }
    
    const beneficiaryDetails = this.personalAccidentForm.get('beneficiaryDetails') as FormGroup;
    if (beneficiaryDetails) {
      Object.keys(beneficiaryDetails.controls).forEach(key => {
        beneficiaryDetails.get(key)?.markAsTouched();
      });
    }
    
    const periodOfInsurance = this.personalAccidentForm.get('periodOfInsurance') as FormGroup;
    if (periodOfInsurance) {
      Object.keys(periodOfInsurance.controls).forEach(key => {
        periodOfInsurance.get(key)?.markAsTouched();
      });
    }
    
    // Mark other step 2 controls
    ['occupationClass', 'hazardousActivities', 'sustainedInjury', 
     'insurerDeclined', 'freeFromIllness', 'engagedInExcludedActivities', 
     'injuryDetails', 'illnessDetails', 'extensionOfCover'].forEach(controlName => {
      this.personalAccidentForm.get(controlName)?.markAsTouched();
    });
  }

  shareQuote(): void {
    if (this.personalAccidentForm.invalid || !this.calculatedPremium) {
      this.triggerAlert('error', 'Please complete the form and select coverage before sharing.', 'inline');
      return;
    }

    const formData = this.personalAccidentForm.getRawValue();
    const selectedCover = this.coverOptions.find(opt => opt.id === formData.coverOption);
    const reference = this.generateQuoteReference();
    
    if (!selectedCover) {
      this.triggerAlert('error', 'Invalid cover option selected.', 'inline');
      return;
    }

    const dialogRef = this._dialog.open(ShareQuoteModalComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: false,
      data: {
        formData: formData,
        coverOption: selectedCover,
        calculatedPremium: this.calculatedPremium,
        benefits: this.benefits,
        reference: reference
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      // Handle any post-share actions if needed
      console.log('Share modal closed', result);
    });
  }
}