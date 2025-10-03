import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NonContractError } from './non-contract-error';

describe('NonContractError', () => {
  let component: NonContractError;
  let fixture: ComponentFixture<NonContractError>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NonContractError]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NonContractError);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
