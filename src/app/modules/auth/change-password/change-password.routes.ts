import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./change-password.component').then(m => m.ChangePasswordComponent),
    },
] as Routes;
