import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartySelectorModal } from './party-selector-modal';

describe('PartySelectorModal', () => {
  let component: PartySelectorModal;
  let fixture: ComponentFixture<PartySelectorModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartySelectorModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartySelectorModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
