import type { PageLayoutSettings } from "./page-layout";

const MM_TO_PX = 96 / 25.4;

const PAGE_DIMENSIONS_MM: Record<PageLayoutSettings["pageSize"], { width: number; height: number }> = {
    A4: { width: 210, height: 297 },
    A3: { width: 297, height: 420 },
    Legal: { width: 216, height: 356 },
    Letter: { width: 216, height: 279 },
};

export interface PageGeometry {
    width: number;
    height: number;
    contentWidth: number;
    contentHeight: number;
    stride: number;
}

export function pageGeometry(layout: PageLayoutSettings): PageGeometry {
    const dim = PAGE_DIMENSIONS_MM[layout.pageSize] ?? PAGE_DIMENSIONS_MM.A4;
    const isLandscape = layout.orientation === "landscape";
    const width = Math.round((isLandscape ? dim.height : dim.width) * MM_TO_PX);
    const height = Math.round((isLandscape ? dim.width : dim.height) * MM_TO_PX);
    const contentWidth = Math.round(width - (layout.marginLeft + layout.marginRight) * MM_TO_PX);
    const contentHeight = Math.round(height - (layout.marginTop + layout.marginBottom) * MM_TO_PX);
    const stride = height + 24; // page gap
    return { width, height, contentWidth, contentHeight, stride };
}

export function measuredPageCount(totalContentHeight: number, contentHeight: number, stride: number): number {
    if (totalContentHeight <= contentHeight) return 1;
    return Math.max(1, Math.ceil((totalContentHeight - contentHeight) / stride) + 1);
}
