import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {FormsModule} from '@angular/forms';
import {AppComponent} from './app.component';
import {PartyAccordionComponent} from './party-accordion';

@NgModule({
  declarations: [
    AppComponent, PartyAccordionComponent
  ],
  imports: [
    NgbModule,
    BrowserModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
