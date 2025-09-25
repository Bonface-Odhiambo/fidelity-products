import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    FormsModule,
    NgForm,
    ReactiveFormsModule,
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import { AuthService } from 'app/core/auth/auth.service';
import { finalize } from 'rxjs';

@Component({
    selector: 'auth-forgot-password',
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    imports: [
        CommonModule,
        FuseAlertComponent,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        RouterLink,
    ],
})
export class AuthForgotPasswordComponent implements OnInit {
    @ViewChild('forgotPasswordNgForm') forgotPasswordNgForm: NgForm;

    alert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    forgotPasswordForm: UntypedFormGroup;
    showAlert: boolean = false;

    /**
     * Constructor
     */
    constructor(
        private _authService: AuthService,
        private _formBuilder: UntypedFormBuilder
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Create the form
        this.forgotPasswordForm = this._formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get button classes based on form state
     */
    getButtonClasses(): string {
        const baseClasses = 'w-full rounded-xl py-4 text-sm font-bold transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-fidelity-primary/30 shadow-lg';
        
        if (this.forgotPasswordForm.disabled) {
            // Loading state - keep light green background with dark green text
            return baseClasses + ' cursor-not-allowed';
        } else if (this.forgotPasswordForm.valid) {
            // Valid email - light green background with dark green text (active state)
            return baseClasses + ' hover:scale-[1.02] cursor-pointer';
        } else {
            // Invalid/empty email - dark green background with white text (disabled state)  
            return baseClasses + ' cursor-not-allowed';
        }
    }
    
    /**
     * Get button style based on form state
     */
    getButtonStyle(): any {
        if (this.forgotPasswordForm.disabled) {
            // Loading state - light green background with dark green text
            return { 
                'background-color': '#B7DC78',
                'color': '#007B7B'
            };
        } else if (this.forgotPasswordForm.valid) {
            // Valid email - light green background with dark green text
            return { 
                'background-color': '#B7DC78',
                'color': '#007B7B'
            };
        } else {
            // Invalid/empty email - dark green background with white text
            return { 
                'background-color': '#007B7B',
                'color': '#ffffff',
                'opacity': '0.7'
            };
        }
    }

    /**
     * Send the reset link
     */
    sendResetLink(): void {
        // Return if the form is invalid
        if (this.forgotPasswordForm.invalid) {
            return;
        }

        // Disable the form
        this.forgotPasswordForm.disable();

        // Hide the alert
        this.showAlert = false;

        // Forgot password
        this._authService
            .forgotPassword(this.forgotPasswordForm.get('email').value)
            .pipe(
                finalize(() => {
                    // Re-enable the form
                    this.forgotPasswordForm.enable();

                    // Reset the form
                    this.forgotPasswordNgForm.resetForm();

                    // Show the alert
                    this.showAlert = true;
                })
            )
            .subscribe(
                (response) => {
                    // Set the alert
                    this.alert = {
                        type: 'success',
                        message:
                            "Password reset sent! You'll receive an email if you are registered on our system.",
                    };
                },
                (response) => {
                    // Set the alert
                    this.alert = {
                        type: 'error',
                        message:
                            'Email does not found! Are you sure you are already a member?',
                    };
                }
            );
    }
}
