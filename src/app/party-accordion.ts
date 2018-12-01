import { Component, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'party-accordion',
  templateUrl: './party-accordion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class partyAccordion {
  @Input() party: any;
  @Input() parent: any;
}