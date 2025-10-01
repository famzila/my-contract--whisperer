import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContractUpload } from './contract-upload';

describe('ContractUpload', () => {
  let component: ContractUpload;
  let fixture: ComponentFixture<ContractUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractUpload]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContractUpload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
