import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appTrim]',
  standalone: true
})
export class TrimDirective {

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private control: NgControl
  ) {}

  @HostListener('blur', ['$event.target.value'])
  onBlur(value: string): void {
    this.trimValue(value);
  }

  @HostListener('input', ['$event.target.value'])
  onInput(value: string): void {
    // Only trim leading spaces on input, preserve trailing for better UX during typing
    if (value && value !== value.trimStart()) {
      this.trimLeadingSpaces(value);
    }
  }

  private trimValue(value: string): void {
    if (value && typeof value === 'string') {
      const trimmedValue = value.trim();
      if (value !== trimmedValue) {
        this.updateValue(trimmedValue);
      }
    }
  }

  private trimLeadingSpaces(value: string): void {
    if (value && typeof value === 'string') {
      const trimmedValue = value.trimStart();
      if (value !== trimmedValue) {
        this.updateValue(trimmedValue);
      }
    }
  }

  private updateValue(newValue: string): void {
    // Update the form control value
    if (this.control && this.control.control) {
      this.control.control.setValue(newValue);
    }
    
    // Update the DOM element value
    this.renderer.setProperty(this.el.nativeElement, 'value', newValue);
  }
}
