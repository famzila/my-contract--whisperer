import { Injectable, inject } from '@angular/core';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { SampleContractModal } from '../../shared/components/sample-contract-modal/sample-contract-modal';
import { HowItWorksModal } from '../../shared/components/how-it-works-modal/how-it-works-modal';
import { PrivacyPolicyModal } from '../../shared/components/privacy-policy-modal/privacy-policy-modal';
import { TermsOfServiceModal } from '../../shared/components/terms-of-service-modal/terms-of-service-modal';
import { PartySelectorModal } from '../../shared/components/party-selector-modal/party-selector-modal';
import { EmailDraftModal } from '../../shared/components/email-draft-modal/email-draft-modal';

export interface ModalConfig {
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
  panelClass?: string;
  hasBackdrop?: boolean;
  disableClose?: boolean;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private dialog = inject(Dialog);

  /**
   * Open Sample Contract Modal
   */
  openSampleContract(config?: ModalConfig): DialogRef<any, any> {
    return this.dialog.open(SampleContractModal, {
      width: '90vw',
      maxWidth: '56rem', // 4xl = 56rem
      maxHeight: '90vh',
      panelClass: 'sample-contract-modal',
      hasBackdrop: true,
      disableClose: false,
      ...config
    });
  }

  /**
   * Open How It Works Modal
   */
  openHowItWorks(config?: ModalConfig): DialogRef<any, any> {
    return this.dialog.open(HowItWorksModal, {
      width: '90vw',
      maxWidth: '56rem', // 4xl = 56rem
      maxHeight: '90vh',
      panelClass: 'how-it-works-modal',
      hasBackdrop: true,
      disableClose: false,
      ...config
    });
  }

  /**
   * Open Privacy Policy Modal
   */
  openPrivacyPolicy(config?: ModalConfig): DialogRef<any, any> {
    return this.dialog.open(PrivacyPolicyModal, {
      width: '90vw',
      maxWidth: '56rem', // 4xl = 56rem
      maxHeight: '90vh',
      panelClass: 'privacy-policy-modal',
      hasBackdrop: true,
      disableClose: false,
      ...config
    });
  }

  /**
   * Open Terms of Service Modal
   */
  openTermsOfService(config?: ModalConfig): DialogRef<any, any> {
    return this.dialog.open(TermsOfServiceModal, {
      width: '90vw',
      maxWidth: '56rem', // 4xl = 56rem
      maxHeight: '90vh',
      panelClass: 'terms-of-service-modal',
      hasBackdrop: true,
      disableClose: false,
      ...config
    });
  }

  /**
   * Open Party Selector Modal
   */
  openPartySelector(config?: ModalConfig): DialogRef<any, any> {
    return this.dialog.open(PartySelectorModal, {
      width: '90vw',
      maxWidth: '42rem', // 2xl = 42rem
      maxHeight: '90vh',
      panelClass: 'party-selector-modal',
      hasBackdrop: true,
      disableClose: false,
      ...config
    });
  }

  /**
   * Open Email Draft Modal
   */
  openEmailDraft(emailData: any, config?: ModalConfig): DialogRef<any, any> {
    return this.dialog.open(EmailDraftModal, {
      width: '90vw',
      maxWidth: '48rem', // 3xl = 48rem
      maxHeight: '90vh',
      panelClass: 'email-draft-modal',
      hasBackdrop: true,
      disableClose: false,
      data: emailData,
      ...config
    });
  }


  /**
   * Close all open dialogs
   */
  closeAll(): void {
    this.dialog.closeAll();
  }
}
