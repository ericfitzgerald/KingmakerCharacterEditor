import { Component, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-party-accordion',
  templateUrl: './party-accordion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

// @todo: remove the parent assignment. Party shouldn't be a shared data
export class PartyAccordionComponent {
  @Input() party: any;
  @Input() parent: any;
}
