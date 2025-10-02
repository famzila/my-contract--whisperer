import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  imports: [CommonModule],
  templateUrl: './card.html',
  styleUrl: './card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // host: {
  //   '[class]': '"bg-white rounded-xl shadow-lg overflow-hidden " + (padding() ? "p-6" : "")',
  // },
})
export class Card {
  padding = input<boolean>(true);
  hoverable = input<boolean>(false);
}
