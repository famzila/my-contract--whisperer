import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanguageBanner } from './language-banner';

describe('LanguageBanner', () => {
  let component: LanguageBanner;
  let fixture: ComponentFixture<LanguageBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageBanner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LanguageBanner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
