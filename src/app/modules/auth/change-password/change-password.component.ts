import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import { AuthService } from 'app/core/auth/auth.service';
import { UserService } from 'app/core/user/user.service';

@Component({
    selector: 'auth-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        RouterLink,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        FuseAlertComponent
    ]
})
export class ChangePasswordComponent implements OnInit {
    changePasswordForm: FormGroup;
    alert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: ''
    };
    showAlert: boolean = false;
    showCurrentPassword: boolean = false;
    showNewPassword: boolean = false;
    showConfirmPassword: boolean = false;

    /**
     * Constructor
     */
    constructor(
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
        private _router: Router,
        private _userService: UserService
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Create the form
        this.changePasswordForm = this._formBuilder.group({
            currentPassword: ['', [Validators.required]],
            newPassword: ['', [Validators.required, this.passwordValidator]],
            confirmPassword: ['', [Validators.required]]
        }, {
            validators: this.passwordMatchValidator
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Change password
     */
    changePassword(): void {
        // Return if the form is invalid
        if (this.changePasswordForm.invalid) {
            return;
        }

        // Disable the form
        this.changePasswordForm.disable();

        // Hide the alert
        this.showAlert = false;

        // Get form values
        const { currentPassword, newPassword } = this.changePasswordForm.value;

        // Call the change password service
        this._authService.changePassword(currentPassword, newPassword).subscribe({
            next: (response) => {
                // Show success alert
                this.alert = {
                    type: 'success',
                    message: 'Your password has been successfully updated! You will be redirected to the dashboard.'
                };
                this.showAlert = true;

                // Redirect to dashboard after a delay
                setTimeout(() => {
                    this._router.navigate(['/dashboard']);
                }, 2000);
            },
            error: (error) => {
                // Re-enable the form
                this.changePasswordForm.enable();

                // Set the alert
                let errorMessage = 'An error occurred while changing your password. Please try again.';
                
                if (error.error?.message) {
                    errorMessage = error.error.message;
                } else if (error.status === 401) {
                    errorMessage = 'Current password is incorrect. Please try again.';
                } else if (error.status === 400) {
                    errorMessage = 'Invalid password format. Please check the requirements.';
                }

                this.alert = {
                    type: 'error',
                    message: errorMessage
                };

                // Show the alert
                this.showAlert = true;
            }
        });
    }

    /**
     * Toggle current password visibility
     */
    toggleCurrentPasswordVisibility(): void {
        this.showCurrentPassword = !this.showCurrentPassword;
    }

    /**
     * Toggle new password visibility
     */
    toggleNewPasswordVisibility(): void {
        this.showNewPassword = !this.showNewPassword;
    }

    /**
     * Toggle confirm password visibility
     */
    toggleConfirmPasswordVisibility(): void {
        this.showConfirmPassword = !this.showConfirmPassword;
    }

    /**
     * Password strength validation methods
     */
    hasMinLength(password: string): boolean {
        return password && password.length >= 8;
    }

    hasLowercase(password: string): boolean {
        return password && /[a-z]/.test(password);
    }

    hasUppercase(password: string): boolean {
        return password && /[A-Z]/.test(password);
    }

    hasNumber(password: string): boolean {
        return password && /\d/.test(password);
    }

    hasSpecialChar(password: string): boolean {
        return password && /[@$!%*?&]/.test(password);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Password validator
     */
    private passwordValidator(control: AbstractControl): ValidationErrors | null {
        const password = control.value;

        if (!password) {
            return null;
        }

        const hasMinLength = password.length >= 8;
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[@$!%*?&]/.test(password);

        const passwordValid = hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSpecialChar;

        return passwordValid ? null : { passwordInvalid: true };
    }

    /**
     * Password match validator
     */
    private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
        const newPassword = control.get('newPassword');
        const confirmPassword = control.get('confirmPassword');

        if (!newPassword || !confirmPassword) {
            return null;
        }

        if (newPassword.value !== confirmPassword.value) {
            confirmPassword.setErrors({ mustMatch: true });
            return { passwordMismatch: true };
        } else {
            // Clear the error if passwords match
            const errors = confirmPassword.errors;
            if (errors) {
                delete errors['mustMatch'];
                confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
            }
        }

        return null;
    }
}
