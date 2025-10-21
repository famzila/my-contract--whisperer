import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SkeletonLine {
  width: string;
  height: string;
}

export interface SkeletonCard {
  lines: SkeletonLine[];
  padding?: string;
  rounded?: string;
}

export interface SkeletonList {
  items: number;
  card: SkeletonCard;
}

export interface SkeletonImage {
  width: string;
  height: string;
  rounded?: string;
}

/**
 * Generic Skeleton Loader Component
 * Displays animated loading placeholders with configurable options
 * Based on Flowbite skeleton patterns
 *
 * @example
 * <!-- Text skeleton with 5 lines -->
 * <app-skeleton-loader type="text" [lines]="5"></app-skeleton-loader>
 *
 * @example
 * <!-- Card skeleton with custom padding -->
 * <app-skeleton-loader type="card" [lines]="3" cardPadding="p-8"></app-skeleton-loader>
 *
 * @example
 * <!-- List skeleton with 4 items -->
 * <app-skeleton-loader type="list" [items]="4" loadingText="Loading data..."></app-skeleton-loader>
 *
 * @example
 * <!-- Avatar skeleton -->
 * <app-skeleton-loader type="avatar" avatarSize="60px"></app-skeleton-loader>
 *
 * @example
 * <!-- Custom skeleton with specific lines -->
 * <app-skeleton-loader
 *   type="custom"
 *   [customLines]="[
 *     { width: 'w-full', height: 'h-6' },
 *     { width: 'w-3/4', height: 'h-4' },
 *     { width: 'w-1/2', height: 'h-4' }
 *   ]">
 * </app-skeleton-loader>
 */
@Component({
  selector: 'app-skeleton-loader',
  imports: [CommonModule],
  template: `
    <div class="skeleton-container" [class]="containerClasses()" role="status" [attr.aria-label]="ariaLabel()">
      @switch (type()) { @case ('text') {
      <div class="space-y-2">
        @for (line of textLines(); track $index) {
        <div
          class="skeleton-text-line"
          [style.width]="line.width"
          [style.height]="line.height"
        ></div>
        }
      </div>
      } @case ('card') {
      <div class="skeleton-card" [class]="cardClasses()">
        <div class="space-y-3">
          @for (line of cardLines(); track $index) {
          <div
            class="skeleton-card-line"
            [style.width]="line.width"
            [style.height]="line.height"
          ></div>
          }
        </div>
      </div>
      } @case ('list') {
      <div class="space-y-3">
        @for (item of listItems(); track $index) {
        <div class="skeleton-list-item" [class]="listItemClasses()">
          <div class="space-y-2">
            @for (line of listItemLines(); track $index) {
            <div
              class="skeleton-list-item-line"
              [style.width]="line.width"
              [style.height]="line.height"
            ></div>
            }
          </div>
        </div>
        }
      </div>
      } @case ('image') {
      <div class="skeleton-image" [class]="imageClasses()">
        <svg
          class="skeleton-image-icon"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 20 18"
        >
          <path
            d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"
          />
        </svg>
      </div>
      } @case ('avatar') {
      <div
        class="skeleton-avatar"
        [style.width]="avatarSize()"
        [style.height]="avatarSize()"
      ></div>
      } @case ('button') {
      <div
        class="skeleton-button"
        [style.width]="buttonWidth()"
        [style.height]="buttonHeight()"
      ></div>
      } @case ('table') {
      <div class="space-y-3">
        @for (row of tableRows(); track $index) {
        <div class="flex space-x-4">
          @for (cell of tableCells(); track $index) {
          <div
            class="skeleton-table-cell"
            [style.width]="cell.width"
            [style.height]="cell.height"
          ></div>
          }
        </div>
        }
      </div>
      } @default {
      <!-- Custom skeleton using provided lines -->
      <div class="space-y-2">
        @for (line of customLines(); track $index) {
        <div
          class="skeleton-text-line"
          [style.width]="line.width"
          [style.height]="line.height"
        ></div>
        }
      </div>
      } } @if (showLoadingText()) {
      <span class="sr-only">{{ loadingText() }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonLoader {
  /**
   * Type of skeleton loader
   */
  type = input<'text' | 'card' | 'list' | 'image' | 'avatar' | 'button' | 'table' | 'custom'>(
    'text'
  );

  /**
   * Number of lines for text skeleton
   */
  lines = input<number>(3);

  /**
   * Number of items for list skeleton
   */
  items = input<number>(3);

  /**
   * Number of rows for table skeleton
   */
  rows = input<number>(5);

  /**
   * Number of cells per row for table skeleton
   */
  cells = input<number>(4);

  /**
   * Custom lines configuration
   */
  customLines = input<SkeletonLine[]>([]);

  /**
   * Avatar size (width and height)
   */
  avatarSize = input<string>('40px');

  /**
   * Button width
   */
  buttonWidth = input<string>('120px');

  /**
   * Button height
   */
  buttonHeight = input<string>('40px');

  /**
   * Image width
   */
  imageWidth = input<string>('100%');

  /**
   * Image height
   */
  imageHeight = input<string>('200px');

  /**
   * Container classes
   */
  containerClasses = input<string>('');

  /**
   * Card padding
   */
  cardPadding = input<string>('p-6');

  /**
   * List item padding
   */
  listItemPadding = input<string>('p-4');

  /**
   * Show loading text for screen readers
   */
  showLoadingText = input<boolean>(true);

  /**
   * Loading text for screen readers
   */
  loadingText = input<string>('Loading...');

  /**
   * Aria label for accessibility
   */
  ariaLabel = input<string>('Loading content');

  // Computed properties for different skeleton types
  textLines = computed(() => {
    const lineCount = this.lines();
    const widths = ['w-full', 'w-5/6', 'w-4/5', 'w-3/4', 'w-2/3'];
    return Array.from({ length: lineCount }, (_, i) => ({
      width: widths[i % widths.length],
      height: 'h-4',
    }));
  });

  cardLines = computed(() => {
    const lineCount = this.lines();
    const widths = ['w-3/4', 'w-full', 'w-5/6'];
    return Array.from({ length: lineCount }, (_, i) => ({
      width: widths[i % widths.length],
      height: i === 0 ? 'h-6' : 'h-4',
    }));
  });

  listItems = computed(() => Array.from({ length: this.items() }, (_, i) => i + 1));

  listItemLines = computed(() => [
    { width: 'w-2/3', height: 'h-5' },
    { width: 'w-full', height: 'h-4' },
  ]);

  tableRows = computed(() => Array.from({ length: this.rows() }, (_, i) => i + 1));

  tableCells = computed(() => {
    const cellCount = this.cells();
    const widths = ['w-24', 'w-32', 'w-20', 'w-28'];
    return Array.from({ length: cellCount }, (_, i) => ({
      width: widths[i % widths.length],
      height: 'h-4',
    }));
  });

  cardClasses = computed(() => {
    const padding = this.cardPadding();
    return `${padding} space-y-3`;
  });

  listItemClasses = computed(() => {
    const padding = this.listItemPadding();
    return `${padding} space-y-2`;
  });

  imageClasses = computed(() => {
    const width = this.imageWidth();
    const height = this.imageHeight();
    return `w-full ${height.includes('px') ? '' : height} rounded-lg`;
  });
}
